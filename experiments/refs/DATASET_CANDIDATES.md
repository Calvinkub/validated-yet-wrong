# Second longitudinal dataset candidates (Case 1 replication)

Checked 2026-10-12 via MetaboLights FTP/API and Metabolomics Workbench REST. "Downloadable" means the quantified table was actually fetched and parsed, not just listed.

## Top pick: MTBLS881 (downloaded to data/MTBLS881/)
- Study: Maltesen et al., serum 1H-NMR (Bruker 600 MHz, CPMG) around coronary artery bypass grafting with cardiopulmonary bypass (CPB), Aalborg. Papers: Sci Rep 7:40275 (2017), 10.1038/srep40275; Sci Data 7:198 (2020), 10.1038/s41597-020-0545-0 (data descriptor). ClinicalTrials.gov NCT02475694. Public, no access request.
- n = 50 patients; 591 serum samples; time points relative to CPB weaning: -1 (baseline, pre-CPB), 0, 2, 4, 8, 20 h; 47/50 patients have all six; each time point sampled at two sites (left atrium and pulmonary artery), 590 sample columns in the table.
- Metabolite table: 63 rows, 59 distinct assigned names (lactate, glucose, amino acids, ketones, TMAO, creatine, lipoproteins, etc.), numeric, only 4 missing cells. Units are not stated (looks like integrals; mean about 830); treat as relative abundance and log-transform. It also contains drugs/exogenous rows (Propofol, Heparin, Ethanol): a ready-made positive control for Case 2.
- Subject linkage: YES. Sample names are Patient_<N>_<code>_2 with N = 1..50 (50 unique N), and the sample sheet (s_MTBLS881.txt) carries Factor Value[Time elapsed from CPB] and [Oxygenated-deoxygenated blood]. Baseline vs follow-up pairing is therefore recoverable and verified (50 patients).
- Caveat for Case 1: the intervention is acute (hours), so "responder" = e.g. >=k of m markers moving in an expected direction between -1 h and 20 h (or 4 h). Regression to the mean is still expected from baseline. Clinical outcome (postoperative lung injury) is not in the sample sheet I parsed; I did not confirm it is public. Surgery is not a weight-loss intervention, so the biology differs from MTBLS242, which makes it a replication of the statistical artefact, not the biology.
- Files (FTP): https://ftp.ebi.ac.uk/pub/databases/metabolights/studies/public/MTBLS881/{s_MTBLS881.txt, i_Investigation.txt, a_MTBLS881_NMR_ischemia_reperfusion_injury_metabolite_profiling_NMR_spectroscopy.txt, m_MTBLS881_ischemia_reperfusion_injury_metabolite_profiling_NMR_spectroscopy_v2_maf.tsv}. Local copies are in data/MTBLS881/ (about 1 MB). (Filename of the assay file on the server differs slightly from the one I saved; the saved one was fetched from the listing at that time.)

## 2: ST000387, HERITAGE Family Study (downloaded to data/ST000387/)
- Metabolomics Workbench ST000387, plasma LC-QTOF (Fiehn lab CSH lipidomics), 20 weeks of supervised endurance training; Quebec centre, N=125 subjects with pre and post samples; the sample names are <ID>pre / <ID>post, so linkage is YES (125/125 IDs have both, verified). 26 QC samples.
- Files: mwTab text for positive mode (AN000622, 708 features) and negative mode (AN000623, 887 features): https://www.metabolomicsworkbench.org/rest/study/analysis_id/AN000622/mwtab/txt (and AN000623). Downloaded to data/ST000387/. Values are counts.
- Limitation: features are unidentified (retention time_m/z names, no metabolite names, no PubChem/KEGG IDs in the file I parsed), so it is lipidomics MS, not an NMR panel, and not "quantified metabolites". Good for the statistical point (largest n, real pairs), poor for the biology. No clinical outcome in the mwTab.

## 3: MTBLS249, COPD exercise training (not downloaded)
- 18 COPD patients + 12 controls (about 30 subjects), plasma 1H NMR (1D and JRES), pre- vs post-8-week endurance training and pre/post acute exercise (4 sampling conditions per subject, columns H1_1..H1_4, COPD2_1..4). Linkage YES by column ID. 12 named metabolites (citrate, glutamine, valine, alanine, ...). Extensive clinical covariates (VO2 peak, BMI, FFMI before/after training) in the sample sheet. Paper: Rodriguez et al., Metabolomics 8(3):508-516 (2012), 10.1007/s11306-011-0336-x.
- Files: https://ftp.ebi.ac.uk/pub/databases/metabolights/studies/public/MTBLS249/ (m_MTBLS249_1D_NMR_spectroscopy_v2_maf.tsv, s_MTBLS249.txt). Small n and 12 metabolites make power low, but real NMR with a physiological intervention. Note a duplicate/blank "copd" MAF whose values are empty; use the 1D file.

## 4: ST004714, lifestyle intervention in children with obesity (not downloaded)
- ST004714, targeted LC-MS, serum, 12 Before/After pairs (IDs OB24001_F0 / _F1 style, so linkage likely YES), 817 named metabolites in the REST data endpoint (nmol/L). n = 12 is too small for responder-from-baseline modelling.

## Checked and rejected (data not actually usable)
- MTBLS2472 (bariatric SG/RYGB, 40 pre/1-month pairs, IDs like A2_pre / A2_1M link well): the public MAF files have sample columns but ALL values are empty (NaN). Raw data only. Excluded.
- MTBLS15091 (resistance training, 8 weeks, NMR, 40-48 metabolites): MAF values empty; also IDs do not obviously pair PRE/POST (different participant numbers per group). Excluded.
- MTBLS218 (bariatric RYGB, 132 serum samples, visits 0/2-3/52): MAF has no sample columns (19 rows only). Excluded.
- ST004199 (ketogenic diet, adolescents, 3 timepoints): REST data endpoint returns no table; only mzML raw files. Excluded.
- MTBLS239 (infliximab IBD, NMR): table contains group-level fold-change columns, not per-sample values. Excluded. MTBLS2187 (96 individuals, lifestyle coaching, MS): sample sheet has no subject/timepoint factors, IDs are anonymous Sample_N. Excluded.
- Zenodo search (NMR + intervention/bariatric) gave only dataset records with no files listed or no per-subject paired tables; none verified.

## Recommendation
Use MTBLS881 as the second replication (real NMR, named metabolites, 50 linked patients, six time points, perfectly downloadable). Use ST000387 as a supplementary statistical replication (n=125 pairs) if reviewers want a larger n, flagged clearly as unidentified-feature lipidomics. MTBLS249 is the only physiological NMR option, but n~30 is thin.
