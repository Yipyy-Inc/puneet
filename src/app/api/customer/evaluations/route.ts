import { NextResponse } from "next/server";

import type { OwnerCardListItem } from "@/lib/evaluations/owner-card-types";
import type { EvaluationResult } from "@/lib/evaluations/questions";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// GET /api/customer/evaluations — the owner's evaluation report cards, newest
// first: "Evaluations" on their report cards (the client's mock, 2026-10-02).
// Their own pets' SENT cards only, through public.my_evaluation_cards().
// ============================================================================

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  facility_id: string;
  pet_id: string;
  pet_name: string;
  result: EvaluationResult | null;
  completed_at: string | null;
  sent_at: string;
  opened_at: string | null;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("my_evaluation_cards", {});
  if (error) {
    return NextResponse.json(
      { error: "Your report cards could not be loaded." },
      { status: 500 },
    );
  }
  return NextResponse.json(
    ((data ?? []) as Row[]).map(
      (row): OwnerCardListItem => ({
        id: row.id,
        facilityId: row.facility_id,
        petId: row.pet_id,
        petName: row.pet_name,
        result: row.result,
        completedAt: row.completed_at,
        sentAt: row.sent_at,
        openedAt: row.opened_at,
      }),
    ),
  );
}
