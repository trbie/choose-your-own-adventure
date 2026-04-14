# Remaining Work Plan (TypeScript-First)

Goal: ship a deployable web app where an author can build and manage branching story graphs, and readers can play the story.

---

## Phase 4 — Graph Viewer/Editor UI

### 4.2 State management

- [x] Add `authSlice` for user/session state (without storing raw JWT)
- [x] Add `uiSlice` for panels/modals/toolbar state
- [x] Add `prefsSlice` for local preferences (layout settings, last-opened graph)
- [x] Persist `graphSlice` drafts and `prefsSlice` to localStorage

### 4.3 Components (authoring)

2. `NodeCard`
   - [x] Show title + small excerpt

3. `InspectorPanel`
   - [x] Show cycle warning in derived info

4. `Toolbar`
   - [x] Add Auto-layout action
   - [x] Add Save action (server mode)
   - [x] Add AI: Suggest branches action (later phase)

5. `LayoutButton`
   - [x] Run dagre/elk layout and update node positions

---

## Phase 5 — Persistence

### 5.1 Local-first autosave

- [ ] Autosave current `GraphDocument` to localStorage on change (debounced)

### 5.2 Server persistence

- [ ] Add `GraphRevision` model/table (optional versioning)

---

## Phase 6 — Import/Export

- [ ] Add PDF import (using pre-existing python script)
- [ ] Add PDF export

---

## Phase 7 — AI Features (Stretch)

### 7.2 UI workflow

- [ ] Add “Suggest branches” button in `InspectorPanel`
- [ ] Add modal/panel to collect branch count + constraints
- [ ] Add results list with checkboxes to:
  - add as new nodes + edges, or
  - insert edge stubs only

### 7.3 Implementation

- [ ] Add `POST /api/ai/suggest-branches`
- [ ] Implement `SuggestBranchesRequest` -> `SuggestBranchesResponse`
- [ ] Add rate limiting + basic input validation

---

## Phase 8 — Quality + Safety

- [ ] Make `typecheck` and `lint` pass
- [ ] Add E2E smoke test: create node -> connect -> export -> import
- [ ] Add/confirm content policy for public deployment (avoid publishing original book text)

---

## Phase 9 — Deploy

- [ ] Full-stack deploy (Vercel or Netlify)
- [ ] Configure production DB + env vars
- [ ] Replace boilerplate deploy docs in README with actual project deployment steps

---

## Acceptance Checklist (Remaining)

- [ ] Persist (local autosave + server sync)
- [ ] Import/export (PDF)
- [ ] Deployable demo
