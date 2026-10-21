# Review of `story_template.tex`

Reviewed: 21 October 2026.

**Overall score: 8/10 as a narrative/perspective paper.**

The revised draft is clear, readable, and substantially more transparent than its earlier versions. Its central practical argument is useful: predictive validation does not by itself establish the biological interpretation of a score. The main remaining weakness is consistency between that argument, the unverified permutation procedure, and the stronger claims in the abstract and conclusion. Template compliance remains unverified until the manuscript is compiled.

## Scope and checks

- Read all 578 lines of `paper/story_template.tex` and compared it with the current `story.tex` and earlier reviews.
- Checked the Case 4 values against `experiments/case4/RESULTS.md` and `results/summary_case4.json`, and the simulation headline values against `simulation/results/rejection_rates.csv`.
- Read the relevant Case 1b results and simulation implementation to distinguish the cohorts, sampling sites, and permutation procedures.
- Rendered and inspected the first page of `paper/[ENG]Templete-Short Paper.pdf` and extracted the reference PDF's text and first-page fonts. This PDF is an example manuscript, rather than an explicit list of submission rules.
- Checked citation keys, cross-reference labels, and figure paths in the source. No missing citation keys or cross-reference labels were found; both included figure files exist. The abstract contains approximately 200 words.
- Did not edit the manuscript, rerun experiments, or compile `story_template.tex`. No LaTeX engine was available on PATH, and no compiled `story_template.pdf` was present. Consequently, the draft's page count, table placement, typography, and margin compliance are not verified.

Source line references below refer to this revision.

## What is stronger now

The opening remains effective, the title is shorter and more precise, and the four stories follow a useful repeated structure. The revised draft now:

- States the actual per-fold training-label permutation procedure and acknowledges that its calibration has not been verified.
- Separates original and revised responder definitions and explains the pooled-prediction gap and its 95% subject-bootstrap interval.
- Reports the matched 20-seed grouped/ungrouped comparison and retains uncertainty about inferred patient membership.
- Labels the full-data SHAP removal comparisons exploratory and reports variation across the ten synthetic-feature draws.
- Distinguishes the original unconstrained Case 4 model from the constrained Case 2 model and acknowledges their shared classification task.
- Makes residualisation conditional on the scientific target and replaces the earlier instruction to blame the null with an audit of the whole procedure.

The updated Case 4 numbers are supported by the current recorded results: original reported ROC-AUC 0.973, rerun 0.973697, repeated grouped 0.965174, repeated naive 0.965467, and approximately 65.1% of naive-CV test samples having another visit from the same patient in training. The simulation's low-reliability, no-response rejection rates are 0.261 at n = 50 and 1.000 at n = 500.

## Priority findings

### 1. The headline still overstates what the uncalibrated procedure establishes

**Locations:** `story_template.tex:55–61`, `97–98`, `214–227`, and `524–527`.

Story 1 correctly discloses that the per-fold permutation scheme has not been calibrated for the constrained model. However, the abstract still says that each check “correctly detected predictive structure,” and the conclusion treats a passing check as excluding a rival explanation. Those formulations are too strong for an unverified randomisation procedure.

The mathematical construction supplies a reason to expect dependence; it does not validate the p-value produced by a particular implementation. The [Ojala and Garriga paper](https://www.jmlr.org/papers/v11/ojala10a.html) describes label permutation as a test of class structure, but citing that general method does not establish calibration of this implementation.

Two defensible options are available:

1. Validate a conventional whole-vector permutation procedure for the raw outcome and report it alongside the historical procedure, retaining an explicit distinction from fold-dependent residualised labels.
2. Retain the historical analysis as an audit of an apparent validation success, but consistently describe 0.001 as the output of an uncalibrated permutation diagnostic. Avoid using it as independent proof of association or of successful validation.

Suggested abstract wording:

> Each analysis produced a result we initially treated as validated, although one permutation procedure was not formally calibrated and the ROAR comparisons were exploratory.

The 26%–100% raw-change simulation result uses a different, whole-vector permutation scheme with ridge regression. Explain that distinction in the narrative: it supports the conceptual coupling argument but does not calibrate the empirical constrained-model procedure.

### 2. The biological grouping of the three compounds remains misleading

**Locations:** `story_template.tex:62–64` and `326–337`.

The text correctly identifies dimethyl sulfone as a regular plasma metabolite with dietary, microbial, and endogenous sources, then groups it with “putatively exogenous” compounds and contrasts the trio with “biology.” Source uncertainty is not evidence that a feature is non-biological, and exogenous origin does not itself imply sample-handling contamination.

Suggested neutral labels are “three compounds of uncertain provenance” or “features with possible biological or handling-related origins.” Keep the synthetic label-derived feature as the unambiguous example of a predictor with no biological origin. The strongest conclusion is that ROAR cannot adjudicate provenance, rather than that the real feature groups have established opposite provenances.

### 3. One recommendation contradicts the promise that no new data are needed

**Locations:** `story_template.tex:471–478` and `496`.

The first checklist item recommends a design with repeated baseline measurements, but the following paragraph says none of the questions needs new data. Asking the questions can use existing records; implementing the remedy may require new measurements or a redesigned cohort.

Suggested replacement:

> These questions can be asked of the existing records, although resolving some of the problems they reveal requires new measurements or a different study design.

Also soften “is needed instead” to “may require repeated baseline measurements or another design that separates measurement error from response,” unless the paper establishes that repeated baselines are the uniquely appropriate solution.

### 4. Describe Case 1b as two sampling sites in the same patients

**Location:** `story_template.tex:278–283`.

The recorded results specify that LA and PA contain the same 47 patients. “47 cardiac-surgery patients per sampling site” can be read as two separate patient groups. Clarify:

> We repeated the analysis in a second cohort of 47 patients, each sampled at two anatomical sites.

The two site results are correlated observations rather than two independent cohort replications. State which site was primary if this replication remains part of the short paper. The per-fold permutation caveat also applies to the reported p = 0.007 values, even though this cohort uses an unconstrained model; the constrained-model caveat alone does not establish validity in the replication.

### 5. Avoid treating a passing check as definitive exclusion

**Locations:** `story_template.tex:119–140` and `524–529`.

“Each excludes one specific way” and “one rival explanation has been excluded” repeat a stronger certification claim than the rest of the paper supports. A test can have sampling error; a CV estimate depends on the evaluation design; and feature-removal results depend on how ranking and evaluation are separated.

Prefer:

> Each check addresses a specific failure mode under stated assumptions; none establishes the full biological interpretation.

Likewise, a small p-value provides evidence against a null under the test's assumptions, rather than proving an association with certainty.

### 6. Template matching is incomplete and needs a compiled comparison

**Locations:** title at `story_template.tex:34`, formatting overrides at `26–31`, and Tables I–II.

The provided reference PDF visibly uses an italic title; its extracted title font is Times New Roman Italic at 24 pt. The manuscript's title has no explicit italic styling, so the source does not establish that it matches this aspect of the example. Do not claim exact template compliance from the affiliation and abstract/keywords changes alone.

The 9 pt bold abstract and 9 pt bold-italic keywords in the reference support the direction of the new overrides. The methods table now uses wrapping columns, addressing the earlier non-wrapping-column concern. However, actual font application, table widths, float placement, margins, and page count require compilation and visual inspection.

Use the example as visual evidence, not as proof of an official page limit. Obtain the actual submission rules before imposing a length constraint.

## Smaller refinements

- **Story 4 metric, lines 397–399:** the historical 0.973 and rerun 0.974 are AUCs of an interpolated mean ROC curve, whereas the repeated 0.965 values average fold AUCs. Add a brief note distinguishing these summaries. The rerun's mean fold AUC in the JSON is approximately 0.976.
- **Story 3, lines 374–376:** collection/cohort membership is perfectly confounded with class. Age and BMI eligibility ranges differ and overlap; describe them as potential confounders or differences in recruitment criteria rather than asserting that each is individually perfectly aliased with the label.
- **Stories 2 and 4, lines 195–199:** they share a cohort and task, but the table now correctly gives them different model specifications. “Two interpretation failures in the same classification task” is more exact than “the same analysis.”
- **Reproducibility, line 537:** pin the final manuscript and companion analysis to an appropriate commit or release tag. The earlier paper-v1 was removed for a documented reason; cite the release that actually contains these results when it exists.
- **Source maintenance:** no active body `\todo{...}` calls remain, but there are commented author-history and release-tag reminders. Do not invent the personal recollection or create a release merely to remove a reminder.

## Revision priority

First reconcile the abstract and conclusion with the uncalibrated/exploratory status of the corresponding checks. Then fix the compound terminology and no-new-data claim, clarify the replication's shared patients, and compile the actual template version for visual comparison. The narrative structure and practical framing are already effective.
