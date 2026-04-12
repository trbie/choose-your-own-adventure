import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { GraphDocument, StoryEdge, StoryNode } from "@cyoa/shared";

export type Selection =
  | { kind: "none" }
  | { kind: "node"; id: string }
  | { kind: "edge"; id: string };

export interface GraphState {
  doc: GraphDocument | null;
  selection: Selection;
}

const initialState: GraphState = {
  doc: null,
  selection: { kind: "none" },
};

function touch(doc: GraphDocument): void {
  doc.meta.updatedAt = new Date().toISOString();
}

export const graphSlice = createSlice({
  name: "graph",
  initialState,
  reducers: {
    setGraph(state, action: PayloadAction<GraphDocument>) {
      state.doc = action.payload;
      state.selection = { kind: "none" };
    },

    selectNode(state, action: PayloadAction<{ id: string }>) {
      state.selection = { kind: "node", id: action.payload.id };
    },

    selectEdge(state, action: PayloadAction<{ id: string }>) {
      state.selection = { kind: "edge", id: action.payload.id };
    },

    clearSelection(state) {
      state.selection = { kind: "none" };
    },

    addNode(state, action: PayloadAction<{ node: StoryNode }>) {
      if (!state.doc) return;
      state.doc.nodes.push(action.payload.node);
      touch(state.doc);
    },

    updateNode(state, action: PayloadAction<{ id: string; changes: Partial<StoryNode> }>) {
      if (!state.doc) return;
      const node = state.doc.nodes.find((n) => n.id === action.payload.id);
      if (!node) return;
      Object.assign(node, action.payload.changes);
      touch(state.doc);
    },

    deleteNode(state, action: PayloadAction<{ id: string }>) {
      if (!state.doc) return;
      const id = action.payload.id;
      state.doc.nodes = state.doc.nodes.filter((n) => n.id !== id);
      state.doc.edges = state.doc.edges.filter((e) => e.source !== id && e.target !== id);
      if (state.selection.kind !== "none" && state.selection.id === id) state.selection = { kind: "none" };
      touch(state.doc);
    },

    addEdge(state, action: PayloadAction<{ edge: StoryEdge }>) {
      if (!state.doc) return;
      state.doc.edges.push(action.payload.edge);
      touch(state.doc);
    },

    updateEdge(state, action: PayloadAction<{ id: string; changes: Partial<StoryEdge> }>) {
      if (!state.doc) return;
      const edge = state.doc.edges.find((e) => e.id === action.payload.id);
      if (!edge) return;
      Object.assign(edge, action.payload.changes);
      touch(state.doc);
    },

    deleteEdge(state, action: PayloadAction<{ id: string }>) {
      if (!state.doc) return;
      const id = action.payload.id;
      state.doc.edges = state.doc.edges.filter((e) => e.id !== id);
      if (state.selection.kind !== "none" && state.selection.id === id) state.selection = { kind: "none" };
      touch(state.doc);
    },
  },
});

export const {
  setGraph,
  selectNode,
  selectEdge,
  clearSelection,
  addNode,
  updateNode,
  deleteNode,
  addEdge,
  updateEdge,
  deleteEdge,
} = graphSlice.actions;

export const graphReducer = graphSlice.reducer;
