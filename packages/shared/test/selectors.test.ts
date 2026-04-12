import { describe, expect, it } from "vitest";
import {
  computeTerminalNodeIds,
  detectCycles,
  enumeratePaths,
  getIncomingEdges,
  getOutgoingEdges,
  type GraphDocument,
} from "../src";

function makeDoc(): GraphDocument {
  return {
    version: 1,
    meta: {
      title: "Test",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      startNodeId: "a",
    },
    nodes: [
      { id: "a", type: "page", title: "A", body: "", tags: [], isTerminal: false, position: { x: 0, y: 0 } },
      { id: "b", type: "page", title: "B", body: "", tags: [], isTerminal: false, position: { x: 0, y: 0 } },
      { id: "c", type: "ending", title: "C", body: "", tags: [], isTerminal: true, position: { x: 0, y: 0 } },
    ],
    edges: [
      { id: "e1", source: "a", target: "b", choiceText: "to b" },
      { id: "e2", source: "b", target: "c", choiceText: "to c" },
    ],
  };
}

describe("selectors", () => {
  it("gets outgoing/incoming edges", () => {
    const doc = makeDoc();
    expect(getOutgoingEdges(doc, "a").map((e) => e.id)).toEqual(["e1"]);
    expect(getIncomingEdges(doc, "c").map((e) => e.id)).toEqual(["e2"]);
  });

  it("computes terminal nodes", () => {
    const doc = makeDoc();
    expect(computeTerminalNodeIds(doc)).toEqual(["c"]);
  });

  it("detects no cycles", () => {
    const doc = makeDoc();
    expect(detectCycles(doc).hasCycle).toBe(false);
  });

  it("detects cycles", () => {
    const doc = makeDoc();
    doc.edges.push({ id: "e3", source: "c", target: "a", choiceText: "loop" });
    const res = detectCycles(doc);
    expect(res.hasCycle).toBe(true);
    expect(res.nodesInCycle).toContain("a");
  });

  it("enumerates paths", () => {
    const doc = makeDoc();
    const paths = enumeratePaths(doc, { startNodeId: "a", maxDecisions: 5 });
    expect(paths).toEqual([{ path: ["a", "b", "c"], reason: "end" }]);
  });
});
