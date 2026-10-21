# Second review of `story_template.tex`

Reviewed: 21 October 2026. Source: the current 607-line revision.

**Overall score: 8.5/10 as a narrative/perspective paper, up from 8/10.**

The paper now presents its central argument clearly and with substantially better evidential restraint: a predictive check does not establish the biological interpretation attached to a score. The previous review's main framing concerns have been addressed. The remaining work is a targeted scientific-precision and consistency pass. This score assesses the draft in its chosen narrative/perspective format; it is not a prediction of acceptance at a particular venue.

## What improved

- **Abstract and conclusion:** the paper now says the analyses were initially treated as validated, explicitly identifies the uncalibrated permutation procedure, and labels the ROAR comparisons exploratory.
- **Compound provenance:** the three compounds are described neutrally as having uncertain provenance. Biological origins, handling effects, and mixtures of the two are distinguished.
- **Replication design:** the text identifies the same 47 patients sampled at two anatomical sites, names the primary site, and explains that these are correlated observations rather than two independent replications.
- **Recommendations:** asking questions of existing records is distinguished from collecting new measurements to resolve the problems they reveal.
- **Numerical interpretation:** the revised outcome, changing prevalence, pooled versus per-fold AP summaries, confidence interval, and Case 4 ROC-AUC summaries are explained more carefully.
- **Scope:** shared data and tasks across Stories 2 and 4, overlapping demographic eligibility ranges in Story 3, and the limits of the simulation receive appropriate qualifications.
- **Template source:** the title now explicitly uses italic styling. Actual rendered compliance still needs verification.

These are substantive improvements. The disclosed empirical limitations should not be presented again as though the author has failed to acknowledge them.

## Remaining findings

### 1. Qualify the claim that outcome construction guarantees dependence

**Location:** `paper/story_template.tex:99–103`; related general explanation at `133–139`.

The introduction says the way the label is built “guarantees” an association. That is too general for an outcome computed from both baseline and a future measurement. A nonconstant deterministic label computed solely from the predictors is dependent on them, but that is not the exact construction used here.

For a simple counterexample, let follow-up be `x12 = x0 + epsilon`, where `epsilon` is independent of baseline `x0`. Then change is `x12 - x0 = epsilon`; a fixed threshold on that change can be independent of baseline despite baseline appearing in the arithmetic. The same construction extends to a vector of changes and a fixed responder rule.

This does not undermine the observed baseline–change correlation or the paper's measurement-noise simulation. It means the claim needs to be tied to the generating process rather than asserted universally.

Suggested wording:

> Building a change-based label from baseline and follow-up measurements can induce baseline–label dependence through measurement error and regression to the mean. Our simulation shows how this can generate predictive structure without forecastable response.

Also describe the historical permutation result as an apparent indication of association, rather than independent proof, given its explicitly unverified calibration.

### 2. Distinguish the simulation's raw and residualised permutation schemes

**Location:** `paper/story_template.tex:278–287`.

The new distinction between simulation and empirical analysis is helpful, but “the simulation … permuted the whole label vector” is still broader than the implementation.

- The **raw-change arm** uses whole-vector label permutations and refits the model: `simulation/sim_pairing_null.py`, function `perm_pvalue`.
- The **residualised arms** permute each fold's training labels while keeping its held-out labels fixed: function `residualised_test`.

Readers could otherwise assume that the 26%–100%, 8%–29%, and 5%–8% rates all come from the same permutation procedure. Specify the distinction without implying that the raw simulation calibrates the historical empirical test.

Suggested wording:

> The raw-change simulation used whole-vector label permutations before cross-validation with ridge regression. The residualised arms used fold-specific labels and shuffled training labels within each fold, leaving held-out labels fixed. These simulations do not establish calibration of the historical empirical procedure.

The reported residualised rejection rates remain useful results under their stated simulation settings; they are not a general calibration guarantee.

### 3. Separate lack of demonstrated improvement from lower point estimates

**Location:** `paper/story_template.tex:293–295`.

The replication says the model “did not beat the unfitted score” at both sites. That wording obscures the positive pulmonary-artery point estimate recorded in `experiments/case1b_mtbls881/RESULTS.md:38–41`:

| Raw-change outcome | Model mean-fold AP | Scorer mean-fold AP | Reported pooled gap [95% CI] |
|---|---:|---:|---:|
| Left atrium | 0.632 | 0.695 | −0.037 [−0.231, +0.118] |
| Pulmonary artery | 0.757 | 0.723 | +0.013 [−0.111, +0.154] |

The pooled gaps use a different summary from the displayed mean-fold AP values, so they are not their arithmetic differences. Both intervals include zero. The defensible conclusion concerns uncertainty, not both model point estimates being lower.

Suggested wording:

> Neither site demonstrated an improvement over the unfitted score; the confidence interval for the model–scorer gap included zero at both sites.

### 4. Carry the improved caveats through captions and discussion

Several shorter statements retain stronger language than the now-careful abstract and limitations. These need wording changes, not necessarily new experiments for the present narrative framing.

| Location | Current wording | Suggested direction |
|---|---|---|
| Abstract, lines 63–65 | Model did no better “because” the outcome used its features | Separate the comparison from the proposed explanation: coupling can explain predictive performance without establishing why the model scored below the comparator. |
| Story 1, line 253 | “remove the coupling” | “address linear baseline–change coupling,” consistent with the stated scope of residualisation. |
| Figure 1, lines 304–305 | “the model passes” | “the historical, uncalibrated diagnostic returned p = 0.001.” |
| Story 2, line 337; discussion, lines 526–527 | “ROAR was right” / “shows which features” | “Exploratory removal results suggest reliance on these features,” preserving the full-data ranking caveat. |
| Limitations, lines 547–548 | “The checks we discuss are necessary” | “These checks can be useful when matched to their assumptions and target.” Their universal necessity has not been established. |

## What this revision can reasonably claim

The paper supports a useful account of how apparently reassuring checks can coexist with unsupported biological interpretations. It now distinguishes that account from formal validation of every historical procedure. Retaining an uncalibrated diagnostic and exploratory ROAR analysis is defensible in this format when their status remains consistent throughout the paper.

Stronger claims about test calibration, unbiased feature-ranking performance, or biological provenance would require additional evidence. Those are different ambitions from the present narrative and should not be prerequisites invented for this review.

## Verification and finishing work

- Read the current manuscript and the previous review; inspected relevant simulation code and recorded experimental results. No experiments were rerun.
- Static source checks found no missing citation keys, unresolved source reference labels, missing included figure files, or active body TODO calls. These checks do not establish that every cited source supports every claim.
- No manuscript text was edited during this review.
- No LaTeX engine was available on PATH and no compiled `story_template.pdf` was present. Page count, overflows, float placement, font rendering, and final template compliance remain unverified.
- Before sharing the final version, complete the wording corrections above, compile and inspect the PDF, and resolve the commented release-tag reminder if an archived version is intended.

**Assessment:** a strong, readable perspective draft with its main earlier framing problems resolved. The remaining issues are specific and repairable; they do not require restructuring the four-story argument.
