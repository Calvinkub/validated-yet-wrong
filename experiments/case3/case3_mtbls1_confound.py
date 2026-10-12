"""Case 3 — MTBLS1 urine NMR, T2DM vs control (Salek et al. 2007, PMID 17190852).

Audit of the 'validated' subject-grouped CV result (PR-AUC 0.976) from
Bridge_ai_summit_nmr_2026/exp_t2dm_nmr_mtbls1.ipynb (commit 0088e38).

Sources (read-only, absolute paths, same files the original notebook used):
  META = /Users/admin/Project/BDI2/calvin/team/1_Tech_AI_ML/research/mtbls1_meta
     s_MTBLS1.txt  (ISA sample sheet), a_MTBLS1_..._NMR_spectroscopy.txt (assay sheet),
     i_Investigation.txt, m_MTBLS1_..._v2_maf.tsv (220 NMR variables x 132 samples)
  NMRML = /Users/admin/Project/BDI2/calvin/team/1_Tech_AI_ML/research/mtbls1_full/*.nmrML
     (132 per-sample nmrML files; acquisition/processing parameters parsed from headers)

Run:  /Users/admin/miniconda3/envs/superaiss6/bin/python case3_mtbls1_confound.py
Outputs (this folder): case3_output.txt (stdout), crosstab_counts.csv, acq_params.csv,
                       cv_results.csv, subject_groupings.csv
"""
import re, csv, glob, os, math
from collections import defaultdict
import numpy as np, pandas as pd
from sklearn.model_selection import StratifiedGroupKFold, StratifiedKFold
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from xgboost import XGBClassifier
import xgboost, sklearn

OUT = os.path.dirname(os.path.abspath(__file__))
META = os.environ.get('MTBLS1_META_DIR', '/Users/admin/Project/BDI2/calvin/team/1_Tech_AI_ML/research/mtbls1_meta')
NMRML = os.environ.get('MTBLS1_NMRML_DIR', '/Users/admin/Project/BDI2/calvin/team/1_Tech_AI_ML/research/mtbls1_full')
print(f'xgboost {xgboost.__version__}, sklearn {sklearn.__version__}, numpy {np.__version__}')

# ------------------------------------------------------------------ load (verbatim from notebook)
maf = pd.read_csv(f'{META}/m_MTBLS1_metabolite_profiling_NMR_spectroscopy_v2_maf.tsv', sep='\t')
samp_cols = [c for c in maf.columns if re.match(r'ADG', c)]
raw = []
for _, r in maf.iterrows():
    nm = str(r.get('metabolite_identification', '')).strip()
    raw.append(nm if nm and nm != 'nan' else f"shift_{r['chemical_shift']}")
seen = {}; names = []
for n in raw:
    n = re.sub(r'[\[\]<>]', '', n)
    seen[n] = seen.get(n, 0) + 1
    names.append(n if seen[n] == 1 else f'{n}_{seen[n]}')
X = maf[samp_cols].T.copy(); X.columns = names
X = X.apply(pd.to_numeric, errors='coerce').fillna(0.0)
Xlog = np.log1p(X.clip(lower=0))

S = pd.read_csv(f'{META}/s_MTBLS1.txt', sep='\t', dtype=str).set_index('Sample Name').loc[samp_cols]
A = pd.read_csv(f'{META}/a_MTBLS1_metabolite_profiling_NMR_spectroscopy.txt', sep='\t', dtype=str).set_index('Sample Name').loc[samp_cols]
y = (S['Factor Value[Metabolic syndrome]'] == 'diabetes mellitus').astype(int).values
label = np.where(y == 1, 'T2DM', 'Control')
prefix = np.array([s.split('_')[0] for s in samp_cols])
num = np.array([int(s.split('_')[1]) for s in samp_cols])
sex = S['Factor Value[Gender]'].values
print(f'samples={len(samp_cols)} features={Xlog.shape[1]} control={(y==0).sum()} T2DM={(y==1).sum()}')

# ------------------------------------------------------------------ 1. metadata cross-tabs
def cramers_v(a, b):
    ct = pd.crosstab(a, b).values
    if min(ct.shape) < 2: return float('nan')
    from scipy.stats import chi2_contingency
    chi2 = chi2_contingency(ct, correction=False)[0]
    return math.sqrt(chi2 / (ct.sum() * (min(ct.shape) - 1)))

print('\n=== 1a. label x prefix (samples) ===')
ct_prefix = pd.crosstab(prefix, label); print(ct_prefix)
print('\n=== 1b. label x sex (samples) ===')
ct_sex = pd.crosstab(sex, label); print(ct_sex)
print((ct_sex.loc['Male'] / ct_sex.sum()).round(3).rename('male fraction'))
print('\n=== 1c. label x prefix x sex (samples) ===')
ct3 = pd.crosstab([label, prefix], sex, margins=True); print(ct3)
ct3.to_csv(f'{OUT}/crosstab_counts.csv')

print('\n=== 1d. every s_/a_ metadata column vs label ===')
meta_rows = []
for src, D in [('s_MTBLS1', S.reset_index()), ('a_MTBLS1', A.reset_index())]:
    for j, c in enumerate(D.columns):
        v = D.iloc[:, j].fillna('<empty>').astype(str).values
        nun = len(set(v))
        if nun == 1:
            kind = 'constant'; cv = float('nan')
        elif nun == len(v):
            kind = 'unique per sample (ID / file path)'
            cv = float('nan')
        else:
            cv = cramers_v(v, label); kind = 'varies'
        meta_rows.append(dict(file=src, column=f'{c} [{j}]', n_unique=nun, kind=kind,
                              cramers_v_vs_label=round(cv, 3) if cv == cv else ''))
meta_df = pd.DataFrame(meta_rows)
print(meta_df[meta_df.kind != 'constant'].to_string(index=False))
print(f"constant columns: {(meta_df.kind=='constant').sum()} of {len(meta_df)}")
print(f"s_ 'Source Name' values: {S['Source Name'].value_counts().to_dict()}  "
      "(ISA source = subject slot; here one value for ALL 132 samples incl. controls -> no subject info)")
meta_df.to_csv(f'{OUT}/metadata_columns_vs_label.csv', index=False)
print('constant values in assay sheet (instrument etc.):')
for c in ['Parameter Value[Instrument]', 'Parameter Value[NMR Probe]', 'Parameter Value[Number of transients]',
          'Parameter Value[Pulse sequence name]', 'Parameter Value[Sample pH]', 'Parameter Value[Temperature]',
          'Acquisition Parameter Data File', 'Normalization Name', 'Data Transformation Name']:
    print(f'   {c}: {sorted(set(A[c].fillna("")))}')

# ------------------------------------------------------------------ 1e. nmrML acquisition/processing params
rows = []
for s in samp_cols:
    t = open(f'{NMRML}/{s}.nmrML').read()
    t = t[:20000] + t[-6000:]
    g = lambda pat: (re.search(pat, t).group(1) if re.search(pat, t) else None)
    rows.append(dict(sample=s,
        ns=int(g(r'numberOfScans="(\d+)"')),
        pulse_width_us=float(g(r'<pulseWidth value="([^"]+)"')),
        o1_MHz=float(g(r'<irradiationFrequency value="([^"]+)"')),
        sweep_Hz=float(g(r'<sweepWidth value="([^"]+)"')),
        d1_s=float(g(r'<relaxationDelay value="([^"]+)"')),
        temp_K=float(g(r'<sampleAcquisitionTemperature value="([^"]+)"')),
        phc0_deg=float(g(r'<zeroOrderPhaseCorrection value="([^"]+)"')),
        phc1_deg=float(g(r'<firstOrderPhaseCorrection value="([^"]+)"')),
        ppm_start=float(g(r'startValue="([^"]+)"')),
        probe=g(r'ProbeHead" value="([^"]+)"'),
        operator=g(r'contact id="\w+" fullname="([^"]*)"')))
acq = pd.DataFrame(rows).set_index('sample')
acq['prefix'] = prefix; acq['label'] = label
acq.to_csv(f'{OUT}/acq_params.csv')
print('\n=== 1e. nmrML header parameters by label ===')
for c in ['ns', 'pulse_width_us', 'o1_MHz', 'sweep_Hz', 'd1_s', 'temp_K', 'phc0_deg', 'phc1_deg', 'ppm_start', 'probe', 'operator']:
    v = acq[c]
    if v.nunique() == 1:
        print(f'   {c}: constant = {v.iloc[0]}'); continue
    if v.dtype == object or v.nunique() <= 4:
        print(f'   {c}:'); print(pd.crosstab(v, acq.label).to_string().replace('\n', '\n      '))
    else:
        auc_ = roc_auc_score(y, v); sep = max(auc_, 1 - auc_)
        gb = acq.groupby('label')[c].agg(['min', 'median', 'max'])
        print(f'   {c}: single-variable ROC-AUC vs label = {sep:.3f}')
        print('      ' + gb.round(4).to_string().replace('\n', '\n      '))

# ------------------------------------------------------------------ 4. subject reconstruction
def heuristic_groups(cols):  # verbatim from the notebook (gap<=3 within prefix)
    byg = defaultdict(list)
    for s in cols:
        p, n = s.split('_'); byg[p].append((int(n), s))
    out = {}; sid = 0
    for p, items in byg.items():
        items.sort(); prev = None
        for n, s in items:
            if prev is None or n - prev > 3: sid += 1
            out[s] = sid; prev = n
    return out
g_heur = np.array([heuristic_groups(samp_cols)[s] for s in samp_cols])

# Control numbering scheme: sample number = 10*k + t, t=1..7  -> subject k
# T2DM: protocol says 1-3 time points per patient. Constrained partition: split heuristic runs at
# sex changes, then into consecutive chunks of <=3 (the fewest subjects consistent with the protocol
# = the most conservative grouping that still obeys 'max 3 samples / patient' and 'one sex / patient').
def constrained_groups():
    out = {}; sid = 0
    order = sorted(range(len(samp_cols)), key=lambda i: (prefix[i], num[i]))
    runs = []; cur = []
    for i in order:
        if cur and (prefix[i] != prefix[cur[-1]] or num[i] - num[cur[-1]] > 3 or sex[i] != sex[cur[-1]] or
                    (prefix[i] == 'ADG19007u' and num[i] // 10 != num[cur[-1]] // 10)):
            runs.append(cur); cur = []
        cur.append(i)
    runs.append(cur)
    for r in runs:
        cap = 7 if prefix[r[0]] == 'ADG19007u' else 3
        for k in range(0, len(r), cap):
            sid += 1
            for i in r[k:k + cap]: out[i] = sid
    return np.array([out[i] for i in range(len(samp_cols))])
g_cons = constrained_groups()
g_ctrl10 = np.where(prefix == 'ADG19007u', 1000 + num // 10, g_cons)  # same as g_cons for controls (check)
assert (pd.Series(g_ctrl10).groupby(g_cons).nunique() == 1).all()

def describe(g, name):
    nc = len(set(g[y == 0])); nd = len(set(g[y == 1]))
    sizes = pd.Series(g[y == 1]).value_counts()
    mixed_sex = sum(len(set(sex[g == k])) > 1 for k in set(g))
    print(f'   {name}: subjects={nc+nd} (control={nc}, T2DM={nd}); T2DM group sizes={sorted(map(int, sizes.values), reverse=True)}; '
          f'groups with >3 T2DM samples={int((sizes>3).sum())}; groups mixing sexes={mixed_sex}')
print('\n=== 4. subject reconstruction ===')
describe(g_heur, 'notebook heuristic (gap<=3)')
describe(g_cons, 'constrained (gap<=3 + same sex + <=3/patient)')
ctrl_blocks = pd.Series(num[y == 0] // 10).value_counts().sort_index()
print(f'   controls: numbering 10k+t, blocks={len(ctrl_blocks)}, sizes={sorted(set(ctrl_blocks))}, t-values={sorted(set(num[y==0] % 10))}')
print(f'   control subjects by sex: {pd.Series(sex[y==0]).groupby(num[y==0]//10).first().value_counts().to_dict()}  (protocol: 8 M / 4 F)')
d_sex_cons = pd.Series(sex[y == 1]).groupby(g_cons[y == 1]).first().value_counts().to_dict()
print(f'   T2DM constrained subjects by sex: {d_sex_cons}  (protocol: 30 patients, 17 M / 13 F, 50 samples; deposited 48)')
print(f'   T2DM sample-level male fraction = {(sex[y==1]=="Male").mean():.3f}; protocol subject-level = {17/30:.3f}')
heur_viol = [(k, list(np.array(samp_cols)[g_heur == k]), list(sex[g_heur == k])) for k in set(g_heur)
             if len(set(sex[g_heur == k])) > 1 or ((g_heur == k) & (y == 1)).sum() > 3]
print('   heuristic groups that provably merge distinct patients (mixed sex or >3 samples):')
for k, ss, sx in sorted(heur_viol, key=lambda z: z[1]):
    print(f'      {[s.split("_")[1] for s in ss]}  sexes={"".join(x[0] for x in sx)}')
pd.DataFrame(dict(sample=samp_cols, label=label, sex=sex, g_heuristic=g_heur, g_constrained=g_cons)).to_csv(
    f'{OUT}/subject_groupings.csv', index=False)

# ------------------------------------------------------------------ CV machinery
MONO_BASE_DIRECTIONS = {
    'hippurate': -1, 'citrate': -1,
    'b-hydroxybutyrate': 1, 'b-hydroxy-n-butyrate': 1, 'acetoacetate': 1, 'acetone': 1,
    'a-Hydroxy-n-butyrate': 1, 'allantoin': 1, 'N-acetyl groups (glycoproteins)': 1,
    'alanine': 1, 'glutamine': 1, 'glutamate': 1, 'valine': 1, 'leucine': 1,
    'isoleucine': 1, 'tyrosine': 1, 'phenylalanine': 1, 'pyruvate': 1, 'lactate': 1,
    '2-oxoisovalerate': 1, 'indoxyl sulfate': 1, 'indoxyl sulphate': 1}
mono = {c: MONO_BASE_DIRECTIONS.get(re.sub(r'_[0-9]+$', '', c), 0) for c in Xlog.columns}
XGB = dict(n_estimators=200, max_depth=3, learning_rate=0.05, subsample=0.8, colsample_bytree=0.8,
           reg_lambda=1.0, eval_metric='logloss', random_state=42, n_jobs=-1, monotone_constraints=mono)
XGB_FREE = {k: v for k, v in XGB.items() if k != 'monotone_constraints'}

results = []
def run_cv(name, Xm, make_model, groups, seeds=(42,), grouping='heuristic'):
    per_seed = []
    for seed in seeds:
        cv = StratifiedGroupKFold(5, shuffle=True, random_state=seed)
        aps, aucs, oof = [], [], np.zeros(len(y))
        for tr, te in cv.split(Xm, y, groups):
            m = make_model().fit(Xm.iloc[tr] if hasattr(Xm, 'iloc') else Xm[tr], y[tr])
            p = m.predict_proba(Xm.iloc[te] if hasattr(Xm, 'iloc') else Xm[te])[:, 1]
            oof[te] = p
            aps.append(average_precision_score(y[te], p)); aucs.append(roc_auc_score(y[te], p))
        per_seed.append((np.mean(aps), np.std(aps), np.mean(aucs), np.std(aucs),
                         average_precision_score(y, oof), roc_auc_score(y, oof)))
    a = np.array(per_seed)
    r = dict(model=name, grouping=grouping, n_groups=len(set(groups)), seeds=len(seeds),
             pr_auc_foldmean=round(a[:, 0].mean(), 3), pr_auc_foldsd=round(a[:, 1].mean(), 3),
             roc_auc_foldmean=round(a[:, 2].mean(), 3), pr_auc_pooled_oof=round(a[:, 4].mean(), 3),
             roc_auc_pooled_oof=round(a[:, 5].mean(), 3),
             pr_auc_seed_range=f'{a[:,0].min():.3f}-{a[:,0].max():.3f}' if len(seeds) > 1 else '')
    results.append(r)
    print(f"   {name:<46} [{grouping}, {r['n_groups']} grp, {len(seeds)} seed] PR-AUC {r['pr_auc_foldmean']:.3f}"
          f" +/- {r['pr_auc_foldsd']:.3f} | ROC-AUC {r['roc_auc_foldmean']:.3f} | pooled-OOF PR {r['pr_auc_pooled_oof']:.3f}"
          + (f" | seed range {r['pr_auc_seed_range']}" if len(seeds) > 1 else ''))
    return r

LR = lambda: make_pipeline(StandardScaler(), LogisticRegression(C=1.0, max_iter=1000))
base_rate = y.mean()
print(f'\nchance PR-AUC (prevalence) = {base_rate:.3f}')

# ------------------------------------------------------------------ 3. reproduce the NMR model
print('\n=== 3. NMR model reproduction (notebook config: XGB + literature monotone, SGKF seed 42) ===')
run_cv('NMR XGB monotone (notebook)', Xlog, lambda: XGBClassifier(**XGB), g_heur)
SEEDS = tuple(range(20))
run_cv('NMR XGB monotone', Xlog, lambda: XGBClassifier(**XGB), g_heur, SEEDS)
run_cv('NMR XGB monotone', Xlog, lambda: XGBClassifier(**XGB), g_cons, SEEDS, 'constrained')
run_cv('NMR XGB unconstrained', Xlog, lambda: XGBClassifier(**XGB_FREE), g_cons, SEEDS, 'constrained')
run_cv('NMR logistic (std, C=1)', Xlog, LR, g_cons, SEEDS, 'constrained')
run_cv('NMR XGB monotone', Xlog, lambda: XGBClassifier(**XGB), np.arange(len(y)), SEEDS, 'none (sample-level, leaky)')

# ------------------------------------------------------------------ 2. metadata-only classifiers
print('\n=== 2. metadata-only classifiers (same subject-grouped CV) ===')
oh = lambda v: pd.get_dummies(pd.Series(v)).astype(float).values
run_cv('batch prefix only (logistic)', oh(prefix), LR, g_heur, SEEDS)
run_cv('batch prefix only (logistic)', oh(prefix), LR, g_cons, SEEDS, 'constrained')
run_cv('sex only (logistic)', oh(sex), LR, g_cons, SEEDS, 'constrained')
run_cv('nmrML phc1 only (logistic)', acq[['phc1_deg']].values, LR, g_cons, SEEDS, 'constrained')
run_cv('nmrML phc0 + phc1 + ppm_start + pw + ns (logistic)',
       acq[['phc0_deg', 'phc1_deg', 'ppm_start', 'pulse_width_us', 'ns']].values, LR, g_cons, SEEDS, 'constrained')
run_cv('sample-number only (logistic)', num.reshape(-1, 1).astype(float), LR, g_cons, SEEDS, 'constrained')

# ------------------------------------------------------------------ 3b. within-batch / within-stratum
print('\n=== 3b. within-batch analysis ===')
for p in sorted(set(prefix)):
    print(f'   prefix {p}: labels present = {sorted(map(str, set(label[prefix == p])))} -> within-batch T2DM-vs-control '
          f'classification is {"IMPOSSIBLE (single class)" if len(set(label[prefix==p]))==1 else "possible"}')
print('   within-sex strata (sex is NOT confounded, but batch==label inside each stratum too):')
for sx in ['Male', 'Female']:
    m = sex == sx
    print(f'      {sx}: {pd.crosstab(prefix[m], label[m]).to_dict()}')

pd.DataFrame(results).to_csv(f'{OUT}/cv_results.csv', index=False)
print('\nwrote crosstab_counts.csv, acq_params.csv, subject_groupings.csv, cv_results.csv')
