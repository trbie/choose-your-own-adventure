"use client";

import { useEffect, useMemo, useState } from "react";

import type { GraphIndex } from "@cyoa/shared";

import { updateEdge, updateGraphMeta, updateNode } from "@/features/graph/graphSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import styles from "./InspectorPanel.module.css";

export default function InspectorPanel({
  index,
  width,
}: {
  index: GraphIndex | null;
  width?: number;
}) {
  const dispatch = useAppDispatch();
  const doc = useAppSelector((s) => s.graph.doc);
  const selection = useAppSelector((s) => s.graph.selection);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const meta = doc?.meta ?? null;

  useEffect(() => {
    if (!settingsOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen]);

  const selectedNode = useMemo(() => {
    if (!index || selection.kind !== "node") return null;
    return index.nodeById[selection.id] ?? null;
  }, [index, selection]);

  const selectedEdge = useMemo(() => {
    if (!index || selection.kind !== "edge") return null;
    return index.edgeById[selection.id] ?? null;
  }, [index, selection]);

  const bodyStats = useMemo(() => {
    const body = selectedNode?.body ?? "";
    const chars = body.length;
    const words = body.trim().length ? body.trim().split(/\s+/).length : 0;
    return { chars, words };
  }, [selectedNode?.body]);

  return (
    <aside className={styles.panel} style={{ width }}>
      <div className={styles.title}>Inspector</div>

      {!index && <div className={styles.hint}>Loading graph…</div>}

      {meta && (
        <div className={styles.storySection}>
          <button
            type="button"
            className={styles.settingsButton}
            onClick={() => setSettingsOpen(true)}
            aria-expanded={settingsOpen}
          >
            Story settings
          </button>
        </div>
      )}

      {meta && settingsOpen ? (
        <div className={styles.modalBackdrop} onClick={() => setSettingsOpen(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label="Story settings"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Story settings</div>
              <button
                type="button"
                className={styles.modalCloseButton}
                onClick={() => setSettingsOpen(false)}
              >
                Close
              </button>
            </div>

            <div className={styles.stack}>
              <label className={styles.field}>
                <div className={styles.label}>Title</div>
                <input
                  value={meta.title}
                  onChange={(e) =>
                    dispatch(updateGraphMeta({ changes: { title: e.target.value } }))
                  }
                  className={styles.input}
                  placeholder="Story title"
                />
              </label>

              <label className={styles.field}>
                <div className={styles.label}>Description</div>
                <textarea
                  value={meta.description ?? ""}
                  onChange={(e) =>
                    dispatch(updateGraphMeta({ changes: { description: e.target.value || null } }))
                  }
                  rows={5}
                  className={`${styles.textarea} ${styles.metaTextarea}`}
                  placeholder="Short summary shown in the story browser"
                />
              </label>
            </div>
          </div>
        </div>
      ) : null}

      {index && selection.kind === "none" && (
        <div className={styles.hint}>Select a node or edge to edit.</div>
      )}

      {selectedNode && (
        <div className={styles.stack}>
          <div className={styles.meta}>Node: {selectedNode.id}</div>

          <label className={styles.field}>
            <div className={styles.label}>Title</div>
            <input
              value={selectedNode.title}
              onChange={(e) =>
                dispatch(updateNode({ id: selectedNode.id, changes: { title: e.target.value } }))
              }
              className={styles.input}
            />
          </label>

          <label className={styles.field}>
            <div className={styles.label}>Body</div>
            <textarea
              value={selectedNode.body}
              onChange={(e) =>
                dispatch(updateNode({ id: selectedNode.id, changes: { body: e.target.value } }))
              }
              rows={12}
              className={styles.textarea}
              placeholder="Write this page section here..."
            />
            <div className={styles.metrics}>
              <span>{bodyStats.words} words</span>
              <span>{bodyStats.chars} chars</span>
            </div>
          </label>

          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={selectedNode.isTerminal}
              onChange={(e) =>
                dispatch(
                  updateNode({ id: selectedNode.id, changes: { isTerminal: e.target.checked } }),
                )
              }
            />
            <span className={styles.label}>Terminal</span>
          </label>

          <label className={styles.field}>
            <div className={styles.label}>Tags (comma-separated)</div>
            <input
              value={selectedNode.tags.join(", ")}
              onChange={(e) =>
                dispatch(
                  updateNode({
                    id: selectedNode.id,
                    changes: {
                      tags: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  }),
                )
              }
              className={styles.input}
            />
          </label>

          <div className={styles.sectionCard}>
            <div className={styles.metrics}>
              <span>Incoming edges</span>
              <span>{index?.incomingEdgeIdsByNodeId[selectedNode.id]?.length ?? 0}</span>
            </div>
            <div className={styles.metrics}>
              <span>Outgoing edges</span>
              <span>{index?.outgoingEdgeIdsByNodeId[selectedNode.id]?.length ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {selectedEdge && (
        <div className={styles.stack}>
          <div className={styles.meta}>Edge: {selectedEdge.id}</div>
          <div className={styles.hint}>
            {selectedEdge.source} → {selectedEdge.target}
          </div>

          <label className={styles.field}>
            <div className={styles.label}>Choice text</div>
            <input
              value={selectedEdge.choiceText}
              onChange={(e) =>
                dispatch(
                  updateEdge({ id: selectedEdge.id, changes: { choiceText: e.target.value } }),
                )
              }
              className={styles.input}
            />
          </label>
        </div>
      )}
    </aside>
  );
}
