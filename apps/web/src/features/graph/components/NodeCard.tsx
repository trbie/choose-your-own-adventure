"use client";

import { Handle, Position, type NodeProps } from "reactflow";

type Data = {
  title: string;
  incomingCount: number;
  outgoingCount: number;
  isStartingNode: boolean;
  isEndingNode: boolean;
  isUnreachable: boolean;
  isCascadeUnreachable: boolean;
};

export default function NodeCard({ data, selected }: NodeProps<Data>) {
  const scale = Math.min(1.35, 1 + data.incomingCount * 0.03);

  // Color precedence:
  // unreachable -> start (incoming=0, outgoing>0) -> end (outgoing=0, incoming>0) -> default.
  let background = "#ffffff";
  let border = selected ? "2px solid #2563eb" : "1px solid #cbd5e1";
  if (data.isUnreachable) {
    background = "#fecaca";
    border = selected ? "2px solid #b91c1c" : "1px solid #ef4444";
  } else if (data.isStartingNode) {
    background = "#bbf7d0";
    border = selected ? "2px solid #15803d" : "1px solid #22c55e";
  } else if (data.isEndingNode) {
    background = "#bfdbfe";
    border = selected ? "2px solid #1d4ed8" : "1px solid #3b82f6";
  }

  let status = "Node";
  if (data.isUnreachable)
    status = data.isCascadeUnreachable ? "Unreachable (child)" : "Unreachable";
  else if (data.isStartingNode) status = "Start";
  else if (data.isEndingNode) status = "End";

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "center",
        padding: 10,
        borderRadius: 10,
        border,
        background,
        color: "#0f172a",
        opacity: data.isCascadeUnreachable ? 0.58 : 1,
        minWidth: 120,
        maxWidth: 220,
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ width: 10, height: 10, background: "#64748b", border: "1px solid #334155" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ width: 10, height: 10, background: "#64748b", border: "1px solid #334155" }}
      />
      <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2, marginBottom: 4 }}>
        {data.title}
      </div>
      <div style={{ fontSize: 11, opacity: 0.75 }}>
        {status}
        {" • "}in: {data.incomingCount}
        {" • "}out: {data.outgoingCount}
      </div>
    </div>
  );
}
