import "server-only";

import { dispatchEvent } from "@/lib/messaging/dispatch";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { databaseNow } from "@/lib/supabase/db-clock";

// ============================================================================
// The day-before reminder (the booking wizard's "Text reminder — short
// reminder the day before", 2026-10-02).
//
// The switch was stored on every booking and nothing ever sent the message:
// `24h_before` had no emitter, so a facility's rule for it could not even be
// switched on. The messaging tick runs this every five minutes: each
// confirmed booking starting 20 to 28 hours from now, at a facility with a
// `24h_before` rule switched on, raises ONE event (`24h_before:<booking>`,
// deduplicated by the database) and is dispatched at once. The rule decides
// the channel and the words; the booking's own switches can turn either off
// (the dispatcher reads them for this kind as for the confirmation).
// ============================================================================

const WINDOW_START_MS = 20 * 3_600_000;
const WINDOW_END_MS = 28 * 3_600_000;
const BATCH = 200;

export async function queueDueBookingReminders(): Promise<{
  queued: number;
  problems: string[];
}> {
  const result = { queued: 0, problems: [] as string[] };
  if (!hasServiceRoleKey()) {
    result.problems.push("no service-role key; no booking reminders evaluated");
    return result;
  }
  const db = createAdminClient();

  const { data: rules, error: rulesError } = await db
    .from("automation_rules")
    .select("facility_id")
    .eq("trigger", "24h_before")
    .eq("enabled", true);
  if (rulesError) {
    result.problems.push(
      `could not read reminder rules: ${rulesError.message}`,
    );
    return result;
  }
  const facilities = [
    ...new Set((rules ?? []).map((r) => r.facility_id as string)),
  ];
  if (facilities.length === 0) return result;

  const now = await databaseNow(db);
  const { data: bookings, error } = await db
    .from("bookings")
    .select("id, facility_id, client_id, location_id")
    .in("facility_id", facilities)
    .eq("status", "confirmed")
    .gt("start_at", new Date(now.getTime() + WINDOW_START_MS).toISOString())
    .lt("start_at", new Date(now.getTime() + WINDOW_END_MS).toISOString())
    .order("start_at", { ascending: true })
    .limit(BATCH);
  if (error) {
    result.problems.push(
      `could not read tomorrow's bookings: ${error.message}`,
    );
    return result;
  }

  for (const booking of bookings ?? []) {
    const { data: emitted, error: emitError } = await db.rpc(
      "emit_automation_event",
      {
        p_facility_id: booking.facility_id,
        p_kind: "24h_before",
        p_dedupe_key: `24h_before:${booking.id}`,
        p_client_id: booking.client_id ?? undefined,
        p_booking_id: booking.id,
        ...(booking.location_id ? { p_location_id: booking.location_id } : {}),
      },
    );
    if (emitError) {
      result.problems.push(`reminder not raised: ${emitError.message}`);
      continue;
    }
    // Null: raised on an earlier tick. Whoever raised it dispatched it.
    if (emitted === null || emitted === undefined) continue;
    const dispatched = await dispatchEvent(emitted as number);
    result.queued += dispatched.sent + dispatched.queued;
    result.problems.push(...dispatched.problems);
  }
  return result;
}
