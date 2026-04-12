import type { GraphDocument } from "@cyoa/shared";

const DRAFT_KEY = "cyoa:draftGraph:v1";
const SERVER_GRAPH_ID_KEY = "cyoa:serverGraphId:v1";

export function loadDraftGraph(): GraphDocument | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GraphDocument;
  } catch {
    return null;
  }
}

export function saveDraftGraph(doc: GraphDocument): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(doc));
  } catch {
    // ignore quota/serialization errors
  }
}

export function clearDraftGraph(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function loadServerGraphId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(SERVER_GRAPH_ID_KEY);
  } catch {
    return null;
  }
}

export function saveServerGraphId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SERVER_GRAPH_ID_KEY, id);
  } catch {
    // ignore
  }
}

export function clearServerGraphId(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SERVER_GRAPH_ID_KEY);
  } catch {
    // ignore
  }
}
