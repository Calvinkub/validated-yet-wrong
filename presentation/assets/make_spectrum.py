"""Schematic 1H-NMR serum spectrum for the slide deck. NOT real data: peaks are synthetic
Lorentzians placed near the textbook chemical shifts of a few metabolites, for explanation only."""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

INK, MUTED, ORANGE, BLUE = "#1B2430", "#5B6470", "#EB6834", "#2A78D6"
# (ppm, height, width, label, colour); ppm values are approximate literature shifts
peaks = [(0.99, 0.55, 0.012, "valine", BLUE), (1.17, 0.45, 0.010, "isopropanol", ORANGE),
         (1.33, 0.95, 0.012, "lactate", BLUE), (1.48, 0.50, 0.012, "alanine", BLUE),
         (1.92, 0.40, 0.008, "acetate", BLUE), (3.14, 0.55, 0.008, "dimethyl\nsulfone", ORANGE),
         (3.36, 0.50, 0.008, "methanol", ORANGE), (3.56, 0.62, 0.008, "glycine", BLUE)]
x = np.linspace(4.2, 0.5, 6000)
y = np.zeros_like(x)
for ppm, h, w, *_ in peaks:
    y += h * (w ** 2) / ((x - ppm) ** 2 + w ** 2)
rng = np.random.default_rng(3)
y += 0.012 * rng.standard_normal(x.size) + 0.03 * np.exp(-((x - 2.4) / 0.9) ** 2)
fig, ax = plt.subplots(figsize=(6.4, 3.4), dpi=220)
ax.plot(x, y, color=INK, lw=1.1)
for ppm, h, w, label, col in peaks:
    ax.annotate(label.replace("\n", " "), (ppm, h + 0.04), ha="center", va="bottom", rotation=90, fontsize=9, color=col, fontweight="bold")
ax.set_xlim(4.2, 0.5); ax.set_ylim(-0.05, 1.6)
ax.set_xlabel("chemical shift (ppm)", color=MUTED, fontsize=10); ax.set_yticks([])
for s in ("top", "right", "left"): ax.spines[s].set_visible(False)
ax.spines["bottom"].set_color(MUTED); ax.tick_params(colors=MUTED, labelsize=9)
fig.tight_layout(); fig.savefig("nmr_schematic.png", facecolor="white"); print("ok")
