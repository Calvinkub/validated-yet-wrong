"""Case 2: ROAR on MTBLS242 obesity (preop vs 12-month), redone with
subject-grouped CV, recursive SHAP re-ranking, a large equal-CV random-removal
null, and a spiked synthetic artifact as positive control.

Stages (each writes to results/; run in order, each fits in a few minutes):
  python run_case2.py main            # baseline, fixed + recursive ROAR, contrast trios
  python run_case2.py null 1 2 3 4    # random-removal null for the listed k
  python run_case2.py null 5 6 7 8
  python run_case2.py null 9 10 11
  python run_case2.py spike           # spiked-artifact positive control
  python run_case2.py summarize       # percentiles -> results/summary.json

CV scheme everywhere (baseline, informed, random, spike): 10 x repeated
StratifiedGroupKFold(5, shuffle=True, random_state in REPEAT_SEEDS), groups =
patient ID; identical fold assignments for every condition (paired). Score =
mean over the 50 folds of per-fold average precision (PR-AUC).
"""
from __future__ import annotations

import itertools
import json
import sys
import time
from math import comb
from multiprocessing import Pool
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from common import (BIOLOGY_TRIO, KNOWN_ARTIFACTS, REPEAT_SEEDS, N_SPLITS, constraints,  # noqa: E402
                    cv_scores, load_dataset, make_splits, shap_rank, MAF_PATH, SAMPLE_SHEET_PATH)

OUT = Path(__file__).resolve().parent / "results"
OUT.mkdir(exist_ok=True)
K_MAX = 11
N_DRAWS = 500                 # per k for k>=3; k=1,2 are enumerated exhaustively (21, 210)
NULL_SEED = 20261012
SPIKE_D = [0.75, 1.25, 1.75]  # Cohen's d of the synthetic artifact (real contaminants: 1.07-1.74)
SPIKE_REPS = 10
SPIKE_SEED = 777
N_PROC = 4

X, y, G, NAMES, _ = load_dataset()
SPLITS = make_splits(y, G, grouped=True)


def build(names, extra=None):
    """Matrix for a list of feature names; 'SPIKE' column taken from `extra`."""
    cols = [extra if n == "SPIKE" else X[:, NAMES.index(n)] for n in names]
    return np.column_stack(cols)


def eval_task(task):
    tag, k, kept, removed, extra = task
    s = cv_scores(build(kept, extra), y, constraints(kept), SPLITS)
    return tag, k, removed, s


def run_pool(tasks):
    with Pool(N_PROC) as p:
        return p.map(eval_task, tasks, chunksize=4)


def eval_one(kept, extra=None):
    return cv_scores(build(kept, extra), y, constraints(kept), SPLITS)


# --------------------------------------------------------------------------
def stage_main():
    t0 = time.time()
    res = {}
    # Baseline, grouped (main) and ungrouped (reproduction of ROAR repo)
    base = eval_one(NAMES)
    ung = cv_scores(X, y, constraints(NAMES), make_splits(y, G, grouped=False))
    res["baseline_grouped"] = {"mean": base.mean(), "sd_folds": base.std()}
    res["baseline_ungrouped_stratified"] = {"mean": ung.mean(), "sd_folds": ung.std()}
    rank0, imp0 = shap_rank(X, y, NAMES)
    pd.DataFrame({"rank": range(1, 22), "feature": rank0, "mean_abs_shap": imp0}).to_csv(
        OUT / "baseline_shap_ranking.csv", index=False)

    # Fixed-ranking ROAR (ranking computed once on the full feature set)
    rows = []
    for k in range(1, K_MAX + 1):
        removed = rank0[:k]
        kept = [n for n in NAMES if n not in removed]
        s = eval_one(kept)
        rows.append({"k": k, "removed_k": removed[-1], "pr_auc": s.mean(), "sd_folds": s.std()})
    pd.DataFrame(rows).to_csv(OUT / "fixed_roar.csv", index=False)

    # Recursive ROAR: retrain on remaining features, recompute SHAP, drop new top
    rows, kept, removed = [], list(NAMES), []
    rows.append({"k": 0, "removed_at_step": "", "pr_auc": base.mean(), "sd_folds": base.std(),
                 "top_after": rank0[0]})
    cur_rank = rank0
    for k in range(1, K_MAX + 1):
        drop = cur_rank[0]
        removed.append(drop)
        kept = [n for n in kept if n != drop]
        s = eval_one(kept)
        cur_rank, cur_imp = shap_rank(build(kept), y, kept)
        rows.append({"k": k, "removed_at_step": drop, "pr_auc": s.mean(), "sd_folds": s.std(),
                     "top_after": cur_rank[0], "top3_after": ";".join(cur_rank[:3])})
        print(f"recursive k={k:2d} drop={drop:20s} AP={s.mean():.4f} next top={cur_rank[0]}", flush=True)
    pd.DataFrame(rows).to_csv(OUT / "recursive_roar.csv", index=False)

    # Contrast trios at k=3
    rows = []
    for label, trio in [("contaminant_trio", KNOWN_ARTIFACTS), ("biology_trio", BIOLOGY_TRIO)]:
        s = eval_one([n for n in NAMES if n not in trio])
        rows.append({"group": label, "features": ";".join(trio), "pr_auc": s.mean(), "sd_folds": s.std()})
    pd.DataFrame(rows).to_csv(OUT / "contrast_trios.csv", index=False)
    res["runtime_s"] = round(time.time() - t0, 1)
    json.dump(res, open(OUT / "main.json", "w"), indent=2, default=float)
    print(json.dumps(res, indent=2, default=float))


# --------------------------------------------------------------------------
def null_sets(k):
    if comb(21, k) <= N_DRAWS:
        return [list(c) for c in itertools.combinations(NAMES, k)]
    rng = np.random.default_rng(NULL_SEED + k)
    seen, out = set(), []
    while len(out) < N_DRAWS:   # distinct subsets, uniform over C(21,k)
        c = tuple(sorted(rng.choice(21, size=k, replace=False)))
        if c not in seen:
            seen.add(c)
            out.append([NAMES[i] for i in c])
    return out


def stage_null(ks):
    for k in ks:
        t0 = time.time()
        sets = null_sets(k)
        tasks = [("null", k, [n for n in NAMES if n not in s], ";".join(s), None)
                 for s in sets]
        out = run_pool(tasks)
        folds = np.array([o[3] for o in out])
        df = pd.DataFrame({"k": k, "draw": range(len(out)), "removed": [o[2] for o in out],
                           "pr_auc": folds.mean(1)})
        df.to_csv(OUT / f"null_k{k:02d}.csv", index=False)
        np.save(OUT / f"null_k{k:02d}_folds.npy", folds)
        print(f"null k={k}: {len(out)} draws, mean {df.pr_auc.mean():.4f}, "
              f"p2.5 {df.pr_auc.quantile(.025):.4f}, {time.time()-t0:.0f}s", flush=True)


# --------------------------------------------------------------------------
def stage_spike():
    """Synthetic artifact: spike = d * y + N(0,1) per sample. It depends only on
    the sampling occasion (label), not on any metabolite - a pure contaminant
    like skin-prep isopropanol. Real features are log1p values; d is a
    standardized mean difference (Cohen's d) by construction."""
    t0 = time.time()
    names22 = NAMES + ["SPIKE"]
    rng = np.random.default_rng(SPIKE_SEED)
    tasks, meta = [], []
    for d in SPIKE_D:
        for rep in range(SPIKE_REPS):
            spike = d * y + rng.standard_normal(len(y))
            r22, imp22 = shap_rank(build(names22, spike), y, names22)
            # recursive SHAP order on the 22-feature set (ranking only)
            kept, order = list(names22), []
            rk = r22
            while "SPIKE" in kept and len(order) < K_MAX:
                order.append(rk[0])
                kept.remove(rk[0])
                if "SPIKE" in kept:
                    rk, _ = shap_rank(build(kept, spike), y, kept)
            step = order.index("SPIKE") + 1 if "SPIKE" in order else None
            meta.append({"d": d, "rep": rep, "spike_shap_rank": r22.index("SPIKE") + 1,
                         "spike_mean_abs_shap": float(imp22[r22.index("SPIKE")]),
                         "top5": ";".join(r22[:5]), "recursive_step_removed": step,
                         "recursive_order_until_spike": ";".join(order)})
            tasks.append((f"{d}|{rep}", 0, names22, "", spike))  # baseline with spike
            for f in names22:                                     # every single removal
                tasks.append((f"{d}|{rep}", 1, [n for n in names22 if n != f], f, spike))
            print(f"spike d={d} rep={rep}: SHAP rank {meta[-1]['spike_shap_rank']}, "
                  f"recursive step {step}", flush=True)
    out = run_pool(tasks)
    rows = [{"d": float(t.split('|')[0]), "rep": int(t.split('|')[1]), "k": k,
             "removed": rem, "pr_auc": s.mean()} for t, k, rem, s in out]
    pd.DataFrame(rows).to_csv(OUT / "spike_single_removals.csv", index=False)
    pd.DataFrame(meta).to_csv(OUT / "spike_rankings.csv", index=False)
    print(f"spike stage {time.time()-t0:.0f}s")


# --------------------------------------------------------------------------
def pct(null, v):
    """Percentile of v in the null: % of random removals with PR-AUC <= v."""
    return float((np.asarray(null) <= v).mean() * 100)


def stage_summarize():
    main = json.load(open(OUT / "main.json"))
    rec = pd.read_csv(OUT / "recursive_roar.csv")
    fix = pd.read_csv(OUT / "fixed_roar.csv")
    con = pd.read_csv(OUT / "contrast_trios.csv")
    S = {"baseline": main, "curve": []}
    for k in range(1, K_MAX + 1):
        nl = pd.read_csv(OUT / f"null_k{k:02d}.csv").pr_auc.values
        r = rec.loc[rec.k == k].iloc[0]
        f = fix.loc[fix.k == k].iloc[0]
        S["curve"].append({
            "k": k, "n_null": len(nl), "null_mean": nl.mean(), "null_p2_5": np.percentile(nl, 2.5),
            "null_p5": np.percentile(nl, 5), "null_p50": np.median(nl), "null_p97_5": np.percentile(nl, 97.5),
            "null_min": nl.min(),
            "recursive_removed": r.removed_at_step, "recursive_pr_auc": r.pr_auc,
            "recursive_pct": pct(nl, r.pr_auc),
            "fixed_pr_auc": f.pr_auc, "fixed_pct": pct(nl, f.pr_auc)})
    nl3 = pd.read_csv(OUT / "null_k03.csv").pr_auc.values
    S["contrast_k3"] = [{"group": c.group, "features": c.features, "pr_auc": c.pr_auc,
                         "pct_in_null_k3": pct(nl3, c.pr_auc)} for c in con.itertuples()]

    sp = pd.read_csv(OUT / "spike_single_removals.csv")
    sr = pd.read_csv(OUT / "spike_rankings.csv")
    rows = []
    for (d, rep), g in sp.groupby(["d", "rep"]):
        base = g.loc[g.k == 0, "pr_auc"].iloc[0]
        singles = g.loc[g.k == 1].set_index("removed").pr_auc
        drop = base - singles
        order = drop.sort_values(ascending=False)  # ROAR importance ranking by drop
        rows.append({"d": d, "rep": rep, "baseline_with_spike": base,
                     "roar_drop_spike": drop["SPIKE"],
                     "roar_drop_L-valine": drop["L-valine"],
                     "roar_drop_lipoproteins": drop["lipoproteins"],
                     "roar_drop_isopropanol": drop["isopropanol"],
                     "roar_drop_Dimethyl sulfone": drop["Dimethyl sulfone"],
                     "spike_roar_rank_of_22": int(list(order.index).index("SPIKE") + 1),
                     "spike_pct_among_22_single_removals": pct(singles.values, singles["SPIKE"]),
                     "best_bio_roar_rank": int(min(list(order.index).index(b) + 1 for b in BIOLOGY_TRIO))})
    spk = pd.DataFrame(rows).merge(sr[["d", "rep", "spike_shap_rank", "recursive_step_removed"]],
                                   on=["d", "rep"])
    spk.to_csv(OUT / "spike_summary_per_rep.csv", index=False)
    agg = spk.groupby("d").agg(["median", "min", "max"])
    S["spike"] = {str(d): {c: {s: float(agg.loc[d, (c, s)]) for s in ["median", "min", "max"]}
                           for c in spk.columns if c not in ("d", "rep")} for d in agg.index}
    # Same quantities for the real features with no spike (21-feature single removals = null k=1)
    nl1 = pd.read_csv(OUT / "null_k01.csv").set_index("removed").pr_auc
    b = main["baseline_grouped"]["mean"]
    S["real_single_removal_drops"] = (b - nl1).sort_values(ascending=False).to_dict()
    S["protocol"] = {
        "cv": f"{len(REPEAT_SEEDS)}x repeated StratifiedGroupKFold(n_splits={N_SPLITS}, shuffle=True), "
              "groups=patient id from ^(\\d+)[-_](\\d+)[-_]S$, identical folds for all conditions",
        "repeat_seeds": REPEAT_SEEDS, "model_seed": "repeat_seed*100+fold",
        "null": f"k=1,2 exhaustive (21, 210 subsets); k>=3 {N_DRAWS} distinct uniform subsets, "
                f"rng seed {NULL_SEED}+k",
        "shap": "mean |SHAP| (TreeExplainer) on full data, averaged over model seeds 2026-2035",
        "spike": f"spike = d*y + N(0,1), d in {SPIKE_D}, {SPIKE_REPS} reps, rng seed {SPIKE_SEED}",
        "percentile": "% of random removals with PR-AUC <= value",
        "data_sha256": {p.name: __import__("hashlib").sha256(p.read_bytes()).hexdigest()
                        for p in [MAF_PATH, SAMPLE_SHEET_PATH]},
        "versions": {m: __import__(m).__version__ for m in ["xgboost", "shap", "sklearn", "numpy", "pandas"]},
        "python": sys.executable,
    }
    json.dump(S, open(OUT / "summary.json", "w"), indent=2, default=float)
    for c in S["curve"]:
        print(f"k={c['k']:2d} rec {c['recursive_removed']:18s} {c['recursive_pr_auc']:.4f} "
              f"pct {c['recursive_pct']:5.1f} | fixed {c['fixed_pr_auc']:.4f} pct {c['fixed_pct']:5.1f} "
              f"| null mean {c['null_mean']:.4f} [{c['null_p2_5']:.4f},{c['null_p97_5']:.4f}] n={c['n_null']}")
    print(json.dumps(S["contrast_k3"], indent=1, default=float))
    print(agg.T.to_string())
    print(json.dumps(S["real_single_removal_drops"], indent=1))


if __name__ == "__main__":
    st = sys.argv[1]
    if st == "main":
        stage_main()
    elif st == "null":
        stage_null([int(a) for a in sys.argv[2:]])
    elif st == "spike":
        stage_spike()
    elif st == "summarize":
        stage_summarize()
