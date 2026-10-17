"""Case 4 (MTBLS242 "obese vs non-obese"): label-provenance audit and the
numbers quoted for it in the paper.

The task is the same 177-sample preop vs 12-month contrast used in Case 2, so
data loading, patient IDs, model and folds are imported from ../case2/common.py.

Parts
    audit     what the label encodes, from the sample sheet alone:
              patients per class, patients in both classes, which columns exist
              (is there any BMI / weight / clinical column?)
    original  re-run of the originally reported result: Bridge_ai_summit_nmr_2026
              commit 17e18df, exp_obesity_nmr_mtbls242.ipynb (unconstrained XGBoost,
              one stratified 5-fold split, seed 42, ROC-AUC of the mean
              interpolated ROC curve; reported 0.973 +/- 0.020)
    cv        grouped vs naive CV, 10 x repeated 5-fold on the Case 2 folds,
              for both the original unconstrained model and the Case 2
              monotonic model; ROC-AUC and PR-AUC = mean over 50 folds

    python case4.py            # all parts -> results/summary_case4.json
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
import platform
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "case2"))

import numpy as np  # noqa: E402
import sklearn  # noqa: E402
import xgboost  # noqa: E402
from sklearn.metrics import auc, average_precision_score, roc_auc_score, roc_curve  # noqa: E402
from sklearn.model_selection import StratifiedKFold  # noqa: E402
from xgboost import XGBClassifier  # noqa: E402

from common import (  # noqa: E402
    MAF_PATH, PID_RE, REPEAT_SEEDS, SAMPLE_SHEET_PATH,
    constraints, load_dataset, make_model, make_splits,
)

RESULTS = HERE / "results"

# Copied verbatim from Bridge_ai_summit_nmr_2026@17e18df, exp_obesity_nmr_mtbls242.ipynb
ORIGINAL_XGB = dict(n_estimators=200, max_depth=3, learning_rate=0.05, subsample=0.8,
                    colsample_bytree=0.8, reg_lambda=1.0, eval_metric="logloss",
                    random_state=42, n_jobs=1)
ORIGINAL_SEED = 42
CLINICAL_RE = re.compile(r"bmi|body|weight|mass|height|age|sex|gender|diabet|glucose|insulin"
                         r"|procedure|surgery|bypass|sleeve|medic|drug|fast", re.I)


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


# --------------------------------------------------------------------------
# audit
# --------------------------------------------------------------------------

def audit():
    # csv.reader, not DictReader: the ISA-Tab sheet repeats "Term Source REF" and
    # "Term Accession Number", which DictReader would collapse
    with open(SAMPLE_SHEET_PATH, encoding="utf-8") as f:
        columns, *rows = list(csv.reader(f, delimiter="\t"))
    i_name = columns.index("Sample Name")
    i_tp = columns.index("Factor Value[time point]")

    tp_counts = defaultdict(int)
    patients = defaultdict(set)          # time point -> patient ids
    unmatched = []
    for r in rows:
        tp = r[i_tp]
        tp_counts[tp] += 1
        m = PID_RE.match(r[i_name])
        if m:
            patients[tp].add(int(m.group(2)))
        else:
            unmatched.append(r[i_name])

    pre, post = patients["preop"], patients["12 months after surgery"]
    # Columns whose value varies across samples, and any column that could hold a
    # clinical covariate (matched by name)
    n_distinct = [len({r[i] for r in rows}) for i in range(len(columns))]
    varying = [f"{i}:{c} ({n_distinct[i]} values)" for i, c in enumerate(columns) if n_distinct[i] > 1]
    clinical_values = {c: sorted({r[i] for r in rows})[:10]
                       for i, c in enumerate(columns) if CLINICAL_RE.search(c)}
    with open(MAF_PATH, encoding="utf-8") as f:
        maf_names = [row[4] for row in csv.reader(f, delimiter="\t")][1:]

    return {
        "samples_per_time_point": dict(sorted(tp_counts.items())),
        "sample_names_not_matching_pid_regex": unmatched,
        "patients_preop": len(pre),
        "patients_12m": len(post),
        "patients_in_both_classes": len(pre & post),
        "patients_12m_without_preop": len(post - pre),
        "patients_preop_only": len(pre - post),
        "sample_sheet_columns": len(columns),
        "varying_columns": varying,
        "columns_with_clinical_names": clinical_values,
        "maf_features": maf_names,
    }


# --------------------------------------------------------------------------
# original reported result
# --------------------------------------------------------------------------

def original(X, y):
    """Bridge@17e18df cell 4/6: one StratifiedKFold(5, shuffle, 42) split; the
    reported number is auc() of the fold-mean ROC interpolated on 200 points."""
    skf = StratifiedKFold(5, shuffle=True, random_state=ORIGINAL_SEED)
    mean_fpr = np.linspace(0, 1, 200)
    tprs, fold_auc = [], []
    for tr, te in skf.split(X, y):
        p = XGBClassifier(**ORIGINAL_XGB).fit(X[tr], y[tr]).predict_proba(X[te])[:, 1]
        fpr, tpr, _ = roc_curve(y[te], p)
        t = np.interp(mean_fpr, fpr, tpr)
        t[0] = 0.0
        tprs.append(t)
        fold_auc.append(roc_auc_score(y[te], p))
    mean_tpr = np.mean(tprs, axis=0)
    mean_tpr[-1] = 1.0
    return {
        "source": "Bridge_ai_summit_nmr_2026@17e18df exp_obesity_nmr_mtbls242.ipynb",
        "reported": {"roc_auc_mean_curve": 0.973, "sd_folds": 0.020,
                     "fold_auc": [0.9416, 0.9619, 0.9932, 0.9864, 0.9932]},
        "rerun": {"roc_auc_mean_curve": float(auc(mean_fpr, mean_tpr)),
                  "sd_folds": float(np.std(fold_auc)),
                  "fold_auc": [round(float(a), 4) for a in fold_auc],
                  "mean_fold_auc": float(np.mean(fold_auc))},
        "note": "sample order here is MAF column order; the notebook read a separately "
                "parsed .npz, so fold membership can differ",
    }


def original_monotonic(X, y, names):
    """Bridge@cb27e89 (unchanged at 0088e38): same split and hyperparameters plus
    the literature monotonic constraints; reported mean of fold PR-AUC 0.984."""
    skf = StratifiedKFold(5, shuffle=True, random_state=ORIGINAL_SEED)
    params = {**ORIGINAL_XGB, "monotone_constraints": constraints(names)}
    fold_ap = []
    for tr, te in skf.split(X, y):
        p = XGBClassifier(**params).fit(X[tr], y[tr]).predict_proba(X[te])[:, 1]
        fold_ap.append(average_precision_score(y[te], p))
    return {
        "source": "Bridge_ai_summit_nmr_2026@0088e38 (= cb27e89) exp_obesity_nmr_mtbls242.ipynb",
        "reported": {"pr_auc_mean_folds": 0.984, "sd_folds": 0.014,
                     "fold_pr_auc": [0.9676, 0.9664, 0.9940, 0.9978, 0.9918]},
        "rerun": {"pr_auc_mean_folds": float(np.mean(fold_ap)),
                  "sd_folds": float(np.std(fold_ap)),
                  "fold_pr_auc": [round(float(a), 4) for a in fold_ap]},
    }


# --------------------------------------------------------------------------
# grouped vs naive CV
# --------------------------------------------------------------------------

def cv_metrics(X, y, splits, model_fn):
    roc, pr = [], []
    for seed, fold, tr, te in splits:
        p = model_fn(seed * 100 + fold).fit(X[tr], y[tr]).predict_proba(X[te])[:, 1]
        roc.append(roc_auc_score(y[te], p))
        pr.append(average_precision_score(y[te], p))
    roc, pr = np.array(roc), np.array(pr)
    return {"roc_auc": float(roc.mean()), "roc_auc_sd_folds": float(roc.std()),
            "pr_auc": float(pr.mean()), "pr_auc_sd_folds": float(pr.std()),
            "n_folds": len(roc)}


def cv(X, y, groups, names):
    mono = constraints(names)
    models = {
        "original_unconstrained": lambda s: XGBClassifier(**{**ORIGINAL_XGB, "random_state": s}),
        "case2_monotonic": lambda s: make_model(mono, s),
    }
    out = {}
    for grouped in (True, False):
        splits = make_splits(y, groups, grouped=grouped)
        if grouped:  # no patient on both sides of any split
            for _, _, tr, te in splits:
                assert not set(groups[tr]) & set(groups[te])
        else:        # how many test samples have their own patient's other visit in training
            shared = [np.isin(groups[te], groups[tr]).mean() for _, _, tr, te in splits]
            out["naive_share_test_with_patient_in_train"] = float(np.mean(shared))
        for name, fn in models.items():
            out[f"{name}|{'grouped' if grouped else 'naive'}"] = cv_metrics(X, y, splits, fn)
    return out


# --------------------------------------------------------------------------

def main():
    os.environ.setdefault("OMP_NUM_THREADS", "1")
    X, y, groups, names, _ = load_dataset()
    res = {
        "audit": audit(),
        "original": original(X, y),
        "original_monotonic": original_monotonic(X, y, names),
        "cv": cv(X, y, groups, names),
        "setup": {
            "n_samples": int(len(y)), "n_preop_label1": int(y.sum()),
            "n_features": int(X.shape[1]), "transform": "log1p",
            "cv": "10 x 5-fold, seeds " + ",".join(map(str, REPEAT_SEEDS))
                  + "; grouped = StratifiedGroupKFold on patient id, naive = StratifiedKFold;"
                  " folds identical to Case 2; model seed = repeat_seed*100+fold",
            "data_sha256": {MAF_PATH.name: sha256(MAF_PATH),
                            SAMPLE_SHEET_PATH.name: sha256(SAMPLE_SHEET_PATH)},
            "versions": {"python": platform.python_version(), "numpy": np.__version__,
                         "sklearn": sklearn.__version__, "xgboost": xgboost.__version__,
                         "platform": platform.platform()},
        },
    }
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "summary_case4.json").write_text(json.dumps(res, indent=2), encoding="utf-8")

    a, o, c = res["audit"], res["original"]["rerun"], res["cv"]
    print(f"patients: preop {a['patients_preop']}, 12m {a['patients_12m']}, "
          f"both {a['patients_in_both_classes']}, preop only {a['patients_preop_only']}")
    print(f"varying sample-sheet columns: {a['varying_columns']}")
    print(f"clinical-named columns: {a['columns_with_clinical_names']}")
    print(f"original re-run: ROC-AUC {o['roc_auc_mean_curve']:.3f} +/- {o['sd_folds']:.3f} "
          f"folds {o['fold_auc']}")
    om = res["original_monotonic"]["rerun"]
    print(f"original monotonic re-run: PR-AUC {om['pr_auc_mean_folds']:.4f} +/- {om['sd_folds']:.3f} "
          f"folds {om['fold_pr_auc']}")
    for k, v in c.items():
        if isinstance(v, dict):
            print(f"{k:40s} ROC-AUC {v['roc_auc']:.4f}  PR-AUC {v['pr_auc']:.4f}")
    print(f"naive CV: share of test samples whose patient is in training = "
          f"{c['naive_share_test_with_patient_in_train']:.3f}")


if __name__ == "__main__":
    main()
