"use client";

import { useMemo } from "react";

import { indexGraph } from "@cyoa/shared";

import { addNode, setGraph } from "@/features/graph/graphSlice";
import { clearDraftGraph } from "@/features/graph/graphPersistence";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import GraphCanvas from "./GraphCanvas";
import InspectorPanel from "./InspectorPanel";
import Toolbar from "./Toolbar";

export default function AuthorShell() {
  const dispatch = useAppDispatch();
  const doc = useAppSelector((s) => s.graph.doc);

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
    const safeTitle = (doc.meta.title || "graph").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Toolbar
        onNewNode={handleNewNode}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
      />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <GraphCanvas index={idx} />
        </div>
        <InspectorPanel index={idx} />
      </div>
    </div>
  );
}
