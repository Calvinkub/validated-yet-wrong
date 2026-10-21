// Builds presentation/validated_yet_wrong.pptx (16:9 wide, clean white academic).
// Run:  NODE_PATH=<dir with pptxgenjs> node build_deck.js
// Charts are native PowerPoint charts filled from the repo's result files.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.env.APPLY_THEME ||
  "/Users/admin/.claude/skills/synced/d6ee17a1-c03b-495d-b0fe-555e5f376767_3711d233-0394-44f6-a445-9295669255c5/pptx/scripts/apply_theme.js");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(__dirname, "validated_yet_wrong.pptx");

// ---------- data from the repo ----------
const rates = fs.readFileSync(path.join(ROOT, "simulation/results/rejection_rates.csv"), "utf8")
  .trim().split("\n");
const head = rates[0].split(",");
const rateRows = rates.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [head[i], v])));
const simCell = (r, g) => rateRows.filter((x) => +x.r === r && +x.gamma === g).sort((a, b) => +a.n - +b.n);
const sim = simCell(0.25, 0);
const pct = (k) => sim.map((x) => +(100 * +x[k]).toFixed(1));
const case2 = JSON.parse(fs.readFileSync(path.join(ROOT, "experiments/case2/results/summary.json"), "utf8"));
const curve = case2.curve;

// ---------- theme ----------
const INK = "1B2430", MUTED = "5B6470", HAIR = "D9DEE3", TINT = "F3F5F7", WHITE = "FFFFFF";
const BLUE = "2A78D6", ORANGE = "EB6834", AQUA = "1BAF7A", VIOLET = "4A3AA7", GRAY = "9AA3AD";
const ORANGE_TXT = "C2410C"; // darker orange for small text on white (contrast)
const HEAD = "Cambria", BODY = "Calibri";
const THEME = {
  name: "Academic White", headFontFace: HEAD, bodyFontFace: BODY,
  colors: { dk1: INK, lt1: WHITE, dk2: MUTED, lt2: TINT, accent1: BLUE, accent2: ORANGE, accent3: AQUA,
    accent4: VIOLET, accent5: "EDA100", accent6: "E34948", hlink: BLUE, folHlink: VIOLET },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };
pres.title = "Validated, yet Wrong";
pres.author = "Chaiyaporn Orrudee, Kanin Calvin Shomwiwat";
pres.subject = "Four ways small-n metabolomics ML passes standard checks";

const W = 13.33, M = 0.6, CW = W - 2 * M;

pres.defineSlideMaster({
  title: "TITLE_ONLY", background: { color: WHITE },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.78, w: CW, h: 1.05, fontFace: HEAD,
        fontSize: 32, bold: true, color: INK, valign: "top", align: "left", margin: 0 }, text: "" } },
    { text: { text: "Validated, yet Wrong  |  KMITL, Artificial Intelligence Technology",
        options: { x: M, y: 7.0, w: 8, h: 0.3, fontFace: BODY, fontSize: 10, color: MUTED, margin: 0 } } },
  ],
  slideNumber: { x: W - M - 0.8, y: 7.0, w: 0.8, h: 0.3, fontFace: BODY, fontSize: 10, color: MUTED, align: "right" },
});
pres.defineSlideMaster({ title: "TITLE_SLIDE", background: { color: WHITE }, objects: [] });

// ---------- helpers ----------
let n = 0;
function content(kicker, title, notes, source) {
  const s = pres.addSlide({ masterName: "TITLE_ONLY" });
  n += 1;
  s.addText(kicker.toUpperCase(), { x: M, y: 0.4, w: CW, h: 0.3, fontFace: BODY, fontSize: 12, bold: true,
    color: ORANGE_TXT, charSpacing: 3, margin: 0, isTextBox: true, objectName: "Kicker" });
  s.addText(title, { placeholder: "title" });
  if (source) s.addText(source, { x: M, y: 6.62, w: CW, h: 0.3, fontFace: BODY, fontSize: 10, color: MUTED,
    italic: true, margin: 0, isTextBox: true, objectName: "Source" });
  if (notes) s.addNotes(notes);
  return s;
}
const card = (s, x, y, w, h, name) => s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: TINT },
  line: { color: TINT, width: 0 }, rectRadius: 0.08, objectName: name || "Card" });
function stat(s, x, y, w, big, label, color) {
  card(s, x, y, w, 2.3, "Stat card");
  s.addText(big, { x: x + 0.3, y: y + 0.25, w: w - 0.6, h: 1.0, fontFace: HEAD, fontSize: 54, bold: true,
    color: color || ORANGE_TXT, margin: 0, isTextBox: true, valign: "middle" });
  s.addText(label, { x: x + 0.3, y: y + 1.3, w: w - 0.6, h: 0.9, fontFace: BODY, fontSize: 16, color: INK,
    margin: 0, isTextBox: true, valign: "top" });
}
const body = (s, runs, o) => s.addText(runs, Object.assign({ fontFace: BODY, fontSize: 16, color: INK,
  margin: 0, isTextBox: true, valign: "top", paraSpaceAfter: 8 }, o));
const bullets = (items) => items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } }));
function chartCommon(extra) {
  return Object.assign({
    catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt",
    legendFontFace: "+mn-lt", catAxisLabelFontSize: 12, valAxisLabelFontSize: 12, dataLabelFontSize: 12,
    legendFontSize: 12, catAxisLabelColor: INK, valAxisLabelColor: MUTED, dataLabelColor: INK, legendColor: INK,
    valGridLine: { color: HAIR, size: 0.75 }, catGridLine: { style: "none" }, showTitle: false,
    valAxisLineShow: false,
  }, extra);
}

// =============== 1. Title ===============
{
  const s = pres.addSlide({ masterName: "TITLE_SLIDE" }); n += 1;
  s.addText("PROJECT DEFENSE  |  OCTOBER 2026", { x: M, y: 0.7, w: 7, h: 0.3, fontFace: BODY, fontSize: 12, bold: true,
    color: ORANGE_TXT, charSpacing: 3, margin: 0, isTextBox: true });
  s.addText("Validated, yet Wrong", { x: M, y: 1.5, w: 7.2, h: 1.3, fontFace: HEAD, fontSize: 54, bold: true,
    color: INK, margin: 0, isTextBox: true, valign: "top" });
  s.addText("Four ways small-n metabolomics machine learning passes standard checks", { x: M, y: 2.95, w: 6.8,
    h: 1.2, fontFace: BODY, fontSize: 22, color: MUTED, margin: 0, isTextBox: true, valign: "top" });
  s.addText([
    { text: "Chaiyaporn Orrudee (67070217)", options: { breakLine: true } },
    { text: "Kanin Calvin Shomwiwat (67070015)", options: { breakLine: true } },
    { text: "Advisor: Asst. Prof. Dr. Nont Kanungsukkasem", options: { breakLine: true } },
    { text: "Artificial Intelligence Technology, School of Information Technology, KMITL" },
  ], { x: M, y: 4.7, w: 7.2, h: 1.7, fontFace: BODY, fontSize: 15, color: INK, margin: 0, isTextBox: true,
    valign: "top", paraSpaceAfter: 4 });
  // right panel: the story in three rows
  const rows = [["Cross-validation", true], ["Permutation test", true], ["Attribution check (ROAR)", true]];
  rows.forEach((r, i) => {
    const y = 1.55 + i * 1.05;
    s.addShape(pres.ShapeType.roundRect, { x: 8.3, y, w: 4.4, h: 0.85, fill: { color: TINT }, line: { color: TINT, width: 0 },
      rectRadius: 0.08, objectName: "Check row" });
    s.addShape(pres.ShapeType.ellipse, { x: 8.55, y: y + 0.2, w: 0.45, h: 0.45, fill: { color: AQUA },
      line: { color: AQUA, width: 0 }, objectName: "Check badge" });
    s.addText("✓", { x: 8.55, y: y + 0.2, w: 0.45, h: 0.45, fontFace: BODY, fontSize: 18, bold: true, color: WHITE,
      align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(r[0], { x: 9.2, y, w: 3.4, h: 0.85, fontFace: BODY, fontSize: 18, color: INK, valign: "middle", margin: 0,
      isTextBox: true });
  });
  s.addShape(pres.ShapeType.roundRect, { x: 8.3, y: 4.7, w: 4.4, h: 0.85, fill: { color: ORANGE },
    line: { color: ORANGE, width: 0 }, rectRadius: 0.08, objectName: "Verdict row" });
  s.addText("Result: still wrong", { x: 8.55, y: 4.7, w: 4.0, h: 0.85, fontFace: HEAD, fontSize: 22, bold: true,
    color: WHITE, valign: "middle", margin: 0, isTextBox: true });
  s.addNotes("สวัสดีครับ/ค่ะ วันนี้นำเสนอโครงงานเรื่อง Validated, yet Wrong หรือ \"ผ่านการตรวจสอบแล้ว แต่ผิด\" งานนี้ว่าด้วยวิธีที่โมเดลแมชชีนเลิร์นนิงบนข้อมูลเมตาโบโลมิกส์ขนาดเล็ก ผ่านการตรวจสอบมาตรฐานครบทุกอย่าง แต่ผลลัพธ์ยังผิดอยู่ดี (เวลา ~0:20)");
}

// =============== 2. Hook ===============
{
  const s = content("The hook", "Every standard check passed. The result was still wrong.",
    "ตัวเลขสามตัวนี้มาจากงานของเราเอง ตอนที่ตรวจสอบด้วยวิธีมาตรฐานแล้วดูน่าเชื่อถือ: p = 0.002 จาก label permutation, PR-AUC 1.000 จากชื่อไฟล์ตัวอย่างอย่างเดียว, และผู้ป่วย 71 จาก 106 คนอยู่ทั้งสองคลาสของ label ที่เราเรียกว่า \"โรคอ้วน\" ทั้งสามเรื่องจะอธิบายต่อไป (~0:35)",
    "Sources: Case 1 (permutation, legacy design), Case 3 (prefix-only classifier), Case 4 (MTBLS242 sample sheet).");
  const w = (CW - 0.6) / 3;
  stat(s, M, 2.4, w, "p = 0.002", "Label permutation says the forecast is significant. A null with no signal scored higher than the model.");
  stat(s, M + w + 0.3, 2.4, w, "1.000", "PR-AUC from the sample-name prefix alone. The \"biology\" is a batch label.");
  stat(s, M + 2 * (w + 0.3), 2.4, w, "71 of 106", "Patients appear in both classes of the \"obese vs non-obese\" label. It is before vs after surgery.");
  body(s, "Small cohorts, many features, and checks that answer narrow questions. The failure is rarely the model.",
    { x: M, y: 5.2, w: CW, h: 1.0, fontSize: 20, color: MUTED });
}

// =============== 3. What the checks ask ===============
{
  const s = content("The problem", "Each check answers a narrow question, and none asks about the label",
    "cross-validation ถามว่าโมเดลใช้กับตัวอย่างใหม่ที่เก็บแบบเดิมได้ไหม, permutation test ถามว่าฟีเจอร์กับ label มีความสัมพันธ์อะไรสักอย่างไหม, ROAR ถามว่าโมเดลพึ่งฟีเจอร์นั้นไหม ไม่มีอันไหนถามว่า label วัดสิ่งที่มันอ้างจริงหรือเปล่า หรือสัญญาณนั้นเป็นชีววิทยาหรือไม่ (~0:35)",
    "Framing follows Kapoor and Narayanan (2023) on leakage and Ojala and Garriga (2010) on permutation tests.");
  const cols = [
    ["Cross-validation", "Does the model generalise to new samples drawn the same way?", "Does \"the same way\" hide a batch, a person, or a time effect?"],
    ["Permutation test", "Is there any association between features and label?", "Is the association guaranteed because the label is built from the features?"],
    ["ROAR (remove and retrain)", "Does the model rely on this feature?", "Is that feature biology, or an artefact of how samples were handled?"],
  ];
  const w = (CW - 0.6) / 3;
  cols.forEach((c, i) => {
    const x = M + i * (w + 0.3);
    card(s, x, 2.15, w, 4.2, "Column card");
    s.addText(c[0], { x: x + 0.3, y: 2.35, w: w - 0.6, h: 0.5, fontFace: HEAD, fontSize: 20, bold: true, color: INK, margin: 0, isTextBox: true });
    s.addText("IT ANSWERS", { x: x + 0.3, y: 3.05, w: w - 0.6, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: AQUA === "" ? INK : "0E7C57", charSpacing: 2, margin: 0, isTextBox: true });
    s.addText(c[1], { x: x + 0.3, y: 3.35, w: w - 0.6, h: 1.2, fontFace: BODY, fontSize: 16, color: INK, margin: 0, isTextBox: true, valign: "top" });
    s.addText("IT NEVER ASKS", { x: x + 0.3, y: 4.65, w: w - 0.6, h: 0.3, fontFace: BODY, fontSize: 11, bold: true, color: ORANGE_TXT, charSpacing: 2, margin: 0, isTextBox: true });
    s.addText(c[2], { x: x + 0.3, y: 4.95, w: w - 0.6, h: 1.2, fontFace: BODY, fontSize: 16, color: INK, margin: 0, isTextBox: true, valign: "top" });
  });
}

// =============== 4. Four cases ===============
{
  const s = content("The map", "Four public-data cases, each with the check it passed and the control that catches it",
    "เราเจอสี่รูปแบบจากข้อมูลสาธารณะบน MetaboLights: หนึ่ง ผลลัพธ์ที่ถูกสร้างจากฟีเจอร์ตัวเอง, สอง สารปนเปื้อนที่ ROAR จัดว่าสำคัญเท่าชีววิทยา, สาม batch ที่ตรงกับ label ทุกตัวอย่าง, สี่ label ที่ชื่อไม่ตรงกับสิ่งที่มันวัด แต่ละกรณีมีการตรวจเฉพาะที่จับได้ (~0:30)",
    "Datasets: MTBLS242 (bariatric surgery serum NMR), MTBLS1 (urine NMR, T2DM). Table I in the paper.");
  const cases = [
    ["1", "Outcome built from its own features", "Label permutation, p = 0.002", "Pairing-destroyed null; joint residualisation", "MTBLS242"],
    ["2", "Contaminants ranked with biology", "ROAR faithfulness test", "Spiked-artefact positive control", "MTBLS242"],
    ["3", "Collection batch equals the label", "Subject-grouped CV", "Metadata and batch audit", "MTBLS1"],
    ["4", "Label name differs from label meaning", "Subject-grouped CV", "Label-provenance audit", "MTBLS242"],
  ];
  const w = (CW - 0.9) / 4;
  cases.forEach((c, i) => {
    const x = M + i * (w + 0.3);
    card(s, x, 2.15, w, 4.25, "Case card");
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.3, y: 2.4, w: 0.6, h: 0.6, fill: { color: INK }, line: { color: INK, width: 0 }, objectName: "Case badge" });
    s.addText(c[0], { x: x + 0.3, y: 2.4, w: 0.6, h: 0.6, fontFace: HEAD, fontSize: 20, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText(c[1], { x: x + 0.3, y: 3.15, w: w - 0.6, h: 1.0, fontFace: HEAD, fontSize: 17, bold: true, color: INK, margin: 0, isTextBox: true, valign: "top" });
    s.addText([
      { text: "PASSES  ", options: { bold: true, fontSize: 11, color: "0E7C57", charSpacing: 2, breakLine: true } },
      { text: c[2], options: { fontSize: 14, color: INK, breakLine: true } },
      { text: " ", options: { fontSize: 6, breakLine: true } },
      { text: "CAUGHT BY  ", options: { bold: true, fontSize: 11, color: ORANGE_TXT, charSpacing: 2, breakLine: true } },
      { text: c[3], options: { fontSize: 14, color: INK } },
    ], { x: x + 0.3, y: 4.2, w: w - 0.6, h: 1.85, fontFace: BODY, margin: 0, isTextBox: true, valign: "top" });
    s.addText(c[4], { x: x + 0.3, y: 6.0, w: w - 0.6, h: 0.28, fontFace: BODY, fontSize: 11, color: MUTED, margin: 0, isTextBox: true });
  });
}

// =============== 5. Case 1 mechanism ===============
{
  const s = content("Case 1  |  Outcome built from features", "A null with no signal beat the model",
    "กรณีแรก: ผู้ป่วยผ่าตัดกระเพาะ 71 คน ทำนายว่าใครจะตอบสนองดีหลังหนึ่งปี โดย label ถูกคำนวณจากการเปลี่ยนแปลงของสารชุดเดียวกับที่ใช้เป็นฟีเจอร์ ค่าเริ่มต้นที่สูงจะลดลงเข้าหาค่าเฉลี่ยเอง (regression to the mean) label permutation ให้ p = 0.002 แต่เมื่อสลับว่าตัวอย่างหลังหนึ่งปีเป็นของใคร แล้วสร้าง label ใหม่ ซึ่งไม่เหลือสัญญาณรายบุคคลเลย ผลกลับได้ lift 2.04 เท่า สูงกว่าโมเดลจริงที่ 1.57 เท่า (~0:50)",
    "Source: MTBLS242, 71 patients, original responder rule (>=9 of 11 markers). Model PR-AUC 0.683 vs prevalence 0.437; observed lift below 499 of 500 null replicates. experiments/case1/RESULTS.md");
  body(s, [
    { text: "The label is computed from change:", options: { bold: true, breakLine: true } },
    { text: "responder = at least 9 of 11 markers move the expected way between baseline and 12 months.", options: { breakLine: true } },
    { text: "The features are the baseline values.", options: { bold: true, breakLine: true } },
    { text: "High baselines fall back toward the mean by themselves, so baseline \"predicts\" change even when nothing happens." },
  ], { x: M, y: 2.15, w: 5.4, h: 2.9, fontSize: 17 });
  card(s, M, 5.1, 5.4, 1.3, "Callout");
  s.addText([
    { text: "Label permutation: ", options: { bold: true } },
    { text: "p = 0.002, so it looks significant. It only tests that features and label are associated, and here that is guaranteed." },
  ], { x: M + 0.25, y: 5.2, w: 4.9, h: 1.1, fontFace: BODY, fontSize: 15, color: INK, margin: 0, isTextBox: true, valign: "middle" });
  s.addChart(pres.charts.BAR, [{ name: "Lift over prevalence", labels: ["Observed model", "Pairing-destroyed null (median)"], values: [1.57, 2.04] }],
    chartCommon({ x: 6.5, y: 2.1, w: 6.2, h: 4.4, barDir: "col", chartColors: [BLUE, ORANGE], barGapWidthPct: 60, showLegend: false,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00\"x\"", dataLabelFontBold: true, dataLabelFontSize: 16,
      valAxisMinVal: 0, valAxisMaxVal: 2.5, valAxisMajorUnit: 0.5, valAxisLabelFormatCode: "0.0\"x\"",
      showValAxisTitle: true, valAxisTitle: "Lift = average precision / prevalence", valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
}

// =============== 6. Case 1 corrected ===============
{
  const s = content("Case 1  |  After the fix", "With the outcome corrected, the model is no better than learn-nothing",
    "พอแก้นิยามผลลัพธ์ (หักผลของค่าเริ่มต้นออกภายในแต่ละ fold) โมเดลก็ไม่ดีกว่าตัวให้คะแนนที่ไม่ได้เรียนรู้อะไรเลย (ผลรวมค่า z-score ของค่าเริ่มต้นที่ไม่มีการ fit) ทั้งสองดีไซน์ ช่วงความเชื่อมั่นระดับ subject คร่อมศูนย์ ดังนั้นพูดได้ว่า \"ไม่ดีกว่า\" ไม่ใช่ \"แย่กว่า\" ความชุกต่างกันระหว่างสองดีไซน์ ให้เทียบ gap ไม่ใช่ระดับ PR-AUC (~0:30)",
    "Source: experiments/case1/RESULTS.md. Gap (model minus scorer), subject-bootstrap 95% interval: per-marker -0.042 [-0.149, +0.052]; joint -0.037 [-0.111, +0.037]. Refit permutation p = 1.0 for both.");
  s.addChart(pres.charts.BAR, [
    { name: "Trained model", labels: ["Per-marker residualised\n(prevalence 0.437)", "Joint residualised\n(prevalence 0.521)"], values: [0.483, 0.554] },
    { name: "Learn-nothing scorer", labels: ["Per-marker residualised\n(prevalence 0.437)", "Joint residualised\n(prevalence 0.521)"], values: [0.522, 0.589] },
  ], chartCommon({ x: M, y: 2.1, w: 7.2, h: 4.4, barDir: "col", chartColors: [BLUE, GRAY], barGapWidthPct: 70, showLegend: true, legendPos: "b",
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", dataLabelFontBold: true, valAxisMinVal: 0, valAxisMaxVal: 0.8,
    valAxisMajorUnit: 0.2, valAxisLabelFormatCode: "0.0", showValAxisTitle: true, valAxisTitle: "PR-AUC", valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
  body(s, [
    { text: "What this shows", options: { bold: true, breakLine: true } },
    ...bullets([
      "The trained model does not beat an unfitted score.",
      "Refitted permutation tests give p = 1.0.",
      "Gap intervals over the 71 patients span zero: say \"no better than\", not \"worse\".",
    ]),
  ], { x: 8.2, y: 2.3, w: 4.5, h: 3.2, fontSize: 17 });
  card(s, 8.2, 5.35, 4.5, 1.05, "Callout");
  s.addText("Compare gaps, not levels: the two designs have different prevalence.", { x: 8.45, y: 5.4, w: 4.0, h: 0.95,
    fontFace: BODY, fontSize: 14, color: INK, margin: 0, isTextBox: true, valign: "middle" });
}

// =============== 7. Simulation ===============
{
  const s = content("Why it happens", "More data makes label permutation more wrong",
    "เพื่อดูว่าปัญหานี้เกิดเมื่อไร เราจำลอง 36,000 ชุดข้อมูล เมื่อไม่มีผลรายบุคคลเลย label permutation ปฏิเสธสมมติฐานว่างผิด ๆ ตั้งแต่ 26% ที่ 50 ตัวอย่าง ไปจนถึง 100% ที่ 500 ตัวอย่าง ยิ่งข้อมูลมาก ยิ่งผิดมาก เพราะข้อมูลมากแค่ทำให้ประมาณ artefact ได้แม่นขึ้น วิธีแก้ที่นิยมคือหักค่าเริ่มต้นทีละสาร ยังผิด 8-29% เพราะสารสัมพันธ์กัน ถ้าหักด้วยค่าเริ่มต้นของทุกสารพร้อมกัน อัตราผิดลงมาที่ 5-8% ส่วน pairing-destroyed null ไม่เคยผิดเกิน 4.3% แต่ตรวจจับผลจริงได้อ่อน จึงใช้เป็นตัวช่วยวินิจฉัย (~0:45)",
    "Source: simulation/results/rejection_rates.csv. 1,000 datasets per point, gamma = 0 (no real individual response), reliability r = 0.25 (reproduces the observed baseline-change correlation of -0.62). Refit permutation, 200 replicates, alpha = 0.05.");
  const labels = sim.map((x) => "n = " + x.n);
  s.addChart(pres.charts.LINE, [
    { name: "Label permutation", labels, values: pct("p_perm_raw") },
    { name: "Pairing-destroyed null", labels, values: pct("p_pair") },
    { name: "Joint residualised + permutation", labels, values: pct("p_perm_resid_joint") },
    { name: "Per-marker residualised + permutation", labels, values: pct("p_perm_resid") },
    { name: "Nominal 5%", labels, values: [5, 5, 5, 5] },
  ], chartCommon({ x: M, y: 2.05, w: 7.6, h: 4.5, chartColors: [ORANGE, BLUE, AQUA, VIOLET, GRAY], lineSize: 3, lineDataSymbol: "circle",
    lineDataSymbolSize: 8, lineDash: ["solid", "solid", "solid", "solid", "dash"], showLegend: true, legendPos: "b", valAxisMinVal: 0, valAxisMaxVal: 100,
    valAxisMajorUnit: 20, valAxisLabelFormatCode: "0\"%\"", showValAxisTitle: true, valAxisTitle: "False-positive rate when there is no real signal",
    valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
  body(s, [
    { text: "26% to 100%", options: { bold: true, color: ORANGE_TXT, fontSize: 26, fontFace: HEAD, breakLine: true } },
    { text: "false positives for label permutation as n goes from 50 to 500.", options: { breakLine: true } },
    { text: " ", options: { fontSize: 8, breakLine: true } },
    { text: "Per-marker correction is not enough:", options: { bold: true, breakLine: true } },
    { text: "8 to 19% false positives here (up to 29% at other settings).", options: { breakLine: true } },
    { text: " ", options: { fontSize: 8, breakLine: true } },
    { text: "Joint correction holds near 5%:", options: { bold: true, breakLine: true } },
    { text: "regress each change on all baselines together." },
  ], { x: 8.6, y: 2.2, w: 4.1, h: 4.2, fontSize: 16 });
}

// =============== 8. Replication ===============
{
  const s = content("Replication", "A second cohort shows the same artefact",
    "เราทำซ้ำบนข้อมูลชุดที่สอง คือผู้ป่วยผ่าตัดหัวใจ 47 คน โดยกำหนดวิธีวิเคราะห์ไว้ก่อนรันโมเดล (pre-registration) ผลแบบ raw change ซ้ำได้ที่ทั้งสองตำแหน่งเก็บเลือด: label permutation ปฏิเสธ (p = 0.007) แต่ pairing-destroyed null ได้ lift สูงกว่าโมเดล ส่วนผลหลังหักค่าเริ่มต้นซ้ำได้เพียงบางส่วน และ 47 คนไม่พอตัดสิน ข้อสังเกต: ยาที่ให้ระหว่างผ่าตัด (propofol, heparin) ทำให้เกิดสัญญาณที่ดูมีนัยสำคัญ (~0:25)",
    "Source: experiments/case1b_mtbls881/RESULTS.md and PREREG.md. MTBLS881, n = 47 per site, baseline -1 h vs 20 h, raw outcome K = 10 of 11 markers. Refit pairing null: p = 0.86 (LA), 0.91 (PA), 150 replicates.");
  s.addChart(pres.charts.BAR, [
    { name: "Observed model lift", labels: ["Left atrium (primary)", "Pulmonary artery"], values: [1.29, 1.19] },
    { name: "Pairing-destroyed null lift (median)", labels: ["Left atrium (primary)", "Pulmonary artery"], values: [1.49, 1.40] },
  ], chartCommon({ x: M, y: 2.05, w: 6.6, h: 4.5, barDir: "col", chartColors: [BLUE, ORANGE], barGapWidthPct: 70, showLegend: true, legendPos: "b",
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00\"x\"", dataLabelFontBold: true, valAxisMinVal: 0, valAxisMaxVal: 2,
    valAxisMajorUnit: 0.5, valAxisLabelFormatCode: "0.0\"x\"", showValAxisTitle: true, valAxisTitle: "Lift over prevalence (raw change outcome)",
    valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
  body(s, [
    { text: "Raw change replicates", options: { bold: true, breakLine: true } },
    { text: "Permutation rejects at both sites (p = 0.007); the no-signal null still scores higher.", options: { breakLine: true } },
    { text: " ", options: { fontSize: 8, breakLine: true } },
    { text: "Corrected outcomes replicate only partly", options: { bold: true, breakLine: true } },
    { text: "One site shows no signal; at the other the tests disagree. n = 47 cannot settle it.", options: { breakLine: true } },
    { text: " ", options: { fontSize: 8, breakLine: true } },
    { text: "Drugs create signal", options: { bold: true, breakLine: true } },
    { text: "Adding propofol, heparin and ethanol made the corrected outcome look significant (p = 0.005)." },
  ], { x: 7.6, y: 2.2, w: 5.1, h: 4.3, fontSize: 16 });
}

// =============== 9. Case 2 ROAR curve ===============
{
  const s = content("Case 2  |  Contaminants", "ROAR sees importance, not origin",
    "กรณีที่สองคือ ROAR ซึ่งตัดฟีเจอร์ที่ SHAP จัดว่าสำคัญแล้วฝึกโมเดลใหม่ ในข้อมูลผ่าตัดกระเพาะ สามสารแรกที่ถูกจัดว่าสำคัญคือ dimethyl sulfone, isopropanol และ methanol ซึ่งน่าจะเป็นสารจากภายนอก isopropanol เป็นน้ำยาทำความสะอาดผิวก่อนผ่าตัด ตัดสามสารนี้ คะแนนตกเหลือ 0.954 ส่วนตัดสามสารชีววิทยาจริงเหลือ 0.959 ต่างกันน้อยกว่าความผันผวนของ fold (~0.03) มาก ROAR แยกสองกลุ่มนี้ไม่ได้ (~0:45)",
    "Source: experiments/case2/RESULTS.md. Recursive ROAR, patient-grouped CV (10 x 5), 500 random draws per k. First removed: dimethyl sulfone, isopropanol, L-valine, glycine, methanol.");
  const ks = curve.map((c) => String(c.k));
  s.addChart(pres.charts.LINE, [
    { name: "Recursive ROAR (informed removal)", labels: ks, values: curve.map((c) => +c.recursive_pr_auc.toFixed(3)) },
    { name: "Random removal, mean", labels: ks, values: curve.map((c) => +c.null_mean.toFixed(3)) },
    { name: "Random removal, 2.5th percentile", labels: ks, values: curve.map((c) => +c.null_p2_5.toFixed(3)) },
  ], chartCommon({ x: M, y: 2.05, w: 7.6, h: 4.5, chartColors: [ORANGE, BLUE, GRAY], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 7,
    lineDash: ["solid", "solid", "dash"], showLegend: true, legendPos: "b", valAxisMinVal: 0.78, valAxisMaxVal: 1.0, valAxisMajorUnit: 0.04,
    valAxisLabelFormatCode: "0.00", showCatAxisTitle: true, catAxisTitle: "Features removed (k)", catAxisTitleFontSize: 12, catAxisTitleColor: MUTED,
    showValAxisTitle: true, valAxisTitle: "PR-AUC after retraining", valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
  card(s, 8.6, 2.2, 4.1, 2.0, "Callout");
  s.addText([
    { text: "Remove 3 contaminants", options: { color: MUTED, fontSize: 14, breakLine: true } },
    { text: "0.954", options: { fontFace: HEAD, bold: true, fontSize: 36, color: ORANGE_TXT } },
  ], { x: 8.85, y: 2.3, w: 3.6, h: 1.8, fontFace: BODY, margin: 0, isTextBox: true, valign: "middle" });
  card(s, 8.6, 4.4, 4.1, 2.0, "Callout");
  s.addText([
    { text: "Remove 3 biology markers", options: { color: MUTED, fontSize: 14, breakLine: true } },
    { text: "0.959", options: { fontFace: HEAD, bold: true, fontSize: 36, color: BLUE } },
  ], { x: 8.85, y: 4.5, w: 3.6, h: 1.8, fontFace: BODY, margin: 0, isTextBox: true, valign: "middle" });
}

// =============== 10. Case 2 spike ===============
{
  const s = content("Case 2  |  Positive control", "A feature with zero biology becomes the top feature",
    "เพื่อยืนยัน เราใส่ฟีเจอร์สังเคราะห์ที่ขึ้นกับ label อย่างเดียว ไม่มีชีววิทยาเลย (d คูณ y บวกสัญญาณรบกวน) เมื่อสัญญาณแรงพอ (d = 1.75) ROAR จัดให้เป็นอันดับหนึ่ง และการตัดมันทำให้คะแนนตกมากกว่าการตัดสารจริงตัวใดก็ตาม (0.0127 เทียบกับ 0.0073 ของ dimethyl sulfone) ROAR วัดว่าฟีเจอร์ พกสัญญาณ มากแค่ไหน ไม่ได้วัดว่ามันมาจากไหน (~0:30)",
    "Source: experiments/case2/RESULTS.md, 10 draws per d. Spike feature = d * y + N(0,1) where y is the label; no biology involved. Median rank among 22 features (21 real + the spike).");
  const w = (CW - 0.6) / 3;
  [["0.75", "10th", "Weak spike hides among the real metabolites."], ["1.25", "3rd", "Moderate spike already outranks most biology."], ["1.75", "1st", "Strong spike is the most important feature."]].forEach((r, i) => {
    const x = M + i * (w + 0.3);
    card(s, x, 2.15, w, 2.7, "Spike card");
    s.addText("d = " + r[0], { x: x + 0.3, y: 2.3, w: w - 0.6, h: 0.4, fontFace: BODY, fontSize: 16, bold: true, color: MUTED, margin: 0, isTextBox: true });
    s.addText(r[1], { x: x + 0.3, y: 2.75, w: w - 0.6, h: 1.0, fontFace: HEAD, fontSize: 54, bold: true, color: i === 2 ? ORANGE_TXT : INK, margin: 0, isTextBox: true, valign: "middle" });
    s.addText(r[2], { x: x + 0.3, y: 3.8, w: w - 0.6, h: 0.9, fontFace: BODY, fontSize: 15, color: INK, margin: 0, isTextBox: true, valign: "top" });
  });
  body(s, [
    { text: "Median ROAR rank among 22 features, ", options: { color: MUTED } },
    { text: "synthetic feature = d × label + noise.", options: { color: MUTED, breakLine: true } },
    { text: "At d = 1.75, removing the spike costs 0.0127 PR-AUC, more than removing any real metabolite (largest: 0.0073).", options: { bold: true } },
  ], { x: M, y: 5.2, w: CW, h: 1.2, fontSize: 17 });
}

// =============== 11. Case 3 ===============
{
  const s = content("Case 3  |  Batch equals label", "A filename predicts diabetes perfectly",
    "กรณีที่สามคือข้อมูลปัสสาวะผู้ป่วยเบาหวาน ชื่อตัวอย่างของกลุ่มควบคุมทุกตัวขึ้นต้นด้วย ADG19007u และของผู้ป่วยทุกตัวขึ้นต้นด้วย ADG10003u เมื่อใช้เฉพาะ prefix นี้ทำนาย ได้ PR-AUC เท่ากับ 1.000 หมายความว่าความต่างระหว่างกลุ่มแยกจาก batch ไม่ได้ ค่า 0.976 ที่เคยรายงานก็ขึ้นกับ random seed เมื่อรัน 20 seed ค่าเฉลี่ยเหลือ 0.911 (~0:50 รวมกรณีที่ 4)",
    "Source: experiments/case3/RESULTS.md. 132 urine samples (84 control, 48 T2DM), subject-grouped CV, 20 seeds; 20-seed range 0.845 to 0.975.");
  s.addChart(pres.charts.BAR, [{ name: "PR-AUC", labels: ["Batch prefix only", "NMR model, seed 42", "NMR model, 20-seed mean", "Sex only", "Chance (prevalence)"],
    values: [1.0, 0.976, 0.911, 0.5, 0.364] }],
    chartCommon({ x: M, y: 2.05, w: 7.4, h: 4.5, barDir: "bar", catAxisOrientation: "maxMin", chartColors: [ORANGE, BLUE, BLUE, GRAY, GRAY], barGapWidthPct: 40, showLegend: false,
      showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", dataLabelFontBold: true, valAxisMinVal: 0, valAxisMaxVal: 1.2,
      valAxisMajorUnit: 0.2, valAxisLabelFormatCode: "0.0", catAxisLabelFontSize: 13, showValAxisTitle: true, valAxisTitle: "PR-AUC, subject-grouped CV",
      valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
  // crosstab
  const hdr = (t) => ({ text: t, options: { bold: true, color: INK, fill: { color: TINT }, fontFace: BODY, fontSize: 14, align: "center" } });
  const cell = (t, hi) => ({ text: t, options: { color: hi ? ORANGE_TXT : MUTED, bold: !!hi, fontFace: BODY, fontSize: 18, align: "center" } });
  s.addText("Samples by label and sample-name prefix", { x: 8.4, y: 2.2, w: 4.3, h: 0.35, fontFace: BODY, fontSize: 14, bold: true, color: INK, margin: 0, isTextBox: true });
  s.addTable([
    [hdr(""), hdr("ADG19007u"), hdr("ADG10003u")],
    [{ text: "Control", options: { bold: true, fontFace: BODY, fontSize: 14, color: INK } }, cell("84", true), cell("0")],
    [{ text: "T2DM", options: { bold: true, fontFace: BODY, fontSize: 14, color: INK } }, cell("0"), cell("48", true)],
  ], { x: 8.4, y: 2.65, w: 4.3, colW: [1.3, 1.5, 1.5], rowH: 0.5, border: { type: "solid", color: HAIR, pt: 0.75 }, valign: "middle" });
  body(s, bullets([
    "No batch contains both groups, so no analysis of this data can separate disease from batch.",
    "Protocols also differ in age and BMI criteria and sampling schedule.",
  ]), { x: 8.4, y: 4.4, w: 4.3, h: 2.0, fontSize: 15 });
}

// =============== 12. Case 4 ===============
{
  const s = content("Case 4  |  Label meaning", "\"Obese vs non-obese\" is really before vs after surgery",
    "กรณีที่สี่ งานเดิมเรียกว่า \"ทำนายโรคอ้วน\" แต่ label จริงคือ \"ก่อนผ่าตัดเทียบกับหลังผ่าตัดหนึ่งปี\" และ 71 จาก 106 คนปรากฏทั้งสองฝั่ง (80% ของตัวอย่างมาจากผู้ป่วยเหล่านี้) การแบ่ง CV ตามผู้ป่วยให้ ROC-AUC 0.960 ส่วน CV ธรรมดา 0.959 ไม่ต่างกัน ปัญหาจึงไม่ใช่ leakage แต่คือความหมายของ label โมเดลจึงเรียนรู้ทุกอย่างที่เปลี่ยนไปหลังผ่าตัด ไม่ใช่เฉพาะภาวะอ้วน (~0:50 รวมกรณีที่ 3)",
    "Source: experiments/case4/RESULTS.md, 10 repeats x 5 folds. The sample sheet has no BMI, so whether 12-month patients are still obese cannot be checked.");
  // two overlapping ellipses
  s.addShape(pres.ShapeType.ellipse, { x: M + 0.2, y: 2.3, w: 5.0, h: 3.6, fill: { color: BLUE, transparency: 78 }, line: { color: BLUE, width: 1.5 }, objectName: "Preop set" });
  s.addShape(pres.ShapeType.ellipse, { x: M + 2.3, y: 3.2, w: 2.5, h: 1.9, fill: { color: ORANGE, transparency: 70 }, line: { color: ORANGE, width: 1.5 }, objectName: "12-month set" });
  s.addText("106 patients\nbefore surgery", { x: M + 0.55, y: 3.65, w: 1.7, h: 0.9, fontFace: BODY, fontSize: 15, bold: true, color: INK, margin: 0, isTextBox: true });
  s.addText([{ text: "71", options: { fontFace: HEAD, fontSize: 40, bold: true, color: INK, breakLine: true } },
    { text: "also sampled at 12 months", options: { fontSize: 13, color: INK } }],
    { x: M + 2.4, y: 3.3, w: 2.3, h: 1.7, fontFace: BODY, align: "center", margin: 0, isTextBox: true, valign: "middle" });
  body(s, "Label 1 = preoperative sample (106). Label 0 = 12 months after surgery (71). Every 12-month patient is also in the first group.",
    { x: M, y: 6.0, w: 5.4, h: 0.55, fontSize: 12, color: MUTED });
  body(s, [
    { text: "Patient-grouped CV vs ordinary CV", options: { bold: true, breakLine: true } },
    { text: "ROC-AUC 0.960 vs 0.959", options: { fontFace: HEAD, fontSize: 28, bold: true, color: INK, breakLine: true } },
    { text: "The scores agree, so leakage is not the issue. The label is.", options: { breakLine: true } },
    { text: " ", options: { fontSize: 8, breakLine: true } },
    { text: "What the classifier learns", options: { bold: true, breakLine: true } },
    ...bullets(["Weight loss, but also diet, supplements and medication after surgery.", "Fasting state and a year of sample storage."]),
  ], { x: 6.9, y: 2.2, w: 5.8, h: 4.2, fontSize: 16 });
}

// =============== 13. Checklist ===============
{
  const s = content("The fix", "Six checks before trusting a small-n result",
    "ข้อเสนอของเราคือเช็กลิสต์หกข้อ หนึ่ง ถ้าผลลัพธ์คำนวณจากฟีเจอร์ อย่าพึ่ง label permutation ให้หักด้วยค่าเริ่มต้นของทุกสารพร้อมกันภายในแต่ละ fold และรายงาน pairing-destroyed null เป็นตัวช่วย สอง ฝึกโมเดลใหม่ในทุกรอบของ permutation สาม เทียบกับตัวให้คะแนนที่ไม่เรียนรู้อะไรเสมอ สี่ ตรวจหาสารจากภายนอก และรายงานผลทั้งแบบมีและไม่มี ห้า ทำตารางไขว้ระหว่าง label กับ metadata ทุกคอลัมน์ เช่น batch ลำดับการรัน และเพศ หก เขียนให้ได้ในหนึ่งประโยคว่า label แยกอะไรออกจากอะไรจริง ๆ (~0:35)",
    "Source: Section VIII (Discussion) of the paper.");
  const items = [
    ["Outcome from features?", "Do not rely on label permutation. Residualise change on all baselines inside each fold; report a pairing-destroyed null."],
    ["Refit in every permutation", "Permuting labels against fixed scores gave 9.7% false positives on pure noise; refitting gave 5.3%."],
    ["Add a learn-nothing baseline", "A fixed, unfitted score. Report the gap with an interval."],
    ["Audit exogenous compounds", "Drugs, solvents, skin-prep agents. Report with and without them."],
    ["Cross-tabulate the label", "Against every metadata column: batch, run order, sample-name prefix, sex."],
    ["Say what the label encodes", "One sentence: which two physical states does it separate?"],
  ];
  const w = (CW - 0.4) / 2, h = 1.3;
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = M + col * (w + 0.4), y = 2.1 + row * (h + 0.2);
    card(s, x, y, w, h, "Check card");
    s.addShape(pres.ShapeType.ellipse, { x: x + 0.25, y: y + 0.35, w: 0.6, h: 0.6, fill: { color: INK }, line: { color: INK, width: 0 }, objectName: "Number badge" });
    s.addText(String(i + 1), { x: x + 0.25, y: y + 0.35, w: 0.6, h: 0.6, fontFace: HEAD, fontSize: 20, bold: true, color: WHITE, align: "center", valign: "middle", margin: 0, isTextBox: true });
    s.addText([{ text: it[0], options: { bold: true, fontSize: 17, fontFace: HEAD, color: INK, breakLine: true } },
      { text: it[1], options: { fontSize: 14, color: INK } }],
      { x: x + 1.05, y: y + 0.1, w: w - 1.25, h: h - 0.2, fontFace: BODY, margin: 0, isTextBox: true, valign: "middle" });
  });
}

// =============== 14. Takeaways ===============
{
  const s = content("Takeaways", "Standard checks are necessary, not sufficient",
    "ข้อสรุปคือ การตรวจสอบมาตรฐานจำเป็น แต่ไม่พอ ถ้าเราตรวจให้ครบทั้งสี่จุดนี้ ก็จะจับข้อผิดพลาดได้ก่อนตีพิมพ์ ข้อจำกัดที่ควรรู้: เราใช้ข้อมูลสาธารณะขนาดเล็กสามชุด ผลที่ได้เป็นเรื่องวิธีตรวจสอบ ไม่ได้บอกอะไรเกี่ยวกับชีววิทยาของโรคอ้วนหรือเบาหวาน การจำลองใช้ข้อมูลแบบเกาส์เซียนและโมเดลเชิงเส้น และกรณีทำซ้ำมีตัวอย่างน้อย ขอบคุณครับ/ค่ะ (~0:25)",
    "Repository: github.com/Calvinkub/validated-yet-wrong (public, tag paper-v1).");
  s.addText("WHAT TO REMEMBER", { x: M, y: 2.15, w: 5.8, h: 0.3, fontFace: BODY, fontSize: 12, bold: true, color: "0E7C57", charSpacing: 2, margin: 0, isTextBox: true });
  body(s, bullets([
    "A passed check answers one narrow question. Know which.",
    "More data can make a wrong test more confident.",
    "Every failure here has a cheap, targeted control.",
  ]), { x: M, y: 2.55, w: 5.8, h: 2.6, fontSize: 18 });
  s.addText("LIMITS", { x: 7.0, y: 2.15, w: 5.7, h: 0.3, fontFace: BODY, fontSize: 12, bold: true, color: ORANGE_TXT, charSpacing: 2, margin: 0, isTextBox: true });
  body(s, bullets([
    "Three small public datasets; findings are about validation, not the biology of obesity or diabetes.",
    "Simulation: Gaussian data, linear model, one outcome rule.",
    "Replication has 47 patients and an acute setting.",
  ]), { x: 7.0, y: 2.55, w: 5.7, h: 2.6, fontSize: 16 });
  card(s, M, 5.4, CW, 1.0, "Repo callout");
  s.addText([{ text: "Code, results and paper: ", options: { color: MUTED } },
    { text: "github.com/Calvinkub/validated-yet-wrong", options: { bold: true, color: INK } }],
    { x: M + 0.3, y: 5.45, w: CW - 0.6, h: 0.9, fontFace: BODY, fontSize: 20, margin: 0, isTextBox: true, valign: "middle" });
}

// =============== 15. Backup: simulation design ===============
{
  const s = content("Backup", "Simulation design",
    "สำรองสำหรับตอบคำถาม: ผู้ใช้ r = 0.25 จะทำซ้ำค่าสหสัมพันธ์ baseline-change เฉลี่ย -0.62 ที่เห็นใน MTBLS242 การทดสอบแต่ละแบบฝึกโมเดลใหม่ในทุก null replicate (200 ครั้ง) และเราทดสอบความถูกต้องกับข้อมูลสัญญาณรบกวนล้วนก่อน: อัตราปฏิเสธ 5.3% เมื่อฝึกใหม่ทุกครั้ง แต่ 9.7% เมื่อใช้คะแนน out-of-fold คงที่",
    "Source: Section VI of the paper; simulation/sim_pairing_null.py (seed 20261011).");
  body(s, [
    { text: "Persistent level per subject, 11 markers + 10 auxiliary features", options: { breakLine: true } },
    { text: "x0 = sqrt(r) * mu + sqrt(1 - r) * e0", options: { fontFace: "Courier New", fontSize: 15, breakLine: true } },
    { text: "x12 = sqrt(r) * (mu + gamma * g * s) + sqrt(1 - r) * e12", options: { fontFace: "Courier New", fontSize: 15, breakLine: true } },
    { text: " ", options: { fontSize: 8, breakLine: true } },
    { text: "r: reliability (share of variance that persists). gamma: real, forecastable response (0 = none). g: response propensity from the auxiliary features. s: expected direction.", options: { breakLine: true } },
    { text: " ", options: { fontSize: 8, breakLine: true } },
    { text: "Outcome: at least 6 of 11 markers change in the expected direction. Model: ridge regression (lambda = 10), 5-fold CV, scored by average precision.", options: { breakLine: true } },
  ], { x: M, y: 2.15, w: 6.6, h: 4.3, fontSize: 16 });
  card(s, 7.7, 2.15, 5.0, 4.3, "Grid card");
  body(s, [
    { text: "Grid (1,000 datasets per cell)", options: { bold: true, breakLine: true } },
    ...bullets(["n: 50, 100, 200, 500", "r: 0.25, 0.5, 0.75", "gamma: 0, 0.25, 0.5", "36,000 datasets in total"]),
    { text: " ", options: { fontSize: 8, breakLine: true } },
    { text: "Four tests per dataset, alpha = 0.05, 200 null replicates, model refit on each", options: { bold: true, breakLine: true } },
    ...bullets(["Label permutation", "Pairing-destroyed null", "Per-marker residualisation", "Joint residualisation"]),
  ], { x: 7.95, y: 2.3, w: 4.5, h: 4.0, fontSize: 15 });
}

// =============== 16. Backup: Case 1 detail ===============
{
  const s = content("Backup", "Case 1 numbers in full",
    "สำรองสำหรับตอบคำถามเรื่องตัวเลขของ Case 1 ตัวเลข PR-AUC เดิมที่รายงานไว้ 0.671 ไม่ซ้ำเป๊ะเมื่อรันใหม่ (ได้ 0.683) ซึ่งตรงกับที่ repository เดิมบันทึกไว้ ความชุกของผู้ตอบสนองต่างกันเพราะเกณฑ์ 6 จาก 11 ให้จำนวนผู้ตอบสนองต่างกันในสองดีไซน์",
    "Source: experiments/case1/RESULTS.md. Intervals: bootstrap over the 71 subjects.");
  const h = (t) => ({ text: t, options: { bold: true, color: INK, fill: { color: TINT }, fontFace: BODY, fontSize: 14, align: "center" } });
  const c = (t) => ({ text: t, options: { fontFace: BODY, fontSize: 14, color: INK, align: "center" } });
  const l = (t) => ({ text: t, options: { fontFace: BODY, fontSize: 14, color: INK, bold: true } });
  s.addTable([
    [h("Measure"), h("Original design"), h("Per-marker residualised"), h("Joint residualised")],
    [l("Responders of 71"), c("31"), c("31"), c("37")],
    [l("Prevalence"), c("0.437"), c("0.437"), c("0.521")],
    [l("Model PR-AUC"), c("0.683"), c("0.483"), c("0.554")],
    [l("Learn-nothing PR-AUC"), c("0.653 (original solver)"), c("0.522"), c("0.589")],
    [l("Gap, 95% interval"), c("n/a"), c("-0.042 [-0.149, +0.052]"), c("-0.037 [-0.111, +0.037]")],
    [l("Refit permutation p"), c("0.001"), c("1.000"), c("1.000")],
    [l("Pairing-null lift (median)"), c("2.04 vs observed 1.57"), c("1.04"), c("1.05")],
  ], { x: M, y: 2.15, w: CW, colW: [3.0, 3.0, 3.1, 3.03], rowH: 0.52, border: { type: "solid", color: HAIR, pt: 0.75 }, valign: "middle" });
}

pres.writeFile({ fileName: OUT }).then(async () => {
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT, "slides:", n);
});
