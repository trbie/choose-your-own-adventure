import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type { GraphDocument, StoryEdge, StoryNode } from "@cyoa/shared";

// When run via `npm run seed:cot`, cwd is the repository root.
const REPO_ROOT = path.resolve(process.cwd());

const GRAPH_PATH = path.join(REPO_ROOT, "output", "cot-story-graph.mmd");
const PAGES_DIR = path.join(REPO_ROOT, "output", "cot-pages-ocr-v2");
const OUTPUT_PATH = path.join(REPO_ROOT, "apps", "web", "public", "seed", "graph.cot.json");

const NODE_RE = /^\s*P(\d+)\["(\d+)"\]\s*$/;
const EDGE_RE = /^\s*P(\d+)\s*-->\s*P(\d+)\s*$/;
const PAGE_FILE_RE = /^(\d+)-CoT\.txt$/;

function isoNow(): string {
  return new Date().toISOString();
}

function parseGraphFile(graphText: string): { pages: number[]; edges: Array<[number, number]> } {
  const pages = new Set<number>();
  const edges: Array<[number, number]> = [];

  for (const rawLine of graphText.split(/\r?\n/)) {
    const line = rawLine.trim();

    const nodeMatch = NODE_RE.exec(line);
    if (nodeMatch) {
      pages.add(Number(nodeMatch[1]));
      continue;
    }

    const edgeMatch = EDGE_RE.exec(line);
    if (edgeMatch) {
      const src = Number(edgeMatch[1]);
      const dst = Number(edgeMatch[2]);
      pages.add(src);
      pages.add(dst);
      edges.push([src, dst]);
    }
  }

  return { pages: Array.from(pages).sort((a, b) => a - b), edges };
}

function readPageTexts(): Map<number, string> {
  const map = new Map<number, string>();
  for (const filename of readdirSync(PAGES_DIR)) {
    const match = PAGE_FILE_RE.exec(filename);
    if (!match) continue;
    const pageNumber = Number(match[1]);
    const fullPath = path.join(PAGES_DIR, filename);
    map.set(pageNumber, readFileSync(fullPath, "utf8").trim());
  }
  return map;
}

function computeLevels(pages: number[], edges: Array<[number, number]>): Map<number, number> {
  const outgoing = new Map<number, number[]>();
  const indegree = new Map<number, number>();

  for (const page of pages) {
    outgoing.set(page, []);
    indegree.set(page, 0);
  }

  for (const [src, dst] of edges) {
    outgoing.get(src)?.push(dst);
    indegree.set(dst, (indegree.get(dst) ?? 0) + 1);
  }

  const queue: number[] = pages.filter((p) => (indegree.get(p) ?? 0) === 0);
  queue.sort((a, b) => a - b);

  const order: number[] = [];
  const indegreeWorking = new Map(indegree);
  while (queue.length) {
    const node = queue.shift()!;
    order.push(node);
    for (const dst of outgoing.get(node) ?? []) {
      indegreeWorking.set(dst, (indegreeWorking.get(dst) ?? 0) - 1);
      if ((indegreeWorking.get(dst) ?? 0) === 0) queue.push(dst);
    }
    queue.sort((a, b) => a - b);
  }

  // If cycles exist, append remaining nodes deterministically.
  const remaining = pages.filter((p) => !order.includes(p));
  order.push(...remaining);

  const level = new Map<number, number>();
  for (const node of order) {
    let best = 0;
    // compute max predecessor level + 1
    for (const [src, dst] of edges) {
      if (dst !== node) continue;
      best = Math.max(best, (level.get(src) ?? 0) + 1);
    }
    level.set(node, best);
  }
  return level;
}

function main(): void {
  const graphText = readFileSync(GRAPH_PATH, "utf8");
  const { pages, edges: rawEdges } = parseGraphFile(graphText);
  const pageTexts = readPageTexts();

  const outgoingCount = new Map<number, number>();
  for (const [src] of rawEdges) outgoingCount.set(src, (outgoingCount.get(src) ?? 0) + 1);

  const levels = computeLevels(pages, rawEdges);
  const pagesByLevel = new Map<number, number[]>();
  for (const p of pages) {
    const lvl = levels.get(p) ?? 0;
    (pagesByLevel.get(lvl) ?? pagesByLevel.set(lvl, []).get(lvl)!).push(p);
  }
  for (const [, list] of pagesByLevel) list.sort((a, b) => a - b);

  const nodes: StoryNode[] = [];
  for (const p of pages) {
    const lvl = levels.get(p) ?? 0;
    const row = (pagesByLevel.get(lvl) ?? []).indexOf(p);

    const isTerminal = !outgoingCount.has(p);
    const body = pageTexts.get(p) ?? `Page ${p}\n\n[Missing page text]`;

    nodes.push({
      id: `p-${p}`,
      type: isTerminal ? "ending" : "page",
      pageNumber: p,
      title: `Page ${p}`,
      body,
      tags: [],
      isTerminal,
      position: { x: lvl * 320, y: row * 120 },
    });
  }

  const edges: StoryEdge[] = [];
  const edgeSeq = new Map<string, number>();
  for (const [src, dst] of rawEdges) {
    const key = `${src}->${dst}`;
    const idx = (edgeSeq.get(key) ?? 0) + 1;
    edgeSeq.set(key, idx);

    edges.push({
      id: `e-p-${src}-p-${dst}-${idx}`,
      source: `p-${src}`,
      target: `p-${dst}`,
      choiceText: "",
    });
  }

  const doc: GraphDocument = {
    version: 1,
    meta: {
      title: "The Cave of Time (Imported)",
      description: "Seed graph imported from Mermaid + OCR text outputs.",
      createdAt: isoNow(),
      updatedAt: isoNow(),
      startNodeId: "p-2",
    },
    nodes,
    edges,
  };

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(doc, null, 2) + "\n", "utf8");

  console.log(`Seed written: ${OUTPUT_PATH}`);
  console.log(`Nodes: ${nodes.length}, Edges: ${edges.length}`);
}

main();
