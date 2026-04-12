"use client";

import "reactflow/dist/style.css";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import ReactFlow, {
  Background,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnConnectStartParams,
  type ReactFlowInstance,
} from "reactflow";

import type { GraphIndex } from "@cyoa/shared";

import {
  addEdge,
  addNode,
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
  incomingCount: number;
  outgoingCount: number;
  isStartingNode: boolean;
  isEndingNode: boolean;
  isUnreachable: boolean;
  isCascadeUnreachable: boolean;
};

function resolveStartNodeId(index: GraphIndex, requestedStartNodeId?: string): string | null {
  if (requestedStartNodeId && index.nodeById[requestedStartNodeId]) return requestedStartNodeId;

  const ids = Object.keys(index.nodeById);
  if (ids.length === 0) return null;

  const inferred = ids.find((id) => (index.incomingEdgeIdsByNodeId[id]?.length ?? 0) === 0);
  return inferred ?? ids[0] ?? null;
}

function computeReachableNodeIds(index: GraphIndex, startId: string | null): Set<string> {
  const reachable = new Set<string>();
  if (!startId) return reachable;

  const queue: string[] = [startId];
  reachable.add(startId);
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    const edgeIds = index.outgoingEdgeIdsByNodeId[current] ?? [];
    for (const edgeId of edgeIds) {
      const edge = index.edgeById[edgeId];
      if (!edge) continue;
      if (reachable.has(edge.target)) continue;
      reachable.add(edge.target);
      queue.push(edge.target);
    }
  }

  return reachable;
}

function toRfNodes(index: GraphIndex | null, startNodeId?: string): Node<StoryNodeData>[] {
  if (!index) return [];

  const resolvedStartNodeId = resolveStartNodeId(index, startNodeId);
  const reachableNodeIds = computeReachableNodeIds(index, resolvedStartNodeId);

  return Object.values(index.nodeById).map((n) => ({
    id: n.id,
    type: "storyNode",
    position: n.position,
    data: (() => {
      const incomingEdgeIds = index.incomingEdgeIdsByNodeId[n.id] ?? [];
      const isUnreachable = !reachableNodeIds.has(n.id);
      const hasUnreachableParent = incomingEdgeIds.some((edgeId) => {
        const edge = index.edgeById[edgeId];
        if (!edge) return false;
        return !reachableNodeIds.has(edge.source);
      });

      return {
        title: n.title,
        incomingCount: incomingEdgeIds.length,
        outgoingCount: index.outgoingEdgeIdsByNodeId[n.id]?.length ?? 0,
        isStartingNode:
          incomingEdgeIds.length === 0 && (index.outgoingEdgeIdsByNodeId[n.id]?.length ?? 0) > 0,
        isEndingNode:
          (index.outgoingEdgeIdsByNodeId[n.id]?.length ?? 0) === 0 && incomingEdgeIds.length > 0,
        isUnreachable,
        isCascadeUnreachable: isUnreachable && hasUnreachableParent,
      };
    })(),
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

export default function GraphCanvas({
  index,
  startNodeId,
}: {
  index: GraphIndex | null;
  startNodeId?: string;
}) {
  const dispatch = useAppDispatch();
  const selection = useAppSelector((s) => s.graph.selection);
  const reactFlowRef = useRef<ReactFlowInstance | null>(null);
  const didCreateConnectionRef = useRef(false);
  const connectStartRef = useRef<{
    nodeId: string;
    handleType: "source" | "target";
  } | null>(null);

  const nodes = useMemo(() => toRfNodes(index, startNodeId), [index, startNodeId]);
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

      didCreateConnectionRef.current = true;

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

  const onConnectStart = useCallback(
    (_event: ReactMouseEvent | ReactTouchEvent, params: OnConnectStartParams) => {
      didCreateConnectionRef.current = false;

      if ((params.handleType === "source" || params.handleType === "target") && params.nodeId) {
        connectStartRef.current = {
          nodeId: params.nodeId,
          handleType: params.handleType,
        };
        return;
      }
      connectStartRef.current = null;
    },
    [],
  );

  const onConnectEnd = useCallback(
    (
      event: MouseEvent | TouchEvent,
      connectionState?: {
        isValid: boolean;
      },
    ) => {
      const start = connectStartRef.current;
      connectStartRef.current = null;

      // Let normal onConnect handle successful drops.
      if (didCreateConnectionRef.current) return;
      if (connectionState?.isValid) return;
      if (!start) return;

      const point = "touches" in event ? (event.touches[0] ?? event.changedTouches[0]) : event;
      if (!point) return;

      const flowPosition = reactFlowRef.current?.screenToFlowPosition({
        x: point.clientX,
        y: point.clientY,
      });

      if (!flowPosition) return;

      const newNodeId = `n-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;
      dispatch(
        addNode({
          node: {
            id: newNodeId,
            type: "page",
            title: "New node",
            body: "",
            tags: [],
            isTerminal: true,
            position: flowPosition,
          },
        }),
      );

      dispatch(
        addEdge({
          edge: {
            id:
              start.handleType === "source"
                ? `e-${start.nodeId}-${newNodeId}-${Date.now()}`
                : `e-${newNodeId}-${start.nodeId}-${Date.now()}`,
            source: start.handleType === "source" ? start.nodeId : newNodeId,
            target: start.handleType === "source" ? newNodeId : start.nodeId,
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
        tag === "input" || tag === "textarea" || tag === "select" || el?.isContentEditable;
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

  useEffect(() => {
    if (selection.kind !== "node") return;

    const rf = reactFlowRef.current;
    if (!rf) return;

    const selected = rf.getNode(selection.id);
    if (!selected) return;

    const position = selected.positionAbsolute ?? selected.position;
    const x = position.x + (selected.width ?? 220) / 2;
    const y = position.y + (selected.height ?? 120) / 2;
    rf.setCenter(x, y, { zoom: 1.15, duration: 260 });
  }, [selection]);

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
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={(_, n) => dispatch(selectNode({ id: n.id }))}
        onEdgeClick={(_, e) => dispatch(selectEdge({ id: e.id }))}
        onPaneClick={() => dispatch(clearSelection())}
        onInit={(instance) => {
          reactFlowRef.current = instance;
        }}
        fitView
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
