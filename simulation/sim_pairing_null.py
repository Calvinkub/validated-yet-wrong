"""Simulation study for Case 1: when does label permutation accept a manufactured outcome?

Each simulated subject has a persistent true level mu (11 outcome markers) plus
transient noise at each visit. The outcome is a change-score "responder" rule
(>= K of 11 markers move in their expected direction), built from the same
baseline values the model uses as features - the design of the MTBLS242
forecast. Ten auxiliary features z are also observed.

Scenarios
    gamma = 0  : no subject-level forecastable response. Any baseline-to-label
                 association is regression to the mean (RTM).
    gamma > 0  : true individual change = gamma * g_i, with g_i a linear
                 function of z. This is real, forecastable signal.

Tests per dataset (alpha = 0.05)
    perm_raw   : raw-change outcome, CV ridge score, label permutation.
    pair_null  : raw-change outcome, pairing-destroyed null on lift
                 (shuffle which follow-up belongs to whom, rebuild the outcome,
                 refit). Mirrors controls.pairing_destroyed_null in
                 Calvinkub/mtbls242-forecast-honest.
    perm_resid : outcome from change residualised on its own baseline inside
                 each training fold, CV ridge score, label permutation.
    perm_resid_joint : same, but each marker's change is residualised on all
                 11 baselines jointly.

Reliability r = var(persistent) / var(observed). r = 0.23 reproduces the
median baseline-change correlation of -0.62 seen in MTBLS242.

Run:   python sim_pairing_null.py            (full grid, writes results/)
       python sim_pairing_null.py --check    (sanity: pure-noise labels)
"""

from __future__ import annotations

import argparse
import itertools
import json
import time
from multiprocessing import Pool
from pathlib import Path

import numpy as np

P_MARKERS = 11
Q_AUX = 10
K_RESPONDER = 6
FACTOR_RHO = 0.3
RIDGE_LAMBDA = 10.0
N_FOLDS = 5
N_NULL = 200
ALPHA = 0.05

N_GRID = [50, 100, 200, 500]
R_GRID = [0.25, 0.5, 0.75]
GAMMA_GRID = [0.0, 0.25, 0.5]
N_DATASETS = 1000
SEED = 20261011

OUT = Path(__file__).resolve().parent / "results"


# --------------------------------------------------------------------------
# Data generation
# --------------------------------------------------------------------------

def simulate(n, r, gamma, rng):
    signs = rng.choice([-1.0, 1.0], size=P_MARKERS)
    factor = rng.standard_normal((n, 1))
    mu = np.sqrt(FACTOR_RHO) * factor + np.sqrt(1 - FACTOR_RHO) * rng.standard_normal((n, P_MARKERS))
    z = rng.standard_normal((n, Q_AUX))
    w = rng.standard_normal(Q_AUX)
    g = z @ w / np.linalg.norm(w)  # unit-variance forecastable propensity
    true_change = gamma * g[:, None] * signs[None, :]
    x0 = np.sqrt(r) * mu + np.sqrt(1 - r) * rng.standard_normal((n, P_MARKERS))
    x12 = np.sqrt(r) * (mu + true_change) + np.sqrt(1 - r) * rng.standard_normal((n, P_MARKERS))
    return x0, x12, z, signs, g


def responder(change, signs):
    return ((change * signs) > 0).sum(axis=1) >= K_RESPONDER


# --------------------------------------------------------------------------
# Scoring
# --------------------------------------------------------------------------

def average_precision(y, score):
    """Row-wise AP. y: (n,) or (reps, n); score: (n,) or matching (reps, n)."""
    y = np.atleast_2d(y)
    score = np.broadcast_to(np.atleast_2d(score), y.shape)
    order = np.argsort(-score, axis=1, kind="mergesort")
    y = np.take_along_axis(y, order, axis=1).astype(float)
    pos = y.sum(axis=1)
    precision = np.cumsum(y, axis=1) / np.arange(1, y.shape[1] + 1)
    with np.errstate(invalid="ignore", divide="ignore"):
        return (precision * y).sum(axis=1) / pos


def make_folds(n, rng):
    fold_of = rng.permutation(np.arange(n) % N_FOLDS)
    return [(np.flatnonzero(fold_of != f), np.flatnonzero(fold_of == f)) for f in range(N_FOLDS)]


def ridge_smoothers(features, folds):
    """Per fold, the matrix H with test_score = H @ (y_train - mean(y_train)).

    Ridge is linear in the labels, so the same H scores every null replicate.
    """
    smoothers = []
    for train, test in folds:
        mean = features[train].mean(axis=0)
        sd = features[train].std(axis=0)
        sd[sd < 1e-12] = 1.0
        xt = (features[train] - mean) / sd
        xs = (features[test] - mean) / sd
        gram = xt.T @ xt + RIDGE_LAMBDA * np.eye(xt.shape[1])
        smoothers.append(xs @ np.linalg.solve(gram, xt.T))
    return smoothers


def cv_scores(labels, folds, smoothers):
    """Out-of-fold ridge scores. labels: (n,) or (reps, n). Returns same shape."""
    labels = np.atleast_2d(labels).astype(float)
    out = np.empty_like(labels)
    for (train, test), h in zip(folds, smoothers):
        yt = labels[:, train]
        out[:, test] = (yt - yt.mean(axis=1, keepdims=True)) @ h.T
    return out


def perm_pvalue(labels, observed, rng, rescore):
    """Label permutation with the model refit on every permuted label vector.

    Holding the out-of-fold scores fixed and permuting only the labels is not a
    valid test: the scores were fitted to the real labels. Our --check run showed
    a 9.7% false-positive rate at alpha 0.05 for that shortcut. Refitting
    (Ojala & Garriga test 1) restores the nominal rate.
    """
    perms = np.array([rng.permutation(labels) for _ in range(N_NULL)])
    null = average_precision(perms, rescore(perms))
    return (1 + np.sum(null >= observed)) / (1 + N_NULL)


def residualised_labels(x0, x12, signs, folds, joint):
    """Per fold: regress change on baseline using train rows only, label both sides.

    joint=False: change_j ~ a_j + b_j * x0_j (each marker on its own baseline).
    joint=True:  change_j ~ a_j + B_j . x0   (each marker on every baseline).
    The per-marker version leaves residual change correlated with the other
    markers' baselines whenever the markers are correlated, so it does not
    remove regression to the mean from a multi-marker outcome.
    """
    change = x12 - x0
    train_labels, test_labels = [], []
    for train, test in folds:
        if joint:
            design = np.hstack([np.ones((len(x0), 1)), x0])
            coef, *_ = np.linalg.lstsq(design[train], change[train], rcond=None)
            resid = change - design @ coef
        else:
            xm = x0[train].mean(axis=0)
            cm = change[train].mean(axis=0)
            slope = ((x0[train] - xm) * (change[train] - cm)).sum(0) / ((x0[train] - xm) ** 2).sum(0)
            resid = change - (cm - slope * xm) - slope * x0
        lab = responder(resid, signs)
        train_labels.append(lab[train])
        test_labels.append(lab[test])
    return train_labels, test_labels


def residualised_test(x0, x12, signs, folds, smoothers, rng, joint):
    """Residualised outcome, CV ridge score, label permutation with refit.

    Train labels are a fold-specific function of the data, so the null permutes
    each fold's training labels and refits; held-out labels stay fixed.
    """
    n = len(x0)
    tr_lab, te_lab = residualised_labels(x0, x12, signs, folds, joint)
    score = np.empty(n)
    y = np.empty(n, dtype=bool)
    for (train, test), h, lt, ls in zip(folds, smoothers, tr_lab, te_lab):
        lt = lt.astype(float)
        score[test] = h @ (lt - lt.mean())
        y[test] = ls
    if not 2 <= y.sum() < n:
        return np.nan
    observed = average_precision(y, score)[0]
    null = np.empty(N_NULL)
    for b in range(N_NULL):
        s_b = np.empty(n)
        for (train, test), h, lt in zip(folds, smoothers, tr_lab):
            lt = rng.permutation(lt).astype(float)
            s_b[test] = h @ (lt - lt.mean())
        null[b] = average_precision(y, s_b)[0]
    return (1 + np.sum(null >= observed)) / (1 + N_NULL)


# --------------------------------------------------------------------------
# One dataset
# --------------------------------------------------------------------------

def run_one(args):
    n, r, gamma, seed = args
    rng = np.random.default_rng(seed)
    x0, x12, z, signs, g = simulate(n, r, gamma, rng)
    features = np.hstack([x0, z])
    folds = make_folds(n, rng)
    smoothers = ridge_smoothers(features, folds)

    y = responder(x12 - x0, signs)
    if y.sum() < 2 or y.all():
        return None
    score = cv_scores(y, folds, smoothers)[0]
    ap = average_precision(y, score)[0]
    obs_lift = ap / y.mean()

    p_perm_raw = perm_pvalue(y, ap, rng, lambda labs: cv_scores(labs, folds, smoothers))

    # Pairing-destroyed null: shuffle follow-ups across subjects, rebuild outcome.
    null_y = np.array([responder(x12[rng.permutation(n)] - x0, signs) for _ in range(N_NULL)])
    ok = (null_y.sum(axis=1) >= 2) & ~null_y.all(axis=1)
    null_y = null_y[ok]
    null_ap = average_precision(null_y, cv_scores(null_y, folds, smoothers))
    null_lift = null_ap / null_y.mean(axis=1)
    p_pair = (1 + np.sum(null_lift >= obs_lift)) / (1 + len(null_lift))

    p_resid = residualised_test(x0, x12, signs, folds, smoothers, rng, joint=False)
    p_resid_joint = residualised_test(x0, x12, signs, folds, smoothers, rng, joint=True)

    return {
        "n": n, "r": r, "gamma": gamma, "seed": seed,
        "prevalence": float(y.mean()), "ap": float(ap), "lift": float(obs_lift),
        "null_lift_median": float(np.median(null_lift)),
        "oracle_lift": float(average_precision(y, g)[0] / y.mean()),
        "corr_base_change": float(np.median([np.corrcoef(x0[:, j], x12[:, j] - x0[:, j])[0, 1] for j in range(P_MARKERS)])),
        "p_perm_raw": float(p_perm_raw), "p_pair": float(p_pair), "p_perm_resid": float(p_resid), "p_perm_resid_joint": float(p_resid_joint),
    }


def run_check(reps=1000):
    """Labels independent of everything: label permutation must reject ~5%."""
    rng = np.random.default_rng(SEED)
    rejections = 0
    for _ in range(reps):
        n = 100
        features = rng.standard_normal((n, P_MARKERS + Q_AUX))
        y = rng.random(n) < 0.45
        folds = make_folds(n, rng)
        smoothers = ridge_smoothers(features, folds)
        rescore = lambda labs: cv_scores(labs, folds, smoothers)
        ap = average_precision(y, rescore(y))[0]
        rejections += perm_pvalue(y, ap, rng, rescore) <= ALPHA
    print(f"pure-noise rejection rate: {rejections / reps:.3f} (expect ~{ALPHA})")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--datasets", type=int, default=N_DATASETS)
    args = parser.parse_args()
    if args.check:
        run_check()
        return

    OUT.mkdir(exist_ok=True)
    jobs = [
        (n, r, gamma, SEED + i * 100_003 + d)
        for i, (n, r, gamma) in enumerate(itertools.product(N_GRID, R_GRID, GAMMA_GRID))
        for d in range(args.datasets)
    ]
    start = time.time()
    with Pool() as pool:
        rows = [row for row in pool.imap_unordered(run_one, jobs, chunksize=20) if row]
    with open(OUT / "sim_rows.jsonl", "w") as fh:
        for row in rows:
            fh.write(json.dumps(row) + "\n")
    meta = {
        "seed": SEED, "datasets_per_cell": args.datasets, "kept": len(rows), "jobs": len(jobs),
        "P_MARKERS": P_MARKERS, "Q_AUX": Q_AUX, "K_RESPONDER": K_RESPONDER,
        "FACTOR_RHO": FACTOR_RHO, "RIDGE_LAMBDA": RIDGE_LAMBDA, "N_FOLDS": N_FOLDS,
        "N_NULL": N_NULL, "ALPHA": ALPHA, "seconds": round(time.time() - start, 1),
        "numpy": np.__version__,
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2))
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
