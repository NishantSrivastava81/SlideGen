// measure.mjs — report billed output tokens per approach. If a live run wrote
// fixtures/usage.json, use the SDK's real usage (completion + reasoning). Else
// fall back to tokenizing the fixtures (offline estimate). Tokens are real either way.
import { encode } from "gpt-tokenizer";
import { readFileSync, existsSync } from "node:fs";

const json = readFileSync(new URL("./fixtures/content.json", import.meta.url), "utf8");
const code = readFileSync(new URL("./fixtures/freehand.js.txt", import.meta.url), "utf8");
const slides = JSON.parse(json).length;
const usagePath = new URL("./fixtures/usage.json", import.meta.url);

let codeTotal, schemaTotal, src;        // TOTAL billed output tokens for the whole deck (these match generate.mjs)
if (existsSync(usagePath)) {
    const u = JSON.parse(readFileSync(usagePath, "utf8"));
    codeTotal = u.free.completion + u.free.reasoning;   // billed = visible + reasoning
    schemaTotal = u.sch.completion + u.sch.reasoning;
    src = `SDK usage: freehand reasoning=${u.free.reasoning}, schema reasoning=${u.sch.reasoning}`;
} else {
    codeTotal = encode(code).length;
    schemaTotal = encode(json).length;
    src = "tokenizer estimate (no live usage.json)";
}
const codeTok = Math.round(codeTotal / slides), schemaTok = Math.round(schemaTotal / slides);  // per-slide, display only

const codeIters = 1, schemaIters = 1, codePrice = 15, schemaPrice = 4.5;  // spike = 1 gen each; $/1M out gpt-5.4 vs mini
const cost = (total, it, p) => (total * it * p) / 1_000_000;             // from the real deck total — no round-then-multiply drift
const cFree = cost(codeTotal, codeIters, codePrice), cSch = cost(schemaTotal, schemaIters, schemaPrice);
console.log(`\nMeasured on ${slides} slides — ${src}:\n`);
console.table({
    "Freehand pptxgenjs": { "tok/slide": codeTok, "deck tokens": codeTotal, model: "frontier", iters: codeIters, "$": cFree.toFixed(4) },
    "Schema + renderer": { "tok/slide": schemaTok, "deck tokens": schemaTotal, model: "small", iters: schemaIters, "$": cSch.toFixed(4) },
});
console.log(`\nToken/slide ratio: ${(codeTok / schemaTok).toFixed(1)}x   deck-token ratio: ${(codeTotal / schemaTotal).toFixed(1)}x   cost ratio: ${(cFree / cSch).toFixed(1)}x`);
console.log(`(prices/iters are directional knobs; billed tokens are real)\n`);
