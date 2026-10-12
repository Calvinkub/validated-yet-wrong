# Case 1 (MTBLS242 responder forecast): reproduction, joint residualisation, null figure

All numbers come from `case1.py` (this directory) and the honest repo's own script. Machine-readable
values: `results/summary_case1.json`. Raw nulls: `results/legacy_nulls.npz`, `results/joint_nulls.npz`,
chunk cache `results/cache/`.

## Provenance

- Honest repo: `/Users/admin/Project/Forecast/MTBLS242_forecast`, branch `honest-evaluation`, commit
  `637a58efc70005e723e11bc787bd486db42fd0a9`. Not modified, nothing committed. `case1.py` imports
  `controls.py`, `forecast_responder_pr_auc.py`, `monotone_logistic.py`, `forecast_mtbls242.py` by path.
- Data: repo files `m_MTBLS242_v2_maf.tsv`, `s_MTBLS242.txt`; n = 71 paired subjects, log1p abundances.
- Seed 42 throughout (repo `SEED`). CV: `controls.repeated_stratified_cv`, 20 repeats x 5-fold,
  stratified on the full-sample outcome, inner 4-fold l2 selection on training rows only (repo `select_l2`),
  sign-constrained logistic (L-BFGS-B), 100 folds, 100% convergence in every design.
- Python: `/Users/admin/miniconda3/envs/superaiss6/bin/python`, 4 worker processes, single-threaded BLAS.

Commands (from this directory):

```
python case1.py --stage repo      # runs the repo script itself: corrected -> results/repo_corrected,
                                  #   legacy (--legacy-outcome --include-artifacts) -> results/repo_legacy
python case1.py --stage compute --budget 540   # chunked refit nulls; re-run until "all chunks complete"
python case1.py --stage report    # summary_case1.json + figures/case1_nulls.{pdf,png}
```

## Task 1: reproduction of the documented numbers

Run of the repo script (`results/repo_corrected/summary_pr_auc.json`) and my re-implementation in
`case1.py` (same CV loop; `permarker` design) agree to the last digit.

| Quantity | Documented | Reproduced |
|---|---|---|
| Model PR-AUC (20x5 CV), corrected | 0.483 | 0.4831 (sd across repeats 0.0267) |
| Prevalence | 0.437 (31/71) | 0.4366 (31/71) |
| Learn-nothing scorer PR-AUC | 0.522 | 0.5224 |
| Model minus scorer, 95% CI (bootstrap over 20 repeat means) | -0.039 [-0.058, -0.023] | -0.0393 [-0.0575, -0.0229] |
| Pairing-destroyed null lift, median / p95 | 1.04 / 1.24 | 1.039 / 1.226 |
| Permutation p (repo method: fixed pooled repeat-1 predictions, 2000 perms) | 0.894 | 0.8936 |
| Legacy PR-AUC (raw change, >=9/11, 21 features) | 0.671 (original) / 0.683 (CORRECTION.md) | 0.6835 |
| Legacy lift | 1.57x | 1.565x |
| Legacy pairing-destroyed null lift median / p95 | 2.04x / 2.51x | 2.039x / 2.511x |
| Legacy label-permutation p (repo method, 2000 perms) | 0.002 | 0.0020 |

No mismatch, with one note: the original 0.671 is not reproducible; the current repo code gives 0.683 for
the legacy design (CORRECTION.md says the same: converged solver, repeated CV). Note also that the repo's
p = 0.894 and p = 0.002 use a fixed-score permutation of pooled repeat-1 held-out predictions, i.e. the model
is not refit per permutation. The joint-design p below refits.

## Task 2: joint residualisation (change_j regressed on all 11 marker baselines, training fold only)

Same rule otherwise: >=6/11 markers improving, 3 contaminants dropped (18 features), same folds scheme.
Implementation: `case1.joint_outcome` (OLS with intercept on all 11 baselines, fitted on training rows,
applied to held-out rows). Held-out labels in each fold use that fold's training fit.

Diagnostic (full-sample, in-sample fit, `coupling_diagnostics` in the JSON): median |corr| between each
marker's residual change and the *other* markers' baselines is 0.087 (max 0.351) after per-marker
residualisation, versus about 3e-15 after joint residualisation (zero by construction), versus 0.163 (max 0.574) for raw change.

| Quantity | Per-marker (repo) | Joint (new) |
|---|---|---|
| Responders / prevalence (full-sample labels) | 31 / 0.437 | **37 / 0.521** |
| Model PR-AUC, mean over 20 repeats | 0.483 | **0.554** (sd across repeats 0.046) |
| Lift over prevalence | 1.11x | 1.06x |
| Learn-nothing scorer PR-AUC | 0.522 | **0.589** |
| Gap model - scorer, repeat-bootstrap CI (repo method, 5000 draws) | -0.039 [-0.058, -0.023] | -0.036 [-0.054, -0.017] |
| Gap model - scorer, paired subject bootstrap (2000 draws, seed 42; pooled held-out AP per repeat) | -0.042 [-0.149, +0.052] | **-0.037 [-0.111, +0.037]** |
| Label-permutation p, model refit per permutation | 1.000 (200 perms) | **1.000 (1000 perms; 1000/1000 nulls >= observed)** |
| Permutation null median / p95 of the statistic | 0.532 / 0.551 | 0.595 / 0.613 |
| Pairing-destroyed null lift (no-learning scorer, 500 reps) median / p95 | 1.039 / 1.226 | 1.045 / 1.207 |
| Observed lift inside pairing null? | yes | yes (1.062) |

Note on the permutation row: p = (1 + #{null >= observed}) / (1 + B) = 1.000 means every one of the 1000 null
values was at or above the observed statistic. The observed statistic (0.554) sits below the null median (0.595).

Refit permutation scheme (`_perm_worker`): in every CV fold, permute the training labels, rerun the inner l2
selection and the fit, score the fixed held-out labels; statistic = mean over repeats of mean fold AP;
per-permutation RNG `default_rng([42, design_code, b])`. Permutation counts: joint 1000, legacy 1000,
per-marker 200 (reduced to save time).

Pairing-null for joint used the repo's no-learning scorer (`controls.pairing_destroyed_null`, joint outcome
rebuilt with each shuffle, 500 reps, seed 42), not a refit of the model.

### Why the subject-bootstrap CI differs from the repo CI

The repo CI resamples the 20 repeat means, which reflects CV-resampling noise, not subject sampling; it is
too narrow for a claim about the population. The subject bootstrap resamples the 71 subjects (same draw
applied to all 20 repeats' pooled held-out predictions). With it, the model-minus-scorer gap is not
distinguishable from zero in any design (CI spans 0). Pooled AP is lower than fold-mean AP (e.g. joint
0.497 vs 0.554) because pooling changes the metric; the gap, not the level, is what is bootstrapped.

## Task 3: figure `figures/case1_nulls.pdf` / `.png` (300 dpi, 3.5 x 3.3 in)

Original withdrawn design (raw change, >=9/11, 21 features incl. contaminants).

- (a) Label-permutation null of PR-AUC with model refit, 1000 permutations (recomputed here): observed 0.683
  vs null median 0.568, p = 0.001 (no null value reached it; floor 1/1001). The repo's fixed-score version gives 0.002.
- (b) Pairing-destroyed null of lift (repo method, no-learning scorer, 500 reps): null median 2.04x, p95 2.51x,
  observed 1.57x. The observed lift (1.565x) is below 499 of 500 null replicates (null minimum 1.552x, null 1st percentile 1.62x).
- Null draws in (a) were recomputed (the repo saved nulls only for the corrected design); (b) was recomputed with the same seed
  and reproduces the repo's median and p95 exactly.
- Extra check not in the figure: pairing-destroyed null with the *full model* refit (500 reps) gives lift median 1.99x,
  p95 2.33x, p(null >= observed) = 0.986. The null's median prevalence is 0.352 vs 0.437 observed, which is why lift, not raw AP, is compared.

## What is and is not shown

Shown:
- The repo's corrected numbers reproduce exactly, and so do the legacy ones (0.683, not the original 0.671).
- Under joint residualisation the conclusion is unchanged: model PR-AUC 0.554 is below the no-learning scorer
  (0.589), below the refit permutation null median, and observed lift 1.06x is inside the pairing-destroyed null
  (median 1.05x). No evidence of forecasting skill beyond regression to the mean in this cohort at n = 71.
- The withdrawn design passes a permutation test (p about 0.001) while scoring below its own pairing-destroyed null.

Not shown:
- Not shown that pre-operative NMR cannot forecast response; only that this cohort and outcome do not demonstrate it.
- The joint design was not re-tuned: the >=6/11 threshold gives prevalence 0.521 (37/71) rather than 0.437, so
  PR-AUC levels are not directly comparable with the per-marker design (compare lifts and gaps).
- The permutation null for the constrained model sits *above* the observed statistic in the corrected designs. A plausible
  reason is that the sign constraints force a literature-signed baseline score even when labels are permuted, which
  inherits whatever edge the outcome gives such a score; I did not test this explanation. It does mean a one-sided
  "p = 1.0" here is a statement that the model does worse than a refit model on shuffled labels, not a calibrated p-value.
- The subject-bootstrap CI for the gap spans zero, so "model worse than the scorer" is supported by the repeat
  bootstrap only (which understates subject-level uncertainty); the defensible statement is "no better than".
- Per-marker refit permutation used 200 permutations; joint and legacy 1000.
- No external replication; single cohort, single seed for CV and nulls.
