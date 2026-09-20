import { NextResponse } from "next/server";

import { bookingCareEntries } from "@/lib/daily-care/booking-care-entries";
import {
  CARE_OVERRIDE_REASON_REQUIRED,
  getPendingCareItems,
  type PendingCareItem,
} from "@/lib/care-completion";
import type { CareLogEntry } from "@/app/api/care-log/route";
import type { Booking } from "@/types/booking";
import type { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The question a CHECK-OUT asks when today's meals or doses are not logged —
// asked by the route that writes the departure, so every surface asks it.
//
// ── WHY THIS IS ON THE SERVER ─────────────────────────────────────────────
//
// It was on ONE SCREEN. `getPendingCareItems` ran in the booking detail page
// and nowhere else, so the gate existed only for staff who checked a guest out
// from that page. The kennel board's own checkout, the daily care board, the
// kiosk and the calendar wrote the departure straight through and never asked
// — three of the four ways a pet actually leaves the building. A rule enforced
// by one screen is not a rule, it is a habit of that screen.
//
// ── ONE ANSWER, NOT A SECOND IMPLEMENTATION ───────────────────────────────
//
// This calls the SAME `bookingCareEntries` + `getPendingCareItems` the panels
// and the page's own dialog call. That is deliberate: the last time this gate
// was wrong it was because two pieces of code disagreed about which fields
// hold a booking's care (the gate read the fixture CHECKLIST fields, the
// panels read what the owner actually gave), so the gate never fired on a real
// booking. Re-deriving "what is pending" in SQL would recreate exactly that.
//
// ── THE SHAPE, WHICH IS require-forms.ts's ────────────────────────────────
//
// Returns a refusal to hand back, or null when the check-out may proceed. A
// reason turns the refusal into a recorded override (the same append-only
// `record_care_gate_override` the booking page already posts to), so going
// ahead is a decision somebody's name is on rather than a dialog dismissed.
// ============================================================================

type ServerClient = Awaited<ReturnType<typeof createServerClient>>;

type UntypedRpc = (
  fn: "record_care_gate_override",
  args: Record<string, unknown>,
) => PromiseLike<{
  data: unknown;
  error: { code?: string; message: string } | null;
}>;

// The code the screens branch on. Defined in care-completion.ts so a client
// module can read it without importing this server-only file.
export { CARE_OVERRIDE_REASON_REQUIRED } from "@/lib/care-completion";

interface BookingCareRow {
  id: string;
  ref: number;
  details: Record<string, unknown> | null;
  facilities?: { timezone: string | null } | null;
}

/** Today where the pet is, not where the server is. */
function facilityDay(timeZone: string | null): string {
  const now = new Date();
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone ?? undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  }
}

/**
 * A refusal to return, or null when the check-out may go ahead.
 *
 * `reason` is what staff typed into the gate dialog. Empty or absent means
 * they have not been asked yet.
 */
export async function requireCareLogged(
  supabase: ServerClient,
  bookingRef: number,
  reason: string | undefined,
): Promise<NextResponse | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, ref, details, facilities(timezone)")
    .eq("ref", bookingRef)
    .maybeSingle();

  // A booking the caller cannot see is not this gate's refusal to give — the
  // writer underneath has its own, and it says the right thing.
  if (error || !data) return null;
  const booking = data as unknown as BookingCareRow;

  const details = (booking.details ?? {}) as Partial<
    Pick<
      Booking,
      | "feedingInstructions"
      | "feedingSchedule"
      | "medicationInstructions"
      | "medications"
    >
  >;

  // No care asked for means nothing to gate, and no reason to pay for a
  // second query on every check-out of every day guest.
  const asksForCare =
    Boolean(details.feedingInstructions?.length) ||
    Boolean(details.feedingSchedule?.length) ||
    Boolean(details.medicationInstructions?.length) ||
    Boolean(details.medications?.length);
  if (!asksForCare) return null;

  // The facility's own day, not the server's: a check-out at 20:00 in Montreal
  // is the next calendar day in UTC, and "today's meals" would come back empty.
  const day = facilityDay(booking.facilities?.timezone ?? null);

  const { data: logRows } = await supabase
    .from("care_log_entries")
    .select(
      "id, task_key, task_type, occurred_on, executed_at, served_at, outcome, notes, details, recorded_by_name, created_at, bookings!inner(ref), pets(ref)",
    )
    .eq("bookings.ref", bookingRef)
    .eq("occurred_on", day);

  type LogRow = {
    id: string;
    task_key: string;
    task_type: CareLogEntry["taskType"];
    occurred_on: string;
    executed_at: string;
    served_at: string | null;
    outcome: string;
    notes: string | null;
    details: Record<string, unknown> | null;
    recorded_by_name: string | null;
    created_at: string;
    bookings?: { ref: number } | null;
    pets?: { ref: number } | null;
  };

  const careLog: CareLogEntry[] = ((logRows ?? []) as unknown as LogRow[]).map(
    (row) => ({
      id: row.id,
      bookingRef: row.bookings?.ref ?? booking.ref,
      petRef: row.pets?.ref ?? null,
      taskKey: row.task_key,
      taskType: row.task_type,
      occurredOn: row.occurred_on,
      executedAt: row.executed_at.slice(0, 5),
      servedAt: row.served_at ? row.served_at.slice(0, 5) : null,
      outcome: row.outcome,
      notes: row.notes,
      details: row.details ?? {},
      recordedByName: row.recorded_by_name,
      createdAt: row.created_at,
    }),
  );

  const entries = bookingCareEntries(
    details as Parameters<typeof bookingCareEntries>[0],
    careLog,
    day,
  );

  // Incidents are the booking page's third source. They are not read here:
  // in-stay incident care is still fixture-backed (see the debt map), so
  // asking for it from a route would refuse check-outs over care the database
  // does not hold. Meals and doses are real rows and are gated.
  const { pending, hasCritical } = getPendingCareItems(
    entries.feeding,
    entries.medication,
  );
  if (pending.length === 0) return null;

  const given = reason?.trim() ?? "";
  if (!given) {
    return NextResponse.json(
      {
        error: "Today's care is not logged for this stay.",
        code: CARE_OVERRIDE_REASON_REQUIRED,
        pending,
        hasCritical,
      },
      { status: 422 },
    );
  }

  const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;
  const { error: overrideError } = await rpc("record_care_gate_override", {
    p_booking_id: booking.id,
    p_reason: given,
    p_items: pending.map((item: PendingCareItem) => ({
      kind: item.kind,
      label: item.label,
      critical: Boolean(item.isCritical),
    })),
  });
  if (overrideError) {
    const status =
      overrideError.code === "42501"
        ? 403
        : overrideError.code === "22023"
          ? 422
          : 500;
    return NextResponse.json({ error: overrideError.message }, { status });
  }

  return null;
}
