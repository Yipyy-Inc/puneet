import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { formatMoney } from "@/lib/i18n/format";
import { sendEmail, sendSms } from "@/lib/messaging/send";
import { isSuppressed } from "@/lib/messaging/suppression";
import type { DepositPlan } from "@/lib/payments/deposit-shares";
import type { DepositRow } from "@/lib/payments/booking-deposit-server";
import { facilityTaxConfig, taxToAddCents } from "@/lib/payments/booking-tax";
import { facilityCustomerLinkOrigin } from "@/lib/public-origin";

// ============================================================================
// The link a client pays a deposit from (the booking wizard's "Send payment
// link", 2026-10-02, and the fallback when a card on file is refused at
// confirmation): /pay/{ref}?deposit=1, one per part the deposit lands on —
// the pay page and the card route work the share out again themselves, so
// the link carries no amount.
// ============================================================================

export async function sendDepositLinks(input: {
  admin: SupabaseClient;
  rows: readonly DepositRow[];
  plan: DepositPlan;
  channel: "email" | "sms";
  request: Request;
}): Promise<{ sent: boolean; detail?: string; to?: string }> {
  const first = input.rows[0];
  if (!first || input.plan.shares.length === 0) {
    return { sent: false, detail: "No deposit is due on this booking." };
  }
  const { data: client } = await input.admin
    .from("clients")
    .select("name, email, phone, preferred_language")
    .eq("id", first.client_id)
    .maybeSingle();
  const { data: facility } = await input.admin
    .from("facilities")
    .select("name, slug")
    .eq("id", first.facility_id)
    .maybeSingle();
  const person = client as {
    name: string;
    email: string | null;
    phone: string | null;
    preferred_language: string | null;
  } | null;
  const address =
    input.channel === "email" ? person?.email?.trim() : person?.phone?.trim();
  if (!person || !address) {
    return {
      sent: false,
      detail:
        input.channel === "email"
          ? "This client has no email address on file."
          : "This client has no phone number on file.",
    };
  }
  const suppression = await isSuppressed(input.admin, {
    facilityId: first.facility_id,
    channel: input.channel,
    address,
    isTransactional: true,
  });
  if (suppression.suppressed) {
    return {
      sent: false,
      detail: "This client has opted out of these messages.",
    };
  }

  const french = Boolean(person.preferred_language?.startsWith("fr"));
  const origin = facilityCustomerLinkOrigin(
    (facility as { slug: string | null } | null)?.slug,
    input.request,
  );
  const taxConfig = await facilityTaxConfig(input.admin, first.facility_id);
  const lines = input.plan.shares.map((share) => {
    const row = input.rows.find((r) => r.id === share.bookingId) ?? first;
    const subtotalCents = Math.round(share.amount * 100);
    const totalCents =
      subtotalCents + taxToAddCents(taxConfig, subtotalCents, row);
    return {
      ref: share.ref,
      amount: formatMoney(totalCents / 100, french ? "fr" : "en"),
      link: `${origin}/pay/${share.ref}?deposit=1`,
    };
  });

  const NB = " ";
  const facilityName = (facility as { name: string } | null)?.name ?? "";
  const firstName = person.name.split(/\s+/)[0] ?? person.name;
  const listed = lines
    .map((line) =>
      french
        ? `n° ${line.ref}, ${line.amount}${NB}: ${line.link}`
        : `#${line.ref}, ${line.amount}: ${line.link}`,
    )
    .join("\n");
  const subject = french
    ? `${facilityName}${NB}: dépôt à payer`
    : `${facilityName}: deposit to pay`;
  const text = french
    ? `Bonjour ${firstName}, ${facilityName} demande un dépôt pour votre réservation. Payez en ligne${NB}:\n${listed}`
    : `Hi ${firstName}, ${facilityName} asks for a deposit on your booking. Pay online:\n${listed}`;

  const result =
    input.channel === "sms"
      ? await sendSms({ to: address, body: text })
      : await sendEmail({
          to: address,
          subject,
          text,
          html: `<p>${escapeHtml(text.split("\n")[0])}</p><ul>${lines
            .map(
              (line) =>
                `<li>${escapeHtml(french ? `n° ${line.ref}` : `#${line.ref}`)} · ${escapeHtml(line.amount)} — <a href="${escapeHtml(line.link)}">${escapeHtml(line.link)}</a></li>`,
            )
            .join("")}</ul>`,
        });
  return { ...result, to: address };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
