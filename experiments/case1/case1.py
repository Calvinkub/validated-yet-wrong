"""Case 1 (MTBLS242 bariatric 'responder' forecast): reproduce, re-run with joint
residualisation, and draw the null-distribution figure for the withdrawn design.

Reuses the honest repo's code by path (read-only; no repo files are modified):
    /Users/admin/Project/Forecast/MTBLS242_forecast  (branch honest-evaluation)

Designs
    legacy    raw change, >=9/11 markers, 21 features (contaminants kept)   [withdrawn]
    permarker change_j ~ baseline_j fitted in training fold, >=6/11, 18 feats [repo corrected]
    joint     change_j ~ all 11 marker baselines fitted in training fold,
              >=6/11, 18 features                                          [this paper]

Stages (each resumable; heavy work is cached in results/cache/ in chunks so every
invocation stays under a time budget):
    python case1.py --stage repo      # run the repo script itself (corrected + legacy)
    python case1.py --stage compute   # refit permutation / pairing nulls (re-run until done)
    python case1.py --stage report    # summary JSON + figure
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from multiprocessing import Pool
from pathlib import Path

sys.dont_write_bytecode = True
for _v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "VECLIB_MAXIMUM_THREADS"):
    os.environ.setdefault(_v, "1")  # 4 single-threaded workers, no oversubscription
REPO = Path(os.environ.get("MTBLS242_FORECAST_DIR", "/Users/admin/Project/Forecast/MTBLS242_forecast"))
sys.path.insert(0, str(REPO))

import numpy as np  # noqa: E402

import forecast_responder_pr_auc as fr  # noqa: E402
from controls import (  # noqa: E402
    average_precision,
    bootstrap_delta_ci,
    pairing_destroyed_null,
    repeated_stratified_cv,
    trivial_signed_baseline_score,
)
from forecast_mtbls242 import load_longitudinal_pairs  # noqa: E402
from monotone_logistic import fit_monotone_logistic  # noqa: E402

HERE = Path(__file__).resolve().parent
RESULTS = HERE / "results"
CACHE = RESULTS / "cache"
FIGDIR = HERE.parent.parent / "figures"
PY = sys.executable

SEED = fr.SEED            # 42, as in the repo
N_SPLITS = fr.N_SPLITS    # 5
N_REPEATS = fr.N_REPEATS  # 20
N_PERM = {"joint": 1000, "legacy": 1000, "permarker": 200}  # label perms, refit each
N_PAIR_REFIT = 500        # pairing-destroyed null with full CV refit (legacy design)
N_PAIR_SCORER = 500       # pairing-destroyed null with the no-learning scorer (repo method)
N_BOOT = 2000             # subject bootstrap
CHUNK = 50
N_PROC = 4
DESIGN_CODE = {"legacy": 0, "permarker": 1, "joint": 2}


# --------------------------------------------------------------------------
# Outcomes
# --------------------------------------------------------------------------

def joint_outcome(x, y, metabolites, train_idx, threshold=fr.MIN_IMPROVED_MARKERS_RESIDUAL):
    """change_j ~ a_j + B_j . x0[markers], least squares on train rows only."""
    idx, signs = fr.marker_columns(metabolites)
    x0 = x[:, idx]
    change = y[:, idx] - x0
    design = np.hstack([np.ones((len(x0), 1)), x0])
    coef, *_ = np.linalg.lstsq(design[train_idx], change[train_idx], rcond=None)
    resid = change - design @ coef
    improved = (resid * signs < 0).sum(axis=1)
    return (improved >= threshold).astype(int), improved


def outcome(design, x, y, metabolites, train_idx):
    if design == "legacy":
        return fr.legacy_outcome(x, y, metabolites)[0]
    if design == "permarker":
        return fr.residual_outcome(x, y, metabolites, train_idx)[0]
    if design == "joint":
        return joint_outcome(x, y, metabolites, train_idx)[0]
    raise ValueError(design)


# --------------------------------------------------------------------------
# CV pipeline (mirrors fr.evaluate exactly, but exposes folds for refitting)
# --------------------------------------------------------------------------

_DATA = None


def data():
    global _DATA
    if _DATA is None:
        _, x, y, mets = load_longitudinal_pairs()
        _DATA = (x, y, mets)
    return _DATA


def prepare(design, y_future=None):
    x, y, mets = data()
    if y_future is None:
        y_future = y
    include_artifacts = design == "legacy"
    dropped = [] if include_artifacts else [m for m in fr.ARTIFACT_FEATURES if m in mets]
    feature_idx = [j for j, m in enumerate(mets) if m not in dropped]
    feature_names = [mets[j] for j in feature_idx]
    constraints = np.array([fr.MONOTONE_DIRECTIONS.get(m, 0) for m in feature_names])
    marker_idx, signs = fr.marker_columns(mets)
    fmi = [feature_idx.index(j) for j in marker_idx if j in feature_idx]
    fms = np.array([s for j, s in zip(marker_idx, signs) if j in feature_idx])
    xf = x[:, feature_idx]
    trivial = trivial_signed_baseline_score(xf, fmi, fms)

    all_idx = np.arange(len(x))
    strat = outcome(design, x, y_future, mets, all_idx)
    folds = []
    for repeat, fold, tr, te in repeated_stratified_cv(strat, N_SPLITS, N_REPEATS, SEED):
        lab = strat if design == "legacy" else outcome(design, x, y_future, mets, tr)
        ytr, yte = lab[tr], lab[te]
        if ytr.sum() == 0 or yte.sum() == 0:
            continue
        folds.append((repeat, fold, tr, te, ytr, yte))
    return dict(design=design, xf=xf, constraints=constraints, trivial=trivial,
                folds=folds, prevalence=float(strat.mean()), n_resp=int(strat.sum()),
                n=len(x), n_features=len(feature_idx), dropped=dropped)


def run_cv(prep, rng=None):
    """Return (stat, fold_ap, pooled). stat = mean over repeats of mean fold AP.

    If rng is given, each fold's TRAINING labels are permuted and the whole pipeline
    (inner l2 selection + fit) is rerun; held-out labels stay fixed.
    """
    xf, cons, n = prep["xf"], prep["constraints"], prep["n"]
    rows, pooled = [], {}
    for repeat, fold, tr, te, ytr, yte in prep["folds"]:
        if rng is not None:
            ytr = rng.permutation(ytr)
        l2 = fr.select_l2(xf[tr], ytr, cons, SEED + fold)
        model = fit_monotone_logistic(xf[tr], ytr, cons, l2)
        prob = model.predict_proba(xf[te])
        rows.append((repeat, average_precision(yte, prob),
                     average_precision(yte, prep["trivial"][te]), float(yte.mean()),
                     bool(model.converged)))
        if rng is None:
            st = pooled.setdefault(repeat, {"prob": np.full(n, np.nan),
                                            "label": np.full(n, -1)})
            st["prob"][te] = prob
            st["label"][te] = yte
    rows = np.array(rows, dtype=float)
    reps = np.unique(rows[:, 0])
    per_rep_model = np.array([rows[rows[:, 0] == r, 1].mean() for r in reps])
    per_rep_triv = np.array([rows[rows[:, 0] == r, 2].mean() for r in reps])
    return dict(stat=float(per_rep_model.mean()), per_rep_model=per_rep_model,
                per_rep_triv=per_rep_triv, rows=rows, pooled=pooled)


# --------------------------------------------------------------------------
# Workers (module level for multiprocessing)
# --------------------------------------------------------------------------

_PREP = {}


def _perm_worker(task):
    design, b = task
    if design not in _PREP:
        _PREP[design] = prepare(design)
    rng = np.random.default_rng([SEED, DESIGN_CODE[design], int(b)])
    return run_cv(_PREP[design], rng=rng)["stat"]


def _pair_refit_worker(task):
    design, b = task
    _, y, _ = data()
    rng = np.random.default_rng([SEED, 100 + DESIGN_CODE[design], int(b)])
    try:
        prep = prepare(design, y_future=y[rng.permutation(len(y))])
        if prep["n_resp"] < 2 or prep["prevalence"] >= 1.0 or len(prep["folds"]) == 0:
            return (np.nan, np.nan)
        res = run_cv(prep)
        return (res["stat"], prep["prevalence"])
    except Exception:  # degenerate replicate
        return (np.nan, np.nan)


def run_chunked(name, worker, design, total, budget_s, pool):
    """Fill results/cache/<name>_<start>.npy chunk by chunk until done or out of time."""
    CACHE.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    for start in range(0, total, CHUNK):
        path = CACHE / f"{name}_{start:05d}.npy"
        if path.exists():
            continue
        if time.time() - t0 > budget_s:
            print(f"[{name}] budget exhausted; re-run --stage compute to continue")
            return False
        out = pool.map(worker, [(design, b) for b in range(start, min(start + CHUNK, total))])
        np.save(path, np.array(out, dtype=float))
        print(f"[{name}] {min(start + CHUNK, total)}/{total}  ({time.time() - t0:.0f}s)",
              flush=True)
    return True


def load_chunks(name, total):
    parts = [np.load(CACHE / f"{name}_{s:05d}.npy") for s in range(0, total, CHUNK)
             if (CACHE / f"{name}_{s:05d}.npy").exists()]
    return np.concatenate(parts) if parts else np.array([])


# --------------------------------------------------------------------------
# Stages
# --------------------------------------------------------------------------

def stage_repo():
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE="1")
    for sub, extra in (("repo_corrected", []),
                       ("repo_legacy", ["--legacy-outcome", "--include-artifacts"])):
        cmd = [PY, "forecast_responder_pr_auc.py", *extra, "--output-dir", str(RESULTS / sub)]
        print("$", " ".join(cmd))
        subprocess.run(cmd, cwd=REPO, env=env, check=True, stdout=subprocess.DEVNULL)


def stage_compute(budget_s):
    jobs = [("perm_joint", _perm_worker, "joint", N_PERM["joint"]),
            ("perm_legacy", _perm_worker, "legacy", N_PERM["legacy"]),
            ("perm_permarker", _perm_worker, "permarker", N_PERM["permarker"]),
            ("pairrefit_legacy", _pair_refit_worker, "legacy", N_PAIR_REFIT)]
    t0 = time.time()
    with Pool(N_PROC) as pool:
        for name, worker, design, total in jobs:
            left = budget_s - (time.time() - t0)
            if not run_chunked(name, worker, design, total, left, pool):
                return
    print("compute: all chunks complete")


def perm_p(null, observed):
    null = null[np.isfinite(null)]
    return float((1 + np.sum(null >= observed)) / (1 + len(null))), int(len(null))


def subject_bootstrap_gap(prep, res, n_boot=N_BOOT, seed=SEED):
    """Paired subject bootstrap of mean_over_repeats[AP_pooled(model) - AP_pooled(trivial)].

    The same subject resample is applied to every repeat's pooled held-out predictions.
    """
    reps = sorted(res["pooled"])
    probs = np.array([res["pooled"][r]["prob"] for r in reps])
    labels = np.array([res["pooled"][r]["label"] for r in reps])
    triv = prep["trivial"]
    assert np.all(labels >= 0), "every subject must be held out once per repeat"

    def gap(pick):
        g = [average_precision(labels[k, pick], probs[k, pick])
             - average_precision(labels[k, pick], triv[pick]) for k in range(len(reps))]
        return float(np.mean(g))

    def pooled_ap(pick, scores):
        return float(np.mean([average_precision(labels[k, pick], scores[k][pick])
                              for k in range(len(reps))]))

    n = prep["n"]
    full = np.arange(n)
    rng = np.random.default_rng(seed)
    draws = np.array([gap(rng.integers(0, n, n)) for _ in range(n_boot)])
    return dict(point=gap(full),
                pooled_model_ap=pooled_ap(full, probs),
                pooled_trivial_ap=pooled_ap(full, [triv] * len(reps)),
                ci95=[float(np.percentile(draws, 2.5)), float(np.percentile(draws, 97.5))],
                n_boot=n_boot, seed=seed)


def coupling_diagnostics():
    """Residual coupling left after each residualisation (full sample, in-sample fit)."""
    x, y, mets = data()
    idx, signs = fr.marker_columns(mets)
    x0, ch = x[:, idx], y[:, idx] - x[:, idx]
    all_idx = np.arange(len(x))
    out = {}
    for name, design in (("raw", "legacy"), ("permarker", "permarker"), ("joint", "joint")):
        if name == "raw":
            resid = ch
        elif name == "permarker":
            fit = fr.residualize_change(x0, y[:, idx], all_idx)
            resid = fit.transform(x0, y[:, idx])
        else:
            d = np.hstack([np.ones((len(x0), 1)), x0])
            coef, *_ = np.linalg.lstsq(d, ch, rcond=None)
            resid = ch - d @ coef
        c = np.array([[np.corrcoef(resid[:, j], x0[:, k])[0, 1] for k in range(len(idx))]
                      for j in range(len(idx))])
        off = c[~np.eye(len(idx), dtype=bool)]
        # signed improvement count vs the no-learning score: the mechanical edge
        improved = (resid * signs < 0).sum(axis=1)
        prep = prepare(design)
        out[name] = dict(
            median_corr_own_baseline=float(np.median(np.diag(c))),
            median_abs_corr_other_baselines=float(np.median(np.abs(off))),
            max_abs_corr_other_baselines=float(np.max(np.abs(off))),
            spearman_improved_count_vs_trivial_score=float(
                np.corrcoef(np.argsort(np.argsort(improved)),
                            np.argsort(np.argsort(prep["trivial"])))[0, 1]),
        )
    return out


def stage_report():
    summary = {"repo_commit": subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO,
                                             capture_output=True, text=True).stdout.strip(),
               "seed": SEED, "cv": f"{N_REPEATS} repeats x {N_SPLITS}-fold stratified "
                                    "(controls.repeated_stratified_cv, seed 42)"}
    for sub in ("repo_corrected", "repo_legacy"):
        summary[sub] = json.loads((RESULTS / sub / "summary_pr_auc.json").read_text())

    for design in ("legacy", "permarker", "joint"):
        prep = prepare(design)
        res = run_cv(prep)
        perm = load_chunks(f"perm_{design}", N_PERM[design])
        p, n_valid = perm_p(perm, res["stat"]) if len(perm) else (None, 0)
        delta_rep = bootstrap_delta_ci(res["per_rep_model"], res["per_rep_triv"],
                                       n_reps=5000, seed=SEED)
        _, y, _ = data()
        x, _, mets = data()

        def ofn(xx, yy, design=design):
            return outcome(design, xx, yy, mets, np.arange(len(xx)))

        tr = prep["trivial"]
        pair = pairing_destroyed_null(x, y, ofn, lambda _xx: tr, N_PAIR_SCORER, SEED)
        d = dict(
            n=prep["n"], n_responders=prep["n_resp"], prevalence=prep["prevalence"],
            n_features=prep["n_features"], dropped=prep["dropped"],
            n_folds_used=len(prep["folds"]),
            convergence_rate=float(res["rows"][:, 4].mean()),
            mean_heldout_label_prevalence=float(res["rows"][:, 3].mean()),
            model_pr_auc=res["stat"],
            model_pr_auc_sd_across_repeats=float(res["per_rep_model"].std(ddof=0)),
            trivial_pr_auc=float(res["per_rep_triv"].mean()),
            lift=res["stat"] / prep["prevalence"],
            gap_model_minus_trivial_repeat_bootstrap=dict(
                point=delta_rep.point, ci95=[delta_rep.low, delta_rep.high],
                note="repo method: bootstrap over the 20 per-repeat means, 5000 draws"),
            gap_subject_bootstrap=subject_bootstrap_gap(prep, res),
            permutation_refit=dict(p=p, n_valid=n_valid, n_requested=N_PERM[design],
                                   statistic="mean over repeats of mean fold AP",
                                   scheme="per fold: permute training labels, rerun "
                                          "inner l2 selection + fit; held-out labels fixed",
                                   null_median=float(np.median(perm)) if len(perm) else None,
                                   null_p95=float(np.percentile(perm, 95)) if len(perm) else None),
            pairing_null_scorer=dict(median_lift=float(np.median(pair.lift)),
                                     p95_lift=pair.percentile(95), n_valid=len(pair.lift),
                                     n_requested=N_PAIR_SCORER,
                                     p=perm_p(pair.lift, res["stat"] / prep["prevalence"])[0]),
        )
        if design == "legacy":
            pr = load_chunks("pairrefit_legacy", N_PAIR_REFIT)
            ok = np.isfinite(pr[:, 0]) if len(pr) else np.array([], bool)
            lift = pr[ok, 0] / pr[ok, 1] if len(pr) else np.array([])
            d["pairing_null_refit"] = dict(
                median_lift=float(np.median(lift)) if len(lift) else None,
                p95_lift=float(np.percentile(lift, 95)) if len(lift) else None,
                median_null_prevalence=float(np.median(pr[ok, 1])) if len(lift) else None,
                n_valid=int(ok.sum()), n_requested=N_PAIR_REFIT,
                p=perm_p(lift, d["lift"])[0] if len(lift) else None)
            np.savez_compressed(RESULTS / "legacy_nulls.npz", perm_refit_stat=perm,
                                pair_refit=pr, pair_scorer_lift=pair.lift,
                                observed_stat=res["stat"], prevalence=prep["prevalence"])
        if design == "joint":
            np.savez_compressed(RESULTS / "joint_nulls.npz", perm_refit_stat=perm,
                                pair_scorer_lift=pair.lift, observed_stat=res["stat"],
                                per_rep_model=res["per_rep_model"],
                                per_rep_triv=res["per_rep_triv"])
        summary[design] = d
        print(f"{design}: AP={d['model_pr_auc']:.4f} prev={d['prevalence']:.4f} "
              f"triv={d['trivial_pr_auc']:.4f} p_refit={p}")

    summary["coupling_diagnostics"] = coupling_diagnostics()
    (RESULTS / "summary_case1.json").write_text(json.dumps(summary, indent=2))
    make_figure(summary)


def make_figure(summary):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    plt.rcParams.update({"font.family": "serif", "font.size": 7, "axes.titlesize": 7.5,
                         "axes.labelsize": 7, "xtick.labelsize": 6.5, "ytick.labelsize": 6.5,
                         "legend.fontsize": 6, "axes.linewidth": 0.6,
                         "pdf.fonttype": 42, "ps.fonttype": 42})
    null_c, obs_c, ref_c = "#9aa5b1", "#c0392b", "#33414e"

    leg = summary["legacy"]
    nulls = np.load(RESULTS / "legacy_nulls.npz")
    perm = nulls["perm_refit_stat"]
    pair = nulls["pair_scorer_lift"]
    obs_ap, obs_lift = leg["model_pr_auc"], leg["lift"]

    fig, (a, b) = plt.subplots(2, 1, figsize=(3.5, 3.3))
    a.hist(perm, bins=30, color=null_c, edgecolor="white", linewidth=0.3)
    a.axvline(obs_ap, color=obs_c, lw=1.4)
    a.text(obs_ap, a.get_ylim()[1] * 0.92, f" observed {obs_ap:.3f}\n p = {leg['permutation_refit']['p']:.3f}",
           color=obs_c, va="top", ha="right" if obs_ap > np.max(perm) else "left", fontsize=6.5)
    a.set_xlabel("PR-AUC (mean held-out AP, 20$\\times$5-fold CV)")
    a.set_ylabel("Permutations")
    a.set_title(f"(a) Label-permutation null (model refit, {len(perm)} perms.)", loc="left")

    b.hist(pair, bins=30, color=null_c, edgecolor="white", linewidth=0.3)
    med = float(np.median(pair))
    b.axvline(med, color=ref_c, lw=0.9, ls="--")
    b.axvline(obs_lift, color=obs_c, lw=1.4)
    top = b.get_ylim()[1]
    b.text(obs_lift, top * 0.92, f"observed\n{obs_lift:.2f}$\\times$ ", color=obs_c,
           ha="right", va="top", fontsize=6.5)
    b.text(med, top * 0.92, f" null median\n {med:.2f}$\\times$", color=ref_c,
           ha="left", va="top", fontsize=6.5)
    b.set_xlim(1.1, 3.05)
    b.set_xlabel("Lift (PR-AUC / prevalence)")
    b.set_ylabel("Replicates")
    b.set_title(f"(b) Pairing-destroyed null ({len(pair)} reps.)", loc="left")
    for ax in (a, b):
        ax.spines[["top", "right"]].set_visible(False)
        ax.tick_params(width=0.6, length=2.5)
    fig.tight_layout(h_pad=0.8)
    FIGDIR.mkdir(exist_ok=True)
    fig.savefig(FIGDIR / "case1_nulls.pdf")
    fig.savefig(FIGDIR / "case1_nulls.png", dpi=300)
    print("figure:", FIGDIR / "case1_nulls.pdf")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", choices=["repo", "compute", "report", "figure"], required=True)
    ap.add_argument("--budget", type=float, default=480.0, help="seconds per compute call")
    args = ap.parse_args()
    RESULTS.mkdir(parents=True, exist_ok=True)
    if args.stage == "repo":
        stage_repo()
    elif args.stage == "compute":
        stage_compute(args.budget)
    elif args.stage == "report":
        stage_report()
    else:
        make_figure(json.loads((RESULTS / "summary_case1.json").read_text()))
