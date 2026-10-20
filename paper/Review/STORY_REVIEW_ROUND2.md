# Second review of `story.tex`

Reviewed: 20 October 2026.

**Overall score: 8/10 as a narrative/perspective draft, up from 7/10.**

The revision is substantially more precise. The opening and four-story structure remain effective, while most of the previous review's major concerns have been addressed. The remaining work includes two methodological reporting issues, several claims that still exceed the evidence, and final presentation checks. This score concerns the manuscript as a perspective; it is not a prediction of acceptance at an unspecified venue.

## Scope

Read all 525 lines of the revised `paper/story.tex`, compared it with the first review, and checked relevant code and recorded results in Cases 1–3. Experiments were not rerun. No LaTeX engine was available on PATH, so compilation, page count, and visual layout were not verified. Source line references refer to this revision.

## Improvements since the first review

- The abstract now identifies the checks as case-specific rather than implying that every model passed all three.
- The distinction between cross-validation and hypothesis testing is explicit.
- The permutation-test discussion now distinguishes dependence from biological interpretation.
- The pairing-null scorer/model distinction and its conservative interpretation are disclosed.
- The revised responder definition, threshold, feature count, prevalence, and loss of baseline-dependent biological signal are explained.
- Patient-grouping uncertainty and full-data SHAP ranking are acknowledged.
- The claims about disease/protocol non-identifiability are substantially more careful.
- The paragraph no longer makes an unconfirmed claim that earlier repositories or the poster have already been corrected.

## Remaining findings, ordered by importance

### 1. Describe and justify the exact permutation procedure

**Location:** `story.tex:77–78`, `115–119`, and `258–259`.

The introduction says the model was refitted on 1,000 permuted label vectors. In `experiments/case1/case1.py`, `run_cv` instead independently permutes the training labels inside each fold while keeping held-out labels fixed. `_perm_worker` calls that procedure for each replicate. This is not a single whole-dataset label permutation evaluated consistently through the CV pipeline.

The conventional procedure discussed by [Ojala and Garriga](https://www.jmlr.org/papers/volume11/ojala10a/ojala10a.pdf) generates permuted datasets under the null. The implementation here needs an explicit description and justification of its calibration for the reported statistic and constrained model. Re-fitting alone does not establish that a particular randomisation procedure yields a calibrated p-value.

This review identifies a reporting mismatch and an unresolved validity question; it does not establish that the reported p-value is invalid. Before confidently describing it as a correctly calibrated independence test, verify the exact implemented scheme. If a conventional permutation test was intended, rerun that procedure and reconcile the result.

### 2. Story 3's grouping comparison mixes evaluation summaries

**Location:** `story.tex:328–344`.

The paragraph reports grouped PR-AUC 0.976 for the original seed and 0.911 over 20 seeds, then calls ungrouped PR-AUC 0.969 similar and concludes that grouping does not drive the result.

However, `experiments/case3/cv_results.csv` records:

| Evaluation | Seeds | Mean per-fold AP |
|---|---:|---:|
| Grouped, original heuristic | Original seed 42 | 0.976 |
| Grouped, original heuristic | 0–19 | 0.911 |
| Grouped, constrained heuristic | 0–19 | 0.906 |
| Ungrouped | 0–19 | 0.969 |

The relevant repeated-evaluation comparison is 0.911 versus 0.969, a difference of 0.058. Those aggregate means alone do not establish that grouping has negligible influence. Report matched evaluation summaries and qualify the inference. The protocol-confounding conclusion remains a separate design argument.

Also, merging different patients into one group is conservative only with respect to those merges. Because membership is unknown, the paper cannot assume that the heuristic never splits samples from one patient across groups. Explicitly retain that uncertainty.

### 3. Remove the remaining exclusive explanation in the introduction

**Location:** `story.tex:84–87`.

“The reason turned out to be arithmetic, not biology” still claims an exclusive mechanism. Later limitations correctly say that the analyses do not establish that a classifier used only an artefact.

Suggested replacement:

> Arithmetic coupling could explain predictive performance without requiring a forecastable biological response, and the trained model showed no demonstrated improvement over the unfitted score.

### 4. Do not quantify the SHAP selection bias without measuring it

**Location:** `story.tex:305–308`.

Disclosing full-data SHAP ranking is an improvement. However, “slightly optimistic” assigns a magnitude that has not been established. Use “subject to selection bias of unquantified magnitude.” The general requirement to keep feature selection inside the evaluation loop is described by [Varma and Simon](https://link.springer.com/article/10.1186/1471-2105-7-91).

If quantitative ROAR comparisons are intended as independently evaluated results, calculate rankings using only the training data within each outer fold and repeat the removal/retraining pipeline. Otherwise label the current ranking/removal results exploratory. The synthetic-feature example still supports the conceptual point that model reliance cannot establish biological origin.

The synthetic-feature statement should also describe variation across draws: at effect size 1.75, it ranked first by SHAP in **6/10 draws**, with **median rank 1 and range 1–2**. “SHAP ranked it first” currently reads as unconditional.

### 5. Qualify the checklist's prescriptions

**Location:** `story.tex:425–431`.

Two recommendations remain too broad:

- “Regress change on all baselines” should be conditional on the scientific target. The manuscript already acknowledges that residualisation removes genuine baseline-dependent effects and changes the target; bring that condition into the recommendation itself.
- “Suspect the null, not the model” does not follow solely from an observed statistic falling below all null replicates. Audit the null construction, scoring pipeline, model constraints, and fitting procedure. The manuscript's own constrained model makes this distinction relevant.

### 6. Explain the gap statistic and avoid an equivalence claim in Story 2

**Location:** `story.tex:227–229` and `300–302`.

For Story 1, the displayed mean-fold AP values are 0.554 and 0.589, whereas the reported gap is −0.037. The companion paper explains that the gap is based on pooled held-out predictions within each repeat. Restore that explanation and identify the interval as a **95% subject-bootstrap interval**.

For Story 2, a difference smaller than the fold-to-fold standard deviation does not demonstrate equivalence. Replace “ROAR treated the two groups alike” with a descriptive statement such as “Both removals reduced performance; the observed gap was 0.0056 AP, and no formal equivalence test was performed.”

### 7. Clarify the relationship between the four stories

**Location:** title, Table II, and Stories 2 and 4.

Stories 2 and 4 use the same pre/post-surgery classification setup and cohort. They demonstrate two distinct interpretation failures rather than providing independent replications. State that relationship explicitly. “Four analyses” or “four lessons” is more precise than “four models” in the title.

## Presentation and completion checks

- **Table II, `story.tex:160–167`:** all text columns use non-wrapping `l` alignment despite long entries. The table is likely wider than the IEEE text area. This is a source-level concern, not a confirmed rendered defect. Use wrapping columns with widths that fit the page and verify the compiled output.
- **TODO, `story.tex:214`:** one author-specific TODO remains. Add the actual recollection or remove the placeholder; do not invent the history.
- **Simulation caption, `story.tex:271–275`:** “every rejection is evidence of coupling” is too general across raw and corrected procedures. Corrected procedures can still reject through nominal sampling error or residual miscalibration. Describe the curves separately.
- **Title:** consider “Passing Is Not Proving: Lessons from Four Metabolomics Validation Audits.”

## Overall assessment

The revision preserves the draft's strongest feature: a concrete account of how useful checks can support an unsupported interpretation. Its scientific framing is considerably better than in the first version. The most valuable next changes are to reconcile the permutation description with the code, correct the grouping comparison, and remove the remaining unqualified claims.
