import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";

import { evaluationDetail } from "@/lib/evaluations/detail-server";
import { notifyReviewers } from "@/lib/evaluations/notify";
import { cardChannels, tellOwner } from "@/lib/evaluations/route-helpers";
import { evaluationFailure } from "@/lib/evaluations/rpc-failure";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// POST /api/evaluations/[id]/finish — "Finish & send for review" or "Finish &
// send report card" (the client's mock, 2026-10-02). The database checks
// every required answer and applies Setup's delivery: the card waits in the
// review queue (its reviewers are told at once), or goes straight to the
// owner — the result recorded on the pet, any deposit credit given — and
// then the owner is emailed and texted where those are on.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const supabase = await createServerClient();
  const detail = await evaluationDetail(supabase, id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data, error } = await supabase.rpc("finish_evaluation", {
    p_evaluation_id: id,
    p_channels: cardChannels(detail),
  });
  if (error) return evaluationFailure(error);
  const outcome = data as "sent" | "in_review";

  if (outcome === "sent") {
    const deliveries = await tellOwner(
      supabase,
      request,
      id,
      detail.facilityId,
    );
    return NextResponse.json({ outcome, deliveries });
  }

  after(() =>
    notifyReviewers({
      request,
      facilityId: detail.facilityId,
      evaluationId: id,
      kind: "evaluation_card_ready",
      round: new Date().toISOString(),
      petName: detail.pet.name,
      clientName: detail.client.name,
      evaluatorName: detail.evaluatorName,
      actorProfileId: user.id,
    }),
  );
  return NextResponse.json({ outcome, deliveries: [] });
}
