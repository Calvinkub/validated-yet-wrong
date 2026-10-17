# สิ่งที่ต้องเติมใน `fixpaper.tex`

`fixpaper.tex` เป็นฉบับแก้ของ `main.tex` ตามผลรีวิว (ฉบับเดิมยังอยู่ ไม่ได้แก้)
ตัวเลขที่เปลี่ยนใหม่ตรวจเทียบกับ `RESULTS.md`, `summary_pr_auc.json` และ
`simulation/results/rejection_rates.csv` แล้ว

Build: `cd paper && tectonic fixpaper.tex` (ตอนนี้ 9 หน้า ไม่มี overfull hbox)

สิ่งที่ทำไปแล้วและตัวเลขที่ใส่ลงไป ดูได้ที่ `RESULTS_FOR_PAPER.md`

## เหลือให้ผู้เขียนทำ (มี `\todo{}` สีแดงในไฟล์)

### 1. เปิด repo ของ paper นี้เป็น public (บรรทัด 766)
`https://github.com/Calvinkub/validated-yet-wrong` ตอบ 404 ถ้าเข้าแบบไม่ login
(ตรวจเมื่อ 18 ต.ค. 2026) แต่ footnote หน้าแรกและย่อหน้า Data and Code
Availability ชี้ไปที่ repo นี้พร้อม tag `paper-v1`
- เปิดเป็น public แล้วสร้าง tag `paper-v1` หลัง commit สุดท้าย แล้วลบ `\todo`
- ถ้าตั้งใจปิดไว้จนกว่าจะส่ง ก็ให้ลบ `\todo` ตอนเปิด

### 2. เปิด code ของ `mtbls242-forecast-honest` เป็น public (บรรทัด 775 และ 818)
- commit `637a58e` (branch `honest-evaluation`) ไม่มีบน GitHub
  (`Chaiporn2005/Forecast` ไม่มี commit นี้ และไม่มี repo ชื่อ `mtbls242-forecast-honest`
  ทั้งในบัญชี Chaiporn2005 และ Calvinkub)
- `Forecast` ฝั่ง public ไม่มี `controls.py` กับ `monotone_logistic.py`
  ซึ่ง Case 1 และ 1b ต้องใช้ ตอนนี้จึงยังไม่มีใคร reproduce สองเคสนี้ได้
- น่าจะอยู่ในเครื่อง Mac ที่ `/Users/admin/Project/Forecast/MTBLS242_forecast`
  ให้ push branch นั้นขึ้นไป แล้วใส่ชื่อผู้แต่งและ URL ใน `\bibitem{honest2026}`
- ถ้าเปิดไม่ได้ ให้แก้ประโยคเป็น "available from the authors on request"

### 3. Acknowledgment (บรรทัด 779)
ใส่แหล่งทุนและอาจารย์ที่ปรึกษา

## ให้ผู้เขียนยืนยัน (ไม่มี `\todo`)

- **`bridge2026`:** ใส่ผู้แต่งเป็น K. C. Shomwiwat โดยอนุมานจากชื่อบัญชี Calvinkub
- **`roar2026`:** ใส่ commit `f220cd2` ซึ่งเป็น head ปัจจุบันของ `main`
  แต่ Case 2 ไม่ได้บันทึกว่าคัดลอกโค้ดมาจาก commit ไหน ถ้ารู้ commit ที่ถูกต้องให้แก้
- **`han2022`:** ใช้ May 2022 (ปีของ issue ตาม IEEE style) ถ้า venue ต้องการปีที่
  ตีพิมพ์ online ให้เปลี่ยนเป็น 2020
- **Table I แถว Case 4:** คง ROC-AUC 0.973 ไว้ตามฉบับร่าง ทางเลือกอื่นคือใช้
  PR-AUC 0.984 จาก commit `0088e38` (เป็น monotonic เหมือน Case 2 และ 3) ซึ่งจะทำให้
  ทุกแถวเป็น PR-AUC ถ้าเลือกทางนี้ ต้องแก้ย่อหน้า Case 4 และประโยค
  "Case 4 re-runs the unconstrained XGBoost" ใน Models ด้วย ตัวเลขทั้งสองแบบอยู่ใน
  `experiments/case4/RESULTS.md`

## ตัดสินใจตาม venue

- **ข้อความ Use of Generative AI:** ปรับให้ตรงกับข้อกำหนดของ venue ที่จะส่ง
- **ความยาว:** ฉบับแก้ยาว 9 หน้า ถ้าส่ง IEEE conference ที่จำกัด 6 หน้า
  ต้องตัดราว 3 หน้า ส่วนที่ตัดง่าย:
  - ย่อ Related Work
  - Table III เหลือเฉพาะ LA (site หลักตาม pre-registration)
  - Table IV เปลี่ยนเป็นประโยคเดียว

## ขั้นสุดท้าย

1. ลบ `\todo{}` ทั้งหมด หรือตั้ง `\showtodosfalse` (บรรทัด 19)
2. ตัดสินใจว่าจะให้ `fixpaper.tex` แทน `main.tex` หรือรวมการแก้กลับเข้า `main.tex`
3. อัปเดต README หัวข้อ Status ให้ตรงกับรายการที่เหลือ
