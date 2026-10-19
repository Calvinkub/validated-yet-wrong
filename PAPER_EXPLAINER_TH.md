# เล่า paper "Validated, yet Wrong" ยังไง (คู่มือเล่าเป็นภาษาไทย)

> *Validated, yet Wrong: Four Ways Small-n Metabolomics Machine Learning Passes Standard Checks*
> ผู้เขียน: Chaiyaporn Orrudee, Kanin Calvin Shomwiwat (KMITL) — draft

---

## 1. เล่าใน 30 วินาที (elevator pitch)

งาน ML บน metabolomics ที่มีคนไข้ไม่กี่สิบคน มักโชว์ AUC สูงมาก แล้วบอกว่า "เชื่อได้ เพราะทำ cross-validation, permutation test และ SHAP แล้ว"
เรากลับไป **ตรวจงานเก่าของตัวเอง 4 ชิ้น** บนข้อมูล NMR สาธารณะ แล้วพบว่า **ทั้ง 4 ชิ้นผ่านการเช็กมาตรฐาน แต่ผลลัพธ์ผิดหรือตีความไม่ได้**
paper นี้ระบุว่าแต่ละชิ้นผ่านการเช็กตัวไหน พังเพราะอะไร และมี "control" ราคาถูกอะไรที่จับได้

**ข้อความหลัก:** CV, permutation test, SHAP/ROAR ล้วนตอบคำถามแคบ ๆ — ไม่มีตัวไหนถามว่า "label วัดสิ่งที่มันอ้างจริงไหม" หรือ "ความสัมพันธ์นี้เป็นชีววิทยาจริงไหม"

---

## 2. โครงเรื่อง (story arc) ที่แนะนำให้ใช้เล่า

1. **เปิดด้วยปัญหา** — n < 200 แต่ได้ AUC เกือบ 1.0 ทำไมถึงน่าสงสัย
2. **ชี้ว่าแต่ละ check ตอบคำถามอะไร** (และไม่ได้ตอบอะไร)
   - Cross-validation → โมเดลทำนายตัวอย่างใหม่ที่ *เก็บมาแบบเดียวกัน* ได้ไหม
   - Label permutation → feature มีความสัมพันธ์กับ label *บ้างไหม*
   - ROAR / faithfulness → โมเดล *พึ่ง* feature นั้นไหม
3. **เล่า 4 case** (หัวใจของ paper) — เรียงตามตารางด้านล่าง
4. **Simulation** — ยืนยันเชิงสถิติว่า Case 1 ไม่ใช่เรื่องบังเอิญ และ per-marker correction ที่คนมักใช้ก็ยังไม่พอ
5. **Checklist 6 ข้อ** + โค้ดที่ปล่อยให้ใช้ซ้ำ
6. **ปิดด้วย limitation อย่างซื่อสัตย์** — เป็นการ audit งานตัวเอง ไม่ได้อ้างว่า failure เหล่านี้พบบ่อยแค่ไหนในวรรณกรรม

> เคล็ดลับการเล่า: ทุก case ใช้โครงเดียวกัน = **"ผลที่รายงาน → check ที่ผ่าน → ทำไมถึงผ่าน → control ที่จับได้"** ผู้ฟังจะตามง่ายและจำ pattern ได้

---

## 3. ภาพรวม 4 failure modes

| Case | ปัญหา | ข้อมูล | ผลที่รายงานเดิม | Check ที่ผ่าน | Control ที่จับได้ |
|---|---|---|---|---|---|
| 1 | Outcome ถูก "สร้าง" จาก feature เอง (change score) | MTBLS242 | PR-AUC 0.683 | Label permutation (refit) p = 0.001 | Learn-nothing baseline, joint residualisation |
| 2 | สารที่น่าจะมาจากภายนอก (contaminant) ถูกจัดอันดับเท่า metabolite จริง | MTBLS242 | PR-AUC 0.973 | ROAR faithfulness | Spiked artefact (positive control) |
| 3 | วิธีเก็บตัวอย่าง = label พอดี | MTBLS1 | PR-AUC 0.976 | Subject-grouped CV | Metadata / protocol audit |
| 4 | ชื่อ label ไม่ตรงกับสิ่งที่ label เข้ารหัส | MTBLS242 | ROC-AUC 0.960 | Subject-grouped CV | Label-provenance audit |

---

## 4. เล่าทีละ case

### Case 1 — Outcome ที่ถูกสร้างจาก feature (จุดเด่นที่สุดของ paper)

**โจทย์เดิม:** ทำนายจากโปรไฟล์ก่อนผ่าตัด ว่าคนไข้ bariatric surgery จะเป็น "strong responder" ที่ 12 เดือนไหม (นิยาม: ≥ 9 จาก 11 markers เปลี่ยนไปทิศทางที่คาด) ข้อมูล 71 คน เป็น responder 31 คน

**ทำไมพัง:** baseline x₀ เป็นทั้ง *predictor* และเป็นส่วนหนึ่งของ *outcome* (Δ = x₁₂ − x₀) พอมี noise ค่า baseline ที่สุดโต่งจะเด้งกลับเข้าหาค่าเฉลี่ย (regression to the mean) ทำให้ baseline "ทำนาย" change ได้ทั้งที่ไม่มีอะไรเกิดขึ้นจริง (ใน MTBLS242 correlation ระหว่าง x₀ กับ Δ มี median ≈ −0.62)

**ทำไม permutation test ถึงผ่าน:** การสลับ label ทำลายความสัมพันธ์ feature–label ทั้งหมด แต่ label จริง *ถูกคำนวณจาก feature* จึงชนะ null นั้นแน่นอน — test ตอบคำถามที่ไม่มีใครถาม

**ตัวเลขที่ต้องจำ:**
- โมเดล PR-AUC 0.683 (prevalence 0.437), permutation p = **0.001** (ต่ำสุดเท่าที่ทำได้)
- แต่ **learn-nothing scorer** (คะแนนที่ไม่ได้ fit อะไรเลย สร้างจาก baseline + ทิศทาง marker ที่คาด) ได้ **0.709 — สูงกว่าโมเดล**
- หลังแก้ outcome (residualise ใน training fold): โมเดล 0.554 vs scorer 0.589, interval ของ gap คร่อมศูนย์ → โมเดลไม่ดีกว่า scorer

**Control สามตัว:**
1. *Learn-nothing baseline* — ถ้าโมเดลไม่ชนะตัวนี้ แปลว่าไม่ได้เรียนรู้อะไรเกิน regression to the mean
2. *Pairing-destroyed null* — สลับว่า sample 12 เดือนเป็นของใคร แล้วคำนวณ outcome ใหม่ทั้งหมด (คง coupling ทางคณิตศาสตร์ ตัดสัญญาณระดับบุคคลออก) ใช้เป็น diagnostic ด้านเดียว: ถ้าโมเดล *ชนะ* ได้ แปลว่ามีอะไรเกิน RTM; ถ้า *แพ้* ยังสรุปอะไรไม่ได้
3. *Joint residualisation* — regress change ของแต่ละ marker บน baseline **ทั้ง 11 ตัวพร้อมกัน** ใน training fold แล้วนิยาม label จาก residual

**Replication บน MTBLS881** (ผ่าตัดหัวใจ, n = 47, เขียน `PREREG.md` ก่อน fit): raw change replicate ได้ชัด (permutation reject แต่โมเดลไม่ชนะ scorer) ส่วน residualised outcome replicate *บางส่วน* — LA บางแบบขัดแย้งกันระหว่าง test และ n = 47 ตัดสินไม่ได้ และเมื่อใส่ยา (propofol, heparin, ethanol) เข้าเป็น feature สัญญาณ "ปรากฏ" ขึ้นมา สอดคล้อง Case 2

**ประโยคที่ปลอดภัยที่จะพูด:** "โมเดลไม่ได้ดีกว่า scorer" — **ไม่ใช่** "profile ก่อนผ่าตัดทำนายการตอบสนองไม่ได้" (n = 71 ไม่มีกำลังพอจะตัดสิน; absence of evidence)

---

### Case 2 — Contaminant ที่ ROAR จัดเป็น "ชีววิทยา"

**ที่ทำ:** recursive ROAR (ตัด top-k feature ตาม SHAP แล้ว retrain) เทียบกับการตัด k feature แบบสุ่ม 500 ชุด, CV จัดกลุ่มตามคนไข้

**ผลที่ดูดี:** ลำดับที่ถูกตัด = dimethyl sulfone, isopropanol, L-valine, glycine, methanol, … จาก k = 3 เส้น ROAR ต่ำกว่า random band เกือบทั้งหมด → "feature ที่ตัดสำคัญจริง" (ซึ่งจริงในแง่ *โมเดล*)

**ปัญหา:** isopropanol (ใช้เช็ดผิวก่อนเจาะเลือด) และ methanol ไม่ใช่ผลผลิตปกติของเมแทบอลิซึมในระดับนี้ ส่วน dimethyl sulfone ไม่ชัด (มาจากอาหาร/แบคทีเรียลำไส้ ซึ่งก็เปลี่ยนได้ก่อน–หลังผ่าตัด) จึงเรียกรวมว่า **"putatively exogenous"** — ไม่ได้อ้างว่าพิสูจน์แล้วว่าเป็น artefact

**ตัวเลข:** ที่ k = 3 ตัดสามตัว "น่าจะ exogenous" → PR-AUC 0.954; ตัดสาม endogenous → 0.959 ห่างกันแค่ 0.006 (fold SD ≈ 0.03) ROAR มองสองกลุ่มเหมือนกัน

**Positive control ที่แรง:** เติม feature ปลอม `d·y + N(0,1)` ที่ขึ้นกับ label อย่างเดียว ไม่มีชีววิทยา ที่ d = 1.75 (ขนาดเท่า dimethyl sulfone) มันถูก SHAP จัดเป็นอันดับ 1 และการตัดมันทำให้ PR-AUC ตก (0.0127) *มากกว่า* metabolite จริงตัวไหน (dimethyl sulfone ตก 0.0073)

**บทเรียน:** removal-based importance วัดว่า feature มี *สัญญาณไม่ซ้ำซ้อน* เท่าไร ไม่สนว่าสัญญาณนั้นมาจากไหน ROAR ต่ำ ≠ ชีววิทยา

---

### Case 3 — วิธีเก็บตัวอย่าง = label (MTBLS1, ปัสสาวะ, เบาหวาน vs. control)

**ผลเดิม:** PR-AUC 0.976 ด้วย subject-grouped CV (reproduce ได้ที่ seed 42 แต่เฉลี่ย 20 seeds = 0.911, ช่วง 0.845–0.975 → headline คือ split ที่ดวงดี)

**ทำไม grouped CV ไม่ช่วย:** มันกันไม่ให้คนเดียวกันอยู่ทั้ง train และ test แต่กัน confound ที่ *ทุกคนในคลาสเดียวกันมีร่วมกัน* ไม่ได้

**สิ่งที่ audit พบ:**
- ไล่ดูทั้ง 64 คอลัมน์ metadata: 56 constant, 6 เป็น ID/path, เหลือแค่ sex ที่ผันแปร — ไม่มีวันที่/run/rack/acquisition order
- แต่ protocol บอกว่านี่คือ **สองการศึกษาที่ต่างกัน**: control = อาสาสมัคร 12 คน อายุ 18–55 BMI 19–30 เก็บ 7 ครั้ง; ผู้ป่วย = อายุ 30–65 BMI 25–40 เก็บ 1–3 ครั้ง
- ชื่อ sample ของ control ขึ้นต้น `ADG19007u` ทั้งหมด ผู้ป่วยขึ้นต้น `ADG10003u` ทั้งหมด → prefix กำหนด label ได้ 100% (logistic บน prefix = PR-AUC 1.000)
- ดังนั้น อายุ, BMI, ตารางเก็บตัวอย่าง, วิธีเก็บ/แช่แข็ง/อาหาร **ผูกติดกับ label** และไม่มีบันทึกรายตัวอย่าง จึงเปรียบเทียบภายใน protocol เดียวกันไม่ได้ (แต่ละ protocol มีคลาสเดียว)
- สรุป: ปัญหาอยู่ที่ *design* ไม่ใช่ที่ grouping — ไม่มีการวิเคราะห์ใดแก้ได้จากข้อมูลชุดนี้

---

### Case 4 — ชื่อ label ไม่ตรงกับความหมาย

งานเดิมเรียก task ว่า "obese vs. non-obese" แต่จริง ๆ คือ **"ก่อนผ่าตัด vs. 12 เดือนหลังผ่าตัด"** — 71 จาก 106 คนอยู่ในทั้งสองคลาส (คิดเป็น 80% ของ 177 samples) ชีต metadata ไม่มี BMI จึงตรวจไม่ได้ว่าคนไข้ 12 เดือนยังอ้วนอยู่ไหม

- grouped CV: ROC-AUC 0.960, naive CV: 0.959 → ต่างกันแทบไม่มี **จึงไม่ใช่ leakage แต่เป็นเรื่อง "ความหมายของ label"**
- โมเดลเรียนรู้ทุกอย่างที่ต่างกันก่อน/หลังผ่าตัด: น้ำหนัก, อาหาร, อาหารเสริม, ยา, สถานะอดอาหาร, และ **ช่วงเวลาที่ตัวอย่างถูกเก็บรักษานานเป็นปี** ไม่ใช่หลักฐานว่า serum profile บอกความอ้วนในประชากรทั่วไปได้
- **Control ไม่ใช่สถิติ:** เขียนให้ได้ใน *หนึ่งประโยค* ว่าอะไรแยกสองคลาสนี้ทางกายภาพ

---

## 5. Simulation (36,000 datasets)

**ออกแบบ:** แต่ละคนมี persistent level ของ 11 markers (inter-marker correlation ρ = 0.3) + feature เสริม 10 ตัว; reliability r = ส่วนของความแปรปรวนที่คงอยู่ระหว่าง 2 visit; γ = ความแรงของ "การตอบสนองรายบุคคลที่ทำนายได้" **γ = 0 คือไม่มี individual response เลย** ดังนั้นสัญญาณใด ๆ = regression to the mean ล้วน ๆ (r = 0.25 ให้ correlation −0.62 ตรงกับ MTBLS242) ปรับ n ∈ {50, 100, 200, 500}, r ∈ {0.25, 0.5, 0.75}, γ ∈ {0, 0.25, 0.5} ชุดละ 1,000 datasets ทดสอบ 4 วิธีที่ α = 0.05 โดย refit โมเดลทุก replicate

**False-positive rate เมื่อ γ = 0 (ควรได้ ≈ 5%):**

| วิธี | ช่วงที่ได้ | พฤติกรรม |
|---|---|---|
| Label permutation | 10.6% → **100%** | ยิ่ง n มาก ยิ่งผิด (n = 500, r = 0.25 reject ทุก dataset) |
| Per-marker residualisation | 8–29% | liberal; เพิ่มตาม n เพราะ residual ของ marker j ยัง correlate กับ baseline ของ marker อื่นที่โมเดลเห็น |
| **Joint residualisation** | 5.3–8.1% | ใกล้ nominal แต่ยัง liberal เล็กน้อย; ไม่มีแนวโน้มตาม n |
| Pairing-destroyed null | ≤ 4.3% | valid แต่ *conservative* — ที่ r = 0.25, γ = 0.25 ไม่มี power เลย |

**ข้อสังเกตที่ควรเน้น:**
- ข้อมูลมากขึ้น *ไม่ได้* ช่วย — มันแค่ประมาณ artefact ได้แม่นขึ้น
- permutation แบบถือ out-of-fold score คงที่ (ไม่ refit) reject 9.7% ของ pure-noise; refit ได้ 5.3% → ต้อง refit เสมอ
- joint residualisation มี power ใกล้ per-marker (97.5% vs 97.0% ที่ n = 500) แต่ต่ำที่ n เล็ก (19% ที่ n = 50)

---

## 6. Checklist 6 ข้อ (ข้อเสนอเชิงปฏิบัติ)

1. ถ้า outcome ถูกคำนวณจาก feature อย่าพึ่ง label permutation → residualise change บน baseline *ทั้งหมด* ใน training fold และรายงาน pairing-destroyed null เป็น diagnostic
2. Refit โมเดลในทุก permutation replicate และดูว่าค่าที่สังเกตไม่ได้ต่ำกว่า null ทั้งชุด (สัญญาณว่า null ผิดสเปก)
3. ใส่ learn-nothing baseline และรายงาน gap พร้อม interval ที่ bootstrap ตาม *subject*
4. ตรวจ feature หา exogenous compound และรายงานผลทั้งแบบมี/ไม่มี
5. Cross-tabulate label กับ *ทุก* คอลัมน์ metadata (batch, run order, sample-name prefix, sex) และอ่าน protocol การเก็บของแต่ละคลาส
6. เขียนหนึ่งประโยคว่า label เข้ารหัสอะไรทางกายภาพ

---

## 7. Limitation — พูดเองก่อนที่คนอื่นจะถาม

- **เป็น audit งานของตัวเอง 3 dataset เล็ก ๆ** ที่เลือกเพราะตรวจสอบได้จากไฟล์สาธารณะ → *ไม่ได้อ้างว่า failure เหล่านี้พบบ่อยแค่ไหนในงานวิจัยโดยรวม*
- paper พูดเรื่อง **validation practice** ไม่ได้พูดเรื่องชีววิทยาของโรคอ้วนหรือเบาหวาน
- Regression to the mean เป็นสถิติคลาสสิก — contribution คือการแสดงว่า *ML practice* จับมันไม่ได้
- ที่มาแบบ exogenous ของสารใน Case 2 "เป็นไปได้" แต่ไม่ได้พิสูจน์จากข้อมูลที่ deposit
- Simulation ใช้ Gaussian + ridge + outcome rule เดียว — โมเดลไม่เชิงเส้นอาจต่างในระดับความแรง
- Pairing-destroyed null conservative: ห้ามใช้เป็น test เดียว
- Joint residualisation ตัดทั้ง artefact **และ** การพึ่งพา baseline ที่เป็นชีววิทยาจริงออกไปด้วย — แยกสองอย่างนี้ต้องมี baseline ซ้ำหลายครั้ง
- Case 1 ที่แก้แล้ว: permutation p = 1.0 ไม่ใช่ calibrated p-value (เดาว่าเกิดจาก sign constraint แต่ยังไม่ได้ทดสอบ)

---

## 8. คำถามที่น่าจะโดนถาม + คำตอบสั้น

**"งานเก่าตัวเองผิด ทำไมเอามาเป็น paper?"**
เพราะนี่คือ case ที่ตรวจได้ครบทุกขั้นจากไฟล์สาธารณะ และเราไม่ต้องกล่าวหางานคนอื่น จุดขายคือ taxonomy + control ที่ใช้ซ้ำได้ ไม่ใช่การยอมรับผิด

**"Regression to the mean รู้กันอยู่แล้วนี่"**
ใช่ และเรายอมรับใน limitation สิ่งใหม่คือ *ปฏิสัมพันธ์กับ ML practice* — outcome นิยามจาก change + โมเดลยืดหยุ่น + permutation เป็น significance test = ใบรับรอง artefact และ per-marker correction ที่นักวิเคราะห์ระวังมักใช้ก็ยัง liberal

**"สรุปคือ pre-op profile ทำนาย response ไม่ได้ใช่ไหม?"**
ไม่ใช่ ที่ n = 71 ตัดสินไม่ได้ สิ่งที่พูดได้คือ "โมเดลไม่ดีกว่า scorer ที่ไม่ fit อะไร"

**"ROAR/SHAP ใช้ไม่ได้เลยหรือ?"**
ใช้ได้ตอบคำถามเรื่อง *โมเดล* แต่ไม่ควรอ่านผลเป็น "feature เหล่านี้เป็นชีววิทยา"

**"Case 3 แก้ได้ไหม?"**
ไม่ได้จากข้อมูลชุดนี้ — ทุก protocol มีคลาสเดียว ต้องมี control/case ที่เก็บด้วย protocol เดียวกัน

---

## 9. ตัวเลขสำคัญที่ใช้ตอบเร็ว ๆ

| เรื่อง | ค่า |
|---|---|
| MTBLS242 | 465 samples, 5 visits, 21 metabolites; 71 คนมีทั้ง pre-op และ 12 เดือน |
| Case 1 (เดิม) | PR-AUC 0.683 vs prevalence 0.437, perm p = 0.001, scorer 0.709 |
| Case 1 (แก้ joint) | โมเดล 0.554 vs scorer 0.589, gap −0.037 [−0.111, +0.037] |
| Simulation | 36,000 datasets, label permutation FPR สูงสุด 100%, joint 5.3–8.1% |
| Case 2 | baseline PR-AUC 0.973; exogenous trio 0.954 vs endogenous trio 0.959; spike d = 1.75 → rank 1 |
| Case 3 | seed 42 = 0.976, เฉลี่ย 20 seeds = 0.911; prefix → PR-AUC 1.000 |
| Case 4 | grouped ROC-AUC 0.960 vs naive 0.959; 71/106 คนอยู่ทั้งสองคลาส (80% ของ samples) |

---

## 10. ที่อยู่ของโค้ดและสถานะ

- Repo: https://github.com/Calvinkub/validated-yet-wrong (tag `paper-v1`)
- ทุก `RESULTS.md` ระบุแต่ละตัวเลขพร้อม script, seed, command
- Simulation: `python simulation/sim_pairing_null.py` (~11 นาทีบน 8 cores), `--check` = sanity ของ pure noise (ควรได้ ≈ 5%)
- Case 1 และ 1b ต้องใช้โค้ดจาก repo `mtbls242-forecast-honest` (branch `honest-evaluation`, commit `637a58e`) ซึ่งแยกต่างหาก
- **ก่อน submit:** เช็กจำนวนหน้า (ตอนนี้ 9), reference `adebayo2018` กับ `kumar2020` (ตรวจแค่ผู้เขียน/venue), และข้อความเรื่องการใช้ AI ของ venue เป้าหมาย; ยังไม่ได้เลือก licence
