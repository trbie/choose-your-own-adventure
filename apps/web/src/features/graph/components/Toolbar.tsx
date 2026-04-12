"use client";

export default function Toolbar({
  onNewNode,
  onExport,
  onImport,
  onReset,
}: {
  onNewNode: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        padding: "10px 12px",
        borderBottom: "1px solid #e5e7eb",
        color: "#111827",
      }}
    >
      <div style={{ fontWeight: 600 }}>CYOA Author</div>
      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReset();
        }}
        style={{
          padding: "6px 10px",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          background: "white",
          color: "#111827",
          cursor: "pointer",
        }}
      >
        Reset
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onExport();
        }}
        style={{
          padding: "6px 10px",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          background: "white",
          color: "#111827",
          cursor: "pointer",
        }}
      >
        Export
      </button>

      <label
        style={{
          padding: "6px 10px",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          background: "white",
          color: "#111827",
          cursor: "pointer",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        Import
        <input
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
            e.currentTarget.value = "";
          }}
        />
      </label>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onNewNode();
        }}
        style={{
          padding: "6px 10px",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          background: "white",
          color: "#111827",
          cursor: "pointer",
        }}
      >
        New node
      </button>
    </div>
  );
}
