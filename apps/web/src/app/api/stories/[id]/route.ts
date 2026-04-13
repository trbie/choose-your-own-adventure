import type { GraphDocument } from "@cyoa/shared";
import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth";
import { dbToGraphDocument } from "@/lib/graphDb";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSessionUser();
  const { id } = await ctx.params;

  const graph = await prisma.graph.findUnique({
    where: { id },
    include: { nodes: true, edges: true, owner: true },
  });

  if (!graph) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const doc: GraphDocument = dbToGraphDocument(graph);

  return NextResponse.json({
    id: graph.id,
    owner: {
      id: graph.owner.id,
      email: graph.owner.email,
      displayName: graph.owner.displayName,
    },
    doc,
  });
}
