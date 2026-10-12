"""Figure for Case 2 from results/summary.json (run after run_case2.py summarize)."""
import json
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

R = Path(__file__).resolve().parent / "results"
FIG = Path(__file__).resolve().parents[2] / "figures"
S = json.load(open(R / "summary.json"))
c = S["curve"]
k = np.array([x["k"] for x in c])
base = S["baseline"]["baseline_grouped"]["mean"]
g = lambda key: np.array([x[key] for x in c])
plt.rcParams.update({"font.size": 7, "font.family": "sans-serif"})
fig, ax = plt.subplots(figsize=(3.5, 2.7))
ax.fill_between(k, g("null_p2_5"), g("null_p97_5"), color="#b8c4d6", alpha=.7, lw=0,
                label="Random removal, 95% band (500 draws/k)")
ax.plot(k, g("null_p50"), color="#5a6b87", lw=1, ls="--", label="Random removal, median")
ax.axhline(base, color="k", lw=.5, ls=":")
ax.plot(k, g("recursive_pr_auc"), "o-", color="#c0392b", ms=3, lw=1.3,
        label="Recursive ROAR (top SHAP re-ranked)")
cm = {x["group"]: x for x in S["contrast_k3"]}
ca, bi = cm["contaminant_trio"], cm["biology_trio"]
ax.plot([3], [ca["pr_auc"]], "s", color="#e67e22", ms=6, mfc="none", mew=1.4,
        label=f"Contaminant trio (null pct. {ca['pct_in_null_k3']:.1f})")
ax.plot([3], [bi["pr_auc"]], "^", color="#27ae60", ms=6, mfc="none", mew=1.4,
        label=f"Biology trio (null pct. {bi['pct_in_null_k3']:.1f})")
ax.set_xlabel("Features removed, $k$")
ax.set_ylabel("PR-AUC (subject-grouped CV)")
ax.set_xticks(range(1, 12))
ax.set_ylim(0.78, 0.99)
ax.text(11, base + .002, f"baseline {base:.3f}", ha="right", va="bottom", fontsize=6)
ax.legend(loc="lower left", fontsize=5.8, frameon=False)
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
fig.tight_layout()
fig.savefig(FIG / "case2_roar.pdf")
fig.savefig(FIG / "case2_roar.png", dpi=300)
