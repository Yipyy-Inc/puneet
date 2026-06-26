import { NextResponse } from "next/server";

import { runHealthChecks } from "@/lib/monitoring/health";

// Real, live health endpoint — must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const health = await runHealthChecks();
  return NextResponse.json(health, {
    headers: { "Cache-Control": "no-store" },
  });
}
