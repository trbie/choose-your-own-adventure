import type { GraphDocument, StoryEdge, StoryNode } from "@cyoa/shared";

import type { Graph, GraphEdge, GraphNode, Prisma } from "@prisma/client";

function decodeTags(tags: GraphNode["tags"]): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t): t is string => typeof t === "string");
}

export function dbToGraphDocument(graph: Graph & { nodes: GraphNode[]; edges: GraphEdge[] }): GraphDocument {
  const nodes: StoryNode[] = graph.nodes.map((n) => ({
    id: n.nodeId,
    type: n.type as StoryNode["type"],
    pageNumber: n.pageNumber ?? undefined,
    title: n.title,
    body: n.body,
    tags: decodeTags(n.tags),
    isTerminal: n.isTerminal,
    position: { x: n.positionX, y: n.positionY },
  }));

  const edges: StoryEdge[] = graph.edges.map((e) => ({
    id: e.edgeId,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    choiceText: e.choiceText,
  }));

  return {
    version: 1,
    meta: {
      title: graph.title,
      description: graph.description ?? undefined,
      createdAt: graph.createdAt.toISOString(),
      updatedAt: graph.updatedAt.toISOString(),
      startNodeId: graph.startNodeId ?? undefined,
      isPublic: graph.isPublic,
    },
    nodes,
    edges,
  };
}

export function docToDbNodes(graphId: string, doc: GraphDocument): Prisma.GraphNodeCreateManyInput[] {
  return doc.nodes.map((n) => ({
    graphId,
    nodeId: n.id,
    type: n.type,
    pageNumber: n.pageNumber ?? null,
    title: n.title,
    body: n.body,
    tags: n.tags,
    isTerminal: n.isTerminal,
    positionX: n.position.x,
    positionY: n.position.y,
  }));
}

export function docToDbEdges(graphId: string, doc: GraphDocument): Prisma.GraphEdgeCreateManyInput[] {
  return doc.edges.map((e) => ({
    graphId,
    edgeId: e.id,
    sourceNodeId: e.source,
    targetNodeId: e.target,
    choiceText: e.choiceText,
  }));
}
