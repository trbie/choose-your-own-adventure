"use client";

import { useMemo } from "react";

import type { GraphIndex } from "@cyoa/shared";

import { updateEdge, updateNode } from "@/features/graph/graphSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function InspectorPanel({ index }: { index: GraphIndex | null }) {
  const dispatch = useAppDispatch();
  const selection = useAppSelector((s) => s.graph.selection);

  const selectedNode = useMemo(() => {
    if (!index || selection.kind !== "node") return null;
    return index.nodeById[selection.id] ?? null;
  }, [index, selection]);

  const selectedEdge = useMemo(() => {
    if (!index || selection.kind !== "edge") return null;
    return index.edgeById[selection.id] ?? null;
  }, [index, selection]);

  return (
    <aside
      style={{
        width: 360,
        borderLeft: "1px solid #e5e7eb",
        padding: 12,
        overflow: "auto",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Inspector</div>

      {!index && <div style={{ opacity: 0.7 }}>Loading graph…</div>}

      {index && selection.kind === "none" && (
        <div style={{ opacity: 0.7 }}>Select a node or edge to edit.</div>
      )}

      {selectedNode && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Node: {selectedNode.id}</div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Title</div>
            <input
              value={selectedNode.title}
              onChange={(e) =>
                dispatch(updateNode({ id: selectedNode.id, changes: { title: e.target.value } }))
              }
              style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Body</div>
            <textarea
              value={selectedNode.body}
              onChange={(e) =>
                dispatch(updateNode({ id: selectedNode.id, changes: { body: e.target.value } }))
              }
              rows={10}
              style={{
                padding: 8,
                border: "1px solid #d1d5db",
                borderRadius: 6,
                resize: "vertical",
              }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={selectedNode.isTerminal}
              onChange={(e) =>
                dispatch(updateNode({ id: selectedNode.id, changes: { isTerminal: e.target.checked } }))
              }
            />
            <span style={{ fontSize: 12, fontWeight: 600 }}>Terminal</span>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Tags (comma-separated)</div>
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
              style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
            />
          </label>

          <div style={{ fontSize: 12, opacity: 0.75 }}>
            Incoming edges: {index?.incomingEdgeIdsByNodeId[selectedNode.id]?.length ?? 0}
            <br />
            Outgoing edges: {index?.outgoingEdgeIdsByNodeId[selectedNode.id]?.length ?? 0}
          </div>
        </div>
      )}

      {selectedEdge && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Edge: {selectedEdge.id}</div>
          <div style={{ fontSize: 12 }}>
            {selectedEdge.source} → {selectedEdge.target}
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Choice text</div>
            <input
              value={selectedEdge.choiceText}
              onChange={(e) =>
                dispatch(updateEdge({ id: selectedEdge.id, changes: { choiceText: e.target.value } }))
              }
              style={{ padding: 8, border: "1px solid #d1d5db", borderRadius: 6 }}
            />
          </label>
        </div>
      )}
    </aside>
  );
}
