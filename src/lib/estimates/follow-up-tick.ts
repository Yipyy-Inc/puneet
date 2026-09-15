import "server-only";

import { facilityCustomerOrigin } from "@/lib/app-host";
import {
  dueFollowUp,
  followUpKey,
  followUpMessage,
} from "@/lib/estimates/follow-up";
import { formatList, formatMoney } from "@/lib/i18n/format";
import { normalisePhone } from "@/lib/messaging/send";
import {
  estimateFollowUpsSchema,
  NO_ESTIMATE_FOLLOW_UPS,
  type EstimateFollowUps,
} from "@/lib/settings/estimate-follow-ups";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// The estimate follow-ups owed on this tick.
//
// Called from the messaging tick BEFORE `sendDueMessages()`, so what it queues
// goes out on the same tick. It never sends: it writes `message_sends` rows
// (source kind `estimate_follow_up`), and the send pass applies suppression,
// quiet hours, the daily cap and lateness. A follow-up is NOT transactional —
// nobody is owed a nudge to buy — so a marketing opt-out stops it. The send
// pass also re-checks that the estimate is still open when the row goes out,
// because quiet hours can hold a reminder overnight.
//
// An estimate is looked at when it is open (`sent`), has a customer account
// (a guest cannot open the link, which is behind the customer's sign-in), and
// its facility has follow-ups on. Which reminder, and whether, is
// lib/estimates/follow-up.ts. A duplicate is the idempotency index doing its
// job.
// ============================================================================

const TICK_BATCH = 500;

export interface EstimateFollowUpTickResult {
  queued: number;
  problems: string[];
}

interface OpenEstimate {
  id: string;
  facility_id: string;
  client_id: string;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  expires_at: string | null;
  token: string;
  service: string | null;
  pet_ids: string[] | null;
  total: number | string | null;
}

type Admin = ReturnType<typeof createAdminClient>;

export async function queueDueEstimateFollowUps(): Promise<EstimateFollowUpTickResult> {
  const result: EstimateFollowUpTickResult = { queued: 0, problems: [] };
  if (!hasServiceRoleKey()) {
    result.problems.push(
      "no service-role key; no estimate follow-ups evaluated",
    );
    return result;
  }
  const db = createAdminClient();
  const now = new Date();

  const { data: settingsRows, error: settingsError } = await db
    .from("facility_settings")
    .select("facility_id, value")
    .eq("domain", "estimate_follow_ups");
  if (settingsError) {
    result.problems.push(
      `could not read estimate follow-up settings: ${settingsError.message}`,
    );
    return result;
  }

  // Only facilities that turned follow-ups on. With none, nothing is read.
  const settingsByFacility = new Map<string, EstimateFollowUps>();
  for (const row of (settingsRows ?? []) as {
    facility_id: string;
    value: unknown;
  }[]) {
    const parsed = estimateFollowUpsSchema.safeParse(row.value);
    const settings = parsed.success ? parsed.data : NO_ESTIMATE_FOLLOW_UPS;
    if (settings.enabled) settingsByFacility.set(row.facility_id, settings);
  }
  if (settingsByFacility.size === 0) return result;

  const { data: estimates, error } = await db
    .from("estimates")
    .select(
      "id, facility_id, client_id, status, sent_at, viewed_at, expires_at, token, service, pet_ids, total",
    )
    .eq("status", "sent")
    .in("facility_id", [...settingsByFacility.keys()])
    .not("client_id", "is", null)
    .not("sent_at", "is", null)
    .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
    .order("sent_at", { ascending: false })
    .limit(TICK_BATCH);
  if (error) {
    result.problems.push(`could not read open estimates: ${error.message}`);
    return result;
  }

  for (const estimate of (estimates ?? []) as OpenEstimate[]) {
    try {
      const settings = settingsByFacility.get(estimate.facility_id);
      if (!settings) continue;
      // Cheap first: most open estimates owe nothing on most ticks.
      if (
        !dueFollowUp(
          {
            status: estimate.status,
            sentAt: estimate.sent_at,
            viewedAt: estimate.viewed_at,
            expiresAt: estimate.expires_at,
          },
          settings,
          now,
          false,
        )
      ) {
        continue;
      }
      result.queued += await queueForEstimate(db, estimate, settings, now);
    } catch (failure) {
      const detail = failure instanceof Error ? failure.message : "unknown";
      result.problems.push(`estimate follow-up ${estimate.id}: ${detail}`);
    }
  }
  return result;
}

async function queueForEstimate(
  db: Admin,
  estimate: OpenEstimate,
  settings: EstimateFollowUps,
  now: Date,
): Promise<number> {
  const { count: bookedSince, error: bookingError } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("facility_id", estimate.facility_id)
    .eq("client_id", estimate.client_id)
    .gt("created_at", estimate.sent_at as string);
  if (bookingError) throw new Error(bookingError.message);

  const due = dueFollowUp(
    {
      status: estimate.status,
      sentAt: estimate.sent_at,
      viewedAt: estimate.viewed_at,
      expiresAt: estimate.expires_at,
    },
    settings,
    now,
    (bookedSince ?? 0) > 0,
  );
  if (!due) return 0;

  const [{ data: facilityRow }, { data: clientRow }, { data: petRows }] =
    await Promise.all([
      db
        .from("facilities")
        .select("name, slug")
        .eq("id", estimate.facility_id)
        .maybeSingle(),
      db
        .from("clients")
        .select("name, email, phone, preferred_language")
        .eq("id", estimate.client_id)
        .maybeSingle(),
      estimate.pet_ids && estimate.pet_ids.length > 0
        ? db.from("pets").select("name").in("id", estimate.pet_ids)
        : Promise.resolve({ data: [] }),
    ]);
  const facility = facilityRow as { name: string; slug: string | null } | null;
  const client = clientRow as {
    name: string | null;
    email: string | null;
    phone: string | null;
    preferred_language: string | null;
  } | null;
  if (!facility?.slug || !client) return 0;

  const origin = facilityCustomerOrigin(
    facility.slug,
    process.env.NEXT_PUBLIC_APP_DOMAIN,
  );
  if (!origin) return 0;

  const locale = client.preferred_language?.startsWith("fr") ? "fr" : "en";
  const rule = due.variant === "viewed" ? settings.viewed : settings.notViewed;
  const message = followUpMessage({
    locale,
    variant: due.variant,
    facilityName: facility.name,
    emailTemplate: rule.emailMessage,
    smsTemplate: rule.smsMessage,
    values: {
      customer_name: client.name?.trim() ?? "",
      pet_name: formatList(
        ((petRows ?? []) as { name: string }[]).map((pet) => pet.name),
        locale,
      ),
      service_name: estimate.service ?? "",
      estimate_total: formatMoney(Number(estimate.total ?? 0), locale),
      estimate_link: `${origin}/customer/estimates/${estimate.token}`,
    },
  });

  const rows = [];
  const email = client.email?.trim();
  if (rule.channel !== "sms" && email) {
    rows.push({
      channel: "email",
      to_address: email,
      subject_rendered: message.subject,
      body_rendered: message.email,
      provider: "resend",
      idempotency_key: followUpKey(estimate.id, due, "email"),
    });
  }
  const phone = client.phone ? normalisePhone(client.phone) : null;
  if (rule.channel !== "email" && phone) {
    rows.push({
      channel: "sms",
      to_address: phone,
      subject_rendered: null,
      body_rendered: message.sms,
      provider: "twilio",
      idempotency_key: followUpKey(estimate.id, due, "sms"),
    });
  }

  let queued = 0;
  for (const row of rows) {
    const { error } = await db.from("message_sends").insert({
      ...row,
      facility_id: estimate.facility_id,
      client_id: estimate.client_id,
      source_kind: "estimate_follow_up",
      source_id: estimate.id,
      status: "queued",
      scheduled_for: now.toISOString(),
    });
    if (!error) queued += 1;
    else if (error.code !== "23505") throw new Error(error.message);
  }
  return queued;
}
