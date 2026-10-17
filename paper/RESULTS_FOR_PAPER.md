# บันทึกผลสำหรับใส่ใน paper (รอบแก้ 18 ต.ค. 2026)

บันทึกนี้สรุปผลที่ได้จากการทำตาม `FIXPAPER_TODO.md` ฉบับก่อน ทุกตัวเลขมีที่มา
และถูกใส่ลงใน `fixpaper.tex` แล้ว รายการที่ยังค้างอยู่ใน `FIXPAPER_TODO.md`

## 1. Case 4: ตัวเลขมีที่มาแล้ว

เพิ่ม `experiments/case4/` (`case4.py`, `RESULTS.md`, `results/summary_case4.json`,
`results/case4_output.txt`) ใช้ข้อมูล, patient ID, folds และ seed ชุดเดียวกับ Case 2

คำสั่ง: `cd experiments/case4 && MTBLS242_FORECAST_DIR=... python case4.py` (ราว 10 วินาที)

### ที่มาของ 0.973 ใน Table I
มาจาก `Calvinkub/Bridge_ai_summit_nmr_2026` commit `17e18df` (14 ก.ค. 2026)
notebook `exp_obesity_nmr_mtbls242.ipynb` พิมพ์ว่า "Mean ROC-AUC = 0.973 +/- 0.020
(stratified 5-fold CV)" (XGBoost ไม่มี monotonic constraint, split เดียว, seed 42)
จึง**ไม่ใช่**การคัดลอก PR-AUC ของ Case 2 มาผิดช่อง ตัวเลขบังเอิญตรงกัน

### ตัวเลขที่ใส่ใน paper

| ค่า | ตัวเลข | ที่มา | ใส่ไว้ที่ |
|---|---|---|---|
| ผู้ป่วยที่อยู่ทั้งสองคลาส | 71 จาก 106 | sample sheet | Case 4 (เดิมมีอยู่แล้ว) |
| ROC-AUC ที่รายงานไว้เดิม | 0.973 | `17e18df` | Table I |
| ROC-AUC เมื่อรันซ้ำ (split เดิม) | **0.974** (0.9737) | `case4.py` ส่วน `original` | Case 4 |
| ROC-AUC, subject-grouped CV (10×5) | **0.965** (0.9652) | `case4.py` ส่วน `cv` | Case 4 |
| ROC-AUC, naive CV (10×5) | **0.965** (0.96547) | `case4.py` ส่วน `cv` | Case 4 |
| test sample ใน naive CV ที่มี visit อื่นของผู้ป่วยคนเดียวกันอยู่ใน training | **65%** (65.1%) | `case4.py` ส่วน `cv` | Case 4 |

ตัวเลข 0.969 (grouped) และ 0.970 (naive) ในฉบับร่างหาที่มาไม่เจอในทุก repo จึงแทนด้วย
0.965 ทั้งคู่ (ที่ 4 ตำแหน่งคือ 0.9652 และ 0.9655)

### ข้อเท็จจริงเพิ่มเติมจาก audit (ใช้ตอบรีวิวได้)
- sample sheet มี 18 คอลัมน์ ที่ค่าแปรผันมีแค่ Sample Name และ time point
  (รวม ontology ref ของ time point) ไม่มี BMI น้ำหนัก อายุ เพศ ชนิดการผ่าตัด ยา
  หรือสถานะอดอาหาร
- ผู้ป่วย 35 คนมีเฉพาะตัวอย่าง preop
- ถ้าใช้ monotonic XGBoost ของ Case 2: ROC-AUC grouped 0.960, naive 0.960
  (PR-AUC 0.972 และ 0.973 เท่ากับ baseline ของ Case 2 เพราะเป็น task เดียวกัน)
- notebook ฉบับ monotonic (`0088e38`) รายงาน PR-AUC 0.984 รันซ้ำได้ 0.983
  ใช้แทน 0.973 ใน Table I ได้ถ้าต้องการให้ทุกแถวเป็น PR-AUC

### ข้อควรระวังเรื่อง reproducibility
รันบน Windows x86 (xgboost 3.2.0, scikit-learn 1.9.1) ในเครื่องนี้ baseline ของ
Case 2 ได้ 0.9723 ส่วนที่บันทึกไว้บน macOS คือ 0.9728 โดย fold ตรงกัน
ความต่างมาจาก xgboost ข้ามแพลตฟอร์ม ตัวเลขทศนิยมตำแหน่งที่สามจึงอาจต่างได้ราว 0.001
บันทึกไว้แล้วใน `experiments/case4/RESULTS.md`

### ข้อความที่ใส่ใน Case 4
> ... 71 of 106 patients appear in both classes, so the label records the visit,
> not a measurement of obesity. The originally reported ROC-AUC of 0.973 came
> from a single stratified 5-fold split (re-run: 0.974). Over 10 repeats of
> 5-fold CV with the same model, subject-grouped and naive CV both give
> ROC-AUC 0.965, although in naive CV 65% of test samples have the same
> patient's other visit in the training folds. Removing that leakage does not
> lower the score, so the issue is not leakage but label meaning.

ใน Models and evaluation แก้ "Cases 2--4 use XGBoost with monotonic constraints"
เป็น "Cases 2 and 3 ... ; Case 4 re-runs the unconstrained XGBoost of its original
analysis" เพราะโมเดลเดิมของ Case 4 ไม่มี constraint

## 2. Case 2: ที่มาของ dimethyl sulfone

ใส่ citation ใหม่ `engelke2005` (ตรวจกับ PubMed 15996001 และ DOI 10.1002/nbm.966 แล้ว)
abstract ระบุว่า dimethyl sulfone เป็น "regular metabolite at low micromolar
concentrations" ในพลาสมา มาจากอาหาร แบคทีเรียในลำไส้ และการเผาผลาญ methanethiol
ภายในร่างกาย

สิ่งที่เปลี่ยนในเนื้อหา:
- ตัดคำว่า "supplements" ออก เพราะ reference ไม่ได้พูดถึง MSM
- เพิ่มว่ามีเส้นทางจากภายในร่างกายด้วย และระบุว่าสารนี้เป็นตัวที่หลักฐานว่าเป็น
  "putatively exogenous" อ่อนที่สุดในสามตัว
- แก้ Limitations ให้สอดคล้อง: "plausible for isopropanol and methanol, only partial
  for dimethyl sulfone"

ข้อสรุปหลักของ Case 2 ไม่เปลี่ยน เพราะ spiked-artefact control ไม่ได้อาศัยการระบุตัวตน
ของสารจริง

## 3. Cite repo งานเก่า

| bibitem | repo | สถานะ |
|---|---|---|
| `bridge2026` | `Calvinkub/Bridge_ai_summit_nmr_2026`, commit `17e18df` (Case 4), `0088e38` (Case 3) | public, commit มีอยู่จริง |
| `roar2026` | `Chaiporn2005/ROAR`, commit `f220cd2` (Case 2) | public |
| `honest2026` | `mtbls242-forecast-honest`, commit `637a58e` (Case 1, 1b) | **ยังไม่ public** มี `\todo` |

ใส่ cite ไว้ใน Introduction และใน Data and Code Availability

ตรวจพบเพิ่ม: repo ของ paper นี้เอง (`Calvinkub/validated-yet-wrong`) ยังเป็น private
(ตอบ 404) จึงใส่ `\todo` ไว้ที่ Data and Code Availability

## 4. Reference อื่น

- **`han2022`:** ใช้ May 2022 ตามปีของ issue (Crossref: online 25 พ.ย. 2020,
  print vol. 41 no. 3 พ.ค. 2022) และลบ `\todo` แล้ว
- **`adebayo2018`, `kumar2020`:** อ่าน abstract แล้ว สนับสนุนประโยค "attribution
  methods can mislead even about model behaviour"

รายละเอียดอยู่ใน `experiments/refs/VERIFICATION.md` หัวข้อ "Update 2026-10-18"

## ผลการ build

`tectonic fixpaper.tex`: 9 หน้า ไม่มี overfull hbox (ปัญหา Table I ที่ล้นขอบหายแล้ว)
ไม่มี citation ที่หาไม่เจอ เหลือ `\todo` 4 จุด ซึ่งต้องให้ผู้เขียนตัดสินใจทั้งหมด
(repo ของ paper, repo honest ×2, Acknowledgment)
