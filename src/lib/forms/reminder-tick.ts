import "server-only";

import { facilityCustomerOrigin } from "@/lib/app-host";
import { formSettingsFor, type FormSettings } from "@/lib/forms/notify";
import {
  reminderDue,
  reminderKey,
  reminderMessage,
} from "@/lib/forms/reminder";
import type { MissingForm } from "@/lib/forms/requirements";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";

// ============================================================================
// The missing-form reminders owed on this tick.
//
// Called from the messaging tick BEFORE `sendDueMessages()`, so what it queues
// goes out on the same tick. It never sends: it writes `message_sends` rows
// (source kind `form_reminder`), and the send pass applies suppression, quiet
// hours and lateness as it does for every message. A reminder about something
// the business requires is transactional, so a marketing opt-out does not
// stop it and the daily marketing cap does not count it.
//
// A booking is looked at when it is still ahead (pending, a request, or
// confirmed), starts within the facility's reminder window, the facility has
// `customer.missingRequiredFormsReminder` on, a form required before check-in
// is still missing, and the client has an email address. One reminder per
// booking and set of missing forms (reminderKey); a duplicate is the unique
// idempotency index doing its job.
// ============================================================================

const TICK_BATCH = 200;
/** The longest window the settings allow (720 days), as a query bound. */
const LONGEST_WINDOW_MS = 720 * 24 * 3_600_000;

export interface FormReminderTickResult {
  queued: number;
  problems: string[];
}

interface UpcomingBooking {
  id: string;
  facility_id: string;
  client_id: string;
  start_at: string;
}

export async function queueDueFormReminders(): Promise<FormReminderTickResult> {
  const result: FormReminderTickResult = { queued: 0, problems: [] };
  if (!hasServiceRoleKey()) {
    result.problems.push("no service-role key; no form reminders evaluated");
    return result;
  }
  const db = createAdminClient();
  const now = new Date();

  const { data: bookings, error } = await db
    .from("bookings")
    .select("id, facility_id, client_id, start_at")
    .in("status", ["pending", "request_submitted", "confirmed"])
    .gt("start_at", now.toISOString())
    .lt("start_at", new Date(now.getTime() + LONGEST_WINDOW_MS).toISOString())
    .order("start_at", { ascending: true })
    .limit(TICK_BATCH);
  if (error) {
    result.problems.push(`could not read upcoming bookings: ${error.message}`);
    return result;
  }

  const settingsByFacility = new Map<string, FormSettings>();
  for (const booking of (bookings ?? []) as UpcomingBooking[]) {
    try {
      let settings = settingsByFacility.get(booking.facility_id);
      if (!settings) {
        settings = await formSettingsFor(booking.facility_id);
        settingsByFacility.set(booking.facility_id, settings);
      }
      const { customer, reminder } = settings.notifications;
      if (!customer.missingRequiredFormsReminder) continue;
      if (!reminderDue(booking.start_at, now, reminder)) continue;
      if (await queueForBooking(db, booking)) result.queued += 1;
    } catch (failure) {
      const detail = failure instanceof Error ? failure.message : "unknown";
      result.problems.push(`form reminder ${booking.id}: ${detail}`);
    }
  }
  return result;
}

async function queueForBooking(
  db: ReturnType<typeof createAdminClient>,
  booking: UpcomingBooking,
): Promise<boolean> {
  const askMissing = db.rpc.bind(db) as unknown as (
    fn: "booking_missing_forms",
    args: { p_booking_id: string; p_stage: string },
  ) => PromiseLike<{
    data: MissingForm[] | null;
    error: { message: string } | null;
  }>;
  const { data: missing, error } = await askMissing("booking_missing_forms", {
    p_booking_id: booking.id,
    p_stage: "before_checkin",
  });
  if (error) throw new Error(error.message);
  if (!missing || missing.length === 0) return false;

  const [{ data: facilityRow }, { data: clientRow }] = await Promise.all([
    db
      .from("facilities")
      .select("name, slug, timezone")
      .eq("id", booking.facility_id)
      .maybeSingle(),
    db
      .from("clients")
      .select("name, email, preferred_language")
      .eq("id", booking.client_id)
      .maybeSingle(),
  ]);
  const facility = facilityRow as {
    name: string;
    slug: string | null;
    timezone: string | null;
  } | null;
  const client = clientRow as {
    name: string;
    email: string | null;
    preferred_language: string | null;
  } | null;

  const to = client?.email?.trim();
  if (!to || !facility) return false;
  const origin = facility.slug
    ? facilityCustomerOrigin(facility.slug, process.env.NEXT_PUBLIC_APP_DOMAIN)
    : null;
  if (!origin) return false;

  const message = reminderMessage({
    locale: client?.preferred_language?.startsWith("fr") ? "fr" : "en",
    clientName: client?.name ?? "",
    facilityName: facility.name,
    startAt: booking.start_at,
    timeZone: facility.timezone ?? DEFAULT_TIMEZONE,
    forms: missing.map((form) => ({
      name: form.form_name,
      url: `${origin}/forms/${encodeURIComponent(form.form_slug)}`,
      petName: form.pet_name,
    })),
  });

  const { error: insertError } = await db.from("message_sends").insert({
    facility_id: booking.facility_id,
    client_id: booking.client_id,
    channel: "email",
    to_address: to,
    source_kind: "form_reminder",
    source_id: booking.id,
    subject_rendered: message.subject,
    body_rendered: message.body,
    status: "queued",
    scheduled_for: new Date().toISOString(),
    provider: "resend",
    idempotency_key: reminderKey(
      booking.id,
      missing.map((form) => form.form_id),
    ),
  });
  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }
  return !insertError;
}
