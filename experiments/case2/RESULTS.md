# Case 2 results: ROAR on MTBLS242 obesity (preop vs 12 months)

## Provenance
- Data: `/Users/admin/Project/Forecast/MTBLS242_forecast/{m_MTBLS242_v2_maf.tsv,s_MTBLS242.txt}` (sha256 identical to ROAR repo copies; `results/summary.json` stores hashes). n=177 (106 preop = 1, 71 12-month = 0), 21 metabolites, log1p.
- Model: XGBoost (150 trees, depth 3, lr 0.1, subsample/colsample 0.9), literature monotonic constraints on 11 of 21 features, identical to Chaiporn's ROAR repo. xgboost 3.2.0, shap 0.51.0, sklearn 1.9.0.
- **CV scheme (all conditions):** 10x repeated StratifiedGroupKFold (5 folds, shuffle, seeds 42,142,...,942), groups = patient ID recovered by `^(\d+)[-_](\d+)[-_]S$` (71 patients have both samples; 35 preop only). Fold assignments identical across every condition (paired). Metric = mean of 50 per-fold average-precision values. Model seed = repeat_seed*100+fold. Informed and random removals use the SAME scheme.
- SHAP ranking: mean |SHAP| (TreeExplainer) on full data, averaged over 10 model seeds (2026-2035).
- Random null: k=1 and k=2 exhaustive (21 and 210 subsets); k=3..11: 500 distinct uniform random subsets each (rng seed 20261012+k). Percentile = % of random removals with PR-AUC <= observed (min possible 0.2 = 1/500; "0.0" means worse than all 500).
- Spike: synthetic feature `d*y + N(0,1)` (depends only on label, no biology), d in {0.75, 1.25, 1.75}, 10 independent draws each (rng seed 777). Real features' |d| for reference: dimethyl sulfone 1.74, isopropanol 1.61, valine 1.43, methanol 1.07, lipoproteins 1.01.
- Commands (cwd `experiments/case2`, python `/Users/admin/miniconda3/envs/superaiss6/bin/python`): `run_case2.py main`; `run_case2.py null 1 2 3 4`, `null 5 6`, `null 7 8 9`, `null 10 11`; `run_case2.py spike`; `run_case2.py summarize`; `make_figure.py`. 4 processes. Raw outputs in `results/`; machine-readable summary `results/summary.json`.

## 1. Baseline reproduction
| CV | PR-AUC (mean over 50 folds) |
|---|---|
| Original ROAR repo code, ungrouped stratified 10x5 (re-run here) | 0.9719 (repo reported 0.972) |
| Subject-grouped (used throughout) | **0.9728** |

Contaminant trio removed, ungrouped (repo code) 0.9501 (repo reported 0.952; xgboost/sklearn versions differ slightly); grouped 0.9538. Grouping does not change the picture.

## 2. Recursive ROAR (SHAP recomputed on retrained model each step)
Removal order: dimethyl sulfone, isopropanol, L-valine, glycine, methanol, L-tyrosine, D-phenylalanine, lipoproteins, pyruvic acid, L-allo-isoleucine, L-leucine.
Note: the full-data multi-seed ranking at k=1..3 equals the recursive order, so fixed and recursive agree there. After removing the first two contaminants, valine (biology) takes over as top feature, then glycine, and methanol only reappears at step 5.

| k | removed at step | recursive PR-AUC | null mean [2.5%, 97.5%] | recursive percentile | fixed-ranking PR-AUC (pct) |
|---|---|---|---|---|---|
| 1 | dimethyl sulfone | 0.9655 | 0.9717 [0.9666, 0.9739] (n=21) | 4.8 | 0.9655 (4.8) |
| 2 | isopropanol | 0.9653 | 0.9706 [0.9634, 0.9742] (n=210) | 6.2 | 0.9653 (6.2) |
| 3 | L-valine | 0.9538 | 0.9696 [0.9612, 0.9743] | 0.2 | 0.9538 (0.2) |
| 4 | glycine | 0.9446 | 0.9684 [0.9558, 0.9744] | 0.0 | 0.9350 (0.0) |
| 5 | methanol | 0.9276 | 0.9673 [0.9529, 0.9743] | 0.0 | 0.9327 (0.0) |
| 6 | L-tyrosine | 0.9098 | 0.9649 [0.9462, 0.9744] | 0.0 | 0.9215 (0.2) |
| 7 | D-phenylalanine | 0.8849 | 0.9633 [0.9442, 0.9743] | 0.0 | 0.9044 (0.0) |
| 8 | lipoproteins | 0.8620 | 0.9605 [0.9344, 0.9742] | 0.0 | 0.9078 (0.0) |
| 9 | pyruvic acid | 0.8484 | 0.9581 [0.9252, 0.9737] | 0.0 | 0.9038 (0.2) |
| 10 | L-allo-isoleucine | 0.8252 | 0.9547 [0.9173, 0.9721] | 0.0 | 0.9073 (1.2) |
| 11 | L-leucine | 0.8016 | 0.9495 [0.9028, 0.9717] | 0.0 | 0.8847 (1.2) |

Recursive removal degrades more than fixed-ranking from k>=6 (re-ranking picks features that are redundant-less given the remaining set), and sits below the whole random band from k=3 on.

## 3. Contaminant trio vs biology trio at k=3 (new 500-draw null, same CV)
| group | PR-AUC | percentile in random k=3 null |
|---|---|---|
| Contaminants (dimethyl sulfone, isopropanol, methanol) | 0.9538 | 0.2 (null min 0.9530) |
| Biology (lipoproteins, L-valine, L-tyrosine) | 0.9594 | 1.2 |

Old numbers (30 draws, lighter CV): 3.3rd and 6.7th percentile. With 500 draws and matched CV both trios are in the extreme lower tail; the contaminant trio is hurt marginally more (difference 0.0056 PR-AUC, smaller than the fold SD of ~0.03; no formal test made). Single-feature removals (21 drops from baseline): dimethyl sulfone 0.0073, lipoproteins 0.0052, isopropanol 0.0033, methanol 0.0029, valine 0.0021, tyrosine 0.0020; the largest single drop is a contaminant.

## 4. Spiked-artifact positive control (pure artifact, 22 features)
Per-draw medians (min-max in `results/spike_summary_per_rep.csv`). "ROAR rank" = rank of the spike among 22 by PR-AUC drop when it alone is removed (retrain).

| d | SHAP rank of spike (median, range) | recursive step at which spike removed | ROAR single-removal drop of spike | ROAR rank of spike (of 22) | best-ranked of biology trio by ROAR |
|---|---|---|---|---|---|
| 0.75 | 10 (3-19) | >=4, median >11 (cap k=11) | 0.0003 | 14.5 (1-21) | 2 |
| 1.25 | 3 (3-6) | 4 (3-8) | 0.0048 | 3 (1-9) | 3 |
| 1.75 | 1 (1-2) | 1 (1-3) | 0.0127 | **1 (1-2)** | 4 |

At d=1.75 (artifact as strong as dimethyl sulfone) the pure artifact is SHAP rank 1 in 6/10 draws, within top 2 in all, and its ROAR drop (0.0127, larger than every real feature's single-removal drop, max 0.0073) places it as the most "irreplaceable" feature. At d=1.25 it ranks about 3rd, alongside the real contaminants and top biology. Only at d=0.75 does it disappear into the pack. ROAR measures how much predictive information is unique, not whether it is biological, so the ranking of artifact vs biology depends only on effect size.

## What this shows
1. The original weaknesses (fixed ranking, 30 draws, lighter random CV) do not change the qualitative conclusion: informed removal falls below essentially all random removals from k=3.
2. Recursive ROAR ranks the exogenous contaminants (dimethyl sulfone, isopropanol, methanol) as at least as non-substitutable as the top biology: contaminant trio percentile 0.2 vs biology trio percentile 1.2 (k=3). A low ROAR percentile therefore cannot certify biological validity.
3. A synthetic artifact with no biology at all, at a realistic effect size, becomes the top ROAR feature, so ROAR cannot separate artifact from biology without domain knowledge.

## Caveats
- Single cohort, n=177, 71 patients with both timepoints, so 12-month vs preop is a within-patient time effect; surgery, weight loss, diet and sample handling are confounded with the label (that confound is the point of the case, not removable here).
- Contaminant and biology trio are chosen post hoc (the trio from the ROAR repo, defined by the original SHAP ranking); the biology trio is the top-3 constrained features from the repo ranking (lipoproteins, valine, tyrosine) while the multi-seed ranking here puts valine above lipoproteins. Spike draws use 10 reps per d; the recursion for the spike is capped at k=11 so "None" means >11.
- Null draws are not independent of each other (overlapping subsets, shared folds), so percentiles at 0.0/0.2 mean "below the observed random range", not a calibrated p-value. Informed PR-AUC is also subject to selection (the ranking is computed on all 177 samples, including test folds); this does not affect the null comparison direction but ROAR percentiles are optimistic for informed removal.
- Percentile differences between trios are within CV noise; do not claim the artifact trio is strictly more important.
- main.tex not modified.
