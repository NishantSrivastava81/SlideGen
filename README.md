

Schema-First Slide Generation: Let the Model Handle Meaning, Not Geometry.

It shows two things:

1. **Cost** — how many output tokens the model emits to "paint the deck" with
   `pptxgenjs` code vs to schema based generation (bounded JSON). 
2. **Render** — that the JSON turns into a real, editable `.pptx` with no model
   in the loop. A ~30-line deterministic renderer owns all geometry.


## Run

```bash

npm install
npm run generate   # optional: live LLM run, rewrites fixtures (needs .env — see below)
npm run measure    # token + cost table (offline, uses committed fixtures)
npm run render     # writes out.pptx from fixtures/content.json
```

## Live LLM mode (optional)

Default runs use committed fixtures (offline). To prove the gap on a real model,
copy `.env.example` to `.env`, set your Azure OpenAI endpoint/key/deployments,
then `npm run generate`. It asks one model both ways and rewrites the fixtures.

## What you'll see (live, gpt-5.4 vs gpt-5.4-mini, 3 slides)

```
Freehand pptxgenjs : 1222 tok/slide  (3667 / deck), gpt-5.4,      1 gen
Schema + renderer  :  158 tok/slide  ( 473 / deck), gpt-5.4-mini, 1 gen
Token/slide ratio  : 7.7x   deck-token ratio: 7.8x   cost ratio: 25.8x   (billed; reasoning tok = 0)
```

`measure.mjs` shows per-slide tokens and the whole-deck totals side by side; the
deck totals are the same numbers `npm run generate` prints. The 7.7x per-slide
token gap (7.8x across the deck) is measured. Iterations and per-token prices in
`measure.mjs` are directional knobs, change them. Cost balloons because the
freehand path needs a frontier model for layout while the bounded path runs on
a small one. Open `out.pptx` to confirm the JSON path produces real editable
shapes, not a screenshot.

## Files

- `fixtures/content.json` — the bounded slot-fill the small model returns
- `fixtures/freehand.js.txt` — the layout code a model emits when asked to paint
- `render.mjs` — JSON to .pptx (the deterministic renderer)
- `measure.mjs` — encode both, print the table
