import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  REPORT_CARD_SELECT,
  rowToReportCard,
  type ReportCardRow,
} from "@/lib/api/mappers/report-card";

// ============================================================================
// Sending a report card.
//
// A FACILITY action, which is why it is not one of the actions on
// [id]/route.ts — that file is the OWNER's four writes, and mixing the two
// actors into one dispatcher would make "who may do this" a property of a
// switch statement rather than of a policy.
//
// Authorised by `report_cards_update`, which requires the send permission for
// THAT CARD'S SERVICE. Nothing is checked here.
//
// ── WHAT "SENT" MEANS, AND WHAT IT DOES NOT ────────────────────────────────
//
// It means the card is now visible in the owner's portal: the customer's list
// asks for `delivery_status = 'sent'`, so this is the moment it appears.
//
// It does NOT mean an email or an SMS was transmitted. Nothing in this product
// sends one for a report card. The code this replaced pushed onto an in-memory
// array and told the facility "Delivered via email, SMS" — a claim with no
// sender behind it, which survived `check:success-claims` only because the
// fake returned a non-empty list of channel names.
//
// When a real transport is wired, it belongs here, after the row is updated,
// and its result belongs in the response rather than in a toast written in
// advance.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("report_cards")
    .update({
      delivery_status: "sent",
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    // Already-sent cards are excluded so a second press cannot rewrite the
    // delivery time. It also makes the "no rows" answer below unambiguous:
    // refused, missing, or already sent — none of which is a success.
    .neq("delivery_status", "sent")
    // `.select()` so an RLS refusal is distinguishable from a no-op. Without
    // it PostgREST answers 204 for an update that changed nothing, and the
    // screen would report a delivery that did not happen — see
    // check:rls-writes.
    .select(REPORT_CARD_SELECT)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      {
        error:
          "That report card could not be sent — it may already have been sent, or not be yours to send.",
      },
      { status: 403 },
    );
  }

  return NextResponse.json(rowToReportCard(data as unknown as ReportCardRow));
}
