import type { EdgeId, GraphDocument, NodeId, StoryEdge } from "./models";
import { indexGraph } from "./models";

export function getOutgoingEdges(doc: GraphDocument, nodeId: NodeId): StoryEdge[] {
  return doc.edges.filter((e) => e.source === nodeId);
}

export function getIncomingEdges(doc: GraphDocument, nodeId: NodeId): StoryEdge[] {
  return doc.edges.filter((e) => e.target === nodeId);
}

export function computeTerminalNodeIds(doc: GraphDocument): NodeId[] {
  const outgoing = new Set<NodeId>();
  for (const edge of doc.edges) outgoing.add(edge.source);

  const result: NodeId[] = [];
  for (const node of doc.nodes) {
    if (!outgoing.has(node.id)) result.push(node.id);
  }
  return result;
}

export interface CycleDetectionResult {
  hasCycle: boolean;
  nodesInCycle: NodeId[];
}

export function detectCycles(doc: GraphDocument): CycleDetectionResult {
  const idx = indexGraph(doc);
  const nodes = doc.nodes.map((n) => n.id);

  const visiting = new Set<NodeId>();
  const visited = new Set<NodeId>();
  const nodesInCycle = new Set<NodeId>();

  const dfs = (nodeId: NodeId): void => {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      nodesInCycle.add(nodeId);
      return;
    }

    visiting.add(nodeId);
    const outgoingEdgeIds: EdgeId[] = idx.outgoingEdgeIdsByNodeId[nodeId] ?? [];
    for (const edgeId of outgoingEdgeIds) {
      const edge = idx.edgeById[edgeId];
      if (!edge) continue;

      if (visiting.has(edge.target)) {
        nodesInCycle.add(edge.source);
        nodesInCycle.add(edge.target);
      } else {
        dfs(edge.target);
      }
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const nodeId of nodes) dfs(nodeId);

  return {
    hasCycle: nodesInCycle.size > 0,
    nodesInCycle: Array.from(nodesInCycle).sort(),
  };
}

export interface EnumeratePathsOptions {
  startNodeId: NodeId;
  maxDecisions: number;
}

export type PathEndReason = "end" | "cycle" | "max-decisions";

export interface EnumeratedPath {
  path: NodeId[];
  reason: PathEndReason;
}

export function enumeratePaths(doc: GraphDocument, options: EnumeratePathsOptions): EnumeratedPath[] {
  const { startNodeId, maxDecisions } = options;
  if (maxDecisions < 1) throw new Error("maxDecisions must be >= 1");

  const idx = indexGraph(doc);
  if (!idx.nodeById[startNodeId]) return [];

  const results: EnumeratedPath[] = [];

  const dfs = (path: NodeId[], decisionPoints: number): void => {
    const current = path[path.length - 1];
    const outgoingEdges = (idx.outgoingEdgeIdsByNodeId[current] ?? [])
      .map((id) => idx.edgeById[id])
      .filter(Boolean);

    if (outgoingEdges.length === 0) {
      results.push({ path: [...path], reason: "end" });
      return;
    }

    if (decisionPoints > maxDecisions) {
      results.push({ path: [...path], reason: "max-decisions" });
      return;
    }

    const nextDecisionPoints = decisionPoints + (outgoingEdges.length > 1 ? 1 : 0);
    if (nextDecisionPoints > maxDecisions) {
      results.push({ path: [...path], reason: "max-decisions" });
      return;
    }

    for (const edge of outgoingEdges) {
      const next = edge.target;
      if (path.includes(next)) {
        results.push({ path: [...path, next], reason: "cycle" });
        continue;
      }
      dfs([...path, next], nextDecisionPoints);
    }
  };

  dfs([startNodeId], 0);
  return results;
}
