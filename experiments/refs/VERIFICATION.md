# Reference verification (2026-10-12)

Sources: Crossref API, PubMed E-utilities, MetaboLights API, JMLR and NeurIPS proceedings pages (citation_* meta tags). Pages not machine-verifiable are omitted from bib_corrected.tex rather than guessed.

## Existing bibitems

| Key | Status | Notes |
|---|---|---|
| mtbls242 | verified | MTBLS242 exists in MetaboLights; title matches Gralka 2015. Consider adding "accessed" date. |
| gralka2015 | verified | Crossref: 6 authors match, AJCN 102(6):1313-1322, Dec 2015, DOI as in paper. Added month. |
| salek2007 | corrected | Removed \todo. Verified Physiol Genomics 29(2):99-108, Apr 2007, 12 authors (et al. fine). Added DOI 10.1152/physiolgenomics.00194.2006. |
| haug2020 | corrected | Removed \todo. Verified NAR 48(D1):D440-D444 (PubMed: 2020 Jan 8; Crossref online 2019). DOI 10.1093/nar/gkz1019 added. |
| oldham1962 | corrected | Pages 969-977 CONFIRMED (Crossref). Added issue 10 and DOI 10.1016/0021-9681(62)90116-9. Note: a 1963 follow-up by Oldham exists (J Chronic Dis 16:1217-1219) - not the paper cited. |
| tu2007 | corrected | Removed \todo. Verified Stat Med 26(2):443-457; first published online 2006, print Jan 2007. DOI 10.1002/sim.2538. (A 2007 letter by Funatogawa exists, 10.1002/sim.2723; not the same item.) |
| barnett2005 | corrected | Verified IJE 34(1):215-220. Crossref indexes the online date as 2004 and lists only A. G. Barnett on the main record, but the three-author list is correct (confirmed by the 2015 correction record). Print year 2005 kept. DOI 10.1093/ije/dyh299 added. |
| kapoor2023 | verified | Patterns 4(9):100804. DOI 10.1016/j.patter.2023.100804 added. |
| leek2010 | verified | NRG 11(10):733-739, DOI 10.1038/nrg2825 added. |
| collins2024 | corrected | Verified BMJ 385:e078378, DOI 10.1136/bmj-2023-078378. Crossref also holds a separate stub DOI 10.1136/bmj.q902 (no authors); use the former. |
| hooker2019 | verified (no pages) | NeurIPS 2019, vol. 32, authors match. Page range not verifiable (NeurIPS pages carry none); omitted. |
| lundberg2017 | verified (no pages) | NeurIPS 2017, vol. 30, authors match. Pages omitted for same reason. |
| ojala2010 | verified | JMLR 11:1833-1863 confirmed on jmlr.org (issue 62). Note: an earlier 2009 ICDM paper with the same title (10.1109/icdm.2009.108, pp. 908-913) is a different, shorter paper. |
| chen2016 | corrected | KDD 2016 pp. 785-794 confirmed (Crossref). Added full venue name and DOI 10.1145/2939672.2939785. |

MTBLS1 = Salek 2007: CONFIRMED. The MetaboLights record for MTBLS1 ("A metabolomic study of urinary changes in type 2 diabetes in human compared to the control group") lists as its publication exactly Salek et al., Physiol Genomics, doi 10.1152/physiolgenomics.00194.2006, PMID 17190852. Optional extra cite: Griffin et al., BMC Res Notes 4:272 (2011), doi 10.1186/1756-0500-4-272, a metadata paper describing this dataset (verified). The paper's "132 samples / ~42 subjects" claim is NOT checked here.

## New references (all verified in Crossref/PubMed unless noted)

| Key | Topic | Verified details |
|---|---|---|
| archie1981 | mathematical coupling | Ann Surg 193(3):296-303, 10.1097/00000658-198103000-00008 |
| vickers2001 | change scores, ANCOVA | BMJ 323:1123-1124, 10.1136/bmj.323.7321.1123 |
| glymour2005 | baseline adjustment in change analyses | AJE 162(3):267-278, 10.1093/aje/kwi187 |
| teahan2006 | analytical bias, serum NMR/metabonomics | Anal Chem 78(13):4307-4318, 10.1021/ac051972y |
| wehrens2016 | batch correction in MS metabolomics | Metabolomics 12(5):88, 10.1007/s11306-016-1015-8 |
| han2022 | batch effects review | Mass Spectrom Rev 41(3):421-442, 10.1002/mas.21672. Crossref gives 2020 (online); volume 41 corresponds to 2022 - re-check year before submission. |
| adebayo2018 | saliency checks | NeurIPS 31, authors confirmed from proceedings page; pages omitted |
| kumar2020 | SHAP as importance measure | ICML 2020, PMLR 119:5491-5500 (proceedings page); no DOI |
| vandersar2015 | exogenous ethanol contamination, NMR | Anal Bioanal Chem 407(16):4835-4839, 10.1007/s00216-015-8663-9 (CSF, not serum) |
| pappas1993 | NMR detection of exogenous volatiles | J Anal Toxicol 17(5):273-277 (PubMed 8107460); no DOI found. Search snippet said it covers ethanol, isopropanol, acetone, methanol in serum; I did NOT read the full text - confirm before citing for isopropanol specifically. |
| bernini2011 | pre-analytical SOPs, NMR | J Biomol NMR 49(3-4):231-243, 10.1007/s10858-011-9489-1 |
| westerhuis2008 | PLS-DA CV pitfalls | Metabolomics 4(1):81-89, 10.1007/s11306-007-0099-6 |
| varma2006 | CV bias with model selection | BMC Bioinf 7:91, 10.1186/1471-2105-7-91 |
| varoquaux2018 | small-n CV error bars | NeuroImage 180:68-77, 10.1016/j.neuroimage.2017.06.061 |
| broadhurst2006 | false discoveries in metabolomics | Metabolomics 2(4):171-196, 10.1007/s11306-006-0037-z |
| maltesen2020, maltesen2017, rodriguez2011 | dataset papers | see DATASET_CANDIDATES.md |

Gaps (honest): I found no peer-reviewed paper specifically on isopropanol/methanol as sample-handling artefacts in serum NMR metabolomics; the closest verified items are vandersar2015 (ethanol, CSF), pappas1993, and bernini2011. Likewise no published critique specifically of ROAR-vs-contaminants; adebayo2018 and kumar2020 support the general faithfulness-vs-validity point. Fulmer et al. 2010 (Organometallics 29:2176, 10.1021/om100106e) is verified and gives shifts of trace solvents (including isopropanol, methanol) but in organic deuterated solvents, not biofluids; not added to the .tex. Kumar 2020 and Adebayo 2018 were checked for authors/volume only. Not checked: the paper's body-text claims.
