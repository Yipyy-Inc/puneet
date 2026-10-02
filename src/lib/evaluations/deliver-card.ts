import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { escapeHtml, renderEmail } from "@/lib/email/shell";
import { evaluationCardMessage } from "@/lib/evaluations/card-message";
import type { EvaluationResult } from "@/lib/evaluations/questions";
import {
  deliveryReason,
  type DeliveryReason,
} from "@/lib/estimates/estimate-message";
import {
  normaliseEmail,
  normalisePhone,
  sendEmail,
  sendSms,
} from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";

// ============================================================================
// A sent evaluation report card, told to its owner by email and text — the
// channels the card went out on (`evaluations.sent_channels`, which the
// database kept to email and SMS and the portal always). The card is in the
// customer portal; the message is the way there.
//
// Through the one sender (lib/messaging/send) and the opt-out list first. A
// report card on a visit the owner booked is transactional: only an "all"
// suppression stops it. Nothing here throws — the card is already sent and
// the pet already unlocked when this runs; a message that cannot go is
// reported per channel as a reason code the staff screen words.
// ============================================================================

export interface CardDelivery {
  channel: "email" | "sms";
  sent: boolean;
  reason?: DeliveryReason;
}

interface Row {
  id: string;
  facility_id: string;
  result: EvaluationResult | null;
  sent_channels: string[] | null;
  pets: { name: string; sex: string | null } | null;
  clients: {
    name: string;
    email: string | null;
    phone: string | null;
    preferred_language: string | null;
  } | null;
  facilities: { name: string } | null;
}

export async function deliverEvaluationCard(
  supabase: SupabaseClient,
  input: {
    evaluationId: string;
    /** The facility's customer address, e.g. https://paws.yipyy.com */
    customerOrigin: string;
  },
): Promise<CardDelivery[]> {
  const { data } = await supabase
    .from("evaluations")
    .select(
      "id, facility_id, result, sent_channels, pets(name, sex), clients(name, email, phone, preferred_language), facilities(name)",
    )
    .eq("id", input.evaluationId)
    .maybeSingle();
  const row = data as unknown as Row | null;
  if (!row || !row.result || !row.pets || !row.clients) return [];

  const channels = (row.sent_channels ?? []).filter(
    (channel): channel is "email" | "sms" =>
      channel === "email" || channel === "sms",
  );
  if (channels.length === 0) return [];

  const locale = row.clients.preferred_language?.startsWith("fr") ? "fr" : "en";
  const link = `${input.customerOrigin}/customer/evaluations/${row.id}`;
  const message = evaluationCardMessage({
    locale,
    facilityName: row.facilities?.name ?? "",
    facilityOrigin: input.customerOrigin,
    clientName: row.clients.name,
    petName: row.pets.name,
    petSex:
      row.pets.sex === "male" || row.pets.sex === "female"
        ? row.pets.sex
        : null,
    result: row.result,
    link,
  });

  const results: CardDelivery[] = [];
  for (const channel of channels) {
    const raw = channel === "email" ? row.clients.email : row.clients.phone;
    if (!raw?.trim()) {
      results.push({ channel, sent: false, reason: "no_address" });
      continue;
    }
    const address =
      channel === "email" ? normaliseEmail(raw) : normalisePhone(raw);
    if (!address) {
      results.push({ channel, sent: false, reason: "invalid_address" });
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
              cta: { label: message.cta, url: link },
              footer: row.facilities?.name ?? "",
              origin: input.customerOrigin,
            }),
          })
        : await sendSms({ to: address, body: message.sms });
    results.push(
      delivery.sent
        ? { channel, sent: true }
        : { channel, sent: false, reason: deliveryReason(delivery.detail) },
    );
  }
  return results;
}
