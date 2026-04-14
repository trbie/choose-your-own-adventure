"use client";

import { LayoutPanelLeft } from "lucide-react";

const buttonStyle = {
  height: 36,
  padding: "0 12px",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-sm)",
  background: "var(--surface-raised)",
  color: "var(--text-strong)",
  cursor: "pointer",
  fontWeight: 600,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  lineHeight: 1,
};

export default function LayoutButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ ...buttonStyle, opacity: disabled ? 0.55 : 1 }}
      title="Auto-layout nodes"
    >
      <LayoutPanelLeft size={15} />
      Auto-layout
    </button>
  );
}
