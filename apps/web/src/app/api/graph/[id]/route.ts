import type { GraphDocument } from "@cyoa/shared";
import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth";
import { dbToGraphDocument, docToDbEdges, docToDbNodes } from "@/lib/graphDb";
import { prisma } from "@/lib/prisma";
import { serverModeGuard } from "@/lib/server-mode";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const guarded = serverModeGuard();
  if (guarded) return guarded;

  const user = await requireSessionUser();
  const { id } = await ctx.params;

  const graph = await prisma.graph.findFirst({
    where: { id, ownerId: user.id },
    include: { nodes: true, edges: true },
  });

  if (!graph) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ id: graph.id, doc: dbToGraphDocument(graph) });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guarded = serverModeGuard();
  if (guarded) return guarded;

  const user = await requireSessionUser();
  const { id } = await ctx.params;

  const doc = (await req.json().catch(() => null)) as GraphDocument | null;
  if (!doc || doc.version !== 1 || !doc.meta?.title) {
    return NextResponse.json({ error: "Invalid graph" }, { status: 400 });
  }

  const existing = await prisma.graph.findFirst({
    where: { id, ownerId: user.id },
    select: { id: true, isPublic: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.graph.update({
      where: { id },
      data: {
        title: doc.meta.title,
        description: doc.meta.description ?? null,
        startNodeId: doc.meta.startNodeId ?? null,
        isPublic: doc.meta.isPublic ?? existing.isPublic,
      },
    });

    await tx.graphEdge.deleteMany({ where: { graphId: id } });
    await tx.graphNode.deleteMany({ where: { graphId: id } });

    if (doc.nodes.length) {
      await tx.graphNode.createMany({ data: docToDbNodes(id, doc) });
    }

    if (doc.edges.length) {
      await tx.graphEdge.createMany({ data: docToDbEdges(id, doc) });
    }
  });

  return NextResponse.json({ ok: true });
}
