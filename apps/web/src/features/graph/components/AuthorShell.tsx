"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { indexGraph } from "@cyoa/shared";

import { clearDraftGraph } from "@/features/graph/graphPersistence";
import { addNode, selectNode, setGraph } from "@/features/graph/graphSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import GraphCanvas from "./GraphCanvas";
import InspectorPanel from "./InspectorPanel";
import Toolbar from "./Toolbar";

export default function AuthorShell() {
  const dispatch = useAppDispatch();
  const doc = useAppSelector((s) => s.graph.doc);
  const [inspectorWidth, setInspectorWidth] = useState(360);
  const dragStateRef = useRef<{ active: boolean; startX: number; startWidth: number }>({
    active: false,
    startX: 0,
    startWidth: 360,
  });

  const idx = useMemo(() => (doc ? indexGraph(doc) : null), [doc]);

  const handleNewNode = () => {
    if (!doc) return;

    const id = `n-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
    dispatch(
      addNode({
        node: {
          id,
          type: "page",
          title: "New node",
          body: "",
          tags: [],
          isTerminal: true,
          position: { x: 40, y: 40 },
        },
      }),
    );
  };

  const handleExport = () => {
    if (!doc) return;
    const json = JSON.stringify(doc, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    const safeTitle = (doc.meta.title || "graph")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    a.download = `${safeTitle || "graph"}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      dispatch(setGraph(parsed));
    } catch (err) {
      console.error(err);
      window.alert("Import failed: invalid JSON graph file.");
    }
  };

  const handleReset = async () => {
    try {
      clearDraftGraph();
      const res = await fetch("/seed/graph.cot.json", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load seed graph");
      const seed = await res.json();
      dispatch(setGraph(seed));
    } catch (err) {
      console.error(err);
      window.alert("Reset failed: could not load seed graph.");
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.active) return;
      const deltaX = e.clientX - dragStateRef.current.startX;
      const next = Math.max(260, Math.min(760, dragStateRef.current.startWidth - deltaX));
      setInspectorWidth(next);
    };

    const onMouseUp = () => {
      if (!dragStateRef.current.active) return;
      dragStateRef.current.active = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startWidth: inspectorWidth,
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
        background: "var(--surface-base)",
      }}
    >
      <Toolbar
        index={idx}
        onSelectNode={(id) => dispatch(selectNode({ id }))}
        onNewNode={handleNewNode}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
      />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GraphCanvas index={idx} startNodeId={doc?.meta.startNodeId} />
        </div>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize inspector"
          onMouseDown={startResize}
          style={{
            width: 10,
            cursor: "col-resize",
            display: "grid",
            placeItems: "center",
            background: "transparent",
          }}
        >
          <div
            style={{
              width: 2,
              height: "100%",
              background: "color-mix(in srgb, var(--border-subtle) 90%, transparent)",
              borderRadius: 999,
            }}
          />
        </div>
        <InspectorPanel index={idx} width={inspectorWidth} />
      </div>
    </div>
  );
}
