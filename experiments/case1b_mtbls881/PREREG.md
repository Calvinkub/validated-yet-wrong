# Case 1b (MTBLS881) design decisions, written BEFORE any outcome/model result was computed

Written before running any analysis code. Only the following were inspected beforehand: file headers, the list
of metabolite names, per-metabolite missing-cell counts (4 missing cells in total, 3 in lactate and 1 in one
duplicate D-glucose row), time-point/site counts. No change score, label, prevalence or model output had been seen.

## Data and pairing
- `data/MTBLS881` MAF + sample sheet. Subject = N in `Patient_<N>_<code>_2` (50 patients). Sample table: 590 serum samples.
- Baseline = -1 h (pre-CPB). Follow-up = 20 h. Subjects need both samples at the given site (complete pairs only).
- Two sampling sites are analysed SEPARATELY, same protocol: **primary = Left atrium** (oxygenated blood; fixed now,
  before looking), **secondary = Pulmonary artery**. Both are reported; neither is picked after seeing results.
- 20 h is the latest time point and the longest recovery window; no other follow-up (0, 2, 4, 8 h) is examined.
  (Not a sweep. If a reviewer wants other time points, that is a new, separately declared analysis.)

## Metabolite set
- All 63 rows have <5% missing cells (max 0.5%), so the missingness filter excludes nothing. Missing cells are imputed by the
  median of that metabolite within the same site and time point.
- Redundant rows removed (same compound or sub-resonance of it): keep the single "D-Glucose 5.24 + 4.62" row, drop the other D-glucose row
  and alpha-/beta-glucose; keep the first Trigonelline row.
- Exogenous rows: propofol (2 rows), heparin (2 rows), ethanol. Main analysis EXCLUDES them from features and markers.
  Artefact version INCLUDES them (first row of propofol and heparin, plus ethanol) as features AND as markers.
  I did not exclude L-dopa, adipic acid or isobutyrylglycine; they might also be drug-related. Not tested.
- Values: log1p(integral). Units unstated in the deposit; treated as relative abundance.
- Features for the model: all remaining named metabolites (~54), i.e. markers are a subset of the features, as in MTBLS242.

## Markers and outcome
- Markers (11, fixed now, chosen to mirror the 11 MTBLS242 markers by name, not from any result): valine, leucine, isoleucine,
  tyrosine, phenylalanine, alanine, lipoproteins, lactate, glycine, glutamine, histidine.
- Direction d_j = sign of the mean raw change (log1p units, 20 h minus -1 h) over the TRAINING rows of each fold (never held-out rows).
  This is the "population mean change".
- Responder = at least K of 11 markers move in the direction d_j, i.e. change_j * d_j > 0 (raw design). For residualised designs the
  residual change is used with the same d_j (the mean of a residual is zero by construction, so d_j must come from the raw change).
- K per design: the K in 1..11 whose FULL-SAMPLE prevalence is closest to 0.5 (ties -> smaller K). Computed once, using labels only,
  per design and per site, before any model is run. Fold labels are then rebuilt with that K and training-only d_j / residual fits,
  exactly as case1.py does.

## Designs (same four tests as the simulation / Case 1)
1. raw: raw change outcome, label permutation (model refit in every permutation; permute training labels in each fold, inner l2
   selection rerun, held-out labels fixed).
2. pairing-destroyed null on lift (PR-AUC / prevalence): shuffle which 20 h profile belongs to which patient, rebuild the outcome, reuse
   K. Reported (a) with the learn-nothing scorer (500 reps, as for all designs in case1.py) and (b) with the full CV refit for the raw
   design (reduced reps if too slow; the count is reported).
3. per-marker residualisation: change_j ~ a_j + b_j * baseline_j fitted on training fold, then label permutation (refit).
4. joint residualisation: change_j ~ a_j + sum_k B_jk baseline_k (all 11 baselines) on training fold, then label permutation (refit).
- Learn-nothing scorer: -sum_j d_j * z(baseline_j) over the 11 markers (z-scored over all subjects' baselines; unsupervised), d_j from
  the training fold. Higher score = more likely a responder (a marker that rises on average and starts high should fall back).
  No label-fitted parameters except the sign d_j.
- Model: l2-penalised logistic (the repo's `fit_monotone_logistic` with all constraints = 0, i.e. unconstrained; there is no literature
  direction for these features in cardiac surgery), inner 4-fold l2 selection on training rows (repo `select_l2`).
- CV: `controls.repeated_stratified_cv`, 20 repeats x 5-fold, seed 42, stratified on the full-sample outcome (same scheme as case1.py).
- Statistic: mean over repeats of mean fold AP (PR-AUC); lift = AP / prevalence. Subject-bootstrap (2000 draws, seed 42) CI for
  model minus scorer on pooled held-out AP; permutation p = (1 + #{null >= obs}) / (1 + B).
- n = 50 (about 10 held-out patients per fold). All intervals are wide; nothing is claimed beyond what they support.

## What would count as replication of MTBLS242 (declared now)
- Raw design: permutation p small (< 0.05) while the pairing-destroyed null produces similar lift (observed lift inside the null p95)
  and model does not beat the learn-nothing scorer (CI for the gap spans 0 or is negative).
- Residualised designs: no permutation signal (p not small), gap vs scorer <= 0 or spanning 0.
- Any other pattern is reported as non-replication.
