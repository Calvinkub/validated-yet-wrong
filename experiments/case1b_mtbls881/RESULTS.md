# Case 1b: replication of the Case 1 analysis on MTBLS881 (CPB cardiac surgery, serum 1H-NMR)

Design was fixed in `PREREG.md` before any model/label result was computed (one deviation noted at the end).
All numbers: `results/summary_case1b.json` (written by `case1b.py --stage report`); nulls cached in `results/cache/*.npy`;
table: `table.tex` (from `make_table.py`).

## Provenance
- Data: `data/MTBLS881/` (MetaboLights MTBLS881 MAF `m_*_v2_maf.tsv` + `s_MTBLS881.txt`). Subject = N in `Patient_<N>_..`.
  Baseline -1 h, follow-up 20 h, log1p(integral). **n = 47 complete pairs per site, not 50** (3 patients lack a -1 h or 20 h
  sample at the site; both sites give the same 47). About 9-10 held-out patients per CV fold.
- Code: `case1b.py` imports the honest repo by path (`/Users/admin/Project/Forecast/MTBLS242_forecast`: `controls.py` CV,
  AP, `pairing_destroyed_null`; `forecast_responder_pr_auc.select_l2`; `monotone_logistic.fit_monotone_logistic` with all constraints 0).
  Nothing in the repo or in `case1.py` was modified.
- Seed 42. CV = 20 repeats x 5-fold stratified (`controls.repeated_stratified_cv`, seed 42), stratified on the full-sample outcome,
  inner 4-fold l2 selection on training rows only; same scheme as `experiments/case1/case1.py`. 100 folds used, 100% solver convergence.
- Permutation RNG `default_rng([42, design, site, variant, b])`, pairing-null refit RNG `default_rng([42, 100+design, site, variant, b])`.
- Python `/Users/admin/miniconda3/envs/superaiss6/bin/python`, 4 worker processes, single-threaded BLAS, foreground, chunked/resumable.
- Commands (from this directory):
  `python case1b.py --stage compute --budget 560` (re-run until "all chunks complete"; about 8 calls),
  `python case1b.py --stage report`, `python make_table.py`.
- Features 54 (main) = all named metabolites after de-duplication, minus exogenous (propofol, heparin, ethanol); markers = 11 fixed
  a priori (valine, leucine, isoleucine, tyrosine, phenylalanine, alanine, lipoproteins, lactate, glycine, glutamine, histidine).
  Artefact variant adds the 3 exogenous compounds as features and as markers (14 markers, 57 features).
- Statistic: mean over repeats of mean fold PR-AUC (AP). Lift = PR-AUC / full-sample prevalence. Permutation: per fold, permute
  training labels, rerun l2 selection + fit, score fixed held-out labels; p = (1+#{null>=obs})/(1+B). Pairing-destroyed null: shuffle which 20 h profile
  belongs to which patient, rebuild labels with the same K, compute lift of the learn-nothing scorer (500 reps) or, for the raw design, of
  the full CV pipeline (150 reps, "refit"). Subject bootstrap: 2000 draws, seed 42, resampling patients, same resample for all 20 repeats' pooled
  held-out predictions; gap = AP(model) - AP(scorer).
- Reps actually run: permutations B = 300 (main designs) / 200 (artefact), pairing refit 150, pairing scorer 500. These are modest; p-values have
  resolution about 0.003 to 0.005. Intervals below are wide because n = 47.

## Main results (table.tex), main variant (exogenous excluded)

LA = left atrium (pre-declared primary), PA = pulmonary artery (secondary). Gap = model minus learn-nothing scorer PR-AUC (subject bootstrap).

| Site | Outcome (K of 11) | Prev. | Model PR-AUC | Scorer PR-AUC | Gap [95% CI] | p perm (refit) | Model lift | Pairing-null lift median (p95), scorer |
|---|---|---|---|---|---|---|---|---|
| LA | Raw change (K=10) | 0.49 | 0.632 | 0.695 | -0.037 [-0.231, +0.118] | 0.007 | 1.29 | 1.49 (2.09) |
| LA | Per-marker resid. (K=6) | 0.55 | 0.678 | 0.542 | +0.164 [-0.004, +0.309] | 0.003 | 1.23 | 1.05 (1.25) |
| LA | Joint resid. (K=6) | 0.43 | 0.619 | 0.545 | +0.071 [-0.077, +0.190] | 0.103 | 1.45 | 1.06 (1.27) |
| PA | Raw change (K=10) | 0.64 | 0.757 | 0.723 | +0.013 [-0.111, +0.154] | 0.007 | 1.19 | 1.40 (1.89) |
| PA | Per-marker resid. (K=6) | 0.51 | 0.631 | 0.546 | +0.078 [-0.086, +0.222] | 0.096 | 1.24 | 1.05 (1.27) |
| PA | Joint resid. (K=6) | 0.53 | 0.598 | 0.629 | -0.034 [-0.169, +0.092] | 0.977 | 1.12 | 1.06 (1.23) |

K selection (rule in PREREG: full-sample prevalence closest to 0.5, labels only): raw K=10 at both sites (prev 0.49 LA, 0.64 PA; no K
gives a closer value), residualised K=6. Prevalence for every K is in the JSON (`prevalence_by_K`). Per-design K is fixed in the pairing nulls, whose
median prevalence drifts (raw 0.34 LA / 0.38 PA; residualised about 0.5), which is why lift is compared, not AP.
Raw-design full-pipeline pairing null (refit, 150 reps): LA median lift 1.50, p95 2.16, p(model lift 1.29 inside null) = 0.861;
PA median 1.46, p95 2.03, p = 0.907 (`pairing_null_refit` in the JSON).
Model-lift p versus the scorer pairing null (`p_model_lift`): raw 0.76 LA / 0.85 PA; per-marker 0.074 / 0.080; joint 0.002 / 0.267.
Scorer (no-learning) lift on full-sample labels: raw 1.23 / 1.07; per-marker 0.84 / 0.95; joint 0.92 / 1.05.

## Artefact check: exogenous compounds included (features and markers; 200 permutations)

| Site | Outcome | K | Prev. | Model PR-AUC | Scorer PR-AUC | Gap [95% CI] | p perm | Lift | Pairing-null median (p95) |
|---|---|---|---|---|---|---|---|---|---|
| LA | Raw | 13 of 14 | 0.34 | 0.578 | 0.497 | +0.049 [-0.159, +0.265] | 0.005 | 1.70 | 1.73 (2.82) |
| LA | Joint | 8 of 14 | 0.51 | 0.644 | 0.503 | +0.163 [+0.069, +0.252] | 0.005 | 1.26 | 1.08 (1.31) |
| PA | Raw | 13 of 14 | 0.49 | 0.667 | 0.586 | +0.058 [-0.098, +0.239] | 0.005 | 1.36 | 1.52 (2.30) |
| PA | Joint | 8 of 14 | 0.43 | 0.613 | 0.615 | +0.008 [-0.121, +0.130] | 0.005 | 1.44 | 1.08 (1.28) |

(p = 0.005 is the floor for B = 200.) Including propofol/heparin/ethanol, the joint-residual outcome becomes permutation-significant at both sites
(it was 0.10 / 0.98 without them), which is the direction expected if drug exposure carries baseline-dependent structure into the label; the
raw outcome is significant either way. This is an artefact signal of the same kind as the MTBLS242 contaminants, but I did not test a mechanism;
the K rule also changed (K=13 or 8 of 14), so the two variants are not matched on the label.

## What this shows

1. Raw-change outcome: **replicates the MTBLS242 pattern at both sites.** The refit label permutation certifies the model (p = 0.007 at both),
   yet the pairing-destroyed null, in which no patient-level signal can exist, produces equal or higher lift (null median 1.49 / 1.40 versus observed
   1.29 / 1.19; observed lift lies inside the null, p = 0.86 / 0.91 with the full pipeline). A tuned model does not beat a no-learning scorer
   (gap -0.037 [-0.231, +0.118] LA, +0.013 [-0.111, +0.154] PA). The permutation p-value therefore tests the wrong null here: the lift is
   regression to the mean built into the outcome definition. Note the point is about the label, not the model: "forecastable" is a property
   manufactured by building the outcome from the baseline features.
2. Residualised outcomes: **do not replicate the clean MTBLS242 result (no signal) uniformly.** In MTBLS242 the residualised designs gave
   permutation p of 1.0 and a gap CI at or below 0. Here: PA joint matches that (p 0.98, gap -0.034 [-0.169, +0.092], lift 1.12 inside the null);
   PA per-marker and LA joint are permutation-nonsignificant (0.096, 0.103) but with positive point gaps; and LA per-marker is permutation-significant
   (p = 0.003; gap +0.164 with CI [-0.004, +0.309], i.e. spanning or touching 0). For LA joint the model lift 1.45 is above the scorer pairing null p95 1.27
   (p = 0.002) while the permutation test is not significant, so the two tests disagree about this cell; I cannot say which is right with n = 47.
   The learn-nothing scorer has lift below 1 on the residualised labels (0.84-1.05), consistent with residualisation removing the mechanical edge
   the scorer can exploit; that is the intended effect and is reproduced.
3. The sign of the effect is not stable across sites for the same design (e.g. joint: LA p = 0.10, PA p = 0.98; per-marker: 0.003 vs 0.096), so
   differences between sites at this n should not be interpreted as biology.

## What this does not show
- It does not show that any residualised outcome is genuinely forecastable. Positive residual-design cells (LA per-marker, LA joint) could be real
  baseline-to-response structure (an acute surgical response may depend on starting state beyond the 11 markers, since the model sees 54 features),
  residual coupling left by fits on about 37 training rows (the residual fit is itself noisy, 12 parameters per marker in the joint design), or chance in 47 patients.
  The pairing-destroyed null with the full CV refit was run only for the raw design; for residualised designs only the scorer-based pairing null
  exists, which cannot represent what the 54-feature model might exploit. I did not run it (post hoc), so those cells are unresolved.
- n = 47; every gap CI above includes zero except the artefact LA joint (+0.163 [+0.069, +0.252]). No claim of equivalence is made for the "no edge" cells.
- It does not say anything about postoperative outcomes: the label is a count of marker moves, and the surgery is acute (hours), unlike the bariatric
  intervention in MTBLS242. This replicates the statistical artefact, not the biology.
- The direction d_j is learned from the training mean change, not from literature (monotone constraints were therefore not used), a departure from MTBLS242.
- K is chosen on full-sample label prevalence (labels only, no model outcome), and K=10 of 11 for the raw design is unusually extreme (the cohort has a strong
  shared 20 h response in most markers); results may depend on K. Not varied.
- Nulls: B = 300/200 permutations and 150 refit pairing replicates are modest. p-values are floor-limited (0.003 / 0.005).

## Deviation / post hoc notes
- After the first probe run (one site, one timing run, which printed K, prevalence and AP for three designs) I reduced the permutation counts for run time
  (300 main / 200 artefact / 150 pairing refit). The designs, K rule, sites and markers were not changed after seeing any result.
- Compared with PREREG, I additionally report scorer-lift and model-lift p-values against the pairing null; and the artefact variant uses the same K rule (giving K=13 and 8).
