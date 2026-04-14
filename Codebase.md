# Codebase Notes

## Purpose

This workspace has two halves:

1. A Python pipeline that extracts text from the scanned PDF of _The Cave of Time_, builds a story graph from extracted pages, enumerates bounded story paths, and renders the graph.
2. A TypeScript/Next.js web app for interactive graph authoring and reader mode.

The web app can run in local-only mode (no DB/auth), but also includes optional server persistence behind a feature flag.

## Repo Layout (High Level)

- output/: canonical OCR pages + derived artifacts used by scripts
- scripts/: Python pipeline (OCR, graph build, story enumeration, SVG render)
- apps/web/: Next.js (App Router) web app: author mode + reader mode + optional API
- packages/shared/: shared TypeScript types + selectors + tests

## Web App (Current State)

### What It Is

- Next.js App Router UI with two primary modes:
  - /author: interactive graph editor (React Flow)
  - /read: reader mode (plays the story from the graph)
- Graph state is held in Redux Toolkit and persisted locally (localStorage).
- Optional server mode (Prisma + JWT + Postgres/Supabase) exists but is gated behind NEXT_PUBLIC_ENABLE_SERVER.

### Key Files

- apps/web/src/app/providers.tsx
  - Boots the Redux store.
  - Loads the graph in this order:
    1. server graph (only if NEXT_PUBLIC_ENABLE_SERVER=true + logged in + graph id exists)
    2. local draft from localStorage
    3. seed graph JSON at /seed/graph.cot.json
  - Autosaves draft locally; optionally debounced server sync.

- apps/web/public/seed/graph.cot.json
  - Seed graph used for Reset + first-time load.
  - Generated from Python outputs via npm run seed:cot.

- apps/web/scripts/seed-cot.ts
  - Imports output/cot-story-graph.mmd + output/cot-pages-ocr-v2 into apps/web/public/seed/graph.cot.json.

- apps/web/src/app/author/page.tsx
  - Author route entry.

- apps/web/src/app/read/page.tsx
  - Reader route entry.

### Delivery Progress

Phase 0 — Repo scaffolding

- Added npm workspaces with apps/web and packages/shared.

Phase 1 — Shared graph model + utilities

- Shared GraphDocument model + indexing/selectors live in packages/shared.
- Unit tests for selectors live in packages/shared/test.

Phase 2 — Seed import

- Added npm run seed:cot to generate a seed JSON graph for the web app.

Phase 3 — Author/editor mode

- Interactive graph editor using React Flow with Redux-backed controlled nodes/edges.
- Create/delete nodes and edges; connect nodes.

Phase 4 — Local persistence + export/import

- Local draft autosave to localStorage.
- Export graph JSON, import graph JSON, reset-to-seed behavior.

Phase 5 — Optional server persistence (gated)

- Prisma schema for Users/Graphs/Nodes/Edges/ReadingProgress.
- JWT auth using httpOnly cookie.
- API routes for auth and graph CRUD.
- Runs locally without DB credentials when NEXT_PUBLIC_ENABLE_SERVER is not true.

Phase 6 — Reader mode

- Reader UI renders current page + body + choices.
- Choice labels fall back to destination page number when choice text is missing.
- Clickable history “time travel” that doesn’t mutate history.
- If you branch from a past point, shows a confirmation modal before truncating.
- If you re-pick the same next decision as before, it advances without truncation.

Phase 7 — AI features (stretch)

- Not yet implemented (suggest branches workflow and API are pending).

Phase 8 — Quality + safety

- `typecheck` and `lint` are passing.
- E2E smoke test exists for create node -> connect -> export -> import.
- Public-deployment content policy confirmation is still pending.

Phase 9 — Deploy

- Full-stack deploy completed (Vercel/Netlify target achieved).
- Production DB + environment variables configured.
- Deployment documentation has replaced boilerplate guidance.

Remaining backlog is tracked in `Todo.md`.

### Web App Commands

- npm run dev
  - Runs the Next.js dev server (apps/web).

- npm run seed:cot
  - Rebuilds apps/web/public/seed/graph.cot.json from output/ artifacts.

- npm test
  - Runs packages/shared tests.

- npm run build
  - Builds the Next.js app for production.

- npm run start
  - Starts the production build.

### Web App Env / Secrets

- Do not commit real .env files.
- This repo ignores .env and .env.\* but allows committing .env.example templates.
- Feature flag:
  - NEXT_PUBLIC_ENABLE_SERVER=false (default local-only)
  - NEXT_PUBLIC_ENABLE_SERVER=true enables auth + server sync calls

## Canonical Source Of Truth

The canonical extracted page set is:

- output/cot-pages-ocr-v2

Do not use the older cot-pages extraction workflow. It had bad OCR and was removed.

## Important PDF Mapping

The scan is a two-page spread layout.

Story start mapping:

- PDF page 8 contains story page 2 on the left and story page 3 on the right
- PDF page 9 contains story page 4 on the left and story page 5 on the right

The story begins on story page 2 with:

- "You've hiked through Snake Canyon once before ..."

Do not confuse story page numbers with PDF page numbers.

## Current Scripts

Canonical scripts in scripts/:

- reextract_cot_ocr_split.py
- build_story_graph.py
- write_all_stories.py
- render_story_graph_svg.py

Superseded scripts were deleted:

- extract_cot.py
- reextract_cot_spreads.py

## What Each Script Does

### reextract_cot_ocr_split.py

Re-extracts story pages from the PDF using OCR on left/right halves of each PDF spread page.

Typical command:

```bash
python3 scripts/reextract_cot_ocr_split.py \
  --pdf samples/the-cave-of-time.pdf \
  --pdf-start-page 8 \
  --pdf-end-page 66 \
  --story-start-page 2 \
  --output-dir output/cot-pages-ocr-v2
```

### build_story_graph.py

Builds Mermaid graph output from the corrected OCR page files.

Typical command:

```bash
python3 scripts/build_story_graph.py \
  --pages-dir output/cot-pages-ocr-v2 \
  --output output/cot-story-graph.mmd
```

Notes:

- Reads explicit "turn to page X" choices from page text.
- Adds sequential continuation edges for pages that continue onto the next numbered page before any explicit choice appears.

### write_all_stories.py

Writes all possible bounded stories from the graph.

Typical command:

```bash
python3 scripts/write_all_stories.py \
  --graph output/cot-story-graph.mmd \
  --pages-dir output/cot-pages-ocr-v2 \
  --start-page 2 \
  --max-decisions 20 \
  --output-dir output/cot-stories
```

Important behavior:

- Starts from story page 2
- Stops on cycles
- Stops if decision points exceed 20
- Clears old story-\*.txt files in the target output directory before writing new ones

### render_story_graph_svg.py

Renders the Mermaid graph to SVG without external layout tools.

Typical command:

```bash
python3 scripts/render_story_graph_svg.py \
  --graph output/cot-story-graph.mmd \
  --output output/cot-story-graph.svg
```

Current visual behavior:

- Uses a layered Sugiyama-style layout with iterative barycenter ordering
- Colors terminal pages differently
- Highlights the main trunk from page 2

## Current Canonical Outputs

Keep these:

- output/cot-pages-ocr-v2
- output/cot-story-graph.mmd
- output/cot-story-graph.svg
- output/cot-stories

These older directories were deleted because they were exploratory or obsolete:

- output/cot-pages
- output/cot-pages-reextract
- output/cot-stories-from-page-02
- output/cot-stories-start10
- output/tmp

## Current Known State

At the end of this session:

- The corrected OCR v2 extraction produced story pages in output/cot-pages-ocr-v2
- The graph was rebuilt from OCR v2 pages and saved to output/cot-story-graph.mmd
- The bounded story writer generated 45 stories into output/cot-stories
- The graph SVG was rendered to output/cot-story-graph.svg
- Web app is deployable and includes authoring + reader flows.
- Remaining major items are PDF import/export, optional graph revisioning, AI branch suggestions, and content-policy confirmation.

## Caveats

OCR is improved but not perfect.

- Some pages still have minor OCR noise
- Page continuations across spreads are important; graph construction relies on sequential edges when no explicit choice appears
- Story page numbers, not PDF page numbers, control graph edges and story traversal

## Next-Time Guidance

When resuming work:

1. Read this file first.
2. Treat output/cot-pages-ocr-v2 as the current source text.
3. If extraction quality needs improvement, update reextract_cot_ocr_split.py rather than rebuilding older workflows.
4. If graph or story outputs need regeneration, rerun build_story_graph.py, write_all_stories.py, and render_story_graph_svg.py in that order.
5. If the web seed graph needs regeneration, rerun the Python steps above, then run npm run seed:cot.
6. For pending product enhancements and remaining tasks, use Todo.md as the source of truth.
