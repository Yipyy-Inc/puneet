import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { channelConfigured } from "@/lib/messaging/send";
import { facilityToday, readRebookConfig } from "@/lib/rebook/config";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { LapsedClient, LapsedPayload } from "@/types/rebook";

// ============================================================================
// Who has not come back.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `lapsedClients` in src/data/rebook-reminders.ts: five hand-written people
// with hand-written `daysOverdue`, identical at every facility, and unchanged
// by anything anyone did. The screen has shown them since it was built.
//
// ── THE ARITHMETIC IS IN POSTGRES ─────────────────────────────────────────
//
// `lapsed_clients()` does the work — see 20260828185226. It has to: "the last
// completed booking per client per service" is a window query, and answering it
// here would mean fetching every booking a facility has ever taken. It is also
// where the four exclusions live, and the one that matters most (they already
// have a booking coming up) is the difference between a useful list and one
// that chases people who have already rebooked.
//
// ── TODAY IS THE FACILITY'S TODAY ─────────────────────────────────────────
//
// Computed here, on the facility's own clock, and passed in. `current_date` in
// the function would be UTC: at 20:00 in Montreal that is already tomorrow, so
// for four hours every evening everybody would read one day further overdue.
// Same lesson as the night-shift window; `wallClockParts` is the one conversion.
// ============================================================================

export const dynamic = "force-dynamic";

interface LapsedRow {
  client_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  service: string;
  last_visit_at: string;
  last_booking_id: string | null;
  days_since: number;
  expected_days: number;
  days_overdue: number;
  reminders_sent: number;
  pet_name: string | null;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  if (hasServiceRoleKey()) {
    // Best effort, exactly like the shipped templates: a seed failure means
    // Send would have nothing to send, not that the list cannot be shown.
    const { error: seedError } = await createAdminClient().rpc(
      "ensure_rebook_templates",
      { p_facility_id: context.facilityId },
    );
    if (seedError) {
      console.warn("[rebook] template seed skipped:", seedError.message);
    }
  }

  const supabase = await createServerClient();
  const [{ config, configured }, today] = await Promise.all([
    readRebookConfig(supabase, context.facilityId),
    facilityToday(supabase, context.facilityId),
  ]);

  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 200);

  const { data, error } = await supabase.rpc("lapsed_clients", {
    p_facility_id: context.facilityId,
    p_rules: config.services as never,
    p_today: today,
    p_limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 200,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const payload: LapsedPayload = {
    clients: ((data ?? []) as LapsedRow[]).map(toLapsedClient),
    configured,
    remindersEnabledFor: Object.entries(config.services)
      .filter(([, rule]) => rule.remindersEnabled)
      .map(([service]) => service),
    emailConfigured: channelConfigured("email"),
    smsConfigured: channelConfigured("sms"),
  };
  return NextResponse.json(payload);
}

function toLapsedClient(row: LapsedRow): LapsedClient {
  return {
    clientId: row.client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    service: row.service,
    lastVisitAt: row.last_visit_at,
    lastBookingId: row.last_booking_id,
    // PostgREST returns numeric as strings often enough that Number() here is
    // cheaper than finding out on a sort.
    daysSince: Number(row.days_since),
    expectedDays: Number(row.expected_days),
    daysOverdue: Number(row.days_overdue),
    remindersSent: Number(row.reminders_sent),
    petName: row.pet_name,
  };
}
