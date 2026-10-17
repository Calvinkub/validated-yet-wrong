# Case 4: MTBLS242 "obese vs non-obese" label

Script: `case4.py` (reuses data loader, model and constraints from `../case2/common.py`).
Command: `MTBLS242_FORECAST_DIR=<folder with m_MTBLS242_v2_maf.tsv and s_MTBLS242.txt> python case4.py`
Output: `results/summary_case4.json`. Runtime about 3 s. xgboost 3.2.0, scikit-learn 1.9.0, numpy 2.4.6.
Data: MTBLS242 sheet re-downloaded 2026-10-15, byte-identical to the file used.

## What the label is
Label 1 = preoperative sample, label 0 = 12 months after surgery (from the sheet's
`Factor Value[time point]`). n = 177 (106 + 71).

| Fact | Value |
|---|---|
| Patients with a preoperative sample | 106 |
| Patients with a 12-month sample | 71 |
| Patients in both classes | 71 |
| Share of the 177 samples that come from those patients | 80.2% |

## Grouped vs naive CV
Same model, 21 features, literature monotonic constraints, 10 repeats (seeds 42, 142, ..., 942)
of 5-fold CV, 50 outer folds per arm. Grouped = `StratifiedGroupKFold` on patient ID;
naive = `StratifiedKFold`. Mean over folds; SD is over the 10 repeat-level means.

| Metric | Grouped | Naive |
|---|---|---|
| ROC-AUC | 0.960 (SD 0.006) | 0.959 (SD 0.009) |
| PR-AUC (average precision) | 0.973 (SD 0.004) | 0.972 (SD 0.007) |
| Pooled out-of-fold ROC-AUC | 0.959 | 0.958 |

Grouping changes nothing beyond the repeat-to-repeat spread. The issue is label meaning,
not leakage.

## Reconciliation with earlier numbers (read before citing any of them)
- **0.973 +/- 0.020 ROC-AUC** is the figure in the Bridge poster (`poster_figures/POSTER.md`, stratified
  5-fold, single seed). It does **not** reproduce here: the same protocol (naive 5-fold, seed 42)
  with the current constrained model gives **0.969** (SD over folds 0.022, key
  `single_seed_42_naive_5fold`). The poster value predates the switch to literature-based constraints.
- **0.969 grouped / 0.970 naive** in earlier drafts of the paper came from a July 2026 session whose
  script is not in this repository, and they do not reproduce under the 10-repeat protocol above.
  Use the table above. Note that 0.969 also appears in the Bridge README as the *MTBLS1* naive
  PR-AUC, so the two may have been confused.
- The paper's Case 2 grouped PR-AUC (0.973) is the same quantity as the PR-AUC row here
  (0.9728); it is a different metric from the ROC-AUC quoted for Case 4.

## What this does and does not show
It shows the pre/post label is shared by 71 patients and that patient grouping does not change
the score. It does not show what features the classifier uses to separate the classes, nor that
the signal is post-surgical diet, medication or storage; those are hypotheses. It uses one
cohort.
