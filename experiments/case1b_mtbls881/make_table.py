"""Writes table.tex from results/summary_case1b.json (main variant only)."""
import json
from pathlib import Path
H = Path(__file__).resolve().parent
s = json.load(open(H / "results/summary_case1b.json"))
lab = {"raw": "Raw change", "permarker": "Per-marker resid.", "joint": "Joint resid."}
site_lab = {"Left atrium": "LA", "Pulmonary artery": "PA"}
def pfmt(p): return f"{p:.3f}" if p >= 0.001 else "<0.001"
L = [r"\begin{tabular}{llrrrrrrr}", r"\toprule",
     r"Site & Outcome & Prev. & PR-AUC & Scorer & Gap [95\% CI] & $p_{\mathrm{perm}}$ & Lift & Pair-null lift \\",
     r" & & & & PR-AUC & & (refit) & & med. (p95) \\", r"\midrule"]
for site, S in s["sites"].items():
    for d in ("raw", "permarker", "joint"):
        r = S[f"main_{d}"]; g = r["gap_subject_bootstrap"]; pn = r["pairing_null_scorer"]
        L.append(f"{site_lab[site]} & {lab[d]} ($K{{=}}{r['K']}$) & {r['prevalence']:.2f} & {r['model_pr_auc']:.3f} & "
                 f"{r['scorer_pr_auc']:.3f} & ${g['point']:+.3f}$ [${g['ci95'][0]:+.3f}$, ${g['ci95'][1]:+.3f}$] & "
                 f"{pfmt(r['permutation_refit']['p'])} & {r['lift']:.2f} & {pn['median_lift']:.2f} ({pn['p95_lift']:.2f}) \\\\")
    if site != list(s["sites"])[-1]: L.append(r"\midrule")
L += [r"\bottomrule", r"\end{tabular}"]
(H / "table.tex").write_text("\n".join(L) + "\n")
print("\n".join(L))
