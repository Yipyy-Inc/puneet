import { NextResponse, type NextRequest } from "next/server";

import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import type {
  CardStatus,
  EvaluationStatus,
  PetEvaluationRow,
} from "@/lib/evaluations/board-types";
import type { EvaluationResult } from "@/lib/evaluations/questions";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// GET /api/evaluations/pet/[ref] — one pet's evaluations, newest first: the
// pet profile's Evaluations tab (the client's mock, 2026-10-02), beside the
// results recorded on the pet. The pet is a pet of the facility the portal
// is showing; RLS says whether the viewer may see evaluations at all.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { ref } = await params;
  const petRef = Number(ref);
  const scope = await activeFacilityIdForStaff();
  if (!Number.isInteger(petRef) || !scope) return NextResponse.json([]);

  const supabase = await createServerClient();
  const { data: pet } = await supabase
    .from("pets")
    .select("id")
    .eq("facility_id", scope)
    .eq("ref", petRef)
    .maybeSingle();
  if (!pet) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("evaluations")
    .select(
      "id, status, card_status, result, evaluator_name, started_at, completed_at, sent_at",
    )
    .eq("facility_id", scope)
    .eq("pet_id", (pet as { id: string }).id)
    .order("started_at", { ascending: false })
    .limit(50);
  if (error) {
    return NextResponse.json(
      { error: "Evaluations could not be loaded." },
      { status: 500 },
    );
  }
  return NextResponse.json(
    (
      (data ?? []) as Array<{
        id: string;
        status: EvaluationStatus;
        card_status: CardStatus;
        result: EvaluationResult | null;
        evaluator_name: string;
        started_at: string;
        completed_at: string | null;
        sent_at: string | null;
      }>
    ).map(
      (row): PetEvaluationRow => ({
        id: row.id,
        status: row.status,
        cardStatus: row.card_status,
        result: row.result,
        evaluatorName: row.evaluator_name,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        sentAt: row.sent_at,
      }),
    ),
  );
}
