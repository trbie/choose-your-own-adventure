"use client";

import "reactflow/dist/style.css";

import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "reactflow";

import type { GraphIndex } from "@cyoa/shared";

import {
  addEdge,
  clearSelection,
  deleteEdge,
  deleteNode,
  selectEdge,
  selectNode,
  updateNode,
} from "@/features/graph/graphSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import NodeCard from "./NodeCard";

const nodeTypes = { storyNode: NodeCard };

type StoryNodeData = {
  title: string;
  isTerminal: boolean;
  incomingCount: number;
};

function toRfNodes(index: GraphIndex | null): Node<StoryNodeData>[] {
  if (!index) return [];
  return Object.values(index.nodeById).map((n) => ({
    id: n.id,
    type: "storyNode",
    position: n.position,
    data: {
      title: n.title,
      isTerminal: n.isTerminal,
      incomingCount: index.incomingEdgeIdsByNodeId[n.id]?.length ?? 0,
    },
  }));
}

function toRfEdges(index: GraphIndex | null): Edge[] {
  if (!index) return [];
  return Object.values(index.edgeById).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.choiceText || undefined,
  }));
}

export default function GraphCanvas({ index }: { index: GraphIndex | null }) {
  const dispatch = useAppDispatch();
  const selection = useAppSelector((s) => s.graph.selection);

  const nodes = useMemo(() => toRfNodes(index), [index]);
  const edges = useMemo(() => toRfEdges(index), [index]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          dispatch(updateNode({ id: change.id, changes: { position: change.position } }));
        }
        if (change.type === "remove") {
          dispatch(deleteNode({ id: change.id }));
        }
      }
    },
    [dispatch],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === "remove") {
          dispatch(deleteEdge({ id: change.id }));
        }
      }
    },
    [dispatch],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const edgeId = `e-${connection.source}-${connection.target}-${Date.now()}`;
      dispatch(
        addEdge({
          edge: {
            id: edgeId,
            source: connection.source,
            target: connection.target,
            choiceText: "",
          },
        }),
      );
    },
    [dispatch],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      const isTypingTarget =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el?.isContentEditable;
      if (isTypingTarget) return;

      if (selection.kind === "node") {
        dispatch(deleteNode({ id: selection.id }));
        e.preventDefault();
      } else if (selection.kind === "edge") {
        dispatch(deleteEdge({ id: selection.id }));
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, selection]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        deleteKeyCode={null}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, n) => dispatch(selectNode({ id: n.id }))}
        onEdgeClick={(_, e) => dispatch(selectEdge({ id: e.id }))}
        onPaneClick={() => dispatch(clearSelection())}
        fitView
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
