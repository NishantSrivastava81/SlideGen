// generate.mjs — the LIVE LLM step (optional). Default measure/render use the
// committed fixtures so the spike runs offline. Run this to regenerate them from
// a real model and prove the token gap on your own provider.
//
//   Azure:  fill .env, then  node generate.mjs
//   OpenAI: OPENAI_API_KEY=...  node generate.mjs
//
// It asks ONE model two ways for the same brief: paint freehand pptxgenjs code,
// vs fill the bounded schema. It writes fixtures/freehand.js.txt and content.json.
import "dotenv/config";
import OpenAI, { AzureOpenAI } from "openai";
import { writeFileSync } from "node:fs";

const BRIEF = "3-slide exec summary for a bank's datacentre-to-Azure migration: cost, resilience, security.";
const SCHEMA = `Return JSON: array of {template:"two_column", title<=70, left_content, right_cards:[{value,label,accent:"green"|"teal"|"blue"|"amber"}] max4}.`;
const big = process.env.MODEL_BIG ?? "gpt-4o";
const small = process.env.MODEL_SMALL ?? "gpt-4o-mini";
const client = process.env.AZURE_OPENAI_API_KEY
    ? new AzureOpenAI({ apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21" })
    : new OpenAI();

async function ask(model, sys, user) {
    const r = await client.chat.completions.create({
        model, messages: [
            { role: "system", content: sys }, { role: "user", content: user }]
    });
    const u = r.usage ?? {};
    return {
        text: r.choices[0].message.content ?? "",
        prompt: u.prompt_tokens ?? 0,
        completion: u.completion_tokens ?? 0,
        reasoning: u.completion_tokens_details?.reasoning_tokens ?? 0,  // hidden, still billed
        total: u.total_tokens ?? 0,
    };
}

const free = await ask(big, "You write pptxgenjs code. Output ONLY code, no prose.", `Build a deck. ${BRIEF}`);
const sch = await ask(small, "You fill a slide schema. Output ONLY JSON.", `${SCHEMA}\n${BRIEF}`);
writeFileSync(new URL("./fixtures/freehand.js.txt", import.meta.url), free.text.replace(/```\w*\n?|```/g, ""));
writeFileSync(new URL("./fixtures/content.json", import.meta.url), sch.text.replace(/```\w*\n?|```/g, ""));
writeFileSync(new URL("./fixtures/usage.json", import.meta.url), JSON.stringify({ big, small, free, sch }, null, 2));
const bill = (x) => x.completion + x.reasoning;   // what you pay for output: visible + reasoning
console.log(`freehand(${big}): ${free.completion} out + ${free.reasoning} reasoning = ${bill(free)} billed`);
console.log(`schema(${small}):  ${sch.completion} out + ${sch.reasoning} reasoning = ${bill(sch)} billed   ${(bill(free) / Math.max(bill(sch), 1)).toFixed(1)}x`);
console.log("usage.json written -> now: node measure.mjs && node render.mjs");
