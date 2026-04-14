import { NextResponse } from "next/server";

/**
 * Hard-disable server-backed routes when running in local-only mode.
 *
 * This protects local-only deployments from accidentally touching Prisma/DB
 * and makes it explicit that these endpoints are unavailable.
 */
export function serverModeGuard(): Response | null {
  const enableServer = process.env.NEXT_PUBLIC_ENABLE_SERVER === "true";
  if (enableServer) return null;
  return NextResponse.json({ error: "Server sync is disabled" }, { status: 404 });
}
