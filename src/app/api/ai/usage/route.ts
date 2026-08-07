import { NextResponse } from "next/server";

import { getLiveAiUsage } from "@/lib/ai-usage-recorder";
import { getViewer } from "@/lib/auth/viewer";

// Exposes the real Anthropic API usage recorded by the AI generation routes.
// The admin AI console merges these onto its seeded baseline.
//
// PLATFORM ADMIN ONLY. The ledger is cross-tenant by construction — one
// in-memory list covering every facility — so serving it to any signed-in
// caller would hand a facility its competitors' AI volume and spend. It was
// served to ANYONE, signed in or not.
//
// Gated here rather than by RLS because these records never reach Postgres;
// they live in module memory (src/lib/ai-usage-recorder.ts). When they become
// a table, this becomes a policy and this check becomes redundant — which is
// the direction to move, not away from.
export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer?.isPlatformAdmin) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }
  return NextResponse.json({ live: getLiveAiUsage() });
}
