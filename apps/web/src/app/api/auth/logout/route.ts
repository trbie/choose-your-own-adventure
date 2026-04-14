import { NextResponse } from "next/server";

import { clearSessionCookie } from "@/lib/auth";
import { serverModeGuard } from "@/lib/server-mode";

export async function POST() {
  const guarded = serverModeGuard();
  if (guarded) return guarded;

  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
