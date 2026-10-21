# Second review of the compiled `story_template.pdf`

Reviewed: 21 October 2026. Source: the 665-line manuscript and seven-page PDF updated at approximately 16:01 local time.

**Overall score: 9/10 as a narrative/perspective paper, up from 8.5/10.**

This revision resolves the previous review's main content and presentation concerns. The methods are easier to locate, the simulation is more self-contained, and the full-width Figure 2 is now readable. The four cases retain their useful progression from the original belief to the check, finding, and lesson.

The higher score reflects clearer reporting and better presentation, not new empirical validation. The uncalibrated historical permutation procedure, exploratory ROAR comparisons, small cohorts, and uncertain compound provenance remain limitations, but the manuscript now states them consistently. This score is not a prediction of acceptance at a particular venue.

## Scope and verification

- Read the current `paper/story_template.tex` and compared it with `STORY_TEMPLATE_PDF_REVIEW.md`.
- Rendered and visually inspected all seven pages of `paper/story_template.pdf`, including a closer inspection of Table I. The review target remains the narrative paper, not `fixpaper.tex` or the older `main.pdf`.
- Inspected the relevant simulation and plotting implementation and the recorded replication results. No experiments were rerun.
- Static checks found no missing citation keys, missing cross-reference labels, missing included figure files, or active body TODO calls.
- The rendered text contains no unresolved `??` references or visible TODO markers. I found no obvious clipping or overlapping text in the inspected pages.
- Did not edit or rebuild the manuscript or PDF. This review does not independently verify every citation or establish compliance with an unspecified submission page limit.

Page references below count from the first PDF page.

## Previous findings: status

| Previous concern | Current status |
|---|---|
| Change-score construction universally “guarantees” dependence | **Resolved in the introduction.** Lines 109–115 describe dependence that can arise through measurement error and regression to the mean. |
| Raw-change and residualised simulation permutation schemes conflated | **Resolved.** Lines 309–316 explicitly distinguish whole-vector permutations from fold-specific training-label permutations. |
| Replication described as the model not beating the scorer at either site | **Resolved.** Lines 402–411 report no demonstrated improvement, both gap estimates and intervals, and the shared-patient design. |
| Abstract implies coupling proves why the model underperformed the scorer | **Resolved.** The comparison and possible explanation are now separated. |
| Figure 1 calls the model validated without qualification | **Resolved.** The caption identifies the historical diagnostic and its unverified calibration. |
| Categorical ROAR reliance statements despite exploratory analysis | **Resolved in the flagged passages.** The results and conclusion now use exploratory language. |
| Checks described as universally necessary | **Resolved.** The conclusion conditions their usefulness on assumptions and target. |
| Figure 2 too small; gamma and error bars unexplained | **Resolved as a readability/reporting issue.** The figure spans both columns on page 5; gamma and 95% Wilson intervals are explained. |
| Stretched table-cell spacing | **Improved.** Ragged-right cells are clearer, and both tables fit without an obvious collision. |

The graphic still uses “False-positive rate” on the top-row axis. Its new caption explicitly distinguishes a false interpretation as forecasting skill from a correct rejection of independence. Renaming that axis “Rejection rate” would be a final polish, but the caption now supplies the missing interpretation; this is not the earlier unresolved issue.

## Remaining corrections

### 1. Distinguish sensitivity to the permutation scheme from calibration

**Location:** page 7, Future Directions; `paper/story_template.tex:619–623`.

The proposed whole-vector rerun is described as a way to “check the calibration of the per-fold procedure.” Comparing the two procedures on one observed dataset can reveal whether the conclusion depends on the permutation scheme. It does not establish how often the per-fold procedure rejects when its intended null is true.

Calibration would require, for example, repeated datasets generated under an appropriate known null and evaluation of the resulting rejection frequency, or an applicable theoretical justification. A null with no forecastable response is not automatically a null of feature–label independence; the paper's main simulation makes precisely that distinction.

For the current future-work paragraph, the smallest adequate correction is:

> rerunning the raw-change Case 1 analysis with whole-vector permutations as a sensitivity analysis

If formal calibration is also an intended future task, state it separately:

> and evaluating the per-fold procedure on repeated datasets generated under its intended null

No additional experiment is required merely to correct this sentence in the present narrative paper.

### 2. Give readers a direct route to the analysis artifacts

**Location:** page 7, Data and Code Availability and references [1]–[4]; `paper/story_template.tex:626–641`.

The previous version linked the code repositories and included version identifiers. The current version says the code and result records are “available from the authors”; the repository and companion-paper references now contain titles but no URLs or persistent identifiers.

That makes the audit harder to inspect, particularly because the methods and recommendations direct readers to the companion paper for technical details and reference code.

If these artifacts are intended to be public, restore a direct repository or archive link and identify the reviewed version with a commit, tag, or DOI. If the links were intentionally removed for the submission process, provide an accessible supplement or the appropriate reviewer-access route instead. This is a recommendation about traceability, not a request to change repository visibility or publish anything new.

### 3. Specify that correlation 0.3 applies to the latent marker levels

**Location:** page 3, Simulation methods; `paper/story_template.tex:297–300`.

The simulation is described as having “inter-marker correlation 0.3.” In `simulation/sim_pairing_null.py:69`, the persistent latent marker levels have this correlation. Line 74 adds independent measurement noise to form the observed baseline markers. Consequently, their population correlation is `0.3 * r`, not 0.3 across all reliability settings.

Change the phrase to:

> 11 outcome markers with correlation 0.3 between their persistent latent levels

This is a description correction. It does not imply a problem with the implemented simulation or require changing the results.

## PDF and structure assessment

The expanded literature review, methods, and results sections make the paper easier to navigate without losing the case-based account. Table I appears on page 2, Table II on page 3, Figure 1 on page 4, and the enlarged Figure 2 on page 5. The title, author blocks, equations, captions, checklist, and references render coherently.

The PDF is now **seven pages**, compared with six in the previous review. The added space supports a readable simulation figure and clearer methods. Whether seven pages is acceptable depends on the actual submission requirements; no maximum is inferred from the example template.

There is no need for another structural rewrite based on this review. The remaining work is the calibration wording, artifact traceability, and the latent-correlation clarification, followed by a final PDF check after those edits.
