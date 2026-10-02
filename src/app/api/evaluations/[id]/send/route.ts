import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { evaluationDetail } from "@/lib/evaluations/detail-server";
import { cardChannels, tellOwner } from "@/lib/evaluations/route-helpers";
import { evaluationFailure } from "@/lib/evaluations/rpc-failure";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// POST /api/evaluations/[id]/send — "Approve & send to owner" (the client's
// mock, 2026-10-02), with the reviewer's last word on the note and the
// channels they kept under "Send by". The database decides who may send
// (Setup's reviewers, owners and admins, the evaluator where self-send is
// on), records the result on the pet and gives any deposit credit; the
// owner is then emailed and texted where those are on.
// ============================================================================

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  ownerNote: z.string().max(4000).optional(),
  channels: z
    .array(z.enum(["email", "sms"]))
    .max(2)
    .optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json(
      { error: "That report card could not be read." },
      { status: 422 },
    );
  }
  const supabase = await createServerClient();
  const detail = await evaluationDetail(supabase, id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = await supabase.rpc("send_evaluation_card", {
    p_evaluation_id: id,
    p_owner_note: parsed.data.ownerNote,
    p_channels: cardChannels(detail, parsed.data.channels),
  });
  if (error) return evaluationFailure(error);

  const deliveries = await tellOwner(supabase, request, id, detail.facilityId);
  return NextResponse.json({ outcome: "sent", deliveries });
}
