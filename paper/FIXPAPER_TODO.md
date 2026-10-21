# สิ่งที่ต้องทำใน `fixpaper.tex`

> 2026-10-21: ใช้ branch `fixpaper-revisions` เป็นฉบับหลัก ส่วน branch `main` และ tag `paper-v1`
> เป็นอีกสายที่แยกออกไป (Case 4 ใช้โมเดล constrained, ROC-AUC 0.960) ไม่ใช้ต่อ
> `main.tex` บน branch นี้คือฉบับก่อนแก้ ฉบับที่แก้แล้วคือ `fixpaper.tex`

Build: `cd paper && tectonic fixpaper.tex` (ยังไม่ได้ build หลังการแก้ 2026-10-21 เพราะเครื่องที่แก้ไม่มี LaTeX
ก่อนหน้านี้ยาว 9 หน้า ไม่มี overfull hbox)

สิ่งที่ทำไปแล้วและตัวเลขที่ใส่ลงไป ดูได้ที่ `RESULTS_FOR_PAPER.md` และ `experiments/*/RESULTS.md`

## แก้แล้ว (2026-10-21)

- **ประเด็นจาก review รอบ 2 ของ `story.tex` ที่ใช้กับ paper หลักด้วย**
  (`Review/STORY_REVIEW_ROUND2.md`):
  - Case 1 และ 1b บรรยาย permutation ให้ตรงกับ code คือสลับ training labels ในแต่ละ fold แล้ว refit
    ไม่ได้สลับทั้ง vector และบอกว่ายังไม่ได้ตรวจ calibration สำหรับโมเดล sign-constrained
    ส่วน Simulation ระบุว่า raw change สลับทั้ง vector และ residualised สลับในแต่ละ fold
  - Case 3: เลิกพูดว่า ungrouped "differs little" แล้วเทียบ 0.911 (grouped) กับ 0.969 (ungrouped)
    บน 20 seed เดียวกัน เพิ่ม 0.906 (grouping 30 กลุ่ม) และบอกว่า heuristic อาจแยกตัวอย่างของคนเดียวกันได้
  - Case 2: SHAP บนข้อมูลทั้งหมดถือเป็น selection bias ที่ไม่ได้วัดขนาด (`varma2006`) และ ROAR เป็น exploratory
    เปลี่ยน "ROAR treats the two groups alike" เป็นตัวเลข gap 0.0056 และบอกว่าไม่ได้ทำ equivalence test
    spike: SHAP อันดับ 1 ใน 6 จาก 10 draws (ช่วง 1–2)
  - Checklist ข้อ 1 มีเงื่อนไขตามเป้าหมาย ข้อ 2 ให้ตรวจ null และ pipeline แทน "mis-specified null"
  - หัวข้อ simulation "is wrong" เป็น "misleads" และ abstract "as highly as" เป็น "alongside"
  - Case 4: "learns everything" เป็น "can learn anything ... potentially also"
- **Repo เปิด public แล้ว**: ตรวจด้วย curl แบบไม่ login เมื่อ 2026-10-21 ได้ 200 ทุกตัว ได้แก่
  `Calvinkub/validated-yet-wrong`, `Calvinkub/mtbls242-forecast-honest` commit `637a58e`,
  `Calvinkub/Bridge_ai_summit_nmr_2026` commits `17e18df` และ `0088e38`, `Chaiporn2005/ROAR` commit `f220cd2`
  ลบ `\todo` ทั้งสองจุดแล้ว และใส่ผู้แต่งกับ URL ใน `\bibitem{honest2026}`
- **Acknowledgment**: ใช้ข้อความเดียวกับที่เติมไว้บน branch `main` คือขอบคุณ ผศ.ดร. นนท์ คนึงสุขเกษม
  ในฐานะอาจารย์ที่ปรึกษา และไม่มีแหล่งทุน

## เหลือ (มี `\todo{}` สีแดง 1 จุด)

### Tag ของ repository
`paper-v1` ชี้ไปที่ commit `155c327` บน `main` ซึ่ง paper ต่างจากฉบับนี้ ตอนนี้จึงเอา tag ออกจาก footnote
หน้าแรกแล้ว และใส่ `\todo` ไว้ใน Data and Code Availability
- เมื่อพร้อมส่ง ให้สร้าง tag ใหม่ (เช่น `paper-v2`) บน commit สุดท้ายของ branch นี้ แล้วใส่ชื่อ tag
  ทั้งใน footnote และ Data and Code Availability ของ `fixpaper.tex`
  และใน `story.tex` (footnote กับบรรทัดที่มี `% TODO`)

## ให้ผู้เขียนยืนยัน (ไม่มี `\todo`)

- **ผู้แต่งของ `honest2026` และ `bridge2026`**: ใส่เป็น K. C. Shomwiwat โดยอนุมานจากชื่อบัญชี Calvinkub
  ซึ่ง branch `main` ก็ใช้ชื่อนี้
- **`roar2026`**: ใช้ commit `f220cd2` ซึ่งเป็น head ของ `main` ใน repo ROAR
  แต่ Case 2 ไม่ได้บันทึกว่าคัดลอกโค้ดมาจาก commit ไหน ถ้ารู้ commit ที่ถูกต้องให้แก้
- **p-value ของ Case 1**: ใช้แบบ per-fold และยังไม่ได้ตรวจ calibration
  ถ้าต้องการปิดประเด็นนี้ ให้รันแบบสลับ label ทั้ง vector ก่อน CV (Ojala & Garriga test 1)
  บนเครื่องที่มีข้อมูล MTBLS242 แล้วรายงานคู่กัน ข้อสรุปของ paper ไม่ได้พึ่งค่านี้
- **`han2022`**: ใช้ May 2022 (ปีของ issue ตาม IEEE style) ถ้า venue ต้องการปี online ให้เปลี่ยนเป็น 2020
- **Table I แถว Case 4:** คง ROC-AUC 0.973 ไว้ตามฉบับร่าง ทางเลือกอื่นคือใช้
  PR-AUC 0.984 จาก commit `0088e38` (เป็น monotonic เหมือน Case 2 และ 3) ซึ่งจะทำให้
  ทุกแถวเป็น PR-AUC ถ้าเลือกทางนี้ ต้องแก้ย่อหน้า Case 4 และประโยค
  "Case 4 re-runs the unconstrained XGBoost" ใน Models ด้วย และแก้ Story 4 ใน `story.tex` ให้ตรงกัน
  ตัวเลขทั้งสองแบบอยู่ใน `experiments/case4/RESULTS.md`

## ตัดสินใจตาม venue

- **ข้อความ Use of Generative AI:** ปรับให้ตรงกับข้อกำหนดของ venue ที่จะส่ง
- **ความยาว:** ถ้าส่ง IEEE conference ที่จำกัด 6 หน้า ต้องตัดราว 3 หน้า ส่วนที่ตัดง่าย:
  - ย่อ Related Work
  - Table III เหลือเฉพาะ LA (site หลักตาม pre-registration)
  - Table IV เปลี่ยนเป็นประโยคเดียว
- **Template ภาษาไทย:** `[THAI]Templete_Short Paper.pdf` ไม่ใช่รูปแบบ IEEE ถ้าต้องส่งตาม template นี้
  ต้องแปลงทั้งภาษาและรูปแบบ

## ขั้นสุดท้าย

1. Build แล้วตรวจว่าไม่มี overfull hbox และนับหน้า
2. สร้าง tag และใส่ใน paper ตามหัวข้อ "เหลือ"
3. ลบ `\todo{}` ทั้งหมด หรือตั้ง `\showtodosfalse` (บรรทัด 19)
4. ตัดสินใจว่าจะเปลี่ยนชื่อ `fixpaper.tex` เป็น `main.tex` หรือไม่
