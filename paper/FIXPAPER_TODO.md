# สิ่งที่ต้องเติมใน `fixpaper.tex`

`fixpaper.tex` เป็นฉบับแก้ของ `main.tex` ตามผลรีวิว (ฉบับเดิมยังอยู่ ไม่ได้แก้)
ตัวเลขที่เปลี่ยนใหม่ตรวจเทียบกับ `RESULTS.md`, `summary_pr_auc.json` และ
`simulation/results/rejection_rates.csv` แล้ว

รายการด้านล่างคือสิ่งที่ยังเติมเองไม่ได้ เพราะต้องใช้ข้อมูลหรือการตัดสินใจของผู้เขียน
แต่ละข้อมี `\todo{}` สีแดงอยู่ในไฟล์ (เลขบรรทัดอ้างอิง `fixpaper.tex`)

Build: `cd paper && tectonic fixpaper.tex`

## Status 2026-10-18 (update after the first pass)

Done in `fixpaper.tex`:
- Item 1: added `experiments/case4/` (script, seed, command, `RESULTS.md`). Measured over 10 repeats:
  ROC-AUC 0.960 grouped vs 0.959 naive, PR-AUC 0.973 vs 0.972. The old 0.969/0.970 and the poster's
  0.973 do not reproduce (single-seed 5-fold gives 0.969); Table I and the Case 4 text now use the
  measured numbers and say so.
- Item 2: dimethyl sulfone now cites Engelke et al. 2005 (NMR Biomed 18:331-336, verified on Crossref:
  a regular plasma metabolite from diet, gut bacteria and endogenous methanethiol metabolism).
  "Supplements" was dropped because that source does not mention them.
- Item 3: the three earlier repositories are cited with commits (`637a58e`, `f220cd2`, `0088e38`).
  `637a58e` IS on GitHub (private repo, verified with `git ls-remote`); the 404 is because the repo is private.
- Item 5: `han2022` year is 2022 (Crossref print issue May 2022; 2020 is online-first). Todo removed.

Still open:
- Item 4, Acknowledgment: needs funding and advisor names from the authors.
- Visibility: `Calvinkub/validated-yet-wrong` and `Calvinkub/mtbls242-forecast-honest` are private. The
  paper's footnote and citations point at both, so both must be public before submission.

## ต้องทำก่อนส่ง (กระทบเนื้อหา)

### 1. Case 4: ตัวเลข AUC ยังไม่มีที่มา (บรรทัด 230 และ 571)
- ROC-AUC 0.973 ใน Table I และ 0.969 (grouped CV) / 0.970 (naive CV) ในหัวข้อ Case 4
  ไม่มีอยู่ในไฟล์ผลลัพธ์ใดใน repo และไม่มีโฟลเดอร์ `experiments/case4/`
- ทางเลือก:
  - (แนะนำ) เพิ่ม `experiments/case4/` ที่มี script, seed, คำสั่ง และ `RESULTS.md`
    แบบเดียวกับเคสอื่น แล้วใส่ตัวเลขที่รันได้
  - หรือตัดตัวเลขออก แล้วเหลือแค่ข้อเท็จจริงที่ verify ได้จาก sample sheet
    (ผู้ป่วย 71 จาก 106 คนอยู่ในทั้งสองคลาส)
- ระวัง: 0.973 ตรงกับ PR-AUC ของ Case 2 (grouped) อาจเป็นการคัดลอกผิดช่อง

### 2. Case 2: citation ที่มาของ dimethyl sulfone (บรรทัด 438)
- ฉบับแก้บอกว่า dimethyl sulfone อาจมาจากอาหาร อาหารเสริม (MSM)
  หรือการเผาผลาญของจุลินทรีย์ในลำไส้ จึงเรียกสารทั้งสามว่า "putatively exogenous"
- ต้องหา reference ที่ verify แล้วมารองรับ (ยังไม่ได้ใส่ เพื่อไม่ให้อ้างโดยไม่ได้ตรวจ)
- ถ้าหาไม่ได้ ให้ตัดประโยคนั้นออก แล้วเหลือแค่ว่าที่มาของ dimethyl sulfone ยังไม่ชัด
- ข้อสังเกตจาก `experiments/refs/VERIFICATION.md`: ยังไม่พบ paper ที่บอกตรงๆ ว่า
  isopropanol/methanol เป็น handling artefact ใน serum NMR
  ตอนนี้ใช้ `bernini2011` และ `vandersar2015` (ethanol ใน CSF) เป็นหลักฐานทั่วไป

### 3. Cite repo งานเก่าของเราเอง (บรรทัด 100 และ 768)
ฉบับแก้บอกตรงๆ ว่าทั้ง 4 เคสเป็นการตรวจงานเก่าของผู้เขียนเอง จึงต้องใส่ลิงก์
- `mtbls242-forecast-honest` (Case 1 และ 1b import code จาก repo นี้,
  ใช้ branch `honest-evaluation` commit `637a58e`): ต้องเปิดเป็น public
  ไม่อย่างนั้น reproduce Case 1/1b ไม่ได้
- ROAR repo (ที่มาของ Case 2)
- `Calvinkub/Bridge_ai_summit_nmr_2026` commit `0088e38` (notebook ของ Case 3)

ถ้าบาง repo เปิด public ไม่ได้ ต้องแก้ย่อหน้า Data and Code Availability ให้ตรงตามจริง

### 4. Acknowledgment (บรรทัด 772)
ใส่แหล่งทุนและอาจารย์ที่ปรึกษา

### 5. ปีของ `han2022` (บรรทัด 799)
Crossref ให้ปี 2020 (online first) แต่ vol. 41 ตรงกับปี 2022 ให้เช็กว่า venue
ต้องการปีแบบไหน แล้วลบ `\todo` ออก

## ตรวจเพิ่ม (ไม่มี `\todo` ในไฟล์)

- **`adebayo2018`, `kumar2020`:** ตรวจแค่ชื่อผู้แต่งและ volume แล้ว
  ยังไม่ได้อ่านว่าเนื้อหาสนับสนุนประโยคที่ cite จริงหรือไม่
- **ข้อความ Use of Generative AI:** ปรับให้ตรงกับข้อกำหนดของ venue ที่จะส่ง
- **ความยาว:** ฉบับแก้ยาว 9 หน้า (ฉบับเดิม 8) ถ้าส่ง IEEE conference ที่จำกัด 6 หน้า
  ต้องตัดราว 3 หน้า ส่วนที่ตัดง่าย:
  - ย่อ Related Work
  - Table III เหลือเฉพาะ LA (site หลักตาม pre-registration)
  - Table IV เปลี่ยนเป็นประโยคเดียว
- **Table I ล้นขอบ:** ตอน compile มี overfull hbox เพราะข้อความ TODO ในช่อง Case 4
  จะหายเองเมื่อแก้ข้อ 1

## ขั้นสุดท้าย

1. ลบ `\todo{}` ทั้งหมด หรือตั้ง `\showtodosfalse` (บรรทัด 19)
2. ตัดสินใจว่าจะให้ `fixpaper.tex` แทน `main.tex` หรือรวมการแก้กลับเข้า `main.tex`
3. อัปเดต README หัวข้อ Status ให้ตรงกับรายการที่เหลือ
