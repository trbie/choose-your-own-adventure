import type { NodeId } from "@cyoa/shared";

const KEY = "cyoa:readerProgress:v1";

export type ReaderProgress = {
  currentNodeId: NodeId;
  history: NodeId[];
  cursorIndex?: number;
};

export function loadReaderProgress(): ReaderProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReaderProgress;
    if (!parsed || typeof parsed.currentNodeId !== "string" || !Array.isArray(parsed.history)) return null;
    const cursorIndex = typeof parsed.cursorIndex === "number" ? parsed.cursorIndex : undefined;
    return {
      currentNodeId: parsed.currentNodeId,
      history: parsed.history.filter((x): x is string => typeof x === "string"),
      cursorIndex,
    };
  } catch {
    return null;
  }
}

export function saveReaderProgress(progress: ReaderProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

export function clearReaderProgress(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
