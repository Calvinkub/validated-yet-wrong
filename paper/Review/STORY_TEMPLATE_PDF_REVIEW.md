# Review of the compiled `story_template.pdf`

Reviewed: 21 October 2026.

**Overall score: 8.5/10 as a narrative/perspective paper.**

The six-page PDF is readable and visually coherent. The italic title, bold abstract, keywords, section hierarchy, tables, equations, and references render successfully. The compiled version resolves the previous uncertainty about basic layout. The main newly visible weakness is Figure 2: its nine panels are too small at the published column width.

The scientific assessment remains 8.5/10 because the four wording issues in the previous review remain in this PDF. Producing a clean PDF improves confidence in presentation, but does not resolve those content issues. This is an editorial assessment of the current draft, not a prediction of acceptance.

## Scope

- Reviewed `paper/story_template.pdf`, the newly generated narrative paper, rather than the older `paper/main.pdf` companion paper.
- Rendered and visually inspected all six pages using native PDFKit, and extracted their text. The pages are 612 by 792 points (US Letter).
- Compared the relevant passages with the current 611-line `paper/story_template.tex` and the previous review.
- Checked the simulation implementation, plotting code, and recorded replication results for the findings below.
- Did not edit the manuscript or PDF, rerun experiments, or independently audit every cited publication.

Page numbers below count from the first PDF page; the document does not print page numbers.

## What works in the PDF

- **Page 1:** the two-line title is prominent and readable. Author blocks align cleanly. The abstract and keyword styling now appears in the rendered document.
- **Page 3:** both full-width tables fit within the page. Headers, rules, and entries are legible, with no obvious overlap or clipped cells.
- **Page 4:** Figure 1 is readable and makes the contrast between the historical permutation result and the pairing-destroyed control easy to see.
- **Pages 5–6:** the checklist, limitations, conclusion, acknowledgments, and references flow cleanly. The conclusion retains the more restrained framing introduced in the earlier revision.
- Across all pages, I found no obvious clipped body text, overlapping elements, visible TODO markers, missing-glyph boxes, or unresolved `??` references. This is a visual and text check, not a LaTeX compilation-log audit.

## Priority findings

### 1. Enlarge Figure 2 and make its caption self-contained

**Location:** page 4, upper-right figure; `paper/story_template.tex:317–328`.

Nine panels are compressed into a single column. PDF text-size inspection gives approximately **3.39 pt for the legend, 3.87 pt for tick labels, and 4.36 pt for panel/axis labels**. These are substantially smaller than the surrounding caption and body text. The graphic remains sharp when zoomed, but its labels are difficult to read at ordinary page size.

Preferred options:

1. Use a two-column figure and retain all nine panels.
2. Show the three no-response panels at a larger size in this narrative paper, and direct readers to the companion paper for the remaining power scenarios.

The caption also omits two pieces of information needed to interpret the displayed panels:

- Define **gamma**, the strength of the simulated forecastable response. The plot shows gamma = 0, 0.25, and 0.5, but the current narrative does not explain that parameter or the lower two rows.
- Identify the **error bars**. The plotting implementation in `simulation/summarize.py` computes 95% Wilson intervals for the simulated rejection proportions.

The top-row axis says “False-positive rate,” while the narrative correctly explains that raw-change rejection can be valid evidence against independence. Prefer **“Rejection rate”**, with the caption explaining why interpreting these rejections as forecasting skill would be erroneous when gamma = 0. This preserves the distinction central to the paper.

Possible caption addition:

> Rows vary the strength of forecastable response (gamma = 0, 0.25, and 0.5); gamma = 0 contains no forecastable individual response. Error bars are 95% Wilson intervals for rejection proportions. Rejection of independence in the top row does not establish forecasting skill.

### 2. The dependence claim is still too universal

**Location:** page 1, introduction and Section II; source lines 103–105 and 141–143.

“The way the label was built guarantees” an association remains too broad for a label constructed from both baseline and follow-up. A nonconstant deterministic function of predictors alone is a different case.

For example, if follow-up equals baseline plus noise independent of baseline, change equals that independent noise. A fixed change threshold can then be independent of baseline despite the shared term in the formula.

Tie the claim to the measurement-noise mechanism and observed/simulated dependence:

> Building a label from baseline-to-follow-up change can induce baseline–label dependence through measurement error and regression to the mean.

This correction narrows the generalisation; it does not negate the reported simulation or observed correlation.

### 3. Specify which simulation arm uses which permutation scheme

**Location:** page 2, right column; source lines 282–291.

The text says “the simulation” permuted the whole label vector. In `simulation/sim_pairing_null.py`, that applies to the **raw-change arm** (`perm_pvalue`). The **residualised arms** use fold-specific labels, shuffle each fold's training labels, and hold its test labels fixed (`residualised_test`).

Add the distinction explicitly so readers do not attribute the raw-change and residualised rejection rates to one identical permutation procedure. Retain the existing caveat that the simulation does not establish calibration of the historical empirical procedure.

### 4. State the replication result as uncertain improvement

**Location:** end of page 2, continuing onto page 3; source lines 297–299.

“The model did not beat the unfitted score” is ambiguous because the pulmonary-artery model has a higher point estimate. The recorded raw-change results are:

| Site | Model mean-fold AP | Scorer mean-fold AP | Pooled model-minus-scorer gap [95% CI] |
|---|---:|---:|---:|
| Left atrium | 0.632 | 0.695 | -0.037 [-0.231, +0.118] |
| Pulmonary artery | 0.757 | 0.723 | +0.013 [-0.111, +0.154] |

Source: `experiments/case1b_mtbls881/RESULTS.md:38–41`. The pooled gaps and mean-fold AP values are different summaries, explaining why the gaps are not the arithmetic differences of the displayed AP means.

Suggested replacement:

> Neither site demonstrated an improvement over the unfitted score; both confidence intervals for the model–scorer gap included zero.

### 5. Make the remaining short statements match the stated limitations

These are the same consistency issues identified in the previous review:

| PDF location | Wording | Revision direction |
|---|---|---|
| Page 1, abstract | Model did no better “because” its outcome used its features | Separate the observed comparison from coupling as a possible explanation of predictive performance. |
| Page 2, right column | “remove the coupling” | “address linear baseline–change coupling.” |
| Page 4, Figure 1 caption | “the model passes” | Identify the result as the historical, uncalibrated diagnostic returning p = 0.001. |
| Page 3, Story 2; page 5, checklist discussion | “ROAR was right” / “shows which features” | Use language consistent with exploratory removals and the disclosed ranking-selection bias. |
| Page 5, final paragraph | “The checks we discuss are necessary” | Say they can be useful when matched to their assumptions and target; universal necessity is not established. |

## Smaller presentation refinements

- **Table II, page 3:** some narrow cells have visibly stretched spacing, particularly the model and metric columns. Ragged-right wrapping would improve readability. The table is already readable; this is polish rather than a blocking defect.
- **Float placement:** the tables are on page 3 and Story 1 figures on page 4, after the principal Story 1 discussion. Moving them closer to their first use would improve reading flow if the template permits it. Do not introduce manual spacing that creates new gaps just to force placement.
- Six pages is the verified length. No official venue page limit or complete submission specification was supplied, so this review does not certify formal submission compliance.

## Recommended next revision

Prioritise the Figure 2 size/caption, the dependence claim, the simulation-scheme distinction, and the replication wording. Then make the short consistency edits and render the PDF again to confirm that the new figure placement and text still fit cleanly.

The paper does not need a new narrative structure. Its four-story organisation, explicit limitations, and practical checklist are effective. The remaining work is focused: make the figures readable at final size and keep every claim at the same evidential level as the careful limitations section.
