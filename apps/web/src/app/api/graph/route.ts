import type { GraphDocument } from "@cyoa/shared";
import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth";
import { docToDbEdges, docToDbNodes } from "@/lib/graphDb";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await requireSessionUser();
  const doc = (await req.json().catch(() => null)) as GraphDocument | null;

  if (!doc || doc.version !== 1 || !doc.meta?.title) {
    return NextResponse.json({ error: "Invalid graph" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const graph = await tx.graph.create({
      data: {
        ownerId: user.id,
        title: doc.meta.title,
        description: doc.meta.description ?? null,
        startNodeId: doc.meta.startNodeId ?? null,
      },
      select: { id: true },
    });

    if (doc.nodes.length) {
      await tx.graphNode.createMany({
        data: docToDbNodes(graph.id, doc),
      });
    }

    if (doc.edges.length) {
      await tx.graphEdge.createMany({
        data: docToDbEdges(graph.id, doc),
      });
    }

    return graph;
  });

  return NextResponse.json({ id: result.id });
}
