"""Shared data loading, model and CV for Case 2 (ROAR on MTBLS242 obesity).

Data, label, feature transform, model hyperparameters and monotonic constraint
set are copied from Chaiporn's ROAR repo (src/data.py, src/model.py), which in
turn reuse Bridge_ai_summit_nmr_2026 Experiment A. The one deliberate change is
the CV: repeated *subject-grouped* stratified 5-fold (StratifiedGroupKFold),
with patient IDs recovered from the sample names (regex
^(\\d+)[-_](\\d+)[-_]S$ -> timepoint, patient).
"""
from __future__ import annotations

import os

import csv
import re
from pathlib import Path

import numpy as np
from sklearn.metrics import average_precision_score
from sklearn.model_selection import StratifiedGroupKFold, StratifiedKFold
from xgboost import XGBClassifier

DATA_DIR = Path(os.environ.get("MTBLS242_FORECAST_DIR", "/Users/admin/Project/Forecast/MTBLS242_forecast"))
MAF_PATH = DATA_DIR / "m_MTBLS242_v2_maf.tsv"
SAMPLE_SHEET_PATH = DATA_DIR / "s_MTBLS242.txt"

CONSTRAINT_DIRECTION = {
    "L-valine": 1, "L-leucine": 1, "L-allo-Isoleucine": 1, "L-tyrosine": 1,
    "D-phenylalanine": 1, "L-alanine": 1, "lipoproteins": 1, "L-Lactic acid": 1,
    "glycine": -1, "L-glutamine": -1, "histidine": -1,
}
KNOWN_ARTIFACTS = ["Dimethyl sulfone", "isopropanol", "methanol"]
BIOLOGY_TRIO = ["lipoproteins", "L-valine", "L-tyrosine"]  # top-3 constrained in ROAR repo ranking

N_ESTIMATORS, MAX_DEPTH, LEARNING_RATE, SUBSAMPLE, COLSAMPLE = 150, 3, 0.1, 0.9, 0.9
REPEAT_SEEDS = [42, 142, 242, 342, 442, 542, 642, 742, 842, 942]
N_SPLITS = 5
PID_RE = re.compile(r"^(\d+)[-_](\d+)[-_]S$")


def _norm(name):
    return name.replace("-", "_")


def load_dataset():
    sample_tp = {}
    with open(SAMPLE_SHEET_PATH, encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            sample_tp[_norm(row["Sample Name"])] = row["Factor Value[time point]"]
    with open(MAF_PATH, encoding="utf-8") as f:
        r = csv.reader(f, delimiter="\t")
        header = next(r)
        sample_cols = header[18:]
        names, rows = [], []
        for row in r:
            names.append(row[4])
            rows.append([float(x) if x not in ("", "NA") else np.nan for x in row[18:]])
    values = np.array(rows, dtype=float)
    keep, labels, pids, snames = [], [], [], []
    for i, col in enumerate(sample_cols):
        tp = sample_tp.get(_norm(col))
        if tp in ("preop", "12 months after surgery"):
            m = PID_RE.match(col)
            assert m, col
            keep.append(i)
            labels.append(1 if tp == "preop" else 0)
            pids.append(int(m.group(2)))
            snames.append(col)
    X = np.log1p(values[:, keep].T)
    y = np.array(labels, dtype=int)
    groups = np.array(pids)
    assert X.shape == (177, 21) and y.sum() == 106 and not np.isnan(X).any()
    return X, y, groups, names, snames


def constraints(names):
    return tuple(CONSTRAINT_DIRECTION.get(n, 0) for n in names)


def make_model(mono, seed):
    return XGBClassifier(
        n_estimators=N_ESTIMATORS, max_depth=MAX_DEPTH, learning_rate=LEARNING_RATE,
        subsample=SUBSAMPLE, colsample_bytree=COLSAMPLE, monotone_constraints=mono,
        eval_metric="logloss", random_state=seed, n_jobs=1,
    )


def make_splits(y, groups, grouped=True, repeat_seeds=REPEAT_SEEDS):
    """Precompute (seed, fold, train, test) so every condition uses identical folds."""
    out = []
    for seed in repeat_seeds:
        if grouped:
            cv = StratifiedGroupKFold(n_splits=N_SPLITS, shuffle=True, random_state=seed)
            it = cv.split(np.zeros(len(y)), y, groups)
        else:
            cv = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=seed)
            it = cv.split(np.zeros(len(y)), y)
        for fold, (tr, te) in enumerate(it):
            out.append((seed, fold, tr, te))
    return out


def cv_scores(X, y, mono, splits):
    s = []
    for seed, fold, tr, te in splits:
        m = make_model(mono, seed * 100 + fold)
        m.fit(X[tr], y[tr])
        s.append(average_precision_score(y[te], m.predict_proba(X[te])[:, 1]))
    return np.array(s)


def shap_rank(X, y, names, seeds=tuple(range(2026, 2036))):
    """Mean |SHAP| on full data, averaged over 10 model seeds (TreeExplainer).
    Returns names sorted by importance and the importance values."""
    import shap
    imp = np.zeros(X.shape[1])
    mono = constraints(names)
    for sd in seeds:
        m = make_model(mono, sd).fit(X, y)
        sv = shap.TreeExplainer(m).shap_values(X)
        imp += np.abs(sv).mean(axis=0)
    imp /= len(seeds)
    order = np.argsort(-imp, kind="stable")
    return [names[i] for i in order], imp[order]
