import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await requireSessionUser();
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  const graphs = await prisma.graph.findMany({
    where: scope === "mine" ? { ownerId: user.id } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      owner: {
        select: {
          displayName: true,
          email: true,
        },
      },
      _count: {
        select: {
          nodes: true,
          edges: true,
        },
      },
    },
  });

  return NextResponse.json({
    stories: graphs.map((graph) => ({
      id: graph.id,
      title: graph.title,
      description: graph.description,
      authorName: graph.owner.displayName?.trim() || graph.owner.email,
      updatedAt: graph.updatedAt.toISOString(),
      nodeCount: graph._count.nodes,
      edgeCount: graph._count.edges,
    })),
  });
}
