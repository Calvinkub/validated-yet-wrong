// Thai, icon-led version of the project-defense deck.
// Builds presentation/validated_yet_wrong_th.pptx (16:9 wide, clean white academic).
// Run:  NODE_PATH=<dir with pptxgenjs, react, react-dom, react-icons, sharp> node build_deck_th.js
// Charts are native PowerPoint charts filled from the repo's result files.
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const FA = require("react-icons/fa");
const { applyTheme } = require(process.env.APPLY_THEME ||
  "/Users/admin/.claude/skills/synced/d6ee17a1-c03b-495d-b0fe-555e5f376767_3711d233-0394-44f6-a445-9295669255c5/pptx/scripts/apply_theme.js");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(process.env.DECK_OUT_DIR || __dirname, "validated_yet_wrong_th.pptx");

// ---------- data from the repo ----------
const rates = fs.readFileSync(path.join(ROOT, "simulation/results/rejection_rates.csv"), "utf8").trim().split("\n");
const head = rates[0].split(",");
const rateRows = rates.slice(1).map((l) => Object.fromEntries(l.split(",").map((v, i) => [head[i], v])));
const sim = rateRows.filter((x) => +x.r === 0.25 && +x.gamma === 0).sort((a, b) => +a.n - +b.n);
const pct = (k) => sim.map((x) => +(100 * +x[k]).toFixed(1));
const curve = JSON.parse(fs.readFileSync(path.join(ROOT, "experiments/case2/results/summary.json"), "utf8")).curve;

// ---------- theme ----------
const INK = "1B2430", MUTED = "5B6470", HAIR = "D9DEE3", TINT = "F3F5F7", WHITE = "FFFFFF";
const BLUE = "2A78D6", ORANGE = "EB6834", AQUA = "1BAF7A", VIOLET = "4A3AA7", GRAY = "9AA3AD";
const ORANGE_TXT = "C2410C", GREEN_TXT = "0E7C57";
const BLUE_BG = "DCE9F9", ORANGE_BG = "FCE3D8", AQUA_BG = "D6F2E7", INK_BG = "E3E7EC";
const FONT = process.env.DECK_FONT || "Tahoma"; // Tahoma ships with Office on Windows and Mac, and has Thai glyphs
const THEME = { name: "Academic White TH", headFontFace: FONT, bodyFontFace: FONT,
  colors: { dk1: INK, lt1: WHITE, dk2: MUTED, lt2: TINT, accent1: BLUE, accent2: ORANGE, accent3: AQUA,
    accent4: VIOLET, accent5: "EDA100", accent6: "E34948", hlink: BLUE, folHlink: VIOLET } };

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.title = "ผ่านการตรวจแล้ว แต่ผิด (Validated, yet Wrong)";
pres.author = "Chaiyaporn Orrudee, Kanin Calvin Shomwiwat";
pres.subject = "Four ways small-n metabolomics ML passes standard checks";
const W = 13.33, M = 0.6, CW = W - 2 * M;

pres.defineSlideMaster({
  title: "TITLE_ONLY", background: { color: WHITE },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: M, y: 0.85, w: CW, h: 1.0, fontFace: FONT,
        fontSize: 30, bold: true, color: INK, valign: "top", align: "left", margin: 0 }, text: "" } },
    { text: { text: "Validated, yet Wrong  |  KMITL, Artificial Intelligence Technology",
        options: { x: M, y: 7.0, w: 8, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED, margin: 0 } } },
  ],
  slideNumber: { x: W - M - 0.8, y: 7.0, w: 0.8, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED, align: "right" },
});
pres.defineSlideMaster({ title: "TITLE_SLIDE", background: { color: WHITE }, objects: [] });

// ---------- icons ----------
const iconCache = {};
async function icon(name, hex) {
  const key = name + hex;
  if (!iconCache[key]) {
    const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(FA[name], { color: "#" + hex, size: 256 }));
    const png = await sharp(Buffer.from(svg)).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    iconCache[key] = "image/png;base64," + png.toString("base64");
  }
  return iconCache[key];
}
const NAMES = ["FaVial", "FaFlask", "FaMicroscope", "FaRobot", "FaShieldAlt", "FaCheckCircle", "FaExclamationTriangle", "FaSyncAlt",
  "FaTags", "FaBarcode", "FaQuestionCircle", "FaChartLine", "FaDatabase", "FaHeartbeat", "FaTint", "FaLayerGroup", "FaSearch",
  "FaBalanceScale", "FaRandom", "FaTable", "FaGithub", "FaCut", "FaArrowRight", "FaWeight", "FaCalculator", "FaLightbulb",
  "FaUsers", "FaTimesCircle", "FaFileAlt", "FaProjectDiagram", "FaStethoscope", "FaCapsules", "FaUserMd", "FaBrain", "FaHospital", "FaBug"];
const COLORS = [INK, BLUE, ORANGE, AQUA, ORANGE_TXT, WHITE, GRAY, MUTED, VIOLET];
const IC = {};
async function loadIcons() {
  for (const n of NAMES) for (const c of COLORS) IC[n + c] = await icon(n, c);
}
const ic = (name, color) => IC[name + color];

// badge = tinted circle with an icon inside
function badge(s, x, y, d, name, color, bg, obj) {
  s.addShape(pres.ShapeType.ellipse, { x, y, w: d, h: d, fill: { color: bg }, line: { color: bg, width: 0 }, objectName: (obj || "Badge") + " circle" });
  const k = d * 0.52;
  s.addImage({ data: ic(name, color), x: x + (d - k) / 2, y: y + (d - k) / 2, w: k, h: k, altText: name.replace("Fa", "") + " icon", objectName: (obj || "Badge") + " icon" });
}
const arrow = (s, x, y, d) => s.addImage({ data: ic("FaArrowRight", GRAY), x, y, w: d, h: d, altText: "arrow", objectName: "Arrow" });

// ---------- helpers ----------
let n = 0;
function content(kicker, iconName, iconColor, title, notes, source) {
  const s = pres.addSlide({ masterName: "TITLE_ONLY" });
  n += 1;
  s.addImage({ data: ic(iconName, iconColor), x: M, y: 0.4, w: 0.34, h: 0.34, altText: iconName + " icon", objectName: "Kicker icon" });
  s.addText(kicker, { x: M + 0.5, y: 0.38, w: CW - 0.5, h: 0.38, fontFace: FONT, fontSize: 15, bold: true, color: iconColor === ORANGE ? ORANGE_TXT : iconColor === AQUA ? GREEN_TXT : iconColor,
    margin: 0, isTextBox: true, valign: "middle", objectName: "Kicker" });
  s.addText(title, { placeholder: "title" });
  if (source) s.addText(source, { x: M, y: 6.62, w: CW, h: 0.3, fontFace: FONT, fontSize: 10, color: MUTED, italic: true, margin: 0, isTextBox: true, objectName: "Source" });
  if (notes) s.addNotes(notes);
  return s;
}
const card = (s, x, y, w, h, name) => s.addShape(pres.ShapeType.roundRect, { x, y, w, h, fill: { color: TINT }, line: { color: TINT, width: 0 }, rectRadius: 0.08, objectName: name || "Card" });
const body = (s, runs, o) => s.addText(runs, Object.assign({ fontFace: FONT, fontSize: 16, color: INK, margin: 0, isTextBox: true, valign: "top", paraSpaceAfter: 8 }, o));
const bullets = (items) => items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } }));
const gap = (pt) => ({ text: " ", options: { fontSize: pt || 8, breakLine: true } });
function chartCommon(extra) {
  return Object.assign({ catAxisLabelFontFace: "+mn-lt", valAxisLabelFontFace: "+mn-lt", dataLabelFontFace: "+mn-lt", legendFontFace: "+mn-lt",
    catAxisLabelFontSize: 12, valAxisLabelFontSize: 12, dataLabelFontSize: 12, legendFontSize: 12, catAxisLabelColor: INK, valAxisLabelColor: MUTED,
    dataLabelColor: INK, legendColor: INK, valGridLine: { color: HAIR, size: 0.75 }, catGridLine: { style: "none" }, showTitle: false, valAxisLineShow: false }, extra);
}

async function main() {
  await loadIcons();

  // =============== 1. Title ===============
  {
    const s = pres.addSlide({ masterName: "TITLE_SLIDE" }); n += 1;
    s.addText("สอบโครงงาน  |  ตุลาคม 2569", { x: M, y: 0.7, w: 7, h: 0.35, fontFace: FONT, fontSize: 15, bold: true, color: ORANGE_TXT, margin: 0, isTextBox: true });
    s.addText("ผ่านการตรวจแล้ว แต่ผิด", { x: M, y: 1.4, w: 7.4, h: 1.0, fontFace: FONT, fontSize: 44, bold: true, color: INK, margin: 0, isTextBox: true, valign: "top" });
    s.addText("Validated, yet Wrong", { x: M, y: 2.4, w: 7.4, h: 0.6, fontFace: FONT, fontSize: 26, color: MUTED, margin: 0, isTextBox: true, valign: "top" });
    s.addText("สี่วิธีที่โมเดลแมชชีนเลิร์นนิงบนข้อมูลเมตาโบโลมิกส์ขนาดเล็ก ผ่านการตรวจสอบมาตรฐานแต่ผลยังผิด", { x: M, y: 3.2, w: 6.8, h: 1.1, fontFace: FONT, fontSize: 18, color: INK, margin: 0, isTextBox: true, valign: "top" });
    s.addText([
      { text: "ชัยพร ออฤดี (67070217)", options: { breakLine: true } },
      { text: "คณิณ แคลวิณ ชมวิวัฒน์ (67070015)", options: { breakLine: true } },
      { text: "อาจารย์ที่ปรึกษา: ผศ.ดร. นนท์ คนึงสุขเกษม", options: { breakLine: true } },
      { text: "สาขาเทคโนโลยีปัญญาประดิษฐ์ คณะเทคโนโลยีสารสนเทศ สจล." },
    ], { x: M, y: 4.75, w: 7.2, h: 1.7, fontFace: FONT, fontSize: 15, color: INK, margin: 0, isTextBox: true, valign: "top", paraSpaceAfter: 4 });
    const rows = ["ทดสอบข้ามชุดข้อมูล (cross-validation)", "สลับ label (permutation test)", "ตัดฟีเจอร์แล้วฝึกใหม่ (ROAR)"];
    for (let i = 0; i < 3; i++) {
      const y = 1.45 + i * 1.05;
      card(s, 8.3, y, 4.4, 0.85, "Check row");
      s.addShape(pres.ShapeType.ellipse, { x: 8.52, y: y + 0.17, w: 0.5, h: 0.5, fill: { color: AQUA }, line: { color: AQUA, width: 0 }, objectName: "Check badge" });
      s.addImage({ data: ic("FaCheckCircle", WHITE), x: 8.6, y: y + 0.25, w: 0.34, h: 0.34, altText: "check", objectName: "Check icon" });
      s.addText(rows[i], { x: 9.2, y, w: 3.4, h: 0.85, fontFace: FONT, fontSize: 14, color: INK, valign: "middle", margin: 0, isTextBox: true });
    }
    s.addShape(pres.ShapeType.roundRect, { x: 8.3, y: 4.65, w: 4.4, h: 0.95, fill: { color: ORANGE }, line: { color: ORANGE, width: 0 }, rectRadius: 0.08, objectName: "Verdict row" });
    s.addImage({ data: ic("FaTimesCircle", WHITE), x: 8.55, y: 4.95, w: 0.36, h: 0.36, altText: "wrong", objectName: "Verdict icon" });
    s.addText("ผลลัพธ์ยังผิดอยู่", { x: 9.1, y: 4.65, w: 3.5, h: 0.95, fontFace: FONT, fontSize: 20, bold: true, color: WHITE, valign: "middle", margin: 0, isTextBox: true });
    s.addNotes("สวัสดีครับ/ค่ะ วันนี้นำเสนอโครงงานเรื่อง \"ผ่านการตรวจแล้ว แต่ผิด\" (Validated, yet Wrong) งานนี้ว่าด้วยกรณีที่โมเดลแมชชีนเลิร์นนิงบนข้อมูลเมตาโบโลมิกส์ขนาดเล็ก ผ่านการตรวจสอบมาตรฐานครบทุกอย่าง แต่ผลลัพธ์ยังผิดอยู่ดี เราจะเล่าก่อนว่าเราทำอะไร แล้วดูทีละกรณี (~0:20)");
  }

  // =============== 2. What we did (flow) ===============
  {
    const s = content("เราทำอะไร", "FaProjectDiagram", BLUE, "ตรวจว่า ผลโมเดลที่ \"ผ่านการตรวจ\" เชื่อได้จริงไหม",
      "พื้นฐานก่อน: นักวิจัยเก็บตัวอย่างเลือดหรือปัสสาวะ วัดด้วยเครื่อง NMR ได้ตัวเลขของสารเมตาโบไลต์หลายสิบตัว แล้วใช้โมเดลแมชชีนเลิร์นนิงทำนายโรคหรือผลการรักษา จากนั้นรายงานผลหลังผ่านการตรวจสอบมาตรฐาน งานของเราคือย้อนกลับไปตรวจงานของเราเองสี่เรื่อง ว่าผลที่ผ่านการตรวจนั้นเชื่อได้จริงไหม (~0:35)",
      "NMR = nuclear magnetic resonance spectroscopy. งานทั้งสี่เรื่องเป็นงานเก่าของผู้เขียนเอง ใช้ข้อมูลสาธารณะจาก MetaboLights");
    const steps = [
      ["FaVial", BLUE, BLUE_BG, "เก็บตัวอย่าง", "เลือดหรือปัสสาวะของผู้ป่วย"],
      ["FaMicroscope", BLUE, BLUE_BG, "วัดด้วยเครื่อง NMR", "ได้ปริมาณสารเมตาโบไลต์หลายสิบตัว"],
      ["FaRobot", BLUE, BLUE_BG, "โมเดล ML ทำนาย", "โรค หรือผลการรักษา"],
      ["FaShieldAlt", AQUA, AQUA_BG, "ตรวจสอบมาตรฐาน", "ผ่านทุกข้อ แล้วรายงานผล"],
    ];
    const w = 2.55, g = 0.64;
    steps.forEach((st, i) => {
      const x = M + i * (w + g);
      badge(s, x + (w - 1.3) / 2, 2.15, 1.3, st[0], st[1], st[2], "Step");
      s.addText(st[3], { x, y: 3.6, w, h: 0.45, fontFace: FONT, fontSize: 18, bold: true, color: INK, align: "center", margin: 0, isTextBox: true });
      s.addText(st[4], { x, y: 4.05, w, h: 0.75, fontFace: FONT, fontSize: 14, color: MUTED, align: "center", margin: 0, isTextBox: true, valign: "top" });
      if (i < 3) arrow(s, x + w + (g - 0.36) / 2, 2.15 + 0.47, 0.36);
    });
    card(s, M, 5.05, CW, 1.35, "Question card");
    badge(s, M + 0.3, 5.3, 0.85, "FaQuestionCircle", ORANGE, ORANGE_BG, "Question");
    s.addText("คำถามของเรา: ถ้าผ่านทุกการตรวจแล้ว ผลนั้นถูกต้องจริงหรือเปล่า? เราพบว่า ในสี่กรณี คำตอบคือ \"ไม่\"", { x: M + 1.4, y: 5.1, w: CW - 1.7, h: 1.25, fontFace: FONT, fontSize: 19, bold: true, color: INK, margin: 0, isTextBox: true, valign: "middle" });
  }

  // =============== 3. Data ===============
  {
    const s = content("ข้อมูลที่ใช้", "FaDatabase", BLUE, "ข้อมูลสาธารณะสามชุด ขนาดเล็กกว่า 200 คน",
      "เราใช้ข้อมูลสาธารณะสามชุดจาก MetaboLights ชุดแรก MTBLS242 คือผู้ป่วยผ่าตัดกระเพาะ วัดก่อนผ่าตัด 106 คน และหลังผ่าตัด 12 เดือน 71 คน ใช้ในกรณีที่ 1, 2 และ 4 ชุดที่สอง MTBLS1 คือปัสสาวะผู้ป่วยเบาหวานเทียบกับคนปกติ 132 ตัวอย่าง ใช้ในกรณีที่ 3 ชุดที่สาม MTBLS881 คือผู้ป่วยผ่าตัดหัวใจ 47 คน ใช้ทำซ้ำกรณีที่ 1 (~0:30)",
      "MetaboLights: www.ebi.ac.uk/metabolights. ตัวอย่างน้อยเป็นลักษณะทั่วไปของงานเมตาโบโลมิกส์ ทำให้ตัวเลขคลาดเคลื่อนง่าย");
    const ds = [
      ["FaWeight", "MTBLS242", "ผ่าตัดกระเพาะ", "ซีรัม วัดด้วย NMR", "ก่อนผ่าตัด 106 คน\nหลังผ่าตัด 12 เดือน 71 คน", "ใช้ในกรณีที่ 1, 2, 4"],
      ["FaTint", "MTBLS1", "เบาหวานชนิดที่ 2", "ปัสสาวะ วัดด้วย NMR", "132 ตัวอย่าง\nจาก 40 ถึง 42 คน", "ใช้ในกรณีที่ 3"],
      ["FaHeartbeat", "MTBLS881", "ผ่าตัดหัวใจ", "ซีรัม วัดด้วย NMR", "47 คน ต่อตำแหน่งเก็บเลือด\nก่อนผ่าตัด 1 ชม. และหลัง 20 ชม.", "ทำซ้ำกรณีที่ 1"],
    ];
    const w = (CW - 0.6) / 3;
    ds.forEach((d, i) => {
      const x = M + i * (w + 0.3);
      card(s, x, 2.1, w, 4.3, "Dataset card");
      badge(s, x + 0.3, 2.35, 1.0, d[0], BLUE, BLUE_BG, "Dataset");
      s.addText(d[1], { x: x + 1.5, y: 2.4, w: w - 1.7, h: 0.45, fontFace: FONT, fontSize: 20, bold: true, color: INK, margin: 0, isTextBox: true });
      s.addText(d[2], { x: x + 1.5, y: 2.85, w: w - 1.7, h: 0.4, fontFace: FONT, fontSize: 15, color: MUTED, margin: 0, isTextBox: true });
      s.addText(d[3], { x: x + 0.3, y: 3.65, w: w - 0.6, h: 0.4, fontFace: FONT, fontSize: 16, color: INK, margin: 0, isTextBox: true });
      s.addText(d[4], { x: x + 0.3, y: 4.15, w: w - 0.6, h: 1.1, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, isTextBox: true, valign: "top" });
      s.addText(d[5], { x: x + 0.3, y: 5.6, w: w - 0.6, h: 0.5, fontFace: FONT, fontSize: 14, bold: true, color: ORANGE_TXT, margin: 0, isTextBox: true, valign: "middle" });
    });
  }

  // =============== 4. What standard checks ask ===============
  {
    const s = content("ปัญหา", "FaExclamationTriangle", ORANGE, "การตรวจมาตรฐานแต่ละข้อ ถามได้แค่คำถามเดียว",
      "การตรวจมาตรฐานสามอย่าง: cross-validation ถามว่าโมเดลใช้กับตัวอย่างใหม่ที่เก็บแบบเดิมได้ไหม, permutation test ถามว่าฟีเจอร์กับ label มีความสัมพันธ์อะไรสักอย่างไหม, ROAR ถามว่าโมเดลพึ่งฟีเจอร์นั้นไหม แต่ไม่มีอันไหนถามว่า label วัดสิ่งที่มันอ้างจริงหรือเปล่า หรือสัญญาณนั้นเป็นชีววิทยาหรือไม่ (~0:35)",
      "Framing follows Kapoor and Narayanan (2023) on leakage and Ojala and Garriga (2010) on permutation tests.");
    const cols = [
      ["FaLayerGroup", "ทดสอบข้ามชุดข้อมูล\n(cross-validation)", "โมเดลใช้กับตัวอย่างใหม่ ที่เก็บแบบเดิมได้ไหม", "\"แบบเดิม\" ซ่อน batch คนเดิม หรือเวลาไว้หรือเปล่า"],
      ["FaRandom", "สลับ label\n(permutation test)", "ฟีเจอร์กับ label สัมพันธ์กันไหม", "ความสัมพันธ์นั้นมีอยู่แล้วโดยโครงสร้างหรือเปล่า"],
      ["FaCut", "ตัดฟีเจอร์แล้วฝึกใหม่\n(ROAR)", "โมเดลพึ่งฟีเจอร์นี้ไหม", "ฟีเจอร์นั้นเป็นชีววิทยา หรือสารปนเปื้อน"],
    ];
    const w = (CW - 0.6) / 3;
    cols.forEach((c, i) => {
      const x = M + i * (w + 0.3);
      card(s, x, 2.1, w, 4.3, "Column card");
      badge(s, x + 0.3, 2.3, 0.85, c[0], BLUE, BLUE_BG, "Check");
      s.addText(c[1], { x: x + 1.3, y: 2.3, w: w - 1.5, h: 0.85, fontFace: FONT, fontSize: 16, bold: true, color: INK, margin: 0, isTextBox: true, valign: "middle" });
      s.addImage({ data: ic("FaCheckCircle", AQUA), x: x + 0.3, y: 3.5, w: 0.32, h: 0.32, altText: "answers", objectName: "Answers icon" });
      s.addText("ตอบได้: " + c[2], { x: x + 0.78, y: 3.4, w: w - 1.0, h: 1.0, fontFace: FONT, fontSize: 15, color: INK, margin: 0, isTextBox: true, valign: "top" });
      s.addImage({ data: ic("FaQuestionCircle", ORANGE), x: x + 0.3, y: 4.85, w: 0.32, h: 0.32, altText: "never asks", objectName: "Never icon" });
      s.addText("ไม่เคยถาม: " + c[3], { x: x + 0.78, y: 4.75, w: w - 1.0, h: 1.4, fontFace: FONT, fontSize: 15, color: INK, margin: 0, isTextBox: true, valign: "top" });
    });
  }

  // =============== 5. Overview diagram: four problems ===============
  {
    const s = content("ภาพรวม", "FaSearch", BLUE, "สี่ปัญหาที่การตรวจมาตรฐานมองไม่เห็น และวิธีจับ",
      "นี่คือแผนที่ของทั้งงาน อ่านจากซ้ายไปขวา: ปัญหาที่ซ่อนอยู่ ซึ่งการตรวจมาตรฐานผ่านหมด และวิธีตรวจเฉพาะที่จับได้ หนึ่ง ผลลัพธ์ที่ถูกสร้างจากฟีเจอร์ตัวเอง จับด้วยการสลับคู่ตัวอย่าง สอง สารปนเปื้อนที่ ROAR นับเป็นชีววิทยา จับด้วยฟีเจอร์ปลอมที่เรารู้คำตอบ สาม ล็อตการวัดตรงกับ label ทุกตัวอย่าง จับด้วยการตรวจ metadata สี่ label ที่ชื่อไม่ตรงความหมาย จับด้วยการเขียน label ลงในหนึ่งประโยค (~0:40)",
      "Table I of the paper. Cases 1, 2, 4: MTBLS242. Case 3: MTBLS1.");
    const hx = [M, 6.15, 9.85], hw = [5.0, 3.35, 2.88];
    [["ปัญหาที่ซ่อนอยู่", "FaExclamationTriangle", ORANGE], ["ตรวจมาตรฐานแล้ว", "FaCheckCircle", AQUA], ["จับได้ด้วย", "FaSearch", BLUE]].forEach((h, i) => {
      s.addImage({ data: ic(h[1], h[2]), x: hx[i] + (i === 0 ? 0.05 : 0), y: 2.0, w: 0.3, h: 0.3, altText: h[0], objectName: "Column icon" });
      s.addText(h[0], { x: hx[i] + 0.42, y: 1.97, w: hw[i] - 0.5, h: 0.36, fontFace: FONT, fontSize: 14, bold: true, color: MUTED, margin: 0, isTextBox: true, valign: "middle" });
    });
    const rows = [
      ["FaSyncAlt", "1  ผลลัพธ์ถูกสร้างจากฟีเจอร์เอง", "label คำนวณจากค่าที่ใช้เป็นฟีเจอร์", "สลับ label ให้ p = 0.002", "สลับคู่ตัวอย่าง + หักค่าเริ่มต้น"],
      ["FaFlask", "2  สารปนเปื้อนถูกนับเป็นชีววิทยา", "สารจากภายนอกดูสำคัญเท่าสารจริง", "ROAR บอกว่าสำคัญต่อโมเดล", "ใส่ฟีเจอร์ปลอมที่รู้คำตอบ"],
      ["FaBarcode", "3  ล็อตการวัดตรงกับ label", "แยกกลุ่มได้จากชื่อไฟล์", "CV แบ่งตามผู้ป่วยแล้ว", "ตรวจ metadata ทุกคอลัมน์"],
      ["FaTags", "4  ชื่อ label ไม่ตรงความหมาย", "\"โรคอ้วน\" คือ ก่อน/หลังผ่าตัด", "CV แบ่งตามผู้ป่วยแล้ว", "เขียน label ใน 1 ประโยค"],
    ];
    rows.forEach((r, i) => {
      const y = 2.45 + i * 1.03;
      card(s, M, y, CW, 0.9, "Row band");
      badge(s, M + 0.15, y + 0.12, 0.66, r[0], ORANGE, ORANGE_BG, "Problem");
      s.addText([{ text: r[1], options: { bold: true, fontSize: 16, breakLine: true } }, { text: r[2], options: { fontSize: 13, color: MUTED } }],
        { x: M + 1.0, y, w: 4.1, h: 0.9, fontFace: FONT, color: INK, margin: 0, isTextBox: true, valign: "middle" });
      arrow(s, 5.72, y + 0.28, 0.34);
      s.addText(r[3], { x: hx[1], y, w: hw[1] - 0.2, h: 0.9, fontFace: FONT, fontSize: 14, color: INK, margin: 0, isTextBox: true, valign: "middle" });
      arrow(s, 9.45, y + 0.28, 0.34);
      s.addText(r[4], { x: hx[2], y, w: hw[2] - 0.1, h: 0.9, fontFace: FONT, fontSize: 14, bold: true, color: INK, margin: 0, isTextBox: true, valign: "middle" });
    });
  }

  // =============== 6. Case 1 mechanism + chart ===============
  {
    const s = content("กรณีที่ 1  |  ผลลัพธ์ถูกสร้างจากฟีเจอร์เอง", "FaSyncAlt", ORANGE, "ตัวเทียบที่ \"ไม่มีสัญญาณ\" ยังชนะโมเดล",
      "กรณีแรก: ผู้ป่วยผ่าตัดกระเพาะ 71 คน ทำนายว่าใครจะ \"ตอบสนองดี\" หลังหนึ่งปี โดย label ถูกคำนวณจากการเปลี่ยนแปลงของสารชุดเดียวกับที่ใช้เป็นฟีเจอร์ ค่าเริ่มต้นที่สูงจะลดลงเข้าหาค่าเฉลี่ยเอง (regression to the mean) การสลับ label ให้ p = 0.002 ดูมีนัยสำคัญ แต่เมื่อเราสลับว่าตัวอย่างหลังหนึ่งปีเป็นของใคร แล้วสร้าง label ใหม่ ซึ่งไม่เหลือสัญญาณรายบุคคลเลย ผลกลับได้ lift 2.04 เท่า สูงกว่าโมเดลจริงที่ 1.57 เท่า (~0:50)",
      "ข้อมูล: MTBLS242, 71 คน, เกณฑ์ตอบสนองเดิม (อย่างน้อย 9 จาก 11 ตัวชี้วัด). PR-AUC 0.683 เทียบความชุก 0.437; lift ที่สังเกตได้ต่ำกว่า 499 จาก 500 ค่า null. experiments/case1/RESULTS.md");
    // mini diagram
    const nodes = [["FaVial", "ค่าเริ่มต้น\n(baseline)"], ["FaVial", "ค่าหลัง\n12 เดือน"], ["FaTags", "label\nตอบสนองดี?"]];
    nodes.forEach((nd, i) => {
      const x = M + i * 1.95;
      badge(s, x + 0.15, 2.1, 0.9, nd[0], i === 2 ? ORANGE : BLUE, i === 2 ? ORANGE_BG : BLUE_BG, "Flow");
      s.addText(nd[1], { x: x - 0.1, y: 3.05, w: 1.5, h: 0.7, fontFace: FONT, fontSize: 13, color: INK, align: "center", margin: 0, isTextBox: true, valign: "top" });
      if (i < 2) arrow(s, x + 1.25, 2.38, 0.3);
    });
    body(s, [
      { text: "label คำนวณจาก \"การเปลี่ยนแปลง\" ของสารเดียวกับที่ใช้เป็นฟีเจอร์", options: { bold: true, breakLine: true } },
      { text: "ค่าเริ่มต้นสูง ๆ ลดลงเข้าหาค่าเฉลี่ยได้เองโดยไม่มีอะไรเกิดขึ้น (regression to the mean) ฟีเจอร์จึง \"ทำนาย\" label ได้", options: {} },
    ], { x: M, y: 3.85, w: 5.5, h: 1.45, fontSize: 15 });
    card(s, M, 5.3, 5.5, 1.15, "Callout");
    s.addImage({ data: ic("FaExclamationTriangle", ORANGE), x: M + 0.25, y: 5.62, w: 0.4, h: 0.4, altText: "warning", objectName: "Callout icon" });
    s.addText("สลับ label ได้ p = 0.002 ดูมีนัยสำคัญ แต่ความสัมพันธ์นี้ถูกการันตีไว้แล้วโดยโครงสร้าง", { x: M + 0.85, y: 5.35, w: 4.5, h: 1.05, fontFace: FONT, fontSize: 14, color: INK, margin: 0, isTextBox: true, valign: "middle" });
    s.addChart(pres.charts.BAR, [{ name: "Lift", labels: ["โมเดลจริง", "ตัวเทียบที่ไม่มีสัญญาณ\n(pairing-destroyed null)"], values: [1.57, 2.04] }],
      chartCommon({ x: 6.5, y: 2.05, w: 6.2, h: 4.5, barDir: "col", chartColors: [BLUE, ORANGE], barGapWidthPct: 60, showLegend: false, showValue: true,
        dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00\"x\"", dataLabelFontBold: true, dataLabelFontSize: 16, valAxisMinVal: 0, valAxisMaxVal: 2.5,
        valAxisMajorUnit: 0.5, valAxisLabelFormatCode: "0.0\"x\"", showValAxisTitle: true, valAxisTitle: "Lift = average precision / ความชุก", valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
  }

  // =============== 7. Case 1 corrected ===============
  {
    const s = content("กรณีที่ 1  |  หลังแก้นิยามผลลัพธ์", "FaBalanceScale", ORANGE, "แก้แล้ว โมเดลก็ไม่ดีกว่าตัวที่ไม่เรียนรู้อะไร",
      "พอแก้นิยามผลลัพธ์ (หักผลของค่าเริ่มต้นออกภายในแต่ละ fold) โมเดลก็ไม่ดีกว่าตัวให้คะแนนที่ไม่ได้เรียนรู้อะไรเลย (ผลรวมค่า z-score ของค่าเริ่มต้นที่ไม่มีการ fit) ทั้งสองดีไซน์ ช่วงความเชื่อมั่นระดับผู้ป่วยคร่อมศูนย์ ดังนั้นพูดได้ว่า \"ไม่ดีกว่า\" ไม่ใช่ \"แย่กว่า\" ความชุกต่างกันระหว่างสองดีไซน์ ให้เทียบ gap ไม่ใช่ระดับ PR-AUC (~0:30)",
      "ที่มา: experiments/case1/RESULTS.md. gap ช่วง 95% ระดับผู้ป่วย: หักทีละสาร -0.042 [-0.149, +0.052]; หักพร้อมกัน -0.037 [-0.111, +0.037]");
    const cats = ["หักทีละสาร\n(ความชุก 0.437)", "หักทุกสารพร้อมกัน\n(ความชุก 0.521)"];
    s.addChart(pres.charts.BAR, [
      { name: "โมเดลที่ฝึกแล้ว", labels: cats, values: [0.483, 0.554] },
      { name: "ตัวเทียบที่ไม่เรียนรู้อะไร", labels: cats, values: [0.522, 0.589] },
    ], chartCommon({ x: M, y: 2.05, w: 7.2, h: 4.5, barDir: "col", chartColors: [BLUE, GRAY], barGapWidthPct: 70, showLegend: true, legendPos: "b", showValue: true,
      dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", dataLabelFontBold: true, valAxisMinVal: 0, valAxisMaxVal: 0.8, valAxisMajorUnit: 0.2,
      valAxisLabelFormatCode: "0.0", showValAxisTitle: true, valAxisTitle: "PR-AUC", valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
    [["FaTimesCircle", ORANGE, "โมเดลไม่ชนะตัวที่ไม่ได้ฝึก"], ["FaRandom", BLUE, "สลับ label (ฝึกใหม่ทุกรอบ) ได้ p = 1.0"], ["FaBalanceScale", INK, "ช่วงของ gap คร่อมศูนย์ จึงพูดว่า \"ไม่ดีกว่า\" ไม่ใช่ \"แย่กว่า\""]].forEach((r, i) => {
      const y = 2.2 + i * 1.2;
      badge(s, 8.2, y, 0.75, r[0], r[1], r[1] === ORANGE ? ORANGE_BG : r[1] === BLUE ? BLUE_BG : INK_BG, "Point");
      s.addText(r[2], { x: 9.15, y, w: 3.55, h: 0.75, fontFace: FONT, fontSize: 15, color: INK, margin: 0, isTextBox: true, valign: "middle" });
    });
    card(s, 8.2, 5.8, 4.5, 0.7, "Callout");
    s.addText("เทียบ gap ไม่ใช่ระดับ เพราะความชุกต่างกัน", { x: 8.4, y: 5.8, w: 4.2, h: 0.7, fontFace: FONT, fontSize: 13, color: INK, margin: 0, isTextBox: true, valign: "middle" });
  }

  // =============== 8. Simulation ===============
  {
    const s = content("ทำไมถึงเกิด  |  การจำลอง 36,000 ชุด", "FaChartLine", VIOLET, "ยิ่งมีข้อมูลมาก การสลับ label ยิ่งผิดมาก",
      "เพื่อดูว่าปัญหานี้เกิดเมื่อไร เราจำลอง 36,000 ชุดข้อมูล เมื่อไม่มีผลรายบุคคลเลย การสลับ label ปฏิเสธสมมติฐานว่างผิด ๆ ตั้งแต่ 26% ที่ 50 ตัวอย่าง ไปจนถึง 100% ที่ 500 ตัวอย่าง ยิ่งข้อมูลมาก ยิ่งผิดมาก เพราะข้อมูลมากแค่ทำให้ประมาณ artefact ได้แม่นขึ้น วิธีแก้ที่นิยมคือหักค่าเริ่มต้นทีละสาร ยังผิด 8-19% เพราะสารสัมพันธ์กัน ถ้าหักด้วยค่าเริ่มต้นของทุกสารพร้อมกัน อัตราผิดลงมาที่ราว 5-7% ส่วน pairing-destroyed null ไม่เคยผิดเกิน 4.3% แต่ตรวจจับผลจริงได้อ่อน (~0:45)",
      "ที่มา: simulation/results/rejection_rates.csv. 1,000 ชุดต่อจุด, ไม่มีผลรายบุคคลจริง (gamma = 0), r = 0.25, alpha = 0.05");
    const labels = sim.map((x) => "n = " + x.n);
    s.addChart(pres.charts.LINE, [
      { name: "สลับ label", labels, values: pct("p_perm_raw") },
      { name: "สลับคู่ตัวอย่าง (pairing-destroyed null)", labels, values: pct("p_pair") },
      { name: "หักทุกสารพร้อมกัน + สลับ", labels, values: pct("p_perm_resid_joint") },
      { name: "หักทีละสาร + สลับ", labels, values: pct("p_perm_resid") },
      { name: "เกณฑ์ 5%", labels, values: [5, 5, 5, 5] },
    ], chartCommon({ x: M, y: 2.05, w: 7.6, h: 4.5, chartColors: [ORANGE, BLUE, AQUA, VIOLET, GRAY], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 8,
      lineDash: ["solid", "solid", "solid", "solid", "dash"], showLegend: true, legendPos: "b", valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20,
      valAxisLabelFormatCode: "0\"%\"", showValAxisTitle: true, valAxisTitle: "อัตราบอกว่ามีสัญญาณ ทั้งที่ไม่มีจริง", valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
    const pts = [["FaTimesCircle", ORANGE, ORANGE_BG, "26% ถึง 100%", "การสลับ label ผิด เมื่อ n เพิ่มจาก 50 เป็น 500"],
      ["FaExclamationTriangle", VIOLET, INK_BG, "หักทีละสาร ยังไม่พอ", "ผิด 8 ถึง 19% เพราะสารสัมพันธ์กัน"],
      ["FaCheckCircle", AQUA, AQUA_BG, "หักทุกสารพร้อมกัน", "ผิดราว 5 ถึง 7% ใกล้เกณฑ์ 5%"]];
    pts.forEach((p, i) => {
      const y = 2.2 + i * 1.4;
      badge(s, 8.55, y, 0.8, p[0], p[1], p[2], "Point");
      s.addText([{ text: p[3], options: { bold: true, fontSize: 16, breakLine: true } }, { text: p[4], options: { fontSize: 13, color: MUTED } }],
        { x: 9.5, y, w: 3.2, h: 0.8, fontFace: FONT, color: INK, margin: 0, isTextBox: true, valign: "middle" });
    });
  }

  // =============== 9. Replication ===============
  {
    const s = content("ทำซ้ำ  |  ข้อมูลชุดที่สอง", "FaHeartbeat", BLUE, "ข้อมูลผ่าตัดหัวใจ เห็นปัญหาแบบเดียวกัน",
      "เราทำซ้ำบนข้อมูลชุดที่สอง คือผู้ป่วยผ่าตัดหัวใจ 47 คน โดยกำหนดวิธีวิเคราะห์ไว้ก่อนรันโมเดล ผลแบบ raw change ซ้ำได้ที่ทั้งสองตำแหน่งเก็บเลือด: การสลับ label ปฏิเสธ (p = 0.007) แต่ตัวเทียบที่ไม่มีสัญญาณได้ lift สูงกว่าโมเดล ส่วนผลหลังหักค่าเริ่มต้นซ้ำได้เพียงบางส่วน และ 47 คนไม่พอตัดสิน ข้อสังเกต: ยาที่ให้ระหว่างผ่าตัด (propofol, heparin) ทำให้เกิดสัญญาณที่ดูมีนัยสำคัญ (~0:25)",
      "ที่มา: experiments/case1b_mtbls881/RESULTS.md และ PREREG.md. n = 47 ต่อตำแหน่ง, baseline -1 ชม. เทียบ 20 ชม., K = 10 จาก 11. pairing null ฝึกใหม่: p = 0.86 (LA), 0.91 (PA), 150 รอบ");
    const cats = ["เอเทรียมซ้าย\n(ตำแหน่งหลัก)", "หลอดเลือดแดงปอด"];
    s.addChart(pres.charts.BAR, [
      { name: "lift ของโมเดลจริง", labels: cats, values: [1.29, 1.19] },
      { name: "lift ของตัวเทียบที่ไม่มีสัญญาณ (median)", labels: cats, values: [1.49, 1.40] },
    ], chartCommon({ x: M, y: 2.05, w: 6.6, h: 4.5, barDir: "col", chartColors: [BLUE, ORANGE], barGapWidthPct: 70, showLegend: true, legendPos: "b", showValue: true,
      dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00\"x\"", dataLabelFontBold: true, valAxisMinVal: 0, valAxisMaxVal: 2, valAxisMajorUnit: 0.5,
      valAxisLabelFormatCode: "0.0\"x\"", showValAxisTitle: true, valAxisTitle: "Lift (ผลลัพธ์แบบ raw change)", valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
    const pts = [["FaCheckCircle", AQUA, AQUA_BG, "ผล raw change ซ้ำได้", "สลับ label ปฏิเสธที่ทั้งสองตำแหน่ง (p = 0.007) แต่ตัวเทียบที่ไม่มีสัญญาณยังได้ lift สูงกว่า"],
      ["FaQuestionCircle", VIOLET, INK_BG, "ผลหลังแก้ ซ้ำได้บางส่วน", "ตำแหน่งหนึ่งไม่มีสัญญาณ อีกตำแหน่งผลขัดกัน 47 คนไม่พอตัดสิน"],
      ["FaCapsules", ORANGE, ORANGE_BG, "ยาสร้างสัญญาณปลอม", "เพิ่ม propofol, heparin, ethanol แล้วผลดูมีนัยสำคัญ (p = 0.005)"]];
    pts.forEach((p, i) => {
      const y = 2.2 + i * 1.45;
      badge(s, 7.55, y, 0.8, p[0], p[1], p[2], "Point");
      s.addText([{ text: p[3], options: { bold: true, fontSize: 16, breakLine: true } }, { text: p[4], options: { fontSize: 13, color: MUTED } }],
        { x: 8.5, y, w: 4.2, h: 1.2, fontFace: FONT, color: INK, margin: 0, isTextBox: true, valign: "top" });
    });
  }

  // =============== 10. Case 2 ROAR ===============
  {
    const s = content("กรณีที่ 2  |  สารปนเปื้อน", "FaFlask", ORANGE, "ROAR เห็นว่าฟีเจอร์ \"สำคัญ\" แต่ไม่รู้ว่ามาจากไหน",
      "กรณีที่สองคือ ROAR ซึ่งตัดฟีเจอร์ที่ SHAP จัดว่าสำคัญแล้วฝึกโมเดลใหม่ ในข้อมูลผ่าตัดกระเพาะ สามสารแรกที่ถูกจัดว่าสำคัญคือ dimethyl sulfone, isopropanol และ methanol ซึ่งน่าจะเป็นสารจากภายนอก isopropanol เป็นน้ำยาทำความสะอาดผิวก่อนผ่าตัด ตัดสามสารนี้ คะแนนตกเหลือ 0.954 ส่วนตัดสามสารชีววิทยาจริงเหลือ 0.959 ต่างกันน้อยกว่าความผันผวนของ fold (~0.03) มาก ROAR แยกสองกลุ่มนี้ไม่ได้ (~0:45)",
      "ที่มา: experiments/case2/RESULTS.md. recursive ROAR, CV แบ่งตามผู้ป่วย (10 x 5), สุ่มตัด 500 ชุดต่อ k. ตัดตามลำดับ: dimethyl sulfone, isopropanol, L-valine, glycine, methanol");
    const ks = curve.map((c) => String(c.k));
    s.addChart(pres.charts.LINE, [
      { name: "ตัดตามความสำคัญ (recursive ROAR)", labels: ks, values: curve.map((c) => +c.recursive_pr_auc.toFixed(3)) },
      { name: "ตัดแบบสุ่ม (ค่าเฉลี่ย)", labels: ks, values: curve.map((c) => +c.null_mean.toFixed(3)) },
      { name: "ตัดแบบสุ่ม (เปอร์เซ็นไทล์ 2.5)", labels: ks, values: curve.map((c) => +c.null_p2_5.toFixed(3)) },
    ], chartCommon({ x: M, y: 2.05, w: 7.6, h: 4.5, chartColors: [ORANGE, BLUE, GRAY], lineSize: 3, lineDataSymbol: "circle", lineDataSymbolSize: 7, lineDash: ["solid", "solid", "dash"],
      showLegend: true, legendPos: "b", valAxisMinVal: 0.78, valAxisMaxVal: 1.0, valAxisMajorUnit: 0.04, valAxisLabelFormatCode: "0.00", showCatAxisTitle: true,
      catAxisTitle: "จำนวนฟีเจอร์ที่ตัดออก (k)", catAxisTitleFontSize: 12, catAxisTitleColor: MUTED, showValAxisTitle: true, valAxisTitle: "PR-AUC หลังฝึกใหม่", valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
    [["FaFlask", ORANGE, ORANGE_BG, ORANGE_TXT, "ตัดสารปนเปื้อน 3 ตัว", "0.954", "dimethyl sulfone, isopropanol, methanol"],
     ["FaStethoscope", BLUE, BLUE_BG, BLUE, "ตัดสารชีววิทยาจริง 3 ตัว", "0.959", "lipoproteins, L-valine, L-tyrosine"]].forEach((c, i) => {
      const y = 2.2 + i * 2.15;
      card(s, 8.6, y, 4.1, 1.95, "Callout");
      badge(s, 8.8, y + 0.2, 0.7, c[0], c[1], c[2], "Callout");
      s.addText(c[4], { x: 9.65, y: y + 0.2, w: 2.95, h: 0.7, fontFace: FONT, fontSize: 14, color: MUTED, margin: 0, isTextBox: true, valign: "middle" });
      s.addText(c[5], { x: 8.8, y: y + 0.95, w: 1.6, h: 0.7, fontFace: FONT, fontSize: 32, bold: true, color: c[3], margin: 0, isTextBox: true, valign: "middle" });
      s.addText(c[6], { x: 10.35, y: y + 0.95, w: 2.25, h: 0.8, fontFace: FONT, fontSize: 11, color: MUTED, margin: 0, isTextBox: true, valign: "middle" });
    });
  }

  // =============== 11. Case 2 spike ===============
  {
    const s = content("กรณีที่ 2  |  ฟีเจอร์ปลอมที่รู้คำตอบ", "FaBug", ORANGE, "ฟีเจอร์ที่ไม่มีชีววิทยาเลย ขึ้นเป็นอันดับหนึ่งได้",
      "เพื่อยืนยัน เราใส่ฟีเจอร์สังเคราะห์ที่ขึ้นกับ label อย่างเดียว ไม่มีชีววิทยาเลย (d คูณ label บวกสัญญาณรบกวน) เมื่อสัญญาณแรงพอ (d = 1.75) ROAR จัดให้เป็นอันดับหนึ่ง และการตัดมันทำให้คะแนนตกมากกว่าการตัดสารจริงตัวใดก็ตาม (0.0127 เทียบกับ 0.0073 ของ dimethyl sulfone) ROAR วัดว่าฟีเจอร์ พกสัญญาณ มากแค่ไหน ไม่ได้วัดว่ามันมาจากไหน (~0:30)",
      "ที่มา: experiments/case2/RESULTS.md, 10 ครั้งต่อ d. ฟีเจอร์ปลอม = d * label + N(0,1) ไม่มีชีววิทยา. อันดับ median จาก 22 ฟีเจอร์ (21 จริง + 1 ปลอม)");
    const w = (CW - 0.6) / 3;
    [["0.75", "10", "สัญญาณอ่อน ปนอยู่กับสารจริง", INK], ["1.25", "3", "สัญญาณกลาง แซงสารจริงเกือบทั้งหมด", INK], ["1.75", "1", "สัญญาณแรง เป็นฟีเจอร์ที่สำคัญที่สุด", ORANGE_TXT]].forEach((r, i) => {
      const x = M + i * (w + 0.3);
      card(s, x, 2.1, w, 2.9, "Spike card");
      badge(s, x + 0.3, 2.3, 0.7, "FaBug", ORANGE, ORANGE_BG, "Spike");
      s.addText("สัญญาณ d = " + r[0], { x: x + 1.15, y: 2.3, w: w - 1.4, h: 0.7, fontFace: FONT, fontSize: 14, bold: true, color: MUTED, margin: 0, isTextBox: true, valign: "middle" });
      s.addText([{ text: "อันดับ ", options: { fontSize: 18, color: MUTED } }, { text: r[1], options: { fontSize: 54, bold: true, color: r[3] } }],
        { x: x + 0.3, y: 3.1, w: w - 0.6, h: 1.0, fontFace: FONT, margin: 0, isTextBox: true, valign: "middle" });
      s.addText(r[2], { x: x + 0.3, y: 4.15, w: w - 0.6, h: 0.7, fontFace: FONT, fontSize: 14, color: INK, margin: 0, isTextBox: true, valign: "top" });
    });
    card(s, M, 5.25, CW, 1.2, "Callout");
    badge(s, M + 0.25, 5.45, 0.8, "FaLightbulb", ORANGE, ORANGE_BG, "Insight");
    s.addText("ที่ d = 1.75 การตัดฟีเจอร์ปลอมทำให้ PR-AUC ลด 0.0127 มากกว่าการตัดสารจริงตัวไหนก็ตาม (มากสุด 0.0073) ROAR วัดว่าฟีเจอร์ \"พกสัญญาณ\" แค่ไหน ไม่ได้วัดว่ามาจากไหน",
      { x: M + 1.3, y: 5.3, w: CW - 1.6, h: 1.1, fontFace: FONT, fontSize: 15, color: INK, margin: 0, isTextBox: true, valign: "middle" });
  }

  // =============== 12. Case 3 ===============
  {
    const s = content("กรณีที่ 3  |  ล็อตการวัดตรงกับ label", "FaBarcode", ORANGE, "ชื่อไฟล์อย่างเดียวก็ทำนายเบาหวานได้สมบูรณ์",
      "กรณีที่สามคือข้อมูลปัสสาวะผู้ป่วยเบาหวาน ชื่อตัวอย่างของกลุ่มควบคุมทุกตัวขึ้นต้นด้วย ADG19007u และของผู้ป่วยทุกตัวขึ้นต้นด้วย ADG10003u เมื่อใช้เฉพาะ prefix นี้ทำนาย ได้ PR-AUC เท่ากับ 1.000 หมายความว่าความต่างระหว่างกลุ่มแยกจากล็อตการวัดไม่ได้ ค่า 0.976 ที่เคยรายงานก็ขึ้นกับ random seed เมื่อรัน 20 seed ค่าเฉลี่ยเหลือ 0.911 (~0:30)",
      "ที่มา: experiments/case3/RESULTS.md. 132 ตัวอย่าง (84 ควบคุม, 48 เบาหวาน), CV แบ่งตามผู้ป่วย, 20 seed; ช่วง 0.845 ถึง 0.975");
    s.addChart(pres.charts.BAR, [{ name: "PR-AUC", labels: ["ใช้ prefix ชื่อไฟล์อย่างเดียว", "โมเดล NMR (seed 42)", "โมเดล NMR (เฉลี่ย 20 seed)", "ใช้เพศอย่างเดียว", "ค่าสุ่ม (ความชุก)"], values: [1.0, 0.976, 0.911, 0.5, 0.364] }],
      chartCommon({ x: M, y: 2.05, w: 7.4, h: 4.5, barDir: "bar", catAxisOrientation: "maxMin", chartColors: [ORANGE, BLUE, BLUE, GRAY, GRAY], barGapWidthPct: 40, showLegend: false,
        showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.000", dataLabelFontBold: true, valAxisMinVal: 0, valAxisMaxVal: 1.2, valAxisMajorUnit: 0.2,
        valAxisLabelFormatCode: "0.0", catAxisLabelFontSize: 13, showValAxisTitle: true, valAxisTitle: "PR-AUC (CV แบ่งตามผู้ป่วย)", valAxisTitleFontSize: 12, valAxisTitleColor: MUTED }));
    s.addText("จำนวนตัวอย่างตาม label และ prefix", { x: 8.4, y: 2.2, w: 4.3, h: 0.4, fontFace: FONT, fontSize: 14, bold: true, color: INK, margin: 0, isTextBox: true });
    const hdr = (t) => ({ text: t, options: { bold: true, color: INK, fill: { color: TINT }, fontFace: FONT, fontSize: 13, align: "center" } });
    const cell = (t, hi) => ({ text: t, options: { color: hi ? ORANGE_TXT : MUTED, bold: !!hi, fontFace: FONT, fontSize: 18, align: "center" } });
    const lab = (t) => ({ text: t, options: { bold: true, fontFace: FONT, fontSize: 13, color: INK } });
    s.addTable([[hdr(""), hdr("ADG19007u"), hdr("ADG10003u")], [lab("ควบคุม"), cell("84", true), cell("0")], [lab("เบาหวาน"), cell("0"), cell("48", true)]],
      { x: 8.4, y: 2.7, w: 4.3, colW: [1.3, 1.5, 1.5], rowH: 0.5, border: { type: "solid", color: HAIR, pt: 0.75 }, valign: "middle" });
    badge(s, 8.4, 4.5, 0.7, "FaTimesCircle", ORANGE, ORANGE_BG, "Point");
    s.addText("ไม่มีล็อตไหนมีทั้งสองกลุ่ม จึงแยกโรคออกจากล็อตการวัดไม่ได้เลย", { x: 9.3, y: 4.45, w: 3.4, h: 0.8, fontFace: FONT, fontSize: 14, color: INK, margin: 0, isTextBox: true, valign: "middle" });
    badge(s, 8.4, 5.5, 0.7, "FaUsers", BLUE, BLUE_BG, "Point");
    s.addText("เกณฑ์อายุ BMI และตารางเก็บตัวอย่างของสองกลุ่มก็ต่างกันด้วย", { x: 9.3, y: 5.45, w: 3.4, h: 0.8, fontFace: FONT, fontSize: 14, color: INK, margin: 0, isTextBox: true, valign: "middle" });
  }

  // =============== 13. Case 4 ===============
  {
    const s = content("กรณีที่ 4  |  ชื่อ label ไม่ตรงความหมาย", "FaTags", ORANGE, "\"โรคอ้วน vs ไม่อ้วน\" จริง ๆ คือ ก่อน vs หลังผ่าตัด",
      "กรณีที่สี่ งานเดิมเรียกว่า \"ทำนายโรคอ้วน\" แต่ label จริงคือ \"ก่อนผ่าตัดเทียบกับหลังผ่าตัดหนึ่งปี\" และ 71 จาก 106 คนปรากฏทั้งสองฝั่ง (80% ของตัวอย่างมาจากผู้ป่วยเหล่านี้) การแบ่ง CV ตามผู้ป่วยให้ ROC-AUC 0.960 ส่วน CV ธรรมดา 0.959 ไม่ต่างกัน ปัญหาจึงไม่ใช่ leakage แต่คือความหมายของ label โมเดลจึงเรียนรู้ทุกอย่างที่เปลี่ยนไปหลังผ่าตัด ไม่ใช่เฉพาะภาวะอ้วน (~0:30)",
      "ที่มา: experiments/case4/RESULTS.md, 10 รอบ x 5 fold. ตัวอย่างไม่มี BMI จึงตรวจไม่ได้ว่าผู้ป่วยหลัง 12 เดือนยังอ้วนอยู่หรือไม่");
    s.addShape(pres.ShapeType.ellipse, { x: M + 0.2, y: 2.3, w: 5.0, h: 3.6, fill: { color: BLUE, transparency: 78 }, line: { color: BLUE, width: 1.5 }, objectName: "Preop set" });
    s.addShape(pres.ShapeType.ellipse, { x: M + 2.3, y: 3.2, w: 2.5, h: 1.9, fill: { color: ORANGE, transparency: 70 }, line: { color: ORANGE, width: 1.5 }, objectName: "12-month set" });
    s.addText("106 คน\nก่อนผ่าตัด", { x: M + 0.55, y: 3.65, w: 1.7, h: 0.9, fontFace: FONT, fontSize: 14, bold: true, color: INK, margin: 0, isTextBox: true });
    s.addText([{ text: "71", options: { fontSize: 36, bold: true, color: INK, breakLine: true } }, { text: "ถูกวัดซ้ำที่ 12 เดือนด้วย", options: { fontSize: 12, color: INK } }],
      { x: M + 2.4, y: 3.3, w: 2.3, h: 1.7, fontFace: FONT, align: "center", margin: 0, isTextBox: true, valign: "middle" });
    body(s, "label 1 = ตัวอย่างก่อนผ่าตัด (106) / label 0 = หลังผ่าตัด 12 เดือน (71) ผู้ป่วยทุกคนที่ถูกวัดหลัง 12 เดือน ก็อยู่ในกลุ่มแรกด้วย",
      { x: M, y: 6.0, w: 5.5, h: 0.6, fontSize: 12, color: MUTED });
    const pts = [["FaEquals" in FA ? "FaBalanceScale" : "FaBalanceScale", BLUE, BLUE_BG, "แบ่ง CV ตามผู้ป่วย ROC-AUC 0.960", "CV ธรรมดา 0.959 ใกล้กัน ปัญหาจึงไม่ใช่ leakage แต่คือความหมายของ label"],
      ["FaPills" in FA ? "FaCapsules" : "FaCapsules", ORANGE, ORANGE_BG, "โมเดลเรียนรู้ทุกอย่างที่เปลี่ยนหลังผ่าตัด", "น้ำหนักที่ลดลง แต่ก็รวมอาหาร อาหารเสริม ยา สภาวะอดอาหาร และการเก็บตัวอย่างนาน 1 ปี"]];
    pts.forEach((p, i) => {
      const y = 2.3 + i * 2.0;
      badge(s, 6.9, y, 0.9, p[0], p[1], p[2], "Point");
      s.addText([{ text: p[3], options: { bold: true, fontSize: 17, breakLine: true } }, { text: p[4], options: { fontSize: 14, color: MUTED } }],
        { x: 8.0, y, w: 4.7, h: 1.6, fontFace: FONT, color: INK, margin: 0, isTextBox: true, valign: "top" });
    });
  }

  // =============== 14. Checklist ===============
  {
    const s = content("ทางแก้", "FaClipboardCheck" in FA ? "FaShieldAlt" : "FaShieldAlt", AQUA, "เช็กลิสต์ 6 ข้อ ก่อนเชื่อผลจากข้อมูลเมตาโบโลมิกส์ขนาดเล็ก",
      "ข้อเสนอของเราคือเช็กลิสต์หกข้อ หนึ่ง ถ้าผลลัพธ์คำนวณจากฟีเจอร์ อย่าพึ่งการสลับ label ให้หักด้วยค่าเริ่มต้นของทุกสารพร้อมกันภายในแต่ละ fold และรายงาน pairing-destroyed null เป็นตัวช่วย สอง ฝึกโมเดลใหม่ในทุกรอบของ permutation สาม เทียบกับตัวให้คะแนนที่ไม่เรียนรู้อะไรเสมอ สี่ ตรวจหาสารจากภายนอก และรายงานผลทั้งแบบมีและไม่มี ห้า ทำตารางไขว้ระหว่าง label กับ metadata ทุกคอลัมน์ เช่น ล็อตการวัด ลำดับการรัน และเพศ หก เขียนให้ได้ในหนึ่งประโยคว่า label แยกอะไรออกจากอะไรจริง ๆ (~0:35)",
      "หมวด Discussion ของบทความ");
    const items = [
      ["FaSyncAlt", "ผลลัพธ์คำนวณจากฟีเจอร์?", "อย่าพึ่งการสลับ label หักค่าเริ่มต้นของทุกสารพร้อมกันในแต่ละ fold"],
      ["FaRandom", "ฝึกโมเดลใหม่ทุกรอบการสลับ", "สลับ label กับคะแนนคงที่ ผิด 9.7% บนข้อมูลสุ่ม ฝึกใหม่เหลือ 5.3%"],
      ["FaBalanceScale", "เทียบกับตัวที่ไม่เรียนรู้อะไร", "คะแนนคงที่ที่ไม่ผ่านการฝึก รายงาน gap พร้อมช่วงความเชื่อมั่น"],
      ["FaFlask", "ตรวจสารจากภายนอก", "ยา ตัวทำละลาย น้ำยาทำความสะอาดผิว รายงานทั้งแบบมีและไม่มี"],
      ["FaTable", "ไขว้ label กับ metadata", "ทุกคอลัมน์: ล็อตการวัด ลำดับการรัน prefix ชื่อไฟล์ เพศ"],
      ["FaTags", "label แยกอะไรออกจากอะไร?", "เขียนให้ได้ใน 1 ประโยค ว่าสองคลาสต่างกันที่สภาวะจริงอะไร"],
    ];
    const w = (CW - 0.4) / 2, h = 1.3;
    items.forEach((it, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const x = M + col * (w + 0.4), y = 2.05 + row * (h + 0.15);
      card(s, x, y, w, h, "Check card");
      badge(s, x + 0.25, y + 0.3, 0.7, it[0], AQUA, AQUA_BG, "Check");
      s.addText([{ text: it[1], options: { bold: true, fontSize: 16, breakLine: true } }, { text: it[2], options: { fontSize: 13, color: MUTED } }],
        { x: x + 1.15, y: y + 0.08, w: w - 1.35, h: h - 0.16, fontFace: FONT, color: INK, margin: 0, isTextBox: true, valign: "middle" });
    });
  }

  // =============== 15. Takeaways ===============
  {
    const s = content("สรุป", "FaLightbulb", AQUA, "การตรวจมาตรฐานจำเป็น แต่ยังไม่พอ",
      "ข้อสรุปคือ การตรวจสอบมาตรฐานจำเป็น แต่ไม่พอ ถ้าเราตรวจให้ครบทั้งสี่จุดนี้ ก็จะจับข้อผิดพลาดได้ก่อนตีพิมพ์ ข้อจำกัดที่ควรรู้: เราใช้ข้อมูลสาธารณะขนาดเล็กสามชุด ผลที่ได้เป็นเรื่องวิธีตรวจสอบ ไม่ได้บอกอะไรเกี่ยวกับชีววิทยาของโรคอ้วนหรือเบาหวาน การจำลองใช้ข้อมูลแบบเกาส์เซียนและโมเดลเชิงเส้น และกรณีทำซ้ำมีตัวอย่างน้อย ขอบคุณครับ/ค่ะ (~0:25)",
      "Repository: github.com/Calvinkub/validated-yet-wrong (public, tag paper-v1)");
    s.addText("สิ่งที่ควรจำ", { x: M, y: 2.05, w: 5.8, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: GREEN_TXT, margin: 0, isTextBox: true });
    [["FaCheckCircle", "การตรวจที่ผ่าน ตอบได้แค่คำถามเดียว รู้ให้ได้ว่าคือคำถามอะไร"], ["FaChartLine", "ข้อมูลมากขึ้น อาจทำให้การทดสอบที่ผิด มั่นใจมากขึ้น"], ["FaShieldAlt", "ทุกปัญหาที่พบ มีวิธีตรวจเฉพาะที่ทำได้ง่าย"]].forEach((r, i) => {
      const y = 2.55 + i * 1.0;
      badge(s, M, y, 0.7, r[0], AQUA, AQUA_BG, "Takeaway");
      s.addText(r[1], { x: M + 0.9, y, w: 4.9, h: 0.8, fontFace: FONT, fontSize: 15, color: INK, margin: 0, isTextBox: true, valign: "middle" });
    });
    s.addText("ข้อจำกัด", { x: 7.0, y: 2.05, w: 5.7, h: 0.4, fontFace: FONT, fontSize: 16, bold: true, color: ORANGE_TXT, margin: 0, isTextBox: true });
    [["FaDatabase", "ข้อมูลสาธารณะเล็กสามชุด ผลเป็นเรื่องวิธีตรวจ ไม่ใช่ชีววิทยาของโรค"], ["FaCalculator", "การจำลองใช้ข้อมูลเกาส์เซียน โมเดลเชิงเส้น และกฎผลลัพธ์แบบเดียว"], ["FaHeartbeat", "การทำซ้ำมีผู้ป่วย 47 คน และเป็นสถานการณ์เฉียบพลัน"]].forEach((r, i) => {
      const y = 2.55 + i * 1.0;
      badge(s, 7.0, y, 0.7, r[0], ORANGE, ORANGE_BG, "Limit");
      s.addText(r[1], { x: 7.9, y, w: 4.8, h: 0.8, fontFace: FONT, fontSize: 14, color: INK, margin: 0, isTextBox: true, valign: "middle" });
    });
    card(s, M, 5.65, CW, 0.9, "Repo callout");
    s.addImage({ data: ic("FaGithub", INK), x: M + 0.3, y: 5.9, w: 0.4, h: 0.4, altText: "GitHub", objectName: "GitHub icon" });
    s.addText([{ text: "โค้ด ผลลัพธ์ และบทความ: ", options: { color: MUTED } }, { text: "github.com/Calvinkub/validated-yet-wrong", options: { bold: true } }],
      { x: M + 0.9, y: 5.65, w: CW - 1.2, h: 0.9, fontFace: FONT, fontSize: 18, color: INK, margin: 0, isTextBox: true, valign: "middle" });
  }

  // =============== 16. Backup: simulation design ===============
  {
    const s = content("สำรอง", "FaCalculator", GRAY, "การออกแบบการจำลอง",
      "สำรองสำหรับตอบคำถาม: ใช้ r = 0.25 เพื่อให้ได้ค่าสหสัมพันธ์ baseline-change เฉลี่ย -0.62 ที่เห็นใน MTBLS242 การทดสอบแต่ละแบบฝึกโมเดลใหม่ในทุก null replicate (200 ครั้ง) และเราทดสอบความถูกต้องกับข้อมูลสัญญาณรบกวนล้วนก่อน: อัตราปฏิเสธ 5.3% เมื่อฝึกใหม่ทุกครั้ง แต่ 9.7% เมื่อใช้คะแนน out-of-fold คงที่",
      "ที่มา: บทความหมวด Simulation Study; simulation/sim_pairing_null.py (seed 20261011)");
    body(s, [
      { text: "สารแต่ละตัวมีระดับถาวรของผู้ป่วยแต่ละคน (11 ตัวชี้วัด + 10 ฟีเจอร์เสริม)", options: { breakLine: true } },
      { text: "x0 = sqrt(r) * mu + sqrt(1 - r) * e0", options: { fontFace: "Courier New", fontSize: 14, breakLine: true } },
      { text: "x12 = sqrt(r) * (mu + gamma * g * s) + sqrt(1 - r) * e12", options: { fontFace: "Courier New", fontSize: 14, breakLine: true } },
      gap(),
      { text: "r: ความน่าเชื่อถือของการวัด (สัดส่วนความแปรปรวนที่คงอยู่) / gamma: ผลตอบสนองจริงที่ทำนายได้ (0 = ไม่มี) / g: แนวโน้มตอบสนองจากฟีเจอร์เสริม / s: ทิศทางที่คาดไว้", options: { breakLine: true } },
      gap(),
      { text: "ผลลัพธ์: อย่างน้อย 6 จาก 11 ตัวชี้วัดเปลี่ยนไปในทิศที่คาด / โมเดล: ridge regression (lambda = 10), CV 5 fold, วัดด้วย average precision", options: {} },
    ], { x: M, y: 2.1, w: 6.6, h: 4.3, fontSize: 15 });
    card(s, 7.7, 2.1, 5.0, 4.3, "Grid card");
    body(s, [
      { text: "ตารางที่จำลอง (1,000 ชุดต่อช่อง)", options: { bold: true, breakLine: true } },
      ...bullets(["n: 50, 100, 200, 500", "r: 0.25, 0.5, 0.75", "gamma: 0, 0.25, 0.5", "รวม 36,000 ชุด"]),
      gap(),
      { text: "ทดสอบสี่แบบต่อชุด alpha = 0.05, null 200 รอบ ฝึกโมเดลใหม่ทุกรอบ", options: { bold: true, breakLine: true } },
      ...bullets(["สลับ label", "สลับคู่ตัวอย่าง (pairing-destroyed null)", "หักทีละสาร", "หักทุกสารพร้อมกัน"]),
    ], { x: 7.95, y: 2.25, w: 4.5, h: 4.0, fontSize: 14 });
  }

  // =============== 17. Backup: Case 1 numbers ===============
  {
    const s = content("สำรอง", "FaTable", GRAY, "ตัวเลขกรณีที่ 1 ทั้งหมด",
      "สำรองสำหรับตอบคำถามเรื่องตัวเลขของกรณีที่ 1 ตัวเลข PR-AUC เดิมที่รายงานไว้ 0.671 ไม่ซ้ำเป๊ะเมื่อรันใหม่ (ได้ 0.683) ซึ่งตรงกับที่ repository เดิมบันทึกไว้ ความชุกของผู้ตอบสนองต่างกันเพราะเกณฑ์ 6 จาก 11 ให้จำนวนผู้ตอบสนองต่างกันในสองดีไซน์",
      "ที่มา: experiments/case1/RESULTS.md. ช่วงความเชื่อมั่น: bootstrap ระดับผู้ป่วย 71 คน");
    const h = (t) => ({ text: t, options: { bold: true, color: INK, fill: { color: TINT }, fontFace: FONT, fontSize: 13, align: "center" } });
    const c = (t) => ({ text: t, options: { fontFace: FONT, fontSize: 13, color: INK, align: "center" } });
    const l = (t) => ({ text: t, options: { fontFace: FONT, fontSize: 13, color: INK, bold: true } });
    s.addTable([
      [h("ตัวชี้วัด"), h("ดีไซน์เดิม"), h("หักทีละสาร"), h("หักทุกสารพร้อมกัน")],
      [l("ผู้ตอบสนอง จาก 71"), c("31"), c("31"), c("37")],
      [l("ความชุก"), c("0.437"), c("0.437"), c("0.521")],
      [l("PR-AUC ของโมเดล"), c("0.683"), c("0.483"), c("0.554")],
      [l("PR-AUC ของตัวที่ไม่เรียนรู้"), c("0.653 (solver เดิม)"), c("0.522"), c("0.589")],
      [l("Gap และช่วง 95%"), c("ไม่มี"), c("-0.042 [-0.149, +0.052]"), c("-0.037 [-0.111, +0.037]")],
      [l("p ของการสลับ label (ฝึกใหม่)"), c("0.001"), c("1.000"), c("1.000")],
      [l("lift ของ null (median)"), c("2.04 เทียบกับที่สังเกตได้ 1.57"), c("1.04"), c("1.05")],
    ], { x: M, y: 2.1, w: CW, colW: [3.3, 2.9, 2.95, 2.98], rowH: 0.52, border: { type: "solid", color: HAIR, pt: 0.75 }, valign: "middle" });
  }

  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT, "slides:", n);
}
main().catch((e) => { console.error(e); process.exit(1); });
