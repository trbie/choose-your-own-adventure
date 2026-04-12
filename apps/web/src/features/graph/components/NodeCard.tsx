"use client";

import { Handle, Position, type NodeProps } from "reactflow";

type Data = {
  title: string;
  isTerminal: boolean;
  incomingCount: number;
};

export default function NodeCard({ data, selected }: NodeProps<Data>) {

  const scale = Math.min(1.35, 1 + data.incomingCount * 0.03);

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "center",
        padding: 10,
        borderRadius: 10,
        border: selected ? "2px solid #2563eb" : "1px solid #cbd5e1",
        background: data.isTerminal ? "#fee2e2" : "#e2e8f0",
        color: "#0f172a",
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
      <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.2, marginBottom: 4 }}>{data.title}</div>
      <div style={{ fontSize: 11, opacity: 0.75 }}>
        {data.isTerminal ? "Terminal" : "Node"}{" • "}in: {data.incomingCount}
      </div>
    </div>
  );
}
