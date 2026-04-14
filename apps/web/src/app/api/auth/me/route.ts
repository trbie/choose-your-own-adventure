import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { serverModeGuard } from "@/lib/server-mode";

export async function GET() {
  const guarded = serverModeGuard();
  if (guarded) return guarded;

  const user = await getSessionUser();
  return NextResponse.json({ user });
}
