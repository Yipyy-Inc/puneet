import "server-only";

import { facilityCustomerOrigin } from "@/lib/app-host";
import { expiryWarningMessage } from "@/lib/estimates/estimate-message";
import {
  expiryWarningDue,
  expiryWarningKey,
  storedEstimateSettings,
} from "@/lib/estimates/expiry-warning";
import { formatMoney } from "@/lib/i18n/format";
import type { EstimateSettings } from "@/lib/settings/estimates";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";

// ============================================================================
// The estimate expiry warnings owed on this tick.
//
// The defaults card has offered "Expiry warning email — remind the customer
// before their estimate expires" for as long as estimate settings have been
// stored, and nothing sent one. Called from the messaging tick before the send
// pass, like the follow-ups: it writes `message_sends` rows under the
// `estimate_follow_up` source kind, so the send pass drops a warning whose
// estimate was accepted, declined or expired while it waited, and applies
// quiet hours, the cap and opt-outs.
//
// Only facilities with a STORED `estimate_settings` row with the switch on —
// see lib/estimates/expiry-warning.ts for why the default does not count.
// Email only, to an estimate with a client and an address.
// ============================================================================

const TICK_BATCH = 500;

export interface ExpiryWarningTickResult {
  queued: number;
  problems: string[];
}

interface OpenEstimate {
  id: string;
  facility_id: string;
  client_id: string;
  status: string;
  expires_at: string;
  token: string;
  estimate_number: string;
  service: string;
  total: number | string;
  pet_ids: string[] | null;
  clients: {
    name: string;
    email: string | null;
    preferred_language: string | null;
  } | null;
  facilities: {
    name: string;
    slug: string | null;
    timezone: string | null;
  } | null;
}

export async function queueDueEstimateExpiryWarnings(): Promise<ExpiryWarningTickResult> {
  const result: ExpiryWarningTickResult = { queued: 0, problems: [] };
  if (!hasServiceRoleKey()) {
    result.problems.push("no service-role key; no expiry warnings evaluated");
    return result;
  }
  const db = createAdminClient();
  const now = new Date();

  const { data: settingsRows, error: settingsError } = await db
    .from("facility_settings")
    .select("facility_id, value")
    .eq("domain", "estimate_settings");
  if (settingsError) {
    result.problems.push(
      `could not read estimate settings: ${settingsError.message}`,
    );
    return result;
  }
  const byFacility = new Map<string, EstimateSettings>();
  for (const row of (settingsRows ?? []) as {
    facility_id: string;
    value: unknown;
  }[]) {
    const settings = storedEstimateSettings(row.value);
    if (settings?.expiryWarningEnabled)
      byFacility.set(row.facility_id, settings);
  }
  if (byFacility.size === 0) return result;

  // The widest window any of these facilities asked for bounds the read.
  const widestHours = Math.max(
    ...[...byFacility.values()].map((s) => s.expiryWarningHoursBefore),
  );
  const { data: estimates, error } = await db
    .from("estimates")
    .select(
      "id, facility_id, client_id, status, expires_at, token, estimate_number, service, total, pet_ids, clients ( name, email, preferred_language ), facilities ( name, slug, timezone )",
    )
    .eq("status", "sent")
    .in("facility_id", [...byFacility.keys()])
    .not("client_id", "is", null)
    .gt("expires_at", now.toISOString())
    .lte(
      "expires_at",
      new Date(
        now.getTime() + Math.max(1, widestHours) * 3_600_000,
      ).toISOString(),
    )
    .limit(TICK_BATCH);
  if (error) {
    result.problems.push(`could not read expiring estimates: ${error.message}`);
    return result;
  }

  for (const estimate of (estimates ?? []) as unknown as OpenEstimate[]) {
    try {
      const settings = byFacility.get(estimate.facility_id) ?? null;
      if (
        !expiryWarningDue(
          { status: estimate.status, expiresAt: estimate.expires_at },
          settings,
          now,
        )
      ) {
        continue;
      }
      const email = estimate.clients?.email?.trim();
      const slug = estimate.facilities?.slug;
      const origin = slug
        ? facilityCustomerOrigin(slug, process.env.NEXT_PUBLIC_APP_DOMAIN)
        : null;
      if (!email || !origin) continue;

      const { data: pets } =
        estimate.pet_ids && estimate.pet_ids.length > 0
          ? await db.from("pets").select("name").in("id", estimate.pet_ids)
          : { data: [] };
      const locale = estimate.clients?.preferred_language?.startsWith("fr")
        ? "fr"
        : "en";
      const message = expiryWarningMessage({
        locale,
        facilityName: estimate.facilities?.name ?? "",
        facilityOrigin: origin,
        clientName: estimate.clients?.name ?? "",
        number: estimate.estimate_number,
        service: estimate.service,
        petNames: ((pets ?? []) as { name: string }[]).map((p) => p.name),
        total: formatMoney(Number(estimate.total), locale),
        expiresAt: estimate.expires_at,
        timeZone: estimate.facilities?.timezone ?? DEFAULT_TIMEZONE,
        link: `${origin}/customer/estimates/${estimate.token}`,
      });

      const { error: insertError } = await db.from("message_sends").insert({
        facility_id: estimate.facility_id,
        client_id: estimate.client_id,
        channel: "email",
        to_address: email,
        source_kind: "estimate_follow_up",
        source_id: estimate.id,
        subject_rendered: message.subject,
        body_rendered: message.text,
        status: "queued",
        scheduled_for: now.toISOString(),
        provider: "resend",
        idempotency_key: expiryWarningKey(estimate.id, estimate.expires_at),
      });
      if (!insertError) result.queued += 1;
      else if (insertError.code !== "23505") {
        throw new Error(insertError.message);
      }
    } catch (failure) {
      const detail = failure instanceof Error ? failure.message : "unknown";
      result.problems.push(`expiry warning ${estimate.id}: ${detail}`);
    }
  }
  return result;
}
