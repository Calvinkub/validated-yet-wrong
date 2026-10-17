"""Case 4: what does the MTBLS242 "obese vs non-obese" label encode?

Facts from the sample sheet and the grouped-vs-naive CV comparison behind the
paper's Case 4 numbers. Same data, model, features and constraints as Case 2
(common.py there); only the CV differs between the two arms.

  label 1 = preoperative sample (106), label 0 = 12-month post-surgery (71)
  grouped arm : repeated StratifiedGroupKFold, groups = patient ID
  naive arm   : repeated StratifiedKFold (same repeat seeds)

Metrics per outer fold: ROC-AUC and PR-AUC (average precision). We report the
mean over folds, the SD of the 10 repeat-level means, and pooled out-of-fold
ROC-AUC per repeat.

Run: MTBLS242_FORECAST_DIR=<folder with MTBLS242 files> python case4.py
"""
import json, os, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "case2"))
sys.dont_write_bytecode = True
import numpy as np
import sklearn, xgboost
from sklearn.metrics import average_precision_score, roc_auc_score
import common as C

X, y, groups, names, snames = C.load_dataset()
mono = C.constraints(names)

pre = set(groups[y == 1]); post = set(groups[y == 0])
facts = {
    "samples": int(len(y)), "preop": int(y.sum()), "month12": int((1 - y).sum()),
    "patients_preop": len(pre), "patients_12m": len(post),
    "patients_in_both_classes": len(pre & post),
    "share_of_samples_from_both_class_patients": float(np.isin(groups, list(pre & post)).mean()),
}
print(facts)

def run(grouped):
    splits = C.make_splits(y, groups, grouped=grouped)
    rows, pooled = [], {}
    for seed, fold, tr, te in splits:
        m = C.make_model(mono, seed * 100 + fold).fit(X[tr], y[tr])
        p = m.predict_proba(X[te])[:, 1]
        rows.append((seed, fold, roc_auc_score(y[te], p), average_precision_score(y[te], p)))
        pooled.setdefault(seed, np.full(len(y), np.nan))[te] = p
    rows = np.array(rows)
    rep = {s: rows[rows[:, 0] == s] for s in C.REPEAT_SEEDS}
    roc_rep = np.array([r[:, 2].mean() for r in rep.values()])
    pr_rep = np.array([r[:, 3].mean() for r in rep.values()])
    pooled_roc = np.array([roc_auc_score(y, p) for p in pooled.values()])
    return {
        "roc_auc_mean_over_folds": float(rows[:, 2].mean()),
        "roc_auc_sd_repeat_means": float(roc_rep.std(ddof=1)),
        "pr_auc_mean_over_folds": float(rows[:, 3].mean()),
        "pr_auc_sd_repeat_means": float(pr_rep.std(ddof=1)),
        "pooled_oof_roc_auc_mean": float(pooled_roc.mean()),
        "n_outer_folds": int(len(rows)),
        "min_test_patients_both_classes_in_grouped_fold": None,
    }

def single_seed_reported_cv():
    """Bridge poster protocol: StratifiedKFold(5, shuffle, seed 42), mean fold ROC-AUC."""
    sp = C.make_splits(y, groups, grouped=False, repeat_seeds=[42])
    r = []
    for seed, fold, tr, te in sp:
        m = C.make_model(mono, seed * 100 + fold).fit(X[tr], y[tr])
        r.append(roc_auc_score(y[te], m.predict_proba(X[te])[:, 1]))
    return {"mean_fold_roc_auc": float(np.mean(r)), "sd_folds": float(np.std(r, ddof=1))}

t = time.time()
out = {"facts": facts, "grouped": run(True), "naive": run(False),
       "single_seed_42_naive_5fold": single_seed_reported_cv(),
       "versions": {"xgboost": xgboost.__version__, "sklearn": sklearn.__version__, "numpy": np.__version__},
       "repeat_seeds": C.REPEAT_SEEDS, "n_splits": C.N_SPLITS, "seconds": round(time.time() - t, 1)}
for arm in ("grouped", "naive"):
    out[arm].pop("min_test_patients_both_classes_in_grouped_fold")
(HERE / "results").mkdir(exist_ok=True)
(HERE / "results" / "summary_case4.json").write_text(json.dumps(out, indent=2))
print(json.dumps(out, indent=2))
