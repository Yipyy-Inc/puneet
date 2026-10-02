import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";

import { evaluationDetail } from "@/lib/evaluations/detail-server";
import { notifyEvaluatorReturned } from "@/lib/evaluations/notify";
import { evaluationFailure } from "@/lib/evaluations/rpc-failure";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// POST /api/evaluations/[id]/return — "Send back to evaluator" (the client's
// mock, 2026-10-02): the card goes back to being answered, with the
// reviewer's comment on it, and its evaluator is told.
// ============================================================================

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  comment: z.string().trim().min(1).max(1000),
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
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!z.string().uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json(
      { error: "Say what the evaluator should change." },
      { status: 422 },
    );
  }
  const supabase = await createServerClient();
  const detail = await evaluationDetail(supabase, id);
  if (!detail) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const { error } = await supabase.rpc("return_evaluation_card", {
    p_evaluation_id: id,
    p_comment: parsed.data.comment,
  });
  if (error) return evaluationFailure(error);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();
  after(() =>
    notifyEvaluatorReturned({
      request,
      facilityId: detail.facilityId,
      evaluationId: id,
      evaluatorStaffId: detail.evaluatorStaffId,
      petName: detail.pet.name,
      reviewerName:
        (profile as { full_name: string | null } | null)?.full_name ??
        user.email ??
        "",
      comment: parsed.data.comment,
      actorProfileId: user.id,
    }),
  );
  return NextResponse.json({ ok: true });
}
