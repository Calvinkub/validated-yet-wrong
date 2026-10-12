# Case 3: MTBLS1 urine NMR, T2DM vs control. The batch prefix is the label

## Provenance

- **Dataset**: MetaboLights MTBLS1 (Salek et al., *Physiol Genomics* 2007, PMID 17190852, doi:10.1152/physiolgenomics.00194.2006). ISA revision 3, 2025-09-02.
- **Files read** (read-only, the same absolute paths the original notebook uses):
  - `/Users/admin/Project/BDI2/calvin/team/1_Tech_AI_ML/research/mtbls1_meta/`: `s_MTBLS1.txt`, `a_MTBLS1_metabolite_profiling_NMR_spectroscopy.txt`, `i_Investigation.txt`, `m_MTBLS1_metabolite_profiling_NMR_spectroscopy_v2_maf.tsv` (220 NMR variables x 132 samples).
  - `/Users/admin/Project/BDI2/calvin/team/1_Tech_AI_ML/research/mtbls1_full/*.nmrML`: 132 per-sample files. Only the acquisition and processing parameters in the headers were parsed.
- **Model under audit**: `exp_t2dm_nmr_mtbls1.ipynb` in GitHub `Calvinkub/Bridge_ai_summit_nmr_2026` at commit `0088e38`. The local BDI copy is an older version that reports ROC only. The model is XGBoost (200 trees, depth 3, lr 0.05) with literature-based monotone constraints on log1p(MAF), evaluated with `StratifiedGroupKFold(5, shuffle, seed 42)` over gap≤3 "subjects".
- **Script**: `case3_mtbls1_confound.py`. Full stdout is in `case3_output.txt`.
- **Environment**: `/Users/admin/miniconda3/envs/superaiss6/bin/python` with xgboost 3.2.0, scikit-learn 1.9.0 and numpy 2.4.6. Runtime is about 1 minute on CPU.
- **Output tables**: `crosstab_counts.csv`, `metadata_columns_vs_label.csv`, `acq_params.csv`, `subject_groupings.csv`, `cv_results.csv` and `crosstab.tex`.

## 1. Metadata cross-tabs

### Label x prefix (samples), a perfect confound

| prefix | Control | T2DM |
|---|---|---|
| ADG10003u | 0 | 48 |
| ADG19007u | 84 | 0 |

Cramér's V = 1.0.

### Label x sex (samples), a moderate imbalance

| sex | Control | T2DM |
|---|---|---|
| Female | 28 | 26 |
| Male | 56 | 22 |
| **male fraction** | **0.667** | **0.458** |

Cramér's V = 0.204. At the subject level the deposited protocol gives controls 8M/4F (67% male) and T2DM 17M/13F (57% male). The sample-level 46% for T2DM therefore partly reflects the uneven number of time points per patient. Both sexes appear in both labels, so sex is a covariate imbalance, not a confound.

### Every other metadata column

The two ISA sheets have 64 columns in total:
- **Constant (56 columns)**: organism, organism part, sample type, protocol, instrument (Bruker AVANCE DRX 700), probe, number of transients (128), pulse sequence (noesypr1d), pH 7.4, 300 K, solvent, tube, the normalization and transformation file names, and all ontology REF columns.
- **Unique per sample (5 columns)**: these are IDs and file paths.
- **Variable (2 columns)**: only Gender and the label itself.
- **Source Name** (the ISA slot for the subject) is `ADG10003u` for all 132 samples, controls included. It carries no subject or batch information and looks like a curation artifact.
- There is no date, run, rack, plate or acquisition-order column anywhere in the ISA metadata.

### nmrML header parameters

These are the only possible run-level information.

**Constant across all 132 files**: O1 (699.873291 MHz), sweep width, D1 (3 s), temperature, TD, line broadening, probe serial number, operator (`mse`) and FID path template.

**Variable parameters and their single-variable ROC-AUC vs label:**

| parameter | ROC-AUC vs label |
|---|---|
| pulse width P1 (control median 7.42 µs vs T2DM 7.96 µs) | 0.769 |
| ppm_start (referencing) | 0.668 |
| PHC0 | 0.593 |
| PHC1 | 0.514 |
| number of scans | 1 T2DM file has NS=64, all others 128 |

None of these parameters separates the labels or defines acquisition sessions that span both labels. P1 is calibrated per sample and depends on ionic strength, so its shift may be biological (urine composition) or session-related. It cannot serve as a batch variable.

**Conclusion**: the prefix is the only batch-like variable, and it equals the label. No other metadata column is perfectly confounded. Sex is weakly associated (V = 0.20).

## 2. Metadata-only classifiers

These use the same subject-grouped 5-fold CV (logistic regression, 20 CV seeds; the fold-mean ± SD columns are averaged over the seeds). Chance PR-AUC equals the prevalence, 0.364.

| features | grouping | PR-AUC | ROC-AUC |
|---|---|---|---|
| **batch prefix only** | heuristic (26 groups) | **1.000 ± 0.000** | **1.000** |
| **batch prefix only** | constrained (30 groups) | **1.000 ± 0.000** | **1.000** |
| sex only | constrained | 0.504 ± 0.164 | 0.604 |
| sample number only | constrained | 0.772 ± 0.235 | 0.814 |
| nmrML params (PHC0, PHC1, ppm_start, P1, NS) | constrained | 0.606 ± 0.130 | 0.740 |
| nmrML PHC1 only | constrained | 0.394 ± 0.066 | 0.403 |

## 3. NMR model reproduction

| model | grouping | CV seeds | PR-AUC (fold mean ± SD) | ROC-AUC | pooled-OOF PR-AUC | seed range |
|---|---|---|---|---|---|---|
| XGB monotone (**notebook config**) | heuristic, 26 groups | 42 only | **0.976 ± 0.022** | 0.980 | 0.907 | n/a |
| XGB monotone | heuristic, 26 groups | 0–19 | 0.911 ± 0.077 | 0.929 | 0.896 | 0.845–0.975 |
| XGB monotone | constrained, 30 groups | 0–19 | 0.906 ± 0.093 | 0.932 | 0.894 | 0.853–0.948 |
| XGB unconstrained | constrained, 30 groups | 0–19 | 0.902 ± 0.098 | 0.927 | 0.889 | 0.846–0.954 |
| logistic regression (standardized, C=1) | constrained, 30 groups | 0–19 | 0.934 ± 0.059 | 0.953 | 0.932 | 0.901–0.958 |
| XGB monotone | none (sample-level, leaky) | 0–19 | 0.969 ± 0.030 | 0.979 | 0.963 | 0.944–0.986 |

**Reproduced exactly**: 0.976 ± 0.022 with fold PR-AUCs of 0.973, 1.000, 1.000, 0.941 and 0.965, identical to the notebook output.

Seed 42 is near the top of the seed distribution. Across 20 CV seeds the fold-mean PR-AUC is 0.91. Every NMR model, however it is grouped, is still far below the batch-prefix-only classifier at 1.000.

### Within-batch analysis

This analysis is **impossible**:
- ADG10003u contains only T2DM samples and ADG19007u contains only control samples, so there is no batch in which both classes occur.
- Stratifying by sex does not help, because prefix = label holds in both strata (male: 56 control/ADG19007u vs 22 T2DM/ADG10003u; female: 28 vs 26).
- Whether the spectra cluster by batch independently of label is **untestable**, because batch and label are the same partition of the samples.
- The nmrML headers hold no date or session information that could define sub-batches crossing labels (Section 1).

The paper's study design reinforces this. The two prefixes look like two separate clinical protocols: different inclusion criteria (controls aged 18–55 with BMI 19–30; T2DM aged 30–65 with BMI 25–40), different sampling schedules (7 fixed time points vs 1–3), and different numbering schemes. Collection, storage time, diet protocol, age and BMI are therefore all aliased with the label as well. None of them is recorded per sample.

## 4. Subject count

- **What the deposit says.** `i_Investigation.txt` (protocol text) states: *"84 samples were collected from 12 healthy volunteers (7 time points, 8 males and 4 females) and 50 samples from 30 T2DM patients (1–3 time points, 17 males and 13 females)"*. The deposit contains 48 T2DM samples, not 50. There is **no per-sample subject ID**. `Source Name` is one constant value, and the sheets have no replicate or time-point column.
- **Controls: 12 subjects, certain.** The sample numbers follow 10k+t with t = 1..7, giving exactly 12 blocks of 7. The per-block sex is 8M/4F, which matches the protocol exactly.
- **T2DM: 28–30 subjects, per protocol.** The protocol lists 30 patients. The 2 missing samples can remove at most 2 patients, and only if each was that patient's only sample. Membership is **unidentifiable**: the numbering is not 10k+t, and the gaps are irregular.
- **The notebook's gap≤3 heuristic gives 14 T2DM groups, 26 in total.** At least 3 of these groups provably merge different patients because they break the protocol's "≤3 time points, one sex" rule:
  - {007, 008, 009, 010}: 4 samples
  - {112–118, 120}: 8 samples
  - {151, 152, 153 (F), 155, 156 (M)}: 5 samples of mixed sex
- **Constrained grouping: 18 T2DM groups, 30 in total.** This splits runs at sex changes and caps groups at 3. It is consistent with the protocol but is still a lower bound: 18 is below 28.
- **Defensible statement**: about 40–42 subjects (12 controls plus 28–30 T2DM), with T2DM membership unknown.
  - Over-merging is conservative for CV leakage, so the heuristic grouping is not anti-conservative. The leaky sample-level CV (0.969) is close to the grouped results, so grouping is not what drives the number.
  - The figure label "n=132, 42 subjects" in the original notebook does not match the grouping it actually used (26 groups).

## Bottom line

1. Under subject-grouped CV the NMR model's PR-AUC is 0.976 (seed 42) or 0.91 (20-seed mean).
2. The batch prefix alone reaches PR-AUC 1.000 and ROC-AUC 1.000 under the same CV.
3. Batch and label are the same partition, so no analysis of these data can separate disease signal from a collection, protocol or run artifact.
4. Subject-grouped CV correctly prevents same-person leakage but is blind to this. That is the "validated-yet-wrong" mechanism.
5. A secondary point: the published 0.976 also benefits from a favourable CV seed (the 20-seed mean is 0.91).
