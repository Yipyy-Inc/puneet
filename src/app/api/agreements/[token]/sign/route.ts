import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// One agreement signed from a signing link (/agreements/{token}).
//
// Unauthenticated, token-bearing and RPC-only, exactly as /api/review/[token]:
// the client opening this from an email has no session, so the ordinary
// cookie client IS anon, and anon reaches nothing here but
// `sign_agreement_by_token` (20261002123123). That function reads the text
// from `waivers`, hashes it, requires consent and refuses an agreement the
// link does not cover — this route only carries the signer's words and where
// they signed from.
// ============================================================================

export const dynamic = "force-dynamic";

const signSchema = z.object({
  waiverId: z.string().uuid(),
  signatureName: z.string().trim().min(2).max(200),
  signatureData: z.string().max(400_000).optional(),
  witnessName: z.string().trim().max(200).optional(),
  witnessSignatureData: z.string().max(400_000).optional(),
  consent: z.literal(true),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const parsed = signSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Type your full name and confirm you agree." },
      { status: 422 },
    );
  }
  const input = parsed.data;
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("sign_agreement_by_token", {
    p_token: token,
    p_waiver_id: input.waiverId,
    p_signature_name: input.signatureName,
    p_signature_data: input.signatureData,
    p_witness_name: input.witnessName,
    p_witness_signature_data: input.witnessSignatureData,
    p_consent: input.consent,
    p_ip_address:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      undefined,
    p_user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? undefined,
  });
  if (error) {
    // An unknown or expired link, or an agreement not on it: one answer.
    const refused = error.code === "42501";
    return NextResponse.json(
      { error: refused ? "This link is not valid." : error.message },
      { status: refused ? 404 : 422 },
    );
  }
  return NextResponse.json(data);
}
