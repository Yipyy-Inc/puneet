import "server-only";

import { notifyStaff } from "@/lib/notifications/notify-staff";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// The staff side of a report card (the client's mock, 2026-10-02):
//
//   ready      an evaluator finished and the card waits for review — to the
//              reviewers Setup names (public.evaluation_reviewers), and only
//              them, "as soon as a card is ready"
//   reminder   still unreviewed after 2 hours — once, to the same people
//              (the messaging tick sends it)
//   returned   a reviewer sent it back — to its evaluator, with the comment
//
// Best effort, like every notice: the card is already where it is.
// ============================================================================

const REVIEW_LINK = "/facility/dashboard/evaluations?tab=review";

export async function notifyReviewers(input: {
  request: Request;
  facilityId: string;
  evaluationId: string;
  kind: "evaluation_card_ready" | "evaluation_card_reminder";
  /** Makes each round its own notice: a card finished again after a send-back. */
  round: string;
  petName: string;
  clientName: string;
  evaluatorName: string;
  actorProfileId?: string | null;
}): Promise<void> {
  if (!hasServiceRoleKey()) return;
  const admin = createAdminClient();
  const { data } = await admin.rpc("evaluation_reviewers", {
    p_facility_id: input.facilityId,
  });
  const reviewers = ((data ?? []) as Array<{ membership_id: string }>).map(
    (row) => row.membership_id,
  );
  if (reviewers.length === 0) return;
  await notifyStaff({
    facilityId: input.facilityId,
    kind: input.kind,
    params: {
      pet: input.petName,
      client: input.clientName,
      staff: input.evaluatorName,
    },
    link: REVIEW_LINK,
    sourceId: input.evaluationId,
    dedupeKey: `${input.kind}:${input.evaluationId}:${input.round}`,
    actorProfileId: input.actorProfileId ?? null,
    onlyMembershipIds: reviewers,
    request: input.request,
  });
}

export async function notifyEvaluatorReturned(input: {
  request: Request;
  facilityId: string;
  evaluationId: string;
  evaluatorStaffId: string | null;
  petName: string;
  reviewerName: string;
  comment: string;
  actorProfileId?: string | null;
}): Promise<void> {
  if (!hasServiceRoleKey() || !input.evaluatorStaffId) return;
  const admin = createAdminClient();
  const { data } = await admin
    .from("staff")
    .select("membership_id")
    .eq("id", input.evaluatorStaffId)
    .eq("facility_id", input.facilityId)
    .maybeSingle();
  const membership = (data as { membership_id: string | null } | null)
    ?.membership_id;
  if (!membership) return;
  await notifyStaff({
    facilityId: input.facilityId,
    kind: "evaluation_card_returned",
    params: {
      pet: input.petName,
      staff: input.reviewerName,
      comment: input.comment.slice(0, 200),
    },
    link: "/facility/dashboard/evaluations",
    sourceId: input.evaluationId,
    dedupeKey: `evaluation_card_returned:${input.evaluationId}:${Date.now()}`,
    actorProfileId: input.actorProfileId ?? null,
    onlyMembershipIds: [membership],
    request: input.request,
  });
}
