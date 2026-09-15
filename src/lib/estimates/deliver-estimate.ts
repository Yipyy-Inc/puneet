import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  deliveryReason,
  estimateMessage,
  type EstimateDelivery,
} from "@/lib/estimates/estimate-message";
import { escapeHtml, renderEmail } from "@/lib/email/shell";
import { formatMoney } from "@/lib/i18n/format";
import {
  normaliseEmail,
  normalisePhone,
  sendEmail,
  sendSms,
} from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";

// ============================================================================
// The estimate, sent to the customer when staff press Send.
//
// "Send" used to open the estimate and copy its link, and send nothing — the
// screen said so, which was honest, and meant a customer heard about their
// quote only if somebody pasted the link into an email by hand.
//
// Through the one sender (`lib/messaging/send`) and the opt-out list first,
// like the pay link. A quote the customer asked for is transactional: only an
// "all" suppression stops it. Nothing here throws — the estimate is already
// open by the time this runs, and a message that cannot go is reported per
// channel as a reason code the staff screen words.
// ============================================================================

interface Row {
  estimate_number: string;
  service: string;
  total: number | string;
  expires_at: string | null;
  token: string;
  facility_id: string;
  pet_ids: string[] | null;
  guest: {
    name?: string;
    email?: string;
    phone?: string;
    pet?: { name?: string };
  } | null;
  clients: {
    name: string;
    email: string | null;
    phone: string | null;
    preferred_language: string | null;
  } | null;
  facilities: { name: string; timezone: string | null } | null;
}

export async function deliverEstimate(
  supabase: SupabaseClient,
  input: {
    estimateId: string;
    via: "email" | "sms" | "both";
    /** The facility's customer address, e.g. https://paws.yipyy.com */
    customerOrigin: string;
  },
): Promise<EstimateDelivery[]> {
  const { data } = await supabase
    .from("estimates")
    .select(
      "estimate_number, service, total, expires_at, token, facility_id, pet_ids, guest, clients ( name, email, phone, preferred_language ), facilities ( name, timezone )",
    )
    .eq("id", input.estimateId)
    .maybeSingle();
  const row = data as unknown as Row | null;
  const channels: ("email" | "sms")[] =
    input.via === "both" ? ["email", "sms"] : [input.via];
  if (!row)
    return channels.map((channel) => ({
      channel,
      sent: false,
      reason: "failed",
    }));

  const { data: pets } =
    row.pet_ids && row.pet_ids.length > 0
      ? await supabase.from("pets").select("name").in("id", row.pet_ids)
      : { data: [] };
  const petNames = ((pets ?? []) as { name: string }[]).map((p) => p.name);
  if (petNames.length === 0 && row.guest?.pet?.name) {
    petNames.push(row.guest.pet.name);
  }

  const locale = row.clients?.preferred_language?.startsWith("fr")
    ? "fr"
    : "en";
  const link = `${input.customerOrigin}/customer/estimates/${row.token}`;
  const message = estimateMessage({
    locale,
    facilityName: row.facilities?.name ?? "",
    facilityOrigin: input.customerOrigin,
    clientName: row.clients?.name ?? row.guest?.name ?? "",
    number: row.estimate_number,
    service: row.service,
    petNames,
    total: formatMoney(Number(row.total), locale),
    expiresAt: row.expires_at,
    timeZone: row.facilities?.timezone ?? DEFAULT_TIMEZONE,
    link,
  });

  const results: EstimateDelivery[] = [];
  for (const channel of channels) {
    const raw =
      channel === "email"
        ? (row.clients?.email ?? row.guest?.email)
        : (row.clients?.phone ?? row.guest?.phone);
    if (!raw?.trim()) {
      results.push({ channel, sent: false, reason: "no_address" });
      continue;
    }
    const address =
      channel === "email" ? normaliseEmail(raw) : normalisePhone(raw);
    if (!address) {
      results.push({
        channel,
        sent: false,
        to: raw,
        reason: "invalid_address",
      });
      continue;
    }

    const suppression = await isSuppressed(supabase, {
      facilityId: row.facility_id,
      channel,
      address,
      isTransactional: true,
    });
    if (suppression.suppressed) {
      results.push({
        channel,
        sent: false,
        to: address,
        reason:
          suppression.reason === "invalid_address"
            ? "invalid_address"
            : "opted_out",
      });
      continue;
    }

    const delivery =
      channel === "email"
        ? await sendEmail({
            to: address,
            subject: message.subject,
            text: message.text,
            html: renderEmail({
              preheader: message.subject,
              heading: message.subject,
              paragraphs: message.text
                .split("\n\n")
                .map((paragraph) =>
                  escapeHtml(paragraph).replace(/\n/g, "<br>"),
                ),
              cta: { label: row.estimate_number, url: link },
              footer: row.facilities?.name ?? "",
              origin: input.customerOrigin,
            }),
          })
        : await sendSms({ to: address, body: message.sms });

    results.push(
      delivery.sent
        ? { channel, sent: true, to: address }
        : {
            channel,
            sent: false,
            to: address,
            reason: deliveryReason(delivery.detail),
          },
    );
  }
  return results;
}
