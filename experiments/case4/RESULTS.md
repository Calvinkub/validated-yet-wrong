# Case 4: MTBLS242 "obese vs non-obese" is preop vs 12 months after surgery

All numbers come from `case4.py` (this directory). Machine-readable values:
`results/summary_case4.json`; console output: `results/case4_output.txt`.

## Provenance

- **Task under audit**: `exp_obesity_nmr_mtbls242.ipynb` in GitHub
  `Calvinkub/Bridge_ai_summit_nmr_2026`.
  - Commit `17e18df` (2026-07-14): unconstrained XGBoost, one
    `StratifiedKFold(5, shuffle, seed 42)` split, reports
    **"Mean ROC-AUC = 0.973 +/- 0.020"** (AUC of the fold-mean ROC curve interpolated
    on 200 points). This is the 0.973 in Table I of the paper. It is not a copy of
    Case 2's PR-AUC 0.973; the two match by coincidence.
  - Commit `cb27e89`, unchanged at `0088e38` (the commit cited for Case 3): same
    split and hyperparameters plus the literature monotonic constraints; reports
    mean fold PR-AUC 0.984 +/- 0.014.
- **Data**: `m_MTBLS242_v2_maf.tsv`, `s_MTBLS242.txt`, sha256 `ac882801...3bfc` and
  `4ff5853c...06d3`, identical to the files used in Case 2 (`../case2/results/summary.json`).
  Read from `MTBLS242_FORECAST_DIR`. n = 177 (106 preop = 1, 71 twelve-month = 0),
  21 metabolites, log1p.
- **Loading, patient IDs, Case 2 model and folds**: imported from `../case2/common.py`
  (same 10 repeat seeds 42, 142, ..., 942; model seed = repeat_seed*100 + fold).
- **Environment**: Windows 10 x86-64, Python 3.11.9, numpy 2.4.6, scikit-learn 1.9.1,
  xgboost 3.2.0. Runtime about 10 s.
- **Cross-platform check**: in this environment the Case 2 grouped baseline is
  0.9723 (Case 2 recorded 0.9728 on macOS with scikit-learn 1.9.0). Fold assignments
  match (per-fold values agree closely, 11 of 50 exactly); xgboost output differs
  slightly between platforms. Expect third-decimal differences of about 0.001 if
  re-run elsewhere.

Command (from this directory):

```
MTBLS242_FORECAST_DIR=/path/to/MTBLS242 python case4.py
```

## 1. Label-provenance audit (sample sheet only)

| Quantity | Value |
|---|---|
| Samples per time point | preop 106, 3 mo 98, 6 mo 98, 9 mo 92, 12 mo 71 |
| Patients with a preop sample | 106 |
| Patients with a 12-month sample | 71 |
| **Patients in both classes** | **71 of 106** (every 12-month patient also has a preop sample) |
| Patients in the preop class only | 35 |
| Sample names not matching `^(\d+)[-_](\d+)[-_]S$` | 1 (`2_0242_2`, a 6-month sample, not used) |
| Sample-sheet columns | 18; only `Sample Name`, `Factor Value[time point]` and that factor's ontology REF/accession vary |
| Columns for BMI, weight, age, sex, procedure, medication, fasting | none |

So the label "obese" = "preop" and "non-obese" = "12 months after surgery". No column
records BMI, so whether any 12-month patient is non-obese cannot be checked.

## 2. Original reported result, re-run

| Source | Reported | Re-run here |
|---|---|---|
| `17e18df`, unconstrained, ROC-AUC (mean curve) | 0.973 +/- 0.020; folds 0.9416, 0.9619, 0.9932, 0.9864, 0.9932 | **0.974** (0.9737) +/- 0.020; folds 0.9448, 0.9587, 0.9898, 0.9932, 0.9932 |
| `0088e38`, monotonic, PR-AUC (mean of folds) | 0.984 +/- 0.014; folds 0.9676, 0.9664, 0.9940, 0.9978, 0.9918 | **0.983** (0.9828) +/- 0.015; folds 0.9662, 0.9665, 1.0000, 0.9978, 0.9837 |

Both reproduce to within 0.001. They are not exact: the notebook read a separately
parsed `.npz` (sample order may differ, hence fold membership) and ran on macOS.

## 3. Grouped vs naive CV (10 x 5-fold, Case 2 folds, mean over 50 folds)

| Model | CV | ROC-AUC | PR-AUC |
|---|---|---|---|
| Original unconstrained (`17e18df` hyperparameters) | subject-grouped | **0.965** (0.9652) | 0.976 |
| Original unconstrained | naive stratified | **0.965** (0.96547) | 0.976 |
| Case 2 monotonic | subject-grouped | 0.960 (0.9596) | 0.972 (Case 2 baseline) |
| Case 2 monotonic | naive stratified | 0.960 (0.9604) | 0.973 |

In naive CV, **65.1%** of test samples have the same patient's other visit in the
training folds; grouped CV has none (asserted in the script). Grouping changes ROC-AUC
by less than 0.001 (0.9652 vs 0.9655; 0.9596 vs 0.9604).

## What this shows

- The headline 0.973 has a traceable source (`17e18df`) and reproduces (0.974).
- 71 of the 106 patients contribute a sample to both classes; the label is the visit,
  not an obesity measurement.
- Removing within-patient leakage does not lower the score, so the problem is not
  leakage. A high, leakage-free score is still a pre- vs post-surgery classifier.

## Not shown

- Nothing here says which serum differences drive the score (weight loss, diet,
  medication, fasting, storage time); the sample sheet records none of them.
- The 0.969 (grouped) and 0.970 (naive) ROC-AUC in the earlier draft have no source
  in any repository we could find; they are replaced by the values in section 3.
- Single cohort; no external obese/lean comparison.
