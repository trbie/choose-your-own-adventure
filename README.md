# choose-your-own-adventure

- Deployed Site: https://choose-your-own-adventure-web.vercel.app/
- Repository: https://github.com/trbie/choose-your-own-adventure

---

This repository combines:

- A Python pipeline for OCR extraction, branching graph construction, story-path generation, and SVG rendering.
- A Next.js + TypeScript web app for authoring branching graphs and reading/playthrough mode.

## Current Status

- Deployable web app is in place (author mode + reader mode, local autosave, optional server sync behind a feature flag).
- Python data pipeline and derived outputs are stable and currently sourced from `output/cot-pages-ocr-v2`.
- Remaining future improvements are tracked in `Todo.md`.

## Web App Quickstart

From repo root:

```bash
npm install
npm run dev
```

Useful commands:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run seed:cot` (rebuilds `apps/web/public/seed/graph.cot.json` from `output/` data)

Environment:

- `NEXT_PUBLIC_ENABLE_SERVER=false` (default local-only mode)
- `NEXT_PUBLIC_ENABLE_SERVER=true` (enables auth + server persistence API usage)

## Python Pipeline

### Re-Extract OCR From Spread-Scanned PDF

The scan is a two-page spread layout. Story page 2 starts on the left side of PDF page 8.

```bash
python3 scripts/reextract_cot_ocr_split.py \
	--pdf samples/the-cave-of-time.pdf \
	--pdf-start-page 8 \
	--pdf-end-page 66 \
	--story-start-page 2 \
	--output-dir output/cot-pages-ocr-v2
```

Output:

- `output/cot-pages-ocr-v2/*.txt`

### Build Story Graph

```bash
python3 scripts/build_story_graph.py \
	--pages-dir output/cot-pages-ocr-v2 \
	--output output/cot-story-graph.mmd
```

Output:

- `output/cot-story-graph.mmd`

### Render Graph SVG

```bash
python3 scripts/render_story_graph_svg.py \
	--graph output/cot-story-graph.mmd \
	--output output/cot-story-graph.svg
```

Output:

- `output/cot-story-graph.svg`

### Generate Bounded Story Variants

```bash
python3 scripts/write_all_stories.py
```

Optional flags:

```bash
python3 scripts/write_all_stories.py \
	--graph output/cot-story-graph.mmd \
	--pages-dir output/cot-pages-ocr-v2 \
	--output-dir output/cot-stories \
	--start-page 2 \
	--max-decisions 20
```

Outputs:

- `output/cot-stories/story-0001.txt` (and additional numbered files)
- `output/cot-stories/manifest.json`

## Canonical Data + References

- Canonical OCR source: `output/cot-pages-ocr-v2`
- Canonical project state notes: `Codebase.md`
- Future roadmap and improvements: `Todo.md`
