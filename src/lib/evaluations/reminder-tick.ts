import "server-only";

import { notifyReviewers } from "@/lib/evaluations/notify";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// "Unreviewed after 2 hours → reminder" (Setup, the client's mock,
// 2026-10-02). Run by the messaging tick: every report card that has waited
// in review for two hours reminds its reviewers ONCE.
//
// Each card is claimed before anyone is told — a conditional update of
// `reminded_at` that returns the row only to the tick that set it — so two
// overlapping ticks cannot remind twice. Sending a card back and finishing it
// again clears `reminded_at`, so the next round is reminded in its turn.
// ============================================================================

const WAIT_MS = 2 * 60 * 60 * 1000;

interface Waiting {
  id: string;
  facility_id: string;
  evaluator_name: string;
  submitted_at: string;
  pets: { name: string } | null;
  clients: { name: string } | null;
}

export async function remindUnreviewedEvaluationCards(
  request: Request,
  now: Date = new Date(),
): Promise<{ reminded: number; problems: string[] }> {
  if (!hasServiceRoleKey()) return { reminded: 0, problems: [] };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("evaluations")
    .select(
      "id, facility_id, evaluator_name, submitted_at, pets(name), clients(name)",
    )
    .eq("card_status", "in_review")
    .is("reminded_at", null)
    .lt("submitted_at", new Date(now.getTime() - WAIT_MS).toISOString())
    .limit(100);
  if (error)
    return { reminded: 0, problems: [`evaluations: ${error.message}`] };

  let reminded = 0;
  const problems: string[] = [];
  for (const card of (data ?? []) as unknown as Waiting[]) {
    const { data: claimed, error: claimError } = await admin
      .from("evaluations")
      .update({ reminded_at: now.toISOString() })
      .eq("id", card.id)
      .eq("card_status", "in_review")
      .is("reminded_at", null)
      .select("id");
    if (claimError) {
      problems.push(`evaluation ${card.id}: ${claimError.message}`);
      continue;
    }
    // Another tick took it, or it was reviewed a moment ago.
    if (!claimed || claimed.length === 0) continue;
    await notifyReviewers({
      request,
      facilityId: card.facility_id,
      evaluationId: card.id,
      kind: "evaluation_card_reminder",
      round: card.submitted_at,
      petName: card.pets?.name ?? "",
      clientName: card.clients?.name ?? "",
      evaluatorName: card.evaluator_name,
    });
    reminded += 1;
  }
  return { reminded, problems };
}
