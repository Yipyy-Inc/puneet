import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { facilityToday, readRebookConfig } from "@/lib/rebook/config";
import { createServerClient } from "@/lib/supabase/server";
import type { QueuePayload, RebookDue } from "@/types/rebook";

// ============================================================================
// Who is coming due, and when we would write to them.
//
// ── IT IS THE LAPSED QUERY WITH THE WINDOW MOVED ──────────────────────────
//
// Same function, same exclusions: somebody with a booking already in the diary
// is absent from both lists, a dismissal hides them from both, an inactive
// client is chased by neither. `rebook_pipeline` returns `is_lapsed` rather
// than filtering on it, so this route keeps the false half and the lapsed
// route keeps the true half — one definition, two readings.
//
// Getting that wrong is not hypothetical: a Queue with its own copy of the
// exclusions would, the first time somebody fixed one of them, start offering
// staff a reminder for a client the Lapsed tab already knew had rebooked.
//
// ── NOTHING IS SCHEDULED ──────────────────────────────────────────────────
//
// This is a PROJECTION, not a list of pending sends. No `message_sends` row
// exists for anybody here — `scheduledSendOn` is arithmetic on their last visit
// and the facility's own interval, recomputed on every read. So a client who
// books tomorrow simply stops appearing, with nothing to cancel and no queue to
// go stale.
//
// The screen says so. Presenting a projection as a queue of scheduled messages
// would be the same lie the fixture told.
// ============================================================================

export const dynamic = "force-dynamic";

interface PipelineRow {
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
  due_on: string;
  lead_days: number;
  scheduled_send_on: string;
  is_lapsed: boolean;
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

  const asked = Number(new URL(request.url).searchParams.get("days") ?? 30);
  const daysAhead = Number.isFinite(asked)
    ? Math.min(Math.max(Math.trunc(asked), 1), 365)
    : 30;

  const supabase = await createServerClient();
  const [{ config, configured }, today] = await Promise.all([
    readRebookConfig(supabase, context.facilityId),
    facilityToday(supabase, context.facilityId),
  ]);

  // A due date `daysAhead` in the future is `days_overdue = -daysAhead`. No
  // upper bound: the lapsed half is dropped below by `is_lapsed`, which is per
  // service, so a fixed cutoff here would be wrong for any service whose grace
  // period differs.
  const { data, error } = await supabase.rpc("rebook_pipeline", {
    p_facility_id: context.facilityId,
    p_rules: config.services as never,
    p_today: today,
    p_min_overdue: -daysAhead,
    // Omitted rather than null: the generated RPC types model a Postgres
    // DEFAULT as an absent key. `p_max_overdue` defaults to NULL, so this is
    // the identical call - it just typechecks against the regenerated types.
    p_limit: 300,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = ((data ?? []) as PipelineRow[]).filter((r) => !r.is_lapsed);

  const payload: QueuePayload = {
    clients: rows.map(toDue),
    configured,
    remindersEnabledFor: Object.entries(config.services)
      .filter(([, rule]) => rule.remindersEnabled)
      .map(([service]) => service),
    daysAhead,
  };
  return NextResponse.json(payload);
}

function toDue(row: PipelineRow): RebookDue {
  return {
    clientId: row.client_id,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    service: row.service,
    lastVisitAt: row.last_visit_at,
    lastBookingId: row.last_booking_id,
    daysSince: Number(row.days_since),
    expectedDays: Number(row.expected_days),
    daysOverdue: Number(row.days_overdue),
    remindersSent: Number(row.reminders_sent),
    petName: row.pet_name,
    dueOn: row.due_on,
    leadDays: Number(row.lead_days),
    scheduledSendOn: row.scheduled_send_on,
  };
}
