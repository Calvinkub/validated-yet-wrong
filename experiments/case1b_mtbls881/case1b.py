"""Case 1b: replicate the Case 1 analysis on MTBLS881 (CPB cardiac surgery, 1H-NMR serum).
Design is fixed in PREREG.md (written before any result). Reuses the honest repo's controls
(CV scheme, AP, bootstrap, pairing-destroyed null) and select_l2 / fit_monotone_logistic by path.

    python case1b.py --stage compute [--budget 540]   # resumable chunked nulls
    python case1b.py --stage report                   # results/summary_case1b.json (+ table.tex)
"""
from __future__ import annotations
import argparse, json, os, sys, time
from multiprocessing import Pool
from pathlib import Path

sys.dont_write_bytecode = True
for _v in ("OMP_NUM_THREADS", "OPENBLAS_NUM_THREADS", "MKL_NUM_THREADS", "VECLIB_MAXIMUM_THREADS"):
    os.environ.setdefault(_v, "1")
REPO = Path(os.environ.get("MTBLS242_FORECAST_DIR", "/Users/admin/Project/Forecast/MTBLS242_forecast"))
sys.path.insert(0, str(REPO))
import numpy as np, pandas as pd  # noqa: E402
import forecast_responder_pr_auc as fr  # noqa: E402
from controls import (average_precision, pairing_destroyed_null,  # noqa: E402
                      repeated_stratified_cv)
from monotone_logistic import fit_monotone_logistic  # noqa: E402

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
RESULTS, CACHE = HERE / "results", HERE / "results" / "cache"
DATA = ROOT / "data" / "MTBLS881"
SEED, N_SPLITS, N_REPEATS = fr.SEED, fr.N_SPLITS, fr.N_REPEATS
N_PERM = 300  # main designs
N_PERM_ART = 200  # artefact variant
N_PAIR_REFIT = 150
N_PAIR_SCORER, N_BOOT, CHUNK, N_PROC = 500, 2000, 25, 4
BASE_T, FOLLOW_T = -1, 20
SITES = ["Left atrium", "Pulmonary artery"]  # primary first
MARKERS = ["L-Valine", "L-Leucine", "L-Isoleucine", "L-Tyrosine", "L-Phenylalanine", "L-Alanine",
           "Lipoproteins", "L-Lactic acid", "Glycine", "L-Glutamine", "L-Histidine"]
EXO = ["Propofol", "Heparin", "Ethanol"]
DROP_ROWS_BY_NAME_FIRST = ["Trigonelline", "Propofol", "Heparin"]  # keep first row only
DROP_NAMES = ["Alpha-D-Glucose", "Beta-D-Glucose"]
DESIGNS = ["raw", "permarker", "joint"]
DCODE = {"raw": 0, "permarker": 1, "joint": 2}
VARIANTS = ["main", "artefact"]


# ---------------------------------------------------------------- data
def load(site):
    m = pd.read_csv(next(DATA.glob("m_*.tsv")), sep="\t")
    cols = [c for c in m.columns if c.startswith("Patient_")]
    # drop the NaN-shift duplicate D-glucose row, alpha/beta glucose, duplicate trigonelline/propofol/heparin rows
    keep = []
    seen = set()
    for i, r in m.iterrows():
        n = r["metabolite_identification"]
        if n in DROP_NAMES or (n == "D-Glucose" and pd.isna(r["chemical_shift"])):
            continue
        if n in DROP_ROWS_BY_NAME_FIRST:
            if n in seen:
                continue
            seen.add(n)
        keep.append(i)
    m = m.loc[keep].reset_index(drop=True)
    names = m["metabolite_identification"].tolist()
    A = m[cols].apply(pd.to_numeric, errors="coerce").to_numpy(float)  # metab x samples
    s = pd.read_csv(DATA / "s_MTBLS881.txt", sep="\t").set_index("Sample Name")
    t = s.loc[cols, "Factor Value[Time elapsed from CPB]"].to_numpy(float)
    st = s.loc[cols, "Factor Value[Oxygenated-deoxygenated blood]"].to_numpy()
    pid = np.array([int(c.split("_")[1]) for c in cols])
    miss_frac = np.isnan(A).mean(axis=1)
    out = {}
    for tt in (BASE_T, FOLLOW_T):
        sel = (t == tt) & (st == site)
        sub = A[:, sel]
        med = np.nanmedian(sub, axis=1, keepdims=True)
        sub = np.where(np.isnan(sub), med, sub)
        out[tt] = (pid[sel], np.log1p(sub.T))
    common = sorted(set(out[BASE_T][0]) & set(out[FOLLOW_T][0]))
    def take(tt):
        p, v = out[tt]
        return v[[list(p).index(c) for c in common]]
    return dict(ids=np.array(common), x=take(BASE_T), y=take(FOLLOW_T), names=names, miss_frac=miss_frac)


class Ctx:
    def __init__(self, site, variant):
        d = load(site)
        self.ids, X, Y, names = d["ids"], d["x"], d["y"], d["names"]
        self.n_missing_max = float(d["miss_frac"].max())
        art = variant == "artefact"
        feat = [j for j, n in enumerate(names) if art or n not in EXO]
        self.feat_names = [names[j] for j in feat]
        self.x, self.y = X[:, feat], Y[:, feat]
        mk = MARKERS + (EXO if art else [])
        self.mk = [self.feat_names.index(m) for m in mk]
        self.n, self.p = self.x.shape
        self.cons = np.zeros(self.p)
        z = (self.x - self.x.mean(0)) / np.where(self.x.std(0) < 1e-12, 1, self.x.std(0))
        self.zm = z[:, self.mk]


def direction(ctx, y, tr):
    d = np.sign((y[tr][:, ctx.mk] - ctx.x[tr][:, ctx.mk]).mean(0))
    return np.where(d == 0, 1.0, d)


def n_moving(design, ctx, y, tr):
    """number of markers moving in direction d (d from training rows) for every subject."""
    x0, y0 = ctx.x[:, ctx.mk], y[:, ctx.mk]
    ch = y0 - x0
    d = direction(ctx, y, tr)
    if design == "raw":
        r = ch
    else:
        if design == "permarker":
            r = np.empty_like(ch)
            for j in range(ch.shape[1]):
                D = np.column_stack([np.ones(len(x0)), x0[:, j]])
                c, *_ = np.linalg.lstsq(D[tr], ch[tr, j], rcond=None)
                r[:, j] = ch[:, j] - D @ c
        else:
            D = np.hstack([np.ones((len(x0), 1)), x0])
            c, *_ = np.linalg.lstsq(D[tr], ch[tr], rcond=None)
            r = ch - D @ c
    return (r * d > 0).sum(1)


def choose_K(design, ctx, y=None):
    y = ctx.y if y is None else y
    cnt = n_moving(design, ctx, y, np.arange(ctx.n))
    prev = {K: float((cnt >= K).mean()) for K in range(1, len(ctx.mk) + 1)}
    K = min(prev, key=lambda k: (abs(prev[k] - 0.5), k))
    return K, prev


def prepare(site, variant, design, y_future=None, K=None):
    ctx = Ctx(site, variant)
    if K is None:
        K, _ = choose_K(design, ctx)
    y = ctx.y if y_future is None else y_future
    allidx = np.arange(ctx.n)
    strat = (n_moving(design, ctx, y, allidx) >= K).astype(int)
    folds = []
    for rep, fold, tr, te in repeated_stratified_cv(strat, N_SPLITS, N_REPEATS, SEED):
        lab = (n_moving(design, ctx, y, tr) >= K).astype(int)
        if lab[tr].sum() == 0 or lab[te].sum() == 0:
            continue
        triv = -(ctx.zm @ direction(ctx, y, tr))
        folds.append((rep, fold, tr, te, lab[tr], lab[te], triv))
    return dict(ctx=ctx, K=K, folds=folds, prevalence=float(strat.mean()), n_resp=int(strat.sum()), n=ctx.n)


def run_cv(prep, rng=None):
    ctx = prep["ctx"]; n = prep["n"]
    rows, pooled = [], {}
    for rep, fold, tr, te, ytr, yte, triv in prep["folds"]:
        if rng is not None:
            ytr = rng.permutation(ytr)
        l2 = fr.select_l2(ctx.x[tr], ytr, ctx.cons, SEED + fold)
        mod = fit_monotone_logistic(ctx.x[tr], ytr, ctx.cons, l2)
        prob = mod.predict_proba(ctx.x[te])
        rows.append((rep, average_precision(yte, prob), average_precision(yte, triv[te]),
                     float(yte.mean()), bool(mod.converged)))
        if rng is None:
            st = pooled.setdefault(rep, {"prob": np.full(n, np.nan), "triv": np.full(n, np.nan),
                                         "label": np.full(n, -1)})
            st["prob"][te], st["triv"][te], st["label"][te] = prob, triv[te], yte
    rows = np.array(rows, float)
    reps = np.unique(rows[:, 0])
    pm = np.array([rows[rows[:, 0] == r, 1].mean() for r in reps])
    pt = np.array([rows[rows[:, 0] == r, 2].mean() for r in reps])
    return dict(stat=float(pm.mean()), per_rep_model=pm, per_rep_triv=pt, rows=rows, pooled=pooled)


# ---------------------------------------------------------------- workers
_P = {}
def _prep(key):
    if key not in _P:
        _P[key] = prepare(*key)
    return _P[key]

def _perm_worker(t):
    key, b = t
    rng = np.random.default_rng([SEED, DCODE[key[2]], SITES.index(key[0]), VARIANTS.index(key[1]), int(b)])
    return run_cv(_prep(key), rng=rng)["stat"]

def _pair_worker(t):
    key, b = t
    site, variant, design = key
    p0 = _prep(key)
    rng = np.random.default_rng([SEED, 100 + DCODE[design], SITES.index(site), VARIANTS.index(variant), int(b)])
    try:
        y = p0["ctx"].y
        pr = prepare(site, variant, design, y_future=y[rng.permutation(len(y))], K=p0["K"])
        if pr["n_resp"] < 2 or pr["prevalence"] >= 1.0 or not pr["folds"]:
            return (np.nan, np.nan)
        return (run_cv(pr)["stat"], pr["prevalence"])
    except Exception:
        return (np.nan, np.nan)


def jobs():
    J = []
    for site in SITES:
        for design in DESIGNS:
            J.append((f"perm_{site[:2]}_main_{design}", _perm_worker, (site, "main", design), N_PERM))
        J.append((f"pair_{site[:2]}_main_raw", _pair_worker, (site, "main", "raw"), N_PAIR_REFIT))
        for design in ("raw", "joint"):
            J.append((f"perm_{site[:2]}_artefact_{design}", _perm_worker, (site, "artefact", design), N_PERM_ART))
    return J


def stage_compute(budget):
    CACHE.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    with Pool(N_PROC) as pool:
        for name, w, key, total in jobs():
            for s in range(0, total, CHUNK):
                path = CACHE / f"{name}_{s:05d}.npy"
                if path.exists():
                    continue
                if time.time() - t0 > budget:
                    print("budget exhausted; rerun"); return
                out = pool.map(w, [(key, b) for b in range(s, min(s + CHUNK, total))])
                np.save(path, np.array(out, float))
            print(f"[{name}] done ({time.time() - t0:.0f}s)", flush=True)
    print("compute: all chunks complete")


def load_chunks(name, total):
    ps = [CACHE / f"{name}_{s:05d}.npy" for s in range(0, total, CHUNK)]
    ps = [p for p in ps if p.exists()]
    return np.concatenate([np.load(p) for p in ps]) if ps else np.array([])


# ---------------------------------------------------------------- report
def perm_p(null, obs):
    null = null[np.isfinite(null)]
    return float((1 + np.sum(null >= obs)) / (1 + len(null))), int(len(null))


def boot_gap(res, n, n_boot=N_BOOT, seed=SEED):
    reps = sorted(res["pooled"])
    pr = np.array([res["pooled"][r]["prob"] for r in reps])
    tv = np.array([res["pooled"][r]["triv"] for r in reps])
    lb = np.array([res["pooled"][r]["label"] for r in reps])
    def gap(pick):
        return float(np.mean([average_precision(lb[k, pick], pr[k, pick]) - average_precision(lb[k, pick], tv[k, pick])
                              for k in range(len(reps))]))
    rng = np.random.default_rng(seed)
    dr = np.array([gap(rng.integers(0, n, n)) for _ in range(n_boot)])
    return dict(point=gap(np.arange(n)), ci95=[float(np.percentile(dr, 2.5)), float(np.percentile(dr, 97.5))],
                n_boot=n_boot, seed=seed)


def stage_report():
    summ = dict(seed=SEED, cv=f"{N_REPEATS}x{N_SPLITS}-fold stratified (controls.repeated_stratified_cv)",
                n_perm=N_PERM, n_perm_artefact=N_PERM_ART, n_pair_refit=N_PAIR_REFIT, n_pair_scorer=N_PAIR_SCORER, sites={})
    for site in SITES:
        S = {}
        for variant in VARIANTS:
            for design in DESIGNS:
                if variant == "artefact" and design == "permarker":
                    continue
                prep = prepare(site, variant, design)
                ctx = prep["ctx"]
                K, prevs = choose_K(design, ctx)
                res = run_cv(prep)
                NP = N_PERM_ART if variant == "artefact" else N_PERM
                perm = load_chunks(f"perm_{site[:2]}_{variant}_{design}", NP)
                p, nv = perm_p(perm, res["stat"]) if len(perm) else (None, 0)
                d_full = direction(ctx, ctx.y, np.arange(ctx.n))
                triv_full = -(ctx.zm @ d_full)
                ofn = lambda xx, yy, design=design, ctx=ctx, K=K: (n_moving(design, _CtxView(ctx, xx), yy, np.arange(len(xx))) >= K).astype(int)
                pair = pairing_destroyed_null(ctx.x, ctx.y, ofn, lambda _x: triv_full, N_PAIR_SCORER, SEED)
                lab_full = (n_moving(design, ctx, ctx.y, np.arange(ctx.n)) >= K).astype(int)
                scorer_lift = average_precision(lab_full, triv_full) / prep["prevalence"]
                lift = res["stat"] / prep["prevalence"]
                d = dict(n=ctx.n, n_features=ctx.p, n_markers=len(ctx.mk), K=K, prevalence_by_K={str(k): v for k, v in prevs.items()},
                         n_responders=prep["n_resp"], prevalence=prep["prevalence"], n_folds_used=len(prep["folds"]),
                         convergence_rate=float(res["rows"][:, 4].mean()),
                         model_pr_auc=res["stat"], model_pr_auc_sd_repeats=float(res["per_rep_model"].std()),
                         scorer_pr_auc=float(res["per_rep_triv"].mean()), lift=lift,
                         scorer_fullsample_lift=scorer_lift,
                         gap_subject_bootstrap=boot_gap(res, ctx.n),
                         permutation_refit=dict(p=p, n_valid=nv, n_requested=NP,
                                                null_median=float(np.median(perm)) if len(perm) else None,
                                                null_p95=float(np.percentile(perm, 95)) if len(perm) else None),
                         pairing_null_scorer=dict(median_lift=float(np.median(pair.lift)), p95_lift=pair.percentile(95),
                                                  n_valid=len(pair.lift),
                                                  median_null_prevalence=float(np.median(pair.prevalence)),
                                                  p_model_lift=perm_p(pair.lift, lift)[0],
                                                  p_scorer_lift=perm_p(pair.lift, scorer_lift)[0]))
                if variant == "main" and design == "raw":
                    pr = load_chunks(f"pair_{site[:2]}_main_raw", N_PAIR_REFIT)
                    if len(pr):
                        ok = np.isfinite(pr[:, 0]); l = pr[ok, 0] / pr[ok, 1]
                        d["pairing_null_refit"] = dict(median_lift=float(np.median(l)), p95_lift=float(np.percentile(l, 95)),
                                                       median_null_prevalence=float(np.median(pr[ok, 1])), n_valid=int(ok.sum()),
                                                       n_requested=N_PAIR_REFIT, p=perm_p(l, lift)[0])
                S[f"{variant}_{design}"] = d
                print(site, variant, design, f"K={K} prev={prep['prevalence']:.2f} AP={res['stat']:.3f} scorer={d['scorer_pr_auc']:.3f} p={p}", flush=True)
        summ["sites"][site] = S
    (RESULTS / "summary_case1b.json").write_text(json.dumps(summ, indent=2))


class _CtxView:
    """ctx with substituted baseline x (for the pairing null helper signature)."""
    def __init__(self, ctx, x):
        self.x, self.mk, self.n = x, ctx.mk, len(x)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--stage", choices=["compute", "report", "probe"], required=True)
    ap.add_argument("--budget", type=float, default=540.0)
    a = ap.parse_args()
    RESULTS.mkdir(parents=True, exist_ok=True)
    if a.stage == "compute":
        stage_compute(a.budget)
    elif a.stage == "probe":
        t = time.time()
        for design in DESIGNS:
            pr = prepare("Left atrium", "main", design)
            print(design, "K", pr["K"], "prev", pr["prevalence"], "n", pr["n"], "folds", len(pr["folds"]),
                  "p", pr["ctx"].p, "mk", len(pr["ctx"].mk), f"{time.time()-t:.1f}s")
            r = run_cv(pr); print("  AP", r["stat"], "scorer", r["per_rep_triv"].mean(), f"{time.time()-t:.1f}s")
    else:
        stage_report()
