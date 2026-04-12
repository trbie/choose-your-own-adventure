export type NodeId = string;
export type EdgeId = string;

export type StoryNodeType = "page" | "ending" | "note";

export interface StoryNode {
  id: NodeId;
  type: StoryNodeType;

  // Page semantics
  pageNumber?: number;
  title: string;
  body: string;

  // Authoring helpers
  tags: string[];
  isTerminal: boolean;

  // React Flow position
  position: { x: number; y: number };
}

export interface StoryEdge {
  id: EdgeId;

  // An edge connects exactly one source -> one target.
  // Multiplicity (one-to-many / many-to-one) is represented by multiple StoryEdge objects.
  source: NodeId;
  target: NodeId;

  choiceText: string;
}

export interface GraphMeta {
  title: string;
  description?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  startNodeId?: NodeId;
}

export interface GraphDocument {
  version: 1;
  meta: GraphMeta;
  nodes: StoryNode[];
  edges: StoryEdge[];
}

export interface GraphIndex {
  nodeById: Record<NodeId, StoryNode>;
  edgeById: Record<EdgeId, StoryEdge>;
  outgoingEdgeIdsByNodeId: Record<NodeId, EdgeId[]>;
  incomingEdgeIdsByNodeId: Record<NodeId, EdgeId[]>;
}

export function indexGraph(doc: GraphDocument): GraphIndex {
  const nodeById: Record<NodeId, StoryNode> = {};
  for (const node of doc.nodes) nodeById[node.id] = node;

  const edgeById: Record<EdgeId, StoryEdge> = {};
  const outgoingEdgeIdsByNodeId: Record<NodeId, EdgeId[]> = {};
  const incomingEdgeIdsByNodeId: Record<NodeId, EdgeId[]> = {};

  for (const edge of doc.edges) {
    edgeById[edge.id] = edge;
    (outgoingEdgeIdsByNodeId[edge.source] ??= []).push(edge.id);
    (incomingEdgeIdsByNodeId[edge.target] ??= []).push(edge.id);
  }

  for (const node of doc.nodes) {
    outgoingEdgeIdsByNodeId[node.id] ??= [];
    incomingEdgeIdsByNodeId[node.id] ??= [];
  }

  return { nodeById, edgeById, outgoingEdgeIdsByNodeId, incomingEdgeIdsByNodeId };
}
