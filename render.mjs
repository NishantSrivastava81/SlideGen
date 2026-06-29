// render.mjs — the deterministic renderer.
// Reads the LLM's bounded JSON (fixtures/content.json) and builds a real,
// editable .pptx. The model never wrote a coordinate; this code owns geometry.
// This mirrors the production two_column mapper (shrink-to-fit, accent ring).
import PptxGenJS from "pptxgenjs";
import { readFileSync } from "node:fs";

const ACCENT = { green: "2ECC71", teal: "1ABC9C", blue: "3498DB", amber: "F39C12", red: "E74C3C" };
const T = { bg: "0B1F3A", header: "0B1F3A", card: "12243F", text: "C8D2E0" };

function twoColumn(slide, c) {
    slide.background = { fill: T.bg };
    slide.addShape("rect", { x: 0, y: 0, w: "100%", h: 0.9, fill: { color: T.header } });
    slide.addText(c.title, { x: 0.6, y: 0.15, w: 10, h: 0.6, fontSize: 22, color: "FFFFFF", bold: true });
    slide.addText(c.left_content, { x: 0.6, y: 1.3, w: 7, h: 5.5, fontSize: 13, color: T.text, lineSpacingMultiple: 1.5, valign: "top" });

    const cards = Array.isArray(c.right_cards) ? c.right_cards : [];
    if (!cards.length) return;
    const compact = cards.length > 3;             // four+ cards shrink, never overflow
    const gap = compact ? 0.12 : 0.2;
    const h = (5.7 - gap * (cards.length - 1)) / cards.length;
    const vSize = compact ? 18 : 26;
    cards.forEach((card, i) => {
        const a = ACCENT[card.accent] ?? ACCENT.blue;
        const y = 1.3 + i * (h + gap);
        slide.addShape("roundRect", { x: 8.2, y, w: 4.5, h, fill: { color: T.card }, rectRadius: 0.06, line: { color: a, width: 1.5 } });
        slide.addText(String(card.value ?? ""), { x: 8.5, y: y + 0.15, w: 4, h: h * 0.45, fontSize: vSize, color: a, bold: true, shrinkText: true });
        slide.addText(String(card.label ?? "").toUpperCase(), { x: 8.5, y: y + h * 0.55, w: 4, h: h * 0.3, fontSize: 9, color: T.text, shrinkText: true });
    });
}

// A complex template, same rule: N metrics auto-fit into a centred grid, the
// renderer derives card width, fonts, and accent bars. The model just lists them.
function metricsDashboard(slide, c) {
    slide.background = { fill: T.bg };
    slide.addShape("rect", { x: 0, y: 0, w: "100%", h: 1.1, fill: { color: T.header } });
    slide.addText(c.title, { x: 0.8, y: 0.2, w: 11, h: 0.5, fontSize: 22, color: "FFFFFF", bold: true });
    if (c.subtitle) slide.addText(c.subtitle, { x: 0.8, y: 0.7, w: 11, h: 0.3, fontSize: 12, color: "D0D0D0" });
    const m = c.metrics ?? [], n = m.length, gap = 0.25, usable = 13.33 - 1.2;
    const w = (usable - (n - 1) * gap) / n, startX = (13.33 - (n * w + (n - 1) * gap)) / 2;
    const vSize = n > 4 ? 26 : 36;                  // five+ metrics downscale to fit
    m.forEach((x, i) => {
        const a = ACCENT[x.accent] ?? ACCENT.blue, px = startX + i * (w + gap);
        slide.addShape("rect", { x: px, y: 2.0, w, h: 3.5, fill: { color: T.card } });
        slide.addShape("rect", { x: px, y: 2.0, w, h: 0.06, fill: { color: a } });
        slide.addText(String(x.value), { x: px, y: 2.5, w, h: 1, fontSize: vSize, color: a, bold: true, align: "center", shrinkText: true });
        slide.addText(String(x.label).toUpperCase(), { x: px, y: 3.6, w, h: 0.5, fontSize: 11, color: "FFFFFF", bold: true, align: "center" });
        if (x.description) slide.addText(x.description, { x: px + 0.1, y: 4.2, w: w - 0.2, h: 1, fontSize: 10, color: T.text, align: "center" });
    });
}

const deck = JSON.parse(readFileSync(new URL("./fixtures/content.json", import.meta.url)));
const pptx = new PptxGenJS();
pptx.layout = "LAYOUT_WIDE";
for (const s of deck) (s.template === "metrics_dashboard" ? metricsDashboard : twoColumn)(pptx.addSlide(), s);
await pptx.writeFile({ fileName: "out.pptx" });
console.log(`Rendered ${deck.length} slides -> out.pptx (real, editable shapes)`);
