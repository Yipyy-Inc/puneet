import { NextResponse } from "next/server";

import { getLiveAiUsage } from "@/lib/ai-usage-recorder";

// Exposes the real Anthropic API usage recorded by the AI generation routes.
// The admin AI console merges these onto its seeded baseline.
export async function GET() {
  return NextResponse.json({ live: getLiveAiUsage() });
}
