import type { GraphDocument } from "@cyoa/shared";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { dbToGraphDocument } from "@/lib/graphDb";
import { prisma } from "@/lib/prisma";
import { serverModeGuard } from "@/lib/server-mode";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const guarded = serverModeGuard();
  if (guarded) return guarded;

  const { id } = await ctx.params;

  const graph = await prisma.graph.findUnique({
    where: { id },
    include: { nodes: true, edges: true, owner: true },
  });

  if (!graph) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!graph.isPublic) {
    const user = await getSessionUser();
    if (!user || user.id !== graph.ownerId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const doc: GraphDocument = dbToGraphDocument(graph);

  return NextResponse.json({
    id: graph.id,
    authorName: graph.owner.displayName?.trim() || "Unknown author",
    doc,
  });
}
