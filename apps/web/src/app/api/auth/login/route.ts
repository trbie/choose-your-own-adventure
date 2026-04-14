import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { createSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDatabaseSetupErrorMessage, isDatabaseSetupError } from "@/lib/prisma-errors";
import { serverModeGuard } from "@/lib/server-mode";

export async function POST(req: Request) {
  const guarded = serverModeGuard();
  if (guarded) return guarded;

  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, displayName: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await createSessionCookie({ id: user.id, email: user.email, displayName: user.displayName });

    return NextResponse.json({
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (err: unknown) {
    if (isDatabaseSetupError(err)) {
      return NextResponse.json({ error: getDatabaseSetupErrorMessage() }, { status: 503 });
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
