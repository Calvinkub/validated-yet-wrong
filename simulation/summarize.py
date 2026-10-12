"""Summarise sim_rows.jsonl into a rejection-rate table (CSV + LaTeX) and a figure."""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.ticker
import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
RESULTS = HERE / "results"
FIGURES = HERE.parent / "figures"
TESTS = {"p_perm_raw": "Label permutation", "p_pair": "Pairing-destroyed null",
         "p_perm_resid": "Per-marker resid. + perm.", "p_perm_resid_joint": "Joint resid. + perm."}
ALPHA = 0.05


def wilson(k, n, z=1.96):
    p = k / n
    centre = (p + z**2 / (2 * n)) / (1 + z**2 / n)
    half = z * np.sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / (1 + z**2 / n)
    return centre - half, centre + half


def main():
    rows = [json.loads(line) for line in open(RESULTS / "sim_rows.jsonl")]
    df = pd.DataFrame(rows)

    records = []
    for (n, r, gamma), cell in df.groupby(["n", "r", "gamma"]):
        rec = {"n": n, "r": r, "gamma": gamma, "datasets": len(cell),
               "corr_base_change": cell.corr_base_change.median(),
               "lift": cell.lift.mean(), "null_lift": cell.null_lift_median.mean(),
               "oracle_lift": cell.oracle_lift.mean()}
        for col in TESTS:
            p = cell[col].dropna()
            k = int((p <= ALPHA).sum())
            lo, hi = wilson(k, len(p))
            rec[col] = k / len(p)
            rec[col + "_lo"], rec[col + "_hi"] = lo, hi
        records.append(rec)
    table = pd.DataFrame(records).sort_values(["gamma", "r", "n"])
    table.to_csv(RESULTS / "rejection_rates.csv", index=False)

    # LaTeX table: rejection rate (%) per test.
    lines = [r"\begin{tabular}{@{}rrr rrrr@{}}", r"\toprule",
             r"$\gamma$ & $r$ & $n$ & Perm. & Pair-null & Resid. & Joint resid. \\", r"\midrule"]
    for _, t in table.iterrows():
        lines.append(f"{t.gamma:.2f} & {t.r:.2f} & {int(t.n)} & "
                     + " & ".join(f"{100 * t[c]:.1f}" for c in TESTS) + r" \\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    (RESULTS / "rejection_rates.tex").write_text("\n".join(lines) + "\n")

    # Figure: rejection rate vs n, rows = gamma, columns = reliability.
    FIGURES.mkdir(exist_ok=True)
    gammas, rs = sorted(table.gamma.unique()), sorted(table.r.unique())
    fig, axes = plt.subplots(len(gammas), len(rs), figsize=(7.2, 6.4), sharex=True, sharey=True)
    colors = {"p_perm_raw": "#c0392b", "p_pair": "#2c3e50", "p_perm_resid": "#e67e22",
              "p_perm_resid_joint": "#2980b9"}
    for i, gamma in enumerate(gammas):
        for j, r in enumerate(rs):
            ax = axes[i, j]
            cell = table[(table.gamma == gamma) & (table.r == r)].sort_values("n")
            for col, label in TESTS.items():
                ax.errorbar(cell.n, cell[col], yerr=[cell[col] - cell[col + "_lo"], cell[col + "_hi"] - cell[col]],
                            marker="o", ms=3, lw=1.2, capsize=2, color=colors[col], label=label)
            ax.axhline(ALPHA, color="grey", lw=0.8, ls="--")
            ax.set_xscale("log")
            ax.set_xticks([50, 100, 200, 500], ["50", "100", "200", "500"])
            ax.xaxis.set_minor_formatter(matplotlib.ticker.NullFormatter())
            ax.set_ylim(-0.02, 1.02)
            if i == 0:
                ax.set_title(f"reliability r = {r}", fontsize=9)
            if j == 0:
                ax.set_ylabel(("False-positive rate" if gamma == 0 else "Power") + f"\n$\\gamma$ = {gamma}", fontsize=9)
            if i == len(gammas) - 1:
                ax.set_xlabel("n subjects", fontsize=9)
            ax.tick_params(labelsize=8)
    axes[0, 0].legend(fontsize=7, loc="upper left", frameon=False)
    fig.tight_layout()
    fig.savefig(FIGURES / "sim_rejection.pdf")
    fig.savefig(FIGURES / "sim_rejection.png", dpi=200)
    print(table.round(3).to_string(index=False))


if __name__ == "__main__":
    main()
