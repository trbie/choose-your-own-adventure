"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import dagre from "dagre";

import { indexGraph, type GraphDocument } from "@cyoa/shared";

import { clearDraftGraph } from "@/features/graph/graphPersistence";
import { addNode, selectNode, setGraph, updateNode } from "@/features/graph/graphSlice";
import { setInspectorWidth } from "@/features/prefs/prefsSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import GraphCanvas from "./GraphCanvas";
import InspectorPanel from "./InspectorPanel";
import Toolbar from "./Toolbar";

const LAYOUT_NODE_WIDTH = 220;
const LAYOUT_NODE_HEIGHT = 120;

function getAutoLayoutPositions(
  doc: GraphDocument,
  direction: "LR" | "TB",
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: direction,
    nodesep: 46,
    ranksep: 88,
    marginx: 20,
    marginy: 20,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of doc.nodes) {
    g.setNode(node.id, { width: LAYOUT_NODE_WIDTH, height: LAYOUT_NODE_HEIGHT });
  }

  for (const edge of doc.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of doc.nodes) {
    const layoutNode = g.node(node.id);
    if (!layoutNode) continue;
    positions[node.id] = {
      x: layoutNode.x - LAYOUT_NODE_WIDTH / 2,
      y: layoutNode.y - LAYOUT_NODE_HEIGHT / 2,
    };
  }

  return positions;
}

export default function AuthorShell() {
  const dispatch = useAppDispatch();
  const params = useParams<{ id?: string }>();
  const storyId = typeof params.id === "string" ? params.id : null;
  const enableServer = process.env.NEXT_PUBLIC_ENABLE_SERVER === "true";

  const doc = useAppSelector((s) => s.graph.doc);
  const inspectorWidth = useAppSelector((s) => s.prefs.author.inspectorWidth);
  const autoLayoutDirection = useAppSelector((s) => s.prefs.author.autoLayoutDirection);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveStateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStateRef = useRef<{ active: boolean; startX: number; startWidth: number }>({
    active: false,
    startX: 0,
    startWidth: 360,
  });

  const idx = useMemo(() => (doc ? indexGraph(doc) : null), [doc]);

  useEffect(() => {
    return () => {
      if (saveStateTimeoutRef.current) clearTimeout(saveStateTimeoutRef.current);
    };
  }, []);

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

  const handleAutoLayout = () => {
    if (!doc) return;

    const nextPositions = getAutoLayoutPositions(doc, autoLayoutDirection);
    for (const [id, position] of Object.entries(nextPositions)) {
      dispatch(updateNode({ id, changes: { position } }));
    }
  };

  const handleSave = async () => {
    if (!doc || !storyId || !enableServer) {
      window.alert("Server save is only available in server mode on /author/[id].");
      return;
    }

    setSaveState("saving");
    try {
      const res = await fetch(`/api/graph/${storyId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(doc),
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Save failed");
      }

      setSaveState("saved");
      if (saveStateTimeoutRef.current) clearTimeout(saveStateTimeoutRef.current);
      saveStateTimeoutRef.current = setTimeout(() => setSaveState("idle"), 1300);
    } catch (err) {
      console.error(err);
      setSaveState("error");
      window.alert("Save failed. Please make sure you are signed in and still own this story.");
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current.active) return;
      const deltaX = e.clientX - dragStateRef.current.startX;
      const next = Math.max(260, Math.min(760, dragStateRef.current.startWidth - deltaX));
      dispatch(setInspectorWidth(next));
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
  }, [dispatch]);

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
        onAutoLayout={handleAutoLayout}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
        onSave={handleSave}
        saveState={saveState}
        showServerSaveAction={enableServer && Boolean(storyId)}
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
