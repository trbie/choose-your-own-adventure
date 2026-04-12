"use client";

import { useEffect, useMemo, useState } from "react";

import type { GraphDocument, GraphIndex, NodeId, StoryEdge } from "@cyoa/shared";
import { indexGraph } from "@cyoa/shared";

import {
  clearReaderProgress,
  loadReaderProgress,
  saveReaderProgress,
} from "@/features/reader/readerPersistence";

const softButtonStyle = {
  padding: "8px 11px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border-subtle)",
  background: "var(--surface-raised)",
  color: "var(--text-strong)",
  cursor: "pointer",
};

const READER_PREFS_KEY = "cyoa_reader_prefs_v1";
const READER_SETTINGS_OPEN_KEY = "cyoa_reader_settings_open_v1";

type ReaderPrefs = {
  fontSizePx: number;
  fontFamily: string;
  storyBackground: string;
  storyText: string;
  choiceBackground: string;
  choiceText: string;
};

const DEFAULT_PREFS: ReaderPrefs = {
  fontSizePx: 18,
  fontFamily: "Georgia, 'Times New Roman', serif",
  storyBackground: "#ffffff",
  storyText: "#111827",
  choiceBackground: "#ffffff",
  choiceText: "#111827",
};

function loadReaderPrefs(): ReaderPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(READER_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<ReaderPrefs>;
    return {
      fontSizePx: Math.max(14, Math.min(30, parsed.fontSizePx ?? DEFAULT_PREFS.fontSizePx)),
      fontFamily: parsed.fontFamily ?? DEFAULT_PREFS.fontFamily,
      storyBackground: parsed.storyBackground ?? DEFAULT_PREFS.storyBackground,
      storyText: parsed.storyText ?? DEFAULT_PREFS.storyText,
      choiceBackground: parsed.choiceBackground ?? DEFAULT_PREFS.choiceBackground,
      choiceText: parsed.choiceText ?? DEFAULT_PREFS.choiceText,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function loadReaderSettingsOpen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(READER_SETTINGS_OPEN_KEY) === "1";
  } catch {
    return false;
  }
}

function pickStartNodeId(doc: GraphDocument, idx: GraphIndex): NodeId | null {
  if (doc.meta.startNodeId && idx.nodeById[doc.meta.startNodeId]) return doc.meta.startNodeId;
  if (doc.nodes.length > 0) return doc.nodes[0].id;
  return null;
}

function outgoingEdges(idx: GraphIndex, nodeId: NodeId): StoryEdge[] {
  return (idx.outgoingEdgeIdsByNodeId[nodeId] ?? [])
    .map((edgeId) => idx.edgeById[edgeId])
    .filter((e): e is StoryEdge => Boolean(e));
}

function stripLeadingOcrPageHeader(body: string, pageLabel: string): string {
  const variants = new Set(
    [`Page ${pageLabel}`, `Page # ${pageLabel}`, `PAGE ${pageLabel}`, `PAGE # ${pageLabel}`].map(
      (s) => s.trim().toLowerCase(),
    ),
  );

  const lines = body.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const t = lines[i]?.trim().toLowerCase() ?? "";
    if (t.length === 0) {
      i += 1;
      continue;
    }
    if (variants.has(t)) {
      i += 1;
      continue;
    }
    break;
  }

  const stripped = lines.slice(i).join("\n");
  return stripped.trim().length ? stripped : body;
}

export default function ReaderView({ doc }: { doc: GraphDocument }) {
  const idx = useMemo(() => indexGraph(doc), [doc]);
  const startNodeId = useMemo(() => pickStartNodeId(doc, idx), [doc, idx]);
  const [prefs, setPrefs] = useState<ReaderPrefs>(() => loadReaderPrefs());
  const [settingsOpen, setSettingsOpen] = useState<boolean>(() => loadReaderSettingsOpen());

  const [progress, setProgress] = useState<{
    history: NodeId[];
    cursorIndex: number;
  }>(() => {
    if (!startNodeId) return { history: [], cursorIndex: 0 };

    const saved = loadReaderProgress();
    if (saved && idx.nodeById[saved.currentNodeId]) {
      const filtered = saved.history.filter((id) => idx.nodeById[id]);
      const history = filtered.length ? filtered : [saved.currentNodeId];

      const cursorIndex =
        typeof saved.cursorIndex === "number" &&
        saved.cursorIndex >= 0 &&
        saved.cursorIndex < history.length
          ? saved.cursorIndex
          : Math.max(0, history.lastIndexOf(saved.currentNodeId));

      return { history, cursorIndex };
    }

    return { history: [startNodeId], cursorIndex: 0 };
  });

  const history = progress.history;
  const cursorIndex = progress.cursorIndex;
  const currentNodeId = history[cursorIndex] ?? null;

  const [pendingChoice, setPendingChoice] = useState<null | { targetId: NodeId }>(null);

  // Persist progress.
  useEffect(() => {
    if (!currentNodeId) return;
    saveReaderProgress({ currentNodeId, history, cursorIndex });
  }, [currentNodeId, history, cursorIndex]);

  useEffect(() => {
    try {
      window.localStorage.setItem(READER_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // ignore storage failures
    }
  }, [prefs]);

  useEffect(() => {
    try {
      window.localStorage.setItem(READER_SETTINGS_OPEN_KEY, settingsOpen ? "1" : "0");
    } catch {
      // ignore storage failures
    }
  }, [settingsOpen]);

  const node = currentNodeId ? idx.nodeById[currentNodeId] : null;
  const choices = currentNodeId ? outgoingEdges(idx, currentNodeId) : [];

  const pageLabel = node ? String(node.pageNumber ?? node.id) : "";
  const showTitle =
    node?.title &&
    node.title.trim().length > 0 &&
    node.title.trim().toLowerCase() !== `page ${pageLabel}`.toLowerCase() &&
    node.title.trim().toLowerCase() !== `page # ${pageLabel}`.toLowerCase();

  const restart = () => {
    clearReaderProgress();
    setProgress({
      history: startNodeId ? [startNodeId] : [],
      cursorIndex: 0,
    });
  };

  const jumpToHistoryIndex = (i: number) => {
    if (i < 0 || i >= history.length) return;
    setPendingChoice(null);
    setProgress((p) => ({ ...p, cursorIndex: i }));
  };

  const chooseTarget = (targetId: NodeId) => {
    const isRevisitingPast = cursorIndex < history.length - 1;
    if (isRevisitingPast) {
      // If the user is looking at a previous point in history but picks the *same* next
      // page they originally picked, just move the cursor forward (no truncation).
      const nextFromHere = history[cursorIndex + 1] ?? null;
      if (nextFromHere === targetId) {
        setPendingChoice(null);
        setProgress((p) => ({
          ...p,
          cursorIndex: Math.min(p.cursorIndex + 1, p.history.length - 1),
        }));
        return;
      }

      setPendingChoice({ targetId });
      return;
    }

    setProgress((p) => ({
      history: [...p.history, targetId],
      cursorIndex: p.history.length,
    }));
  };

  const confirmTruncateAndChoose = () => {
    if (!pendingChoice) return;
    const targetId = pendingChoice.targetId;
    setPendingChoice(null);

    setProgress((p) => {
      const truncated = p.history.slice(0, p.cursorIndex + 1);
      const nextHistory = [...truncated, targetId];
      return { history: nextHistory, cursorIndex: nextHistory.length - 1 };
    });
  };

  if (!startNodeId) {
    return <div style={{ padding: 24, color: "var(--text-muted)" }}>No nodes available.</div>;
  }

  if (!node) {
    return (
      <div style={{ padding: 24, color: "var(--text-strong)" }}>
        <div style={{ marginBottom: 12 }}>Current node missing.</div>
        <button type="button" onClick={restart} style={softButtonStyle}>
          Restart
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 16,
        padding: 24,
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                lineHeight: 1.2,
                color: "var(--text-strong)",
              }}
            >
              Page {pageLabel}
            </div>
            {showTitle ? (
              <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
                {node.title}
              </div>
            ) : null}
          </div>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={restart} style={softButtonStyle}>
            Restart
          </button>
        </div>

        <div
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: 18,
            background: prefs.storyBackground,
            color: prefs.storyText,
            marginBottom: 16,
            boxShadow: "var(--shadow-soft)",
            fontFamily: prefs.fontFamily,
            fontSize: `${prefs.fontSizePx}px`,
          }}
        >
          {node.body ? stripLeadingOcrPageHeader(node.body, pageLabel) : "(No text)"}
        </div>

        <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--text-strong)" }}>Choices</div>
        {choices.length === 0 ? (
          <div style={{ color: "var(--text-muted)" }}>The story ends here.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {choices.map((e) => {
              const target = idx.nodeById[e.target];
              const label = e.choiceText?.trim()
                ? e.choiceText.trim()
                : target?.pageNumber
                  ? `Go to page ${target.pageNumber}`
                  : `Go to ${target?.title || e.target}`;
              const disabled = !target;
              return (
                <button
                  key={e.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    chooseTarget(e.target);
                  }}
                  style={{
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    background: prefs.choiceBackground,
                    color: prefs.choiceText,
                    fontWeight: 700,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.6 : 1,
                    fontFamily: prefs.fontFamily,
                    fontSize: `${Math.max(13, prefs.fontSizePx - 2)}px`,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: 16,
          background: "var(--surface-raised)",
          color: "var(--text-strong)",
          minHeight: 0,
          overflow: "auto",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          style={{ ...softButtonStyle, width: "100%", marginBottom: settingsOpen ? 10 : 14 }}
        >
          {settingsOpen ? "Hide Reader Settings" : "Show Reader Settings"}
        </button>

        {settingsOpen ? (
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Font family</span>
              <select
                value={prefs.fontFamily}
                onChange={(e) => setPrefs((p) => ({ ...p, fontFamily: e.target.value }))}
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  background: "var(--surface-raised)",
                  color: "var(--text-strong)",
                }}
              >
                <option value="Georgia, 'Times New Roman', serif">Serif (Georgia)</option>
                <option value="'Segoe UI', Arial, sans-serif">Sans (Segoe UI)</option>
                <option value="'Trebuchet MS', 'Segoe UI', sans-serif">Humanist Sans</option>
                <option value="'Courier New', Consolas, monospace">Monospace</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Font size: {prefs.fontSizePx}px
              </span>
              <input
                type="range"
                min={14}
                max={30}
                value={prefs.fontSizePx}
                onChange={(e) => setPrefs((p) => ({ ...p, fontSizePx: Number(e.target.value) }))}
              />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Story BG</span>
                <input
                  type="color"
                  value={prefs.storyBackground}
                  onChange={(e) => setPrefs((p) => ({ ...p, storyBackground: e.target.value }))}
                  style={{ width: "100%", height: 34, border: "none", background: "transparent" }}
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Story Text</span>
                <input
                  type="color"
                  value={prefs.storyText}
                  onChange={(e) => setPrefs((p) => ({ ...p, storyText: e.target.value }))}
                  style={{ width: "100%", height: 34, border: "none", background: "transparent" }}
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Choice BG</span>
                <input
                  type="color"
                  value={prefs.choiceBackground}
                  onChange={(e) => setPrefs((p) => ({ ...p, choiceBackground: e.target.value }))}
                  style={{ width: "100%", height: 34, border: "none", background: "transparent" }}
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Choice Text</span>
                <input
                  type="color"
                  value={prefs.choiceText}
                  onChange={(e) => setPrefs((p) => ({ ...p, choiceText: e.target.value }))}
                  style={{ width: "100%", height: 34, border: "none", background: "transparent" }}
                />
              </label>
            </div>

            <button type="button" onClick={() => setPrefs(DEFAULT_PREFS)} style={softButtonStyle}>
              Reset Reader Settings
            </button>
          </div>
        ) : null}

        <div style={{ fontWeight: 700, marginBottom: 8 }}>History</div>
        {history.length <= 1 ? (
          <div style={{ color: "var(--text-muted)" }}>No choices made yet.</div>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
            {history.map((id, i) => {
              const n = idx.nodeById[id];
              const isCurrent = i === cursorIndex;
              return (
                <li key={`${id}-${i}`} style={{ opacity: i === history.length - 1 ? 1 : 0.8 }}>
                  <button
                    type="button"
                    onClick={() => jumpToHistoryIndex(i)}
                    style={{
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      color: "var(--text-strong)",
                      cursor: "pointer",
                      textAlign: "left",
                      fontWeight: isCurrent ? 700 : 500,
                      textDecoration: "underline",
                    }}
                  >
                    {n?.title || id}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {pendingChoice ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "grid",
            placeItems: "center",
            padding: 16,
            zIndex: 50,
          }}
          onClick={() => setPendingChoice(null)}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-raised)",
              border: "1px solid var(--border-subtle)",
              padding: 16,
              color: "var(--text-strong)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Change your mind?</div>
            <div style={{ opacity: 0.85, lineHeight: 1.5, marginBottom: 14 }}>
              You’re viewing a previous point in the story. If you pick a new choice here, it will
              erase the decisions you made after this point.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setPendingChoice(null)} style={softButtonStyle}>
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTruncateAndChoose}
                style={{
                  ...softButtonStyle,
                  background: "var(--danger-soft)",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Yes, erase future
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
