import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serverModeGuard } from "@/lib/server-mode";

export async function GET(req: Request) {
  const guarded = serverModeGuard();
  if (guarded) return guarded;

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");

  const user = scope === "mine" ? await requireSessionUser() : null;

  const where =
    scope === "mine" && user
      ? { ownerId: user.id }
      : {
          isPublic: true,
        };

  const graphs = await prisma.graph.findMany({
    where,
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
      authorName:
        graph.owner.displayName?.trim() || (scope === "mine" ? graph.owner.email : "Unknown author"),
      updatedAt: graph.updatedAt.toISOString(),
      nodeCount: graph._count.nodes,
      edgeCount: graph._count.edges,
      isPublic: graph.isPublic,
    })),
  });
}
