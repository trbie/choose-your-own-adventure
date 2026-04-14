import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serverModeGuard } from "@/lib/server-mode";

export async function GET(_: Request, ctx: { params: Promise<{ graphId: string }> }) {
  const guarded = serverModeGuard();
  if (guarded) return guarded;

  const user = await requireSessionUser();
  const { graphId } = await ctx.params;

  const progress = await prisma.readingProgress.findUnique({
    where: { userId_graphId: { userId: user.id, graphId } },
  });

  return NextResponse.json({ progress });
}

export async function PUT(req: Request, ctx: { params: Promise<{ graphId: string }> }) {
  const guarded = serverModeGuard();
  if (guarded) return guarded;

  const user = await requireSessionUser();
  const { graphId } = await ctx.params;

  const body = (await req.json().catch(() => null)) as
    | { currentNodeId?: unknown; history?: unknown }
    | null;

  const currentNodeId = typeof body?.currentNodeId === "string" ? body.currentNodeId : null;
  const history = Array.isArray(body?.history) ? body?.history : [];

  const progress = await prisma.readingProgress.upsert({
    where: { userId_graphId: { userId: user.id, graphId } },
    update: { currentNodeId, history },
    create: { userId: user.id, graphId, currentNodeId, history },
  });

  return NextResponse.json({ progress });
}
