"use client";

import { useEffect, useMemo, useState } from "react";

import type { GraphDocument, GraphIndex, NodeId, StoryEdge } from "@cyoa/shared";
import { indexGraph } from "@cyoa/shared";

import { clearReaderProgress, loadReaderProgress, saveReaderProgress } from "@/features/reader/readerPersistence";

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
    [
      `Page ${pageLabel}`,
      `Page # ${pageLabel}`,
      `PAGE ${pageLabel}`,
      `PAGE # ${pageLabel}`,
    ].map((s) => s.trim().toLowerCase()),
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
        typeof saved.cursorIndex === "number" && saved.cursorIndex >= 0 && saved.cursorIndex < history.length
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
        setProgress((p) => ({ ...p, cursorIndex: Math.min(p.cursorIndex + 1, p.history.length - 1) }));
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
    return <div style={{ padding: 24 }}>No nodes available.</div>;
  }

  if (!node) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ marginBottom: 12 }}>Current node missing.</div>
        <button
          type="button"
          onClick={restart}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "white",
            color: "#111827",
            cursor: "pointer",
          }}
        >
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
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>Page {pageLabel}</div>
            {showTitle ? (
              <div style={{ fontSize: 14, opacity: 0.8, marginTop: 4 }}>{node.title}</div>
            ) : null}
          </div>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={restart}
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#111827",
              cursor: "pointer",
            }}
          >
            Restart
          </button>
        </div>

        <div
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.6,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "white",
            color: "#111827",
            marginBottom: 16,
          }}
        >
          {node.body ? stripLeadingOcrPageHeader(node.body, pageLabel) : "(No text)"}
        </div>

        <div style={{ fontWeight: 700, marginBottom: 8 }}>Choices</div>
        {choices.length === 0 ? (
          <div style={{ opacity: 0.8 }}>The story ends here.</div>
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
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    background: "white",
                    color: "#111827",
                    fontWeight: 700,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.6 : 1,
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
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
          background: "white",
          color: "#111827",
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 8 }}>History</div>
        {history.length <= 1 ? (
          <div style={{ opacity: 0.8 }}>No choices made yet.</div>
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
                      color: "#111827",
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
              borderRadius: 12,
              background: "white",
              border: "1px solid #e5e7eb",
              padding: 16,
              color: "#111827",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Change your mind?</div>
            <div style={{ opacity: 0.85, lineHeight: 1.5, marginBottom: 14 }}>
              You’re viewing a previous point in the story. If you pick a new choice here, it will erase the
              decisions you made after this point.
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setPendingChoice(null)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#111827",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTruncateAndChoose}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  background: "white",
                  color: "#111827",
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
