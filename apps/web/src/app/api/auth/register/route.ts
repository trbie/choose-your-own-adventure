import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { createSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDatabaseSetupErrorMessage, isDatabaseSetupError } from "@/lib/prisma-errors";
import { Prisma } from "@prisma/client";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
    displayName?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : null;

  if (!email || !email.includes("@") || password.length < 8) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
      select: { id: true, email: true, displayName: true },
    });

    await createSessionCookie(user);

    return NextResponse.json({ user });
  } catch (err: unknown) {
    // Unique constraint
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    if (isDatabaseSetupError(err)) {
      return NextResponse.json({ error: getDatabaseSetupErrorMessage() }, { status: 503 });
    }

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
