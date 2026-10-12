# Data

Public datasets are not redistributed here. Download them from the source.

| Dataset | Used in | Source | Notes |
|---|---|---|---|
| MTBLS242 | Cases 1, 2, 4 | https://www.ebi.ac.uk/metabolights/MTBLS242 | files `m_MTBLS242_v2_maf.tsv`, `s_MTBLS242.txt` |
| MTBLS1 | Case 3 | https://www.ebi.ac.uk/metabolights/MTBLS1 | sample and assay sheets, plus the 132 nmrML files |
| MTBLS881 | Case 1 replication | https://www.ebi.ac.uk/metabolights/MTBLS881 | put the `i_`, `s_`, `a_` and `m_*_maf.tsv` files in `data/MTBLS881/` |

`ST000387` (HERITAGE, Metabolomics Workbench) was downloaded while choosing a
second dataset but is not used in the paper.

Scripts read these paths from environment variables; see the top-level README.
