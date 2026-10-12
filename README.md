# Validated, yet Wrong

Code, results and LaTeX source for the paper *Validated, yet Wrong: Four Ways
Small-n Metabolomics Machine Learning Passes Standard Checks* (draft).

Authors: Chaiyaporn Orrudee, Kanin Calvin Shomwiwat. Artificial Intelligence
Technology, School of Information Technology, KMITL.

Four cases on public NMR metabolomics data in which cross-validation, a
permutation test, or an attribution check passes while the result is wrong,
plus a simulation of when label permutation fails on change-score outcomes.

## Layout

| Path | Contents |
|---|---|
| `paper/` | `main.tex` (IEEEtran), `main.pdf`. Build: `cd paper && tectonic main.tex` |
| `simulation/` | `sim_pairing_null.py` (36,000 datasets), `summarize.py`, `results/` |
| `experiments/case1/` | MTBLS242 responder forecast: original, per-marker and joint residualisation |
| `experiments/case1b_mtbls881/` | Case 1 replication on MTBLS881, with `PREREG.md` written before fitting |
| `experiments/case2/` | Recursive ROAR, 500-draw random null, spiked-artefact control |
| `experiments/case3/` | MTBLS1 metadata audit and batch-only classifier |
| `experiments/refs/` | Reference verification and second-dataset candidates |
| `figures/` | Figures used in the paper |
| `data/` | Download instructions only |

Every `RESULTS.md` lists each number with its script, seed and command.

## Reproduce

Python 3.11 with numpy, pandas, scikit-learn, xgboost, shap, scipy and
matplotlib (we used a conda env; versions are recorded in each `RESULTS.md`).

```bash
# Simulation (about 11 minutes on 8 cores)
python simulation/sim_pairing_null.py
python simulation/summarize.py
python simulation/sim_pairing_null.py --check   # pure-noise sanity: expect about 5%
```

Data locations are set by environment variables; the defaults are the
authors' local paths.

| Variable | Points to |
|---|---|
| `MTBLS242_FORECAST_DIR` | Folder with the MTBLS242 files and the forecast code (`controls.py`, `forecast_responder_pr_auc.py`, `monotone_logistic.py`) |
| `MTBLS1_META_DIR` | MTBLS1 sample and assay sheets |
| `MTBLS1_NMRML_DIR` | MTBLS1 nmrML files |

Cases 1 and 1b import the forecast code from the `mtbls242-forecast-honest`
repository (`MTBLS242_forecast/`), which is not part of this repository.

## Status

Draft. Open items are red `\todo{}` in `paper/main.tex`: repository URL,
funding, venue-specific AI-use wording. Three references (`han2022`,
`adebayo2018`, `kumar2020`) need a final check.

No licence has been chosen yet.
