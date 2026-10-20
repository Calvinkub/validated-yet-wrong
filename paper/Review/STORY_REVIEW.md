# Review of `story.tex`

**Overall score: 7/10 as a narrative/perspective draft.**

The writing is engaging and the argument is useful, but several scientific claims need tightening before submission.

## Review scope

The full draft was read, and key claims were cross-checked against `main.tex`, the recorded experimental results, and selected references. This is a content review; the experiments were not rerun and the compiled layout was not assessed. Line references below refer to the version reviewed on 20 October 2026 and may shift after edits.

## What works well

The opening contrast—PR-AUC **0.683** with *p* = **0.001**, versus **0.709** from an unfitted score—is effective. It immediately gives readers a reason to care.

The repeated “What we believed → Why the check passed → What we found → The lesson” structure makes the four cases easy to follow. Auditing the authors’ own work also gives the paper a distinctive perspective. The practical questions at the end make the argument useful beyond these datasets.

## Priority revisions

### 1. Correct the central explanation of hypothesis testing

At `story.tex:102`, “Each standard check is a hypothesis test” is too broad: cross-validation estimates predictive performance and does not inherently specify a null hypothesis.

Similarly, describing label permutation as becoming “more wrong” confuses a misleading biological interpretation with rejection of the test’s actual null. Coupling creates an association, so independence is already false. The cited [Ojala and Garriga paper](https://www.jmlr.org/papers/v11/ojala10a.html) helps establish this distinction.

A stronger central statement would be:

> The checks detected predictive structure, but did not establish the biological interpretations attached to it.

### 2. Keep uncertain mechanisms uncertain throughout the paper

The abstract (`story.tex:49`) and conclusion (`story.tex:405`) sound more certain than the limitations. The analyses demonstrate that disease and protocol effects cannot be separated; they do not establish that the classifier used only protocol effects. Likewise, handling contamination remains unconfirmed.

[Engelke et al.](https://pubmed.ncbi.nlm.nih.gov/15996001/) identifies dimethyl sulfone as a regular metabolite, while [van der Sar et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC4446525/) studies ethanol contamination in cerebrospinal fluid. These do not establish contamination of the serum samples used here.

Frame the cases as **unsupported or unidentifiable biological interpretations** where appropriate.

### 3. Fix Figure 1’s “same model” claim and restore the conservative-null caveat

The caption at `story.tex:208` says “Same model, same data.” However, the recorded **2.04×** pairing-null result uses the unfitted scorer; the full-model refitting result is **1.99×**. Disclose the distinction or update the figure.

Also restore the explanation from `main.tex`: this control can be conservative, so failing to exceed it does **not** establish an absence of real response signal.

### 4. Disclose the additional changes in the corrected analysis

At `story.tex:178`, the transition to PR-AUC **0.554** sounds like residualisation was the only change. The recorded design also changes the responder threshold from **9/11 to 6/11**, removes three features, and changes prevalence. Readers need those details.

Explain that residualisation changes what “response” means and may remove genuine baseline-dependent biology. For the interval spanning zero, use **“we found no evidence of improvement over the unfitted score”** rather than implying equivalence.

### 5. Restore essential methodological qualifications

Two omissions matter especially in a paper about validation:

- Story 3 uses inferred patient groupings because individual membership is incomplete.
- Story 2 computes SHAP rankings using the full dataset, including evaluation samples.

State these limitations briefly. A compact methods table could also identify each model, sample size, CV scheme, and how average precision was aggregated.

### 6. Make the abstract accurately describe the four audits

At `story.tex:44–47`, the wording implies that every analysis passed all three checks. The case table documents different checks for different analyses. Say **“each passed its corresponding validation checks.”**

Also qualify the **26% → 100%** simulation example with its setting, rather than presenting it as a universal rate.

## Outstanding author confirmations

Two visible TODOs remain:

- `story.tex:183`: add the authors’ account of what first prompted doubt about the *p* = 0.001 result and how long it took.
- `story.tex:384`: confirm that the earlier repositories or poster were corrected or annotated, or revise the paragraph to describe what was actually done.

The second item requires factual confirmation before the paper can claim that the earlier results have been corrected.

## Editorial recommendation

Preserve the opening and four-story structure. The largest improvement will come from making the abstract, case conclusions, and final paragraph as careful as the limitations section.
