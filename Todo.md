
# Build Plan (TypeScript-First)

Goal: a deployable web app where an author can view a branching story as an interactive graph (pan/zoom, click details), and also drag, edit, and create nodes/edges; plus an optional “reader” mode.

This plan assumes a single full-stack TypeScript app using:
- Next.js (React) + TypeScript
- React Flow (interactive graph editor)

Notes on deployment constraints:
- This plan targets a full-stack deployment (Vercel or Netlify) with DB persistence.
- Selected direction: full-stack deployment (Vercel or Netlify) with DB persistence.
---

## Phase 0 — Decisions (edit these first)

- [ ] Deployment target (selected): Full-stack (Vercel or Netlify)
	- Why: required for auth + saving graphs/progress across devices
	- Still support offline authoring via localStorage + Export/Import
- [ ] Storage strategy (selected): Hybrid
	- Local: localStorage for autosave drafts + UI state
	- Server: Prisma + Supabase Postgres for users, saved graphs, reading progress
- [ ] Auth + state tracking (selected)
	- Auth: JWT-based sessions
	- App state: Redux Toolkit
- [ ] AI provider approach (selected): Stretch goal later
	- Ship authoring/reader MVP without AI first

---

## Phase 1 — Repo & App Scaffolding (TypeScript everywhere)

- [ ] Create `apps/web` (Next.js + TS) and `packages/shared` (shared types + utils)
- [ ] Add tooling
	- [ ] npm
	- [ ] ESLint + Prettier
	- [ ] TypeScript strict mode
	- [ ] Basic CI script hooks (typecheck + lint)
- [ ] Define environment variable strategy
	- [ ] `.env` (selected) for local dev secrets; add to `.gitignore`
	- [ ] `.env.example` template (no secrets)

Deliverable: `npm run dev` starts the app and shows a placeholder page.

---

## Phase 2 — Core Data Model (shared TypeScript types)

Create these in `packages/shared/src/models.ts`.

### 2.1 IDs

Decision: use stable string IDs.
- NodeId: `"p-2"` (page-based) or `"n-uuid"` (author-created)
- EdgeId: `"e-<source>-<target>-<index>"` or uuid

### 2.2 Graph document

```ts
export type NodeId = string;
export type EdgeId = string;

export type StoryNodeType = "page" | "ending" | "note";

export interface StoryNode {
	id: NodeId;
	type: StoryNodeType;

	// Page semantics
	pageNumber?: number; // from OCR book import; optional for author-created nodes
	title: string;
	body: string; // the story text for this node

	// Authoring helpers
	tags: string[];
	isTerminal: boolean; // computed or author-set; keep explicit for UI filtering/styling

	// React Flow position
	position: { x: number; y: number };
}

export interface StoryEdge {
	id: EdgeId;

	// IMPORTANT: An edge connects exactly one source -> one target.
	// A node can point to MANY other nodes by having MANY edges with the same `source`.
	// A node can be pointed-to by MANY nodes by having MANY edges with the same `target`.
	source: NodeId;
	target: NodeId;

	// The visible choice text (if known). For Cave of Time import this may be empty.
	choiceText: string;
}

export interface GraphMeta {
	title: string;
	description?: string;
	createdAt: string; // ISO
	updatedAt: string; // ISO
	startNodeId?: NodeId;
}

export interface GraphDocument {
	version: 1;
	meta: GraphMeta;
	nodes: StoryNode[];
	edges: StoryEdge[];
}

// Optional but recommended: build an in-memory index so the runtime objects
// you work with directly represent the many-to-many connectivity.
export interface GraphIndex {
	nodeById: Record<NodeId, StoryNode>;
	edgeById: Record<EdgeId, StoryEdge>;
	outgoingEdgeIdsByNodeId: Record<NodeId, EdgeId[]>;
	incomingEdgeIdsByNodeId: Record<NodeId, EdgeId[]>;
}

export function indexGraph(doc: GraphDocument): GraphIndex {
	const nodeById: Record<NodeId, StoryNode> = {};
	for (const node of doc.nodes) nodeById[node.id] = node;

	const edgeById: Record<EdgeId, StoryEdge> = {};
	const outgoingEdgeIdsByNodeId: Record<NodeId, EdgeId[]> = {};
	const incomingEdgeIdsByNodeId: Record<NodeId, EdgeId[]> = {};

	for (const edge of doc.edges) {
		edgeById[edge.id] = edge;
		(outgoingEdgeIdsByNodeId[edge.source] ??= []).push(edge.id);
		(incomingEdgeIdsByNodeId[edge.target] ??= []).push(edge.id);
	}

	// Ensure every node has arrays, even if empty (avoids undefined checks in UI).
	for (const node of doc.nodes) {
		outgoingEdgeIdsByNodeId[node.id] ??= [];
		incomingEdgeIdsByNodeId[node.id] ??= [];
	}

	return { nodeById, edgeById, outgoingEdgeIdsByNodeId, incomingEdgeIdsByNodeId };
}
```

### 2.3 Derived graph selectors (shared utils)

- [ ] `getOutgoingEdges(doc, nodeId)`
- [ ] `getIncomingEdges(doc, nodeId)`
- [ ] `indexGraph(doc)` (recommended for UI performance + simpler authoring logic)
- [ ] `computeTerminalNodes(doc)`
- [ ] `detectCycles(doc)` (for warnings)
- [ ] `enumeratePaths(doc, { maxDecisions })` (later: story export/analysis)

Deliverable: A small unit test set for these selectors (even 5–10 tests).

---

## Phase 3 — Import Pipeline (convert existing outputs to GraphDocument)()

We already have:
- `output/cot-story-graph.mmd` (Mermaid graph)
- `output/cot-pages-ocr-v2/*.txt` (page text)
- `output/cot-stories/manifest.json` (paths)

Add a TypeScript import script in `apps/web/scripts/` (or `packages/shared/scripts/`).

- [ ] Parse Mermaid edges (`P2 --> P3`) into nodes/edges
- [ ] Load page text files, map story page -> node body
- [ ] Initialize positions
	- [ ] Simple layered layout (dagre/elk) OR a deterministic grid
- [ ] Emit `graph.cot.json` into `apps/web/public/seed/`

Deliverable: `public/seed/graph.cot.json` loads without runtime errors.

---

## Phase 4 — Graph Viewer/Editor UI (React Flow)(This is mostly implemented there are some changes that could be made to imrpove the author UI)

### 4.1 App pages (Next.js)

- [ ] `/author` — full authoring mode
- [ ] `/read` — reader mode

### 4.2 State management

Implement a graph store with:
- current `GraphDocument`
- selected node/edge
- dirty flag + undo/redo (optional)

Selected: Redux Toolkit
- Slices (suggested)
	- `graphSlice`: current `GraphDocument`, selected node/edge, dirty flag
	- `authSlice`: user/session state (avoid storing raw JWT in Redux if using httpOnly cookies)
	- `uiSlice`: panels/modals, toolbar state
	- `prefsSlice`: local preferences (layout settings, last-opened graph)
- Persistence
	- persist `graphSlice` drafts + `prefsSlice` to localStorage

### 4.3 Components (authoring)

Build these components in order:

1) `GraphCanvas`
	 - Features
		 - pan/zoom
		 - drag nodes
		 - connect nodes to create edges
		 - click node/edge to select
		 - keyboard delete for selected
	 - Data
		 - converts `GraphDocument` <-> React Flow nodes/edges

2) `NodeCard` (custom React Flow node renderer)
	 - Features
		 - shows title + small excerpt
		 - styles terminal nodes differently
		 - styles start node differently
         - increases in size based on number of nodes pointing to it

3) `InspectorPanel`
	 - Features
		 - when a node selected: edit title/body/tags/isTerminal
		 - when an edge selected: edit `choiceText`, retarget edge (optional)
		 - shows derived info: incoming/outgoing counts, cycle warning

4) `Toolbar`
	 - Buttons
		 - New node
		 - Auto-layout
		 - Export JSON
		 - Import JSON
		 - Save (if server mode)
		 - AI: Suggest branches (later phase)

5) `ImportExportPanel`
	 - Features
		 - export downloads `graph.json`
		 - import loads from file picker

6) `LayoutButton`
	 - Features
		 - runs dagre/elk layout, updates node positions

Deliverable: You can create nodes, connect edges, edit node text, export/import.

---

## Phase 5 — Persistence (Hybrid: local autosave + server sync)(Seems to be working fairly well locally)

Selected approach: Hybrid (local-first autosave + server sync)

### 5.1 Local-first autosave (drafts + UI state)

- [ ] Autosave current `GraphDocument` to localStorage on change (debounced)
- [ ] “Reset to seed” button to reload `public/seed/graph.cot.json`
- [ ] Export/Import JSON remains supported (share + backup)

### 5.2 Server persistence (accounts + saved graphs + progress)

- [ ] Add Prisma + DB (Supabase Postgres for prod; local can use Supabase as well)
	- Tables (minimum)
		- User
		- Graph
		- Node
		- Edge
		- ReadingProgress (userId, graphId, currentNodeId, history, updatedAt)
		- GraphRevision (optional: versioning)
- [ ] API routes
	- Graph CRUD
		- `GET /api/graph/:id`
		- `PUT /api/graph/:id` (upsert nodes/edges)
		- `POST /api/graph` (create)
	- Progress
		- `GET /api/progress/:graphId`
		- `PUT /api/progress/:graphId`

### 5.3 Auth (JWT sessions)

- [ ] Auth endpoints
	- `POST /api/auth/register`
	- `POST /api/auth/login`
	- `POST /api/auth/logout`
	- `GET /api/auth/me`
- [ ] JWT storage (recommended)
	- use httpOnly cookie for session token
	- Redux stores only derived user state (id/email/displayName), not the raw token

Deliverable: edits persist across refresh and across devices (if deployed).

---

## Phase 6 — Reader Mode (consume the same graph)(partially finished could use some finishing touches for user experience)

- [ ] `/read` uses `startNodeId` (or user picks start)
- [ ] `ReaderView`
	- shows node body
	- renders choices from outgoing edges
	- clicking a choice navigates to target node
- [ ] `ReaderHistory`
	- breadcrumbs of visited nodes
	- restart button

Deliverable: someone can “play” the story in the browser.

---

## Phase 7 — AI Features (authoring assistant) Stretch Goal for now

Keep AI scoped to author help (not required for core functionality).

### 7.1 AI data contracts (shared) 

```ts
export interface SuggestBranchesRequest {
	nodeId: NodeId;
	nodeTitle: string;
	nodeBody: string;
	desiredBranchCount: number; // e.g. 2-4
	constraints?: string; // tone, setting, etc.
}

export interface SuggestedBranch {
	choiceText: string;
	targetTitle: string;
	targetBody: string;
}

export interface SuggestBranchesResponse {
	suggestions: SuggestedBranch[];
}
```

### 7.2 UI workflow

- [ ] In `InspectorPanel` for a node: “Suggest branches” button
- [ ] Modal/panel collects: count + constraints
- [ ] Results list with checkboxes:
	- Add as new nodes + edges
	- Or just insert edge stubs

### 7.3 Implementation 

- [ ] Server route `POST /api/ai/suggest-branches`
	- takes `SuggestBranchesRequest`
	- returns `SuggestBranchesResponse`
- [ ] Add rate limiting + basic input validation

Deliverable: one-click creation of 2–4 new branches.

---

## Phase 8 — Quality + Safety 

- [ ] Typecheck + lint passes
- [ ] Unit tests for graph selectors
- [ ] E2E smoke test (optional): create node → connect → export → import
- [ ] Content considerations
	- If deploying publicly, avoid publishing the original book text; use your own sample story or keep the imported content private.

---

## Phase 9 — Deploy
- [ ] Full-stack deploy (selected)
	- Vercel or Netlify
	- Configure DB + env vars
	- Add `README` deploy steps

---

## Acceptance Checklist (must-have features)

- [ ] Pan/zoom graph
- [ ] Click node/edge shows details
- [ ] Drag nodes
- [ ] Create node
- [ ] Create edge by connecting
- [ ] Edit node title/body/tags
- [ ] Edit edge choice text
- [ ] Persist (local autosave + server sync)
- [ ] Deployable demo

