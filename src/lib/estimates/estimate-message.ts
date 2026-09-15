import { formatCalendarDayLong } from "@/lib/i18n/format";
import { wallClockParts } from "@/lib/time/facility-time";

// ============================================================================
// What a customer receives about an estimate: the estimate itself when staff
// press Send, and the warning before it expires. Pure, so the words are
// unit-tested; lib/estimates/deliver-estimate.ts and expiry-warning-tick.ts
// do the reading and the sending.
//
// ── SIGNING IN IS PART OF THE MESSAGE ─────────────────────────────────────
//
// The link opens a page behind the customer's sign-in, and a guest has no
// account yet. So the message says how to reach it: sign in, or create an
// account, with the address it was sent to. Their estimate is waiting on
// their dashboard once they do (the send attached it to a client with that
// address, and joining the facility claims that client).
// ============================================================================

export type MessageLocale = "en" | "fr";

/**
 * Why a message was not sent, as a code the staff screen words in the
 * viewer's language — never the provider's English sentence.
 */
export type DeliveryReason =
  | "no_address"
  | "invalid_address"
  | "opted_out"
  | "not_configured"
  | "failed";

export interface EstimateDelivery {
  channel: "email" | "sms";
  sent: boolean;
  /** The address it went to, when there was one. */
  to?: string;
  reason?: DeliveryReason;
}

/** A sender's English detail, as a reason code. */
export function deliveryReason(detail: string | undefined): DeliveryReason {
  if (!detail) return "failed";
  if (/no (email|SMS) service configured/i.test(detail)) {
    return "not_configured";
  }
  if (/not valid/i.test(detail)) return "invalid_address";
  return "failed";
}

export interface EstimateMessageInput {
  locale: MessageLocale;
  facilityName: string;
  /** The facility's customer address, where an account is created. */
  facilityOrigin: string;
  clientName: string;
  number: string;
  service: string;
  petNames: string[];
  /** Already formatted in the customer's locale. */
  total: string;
  expiresAt: string | null;
  timeZone: string;
  link: string;
}

const NB = " ";

function greeting(locale: MessageLocale, name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  if (locale === "fr") return first ? `Bonjour ${first},` : "Bonjour,";
  return first ? `Hi ${first},` : "Hello,";
}

function expiryDay(input: EstimateMessageInput): string | null {
  if (!input.expiresAt) return null;
  return formatCalendarDayLong(
    wallClockParts(input.expiresAt, input.timeZone).date,
    input.locale,
  );
}

function what(input: EstimateMessageInput): string {
  const pets = new Intl.ListFormat(input.locale === "fr" ? "fr-CA" : "en-CA", {
    type: "conjunction",
  }).format(input.petNames.filter(Boolean));
  if (!pets) return input.service;
  return input.locale === "fr"
    ? `${input.service} pour ${pets}`
    : `${input.service} for ${pets}`;
}

/** The estimate itself, sent when staff press Send. */
export function estimateMessage(input: EstimateMessageInput): {
  subject: string;
  text: string;
  sms: string;
} {
  const day = expiryDay(input);
  if (input.locale === "fr") {
    return {
      subject: `${input.facilityName}${NB}: estimation ${input.number}`,
      text: [
        greeting("fr", input.clientName),
        "",
        `${input.facilityName} vous a envoyé l’estimation ${input.number}${NB}: ${what(input)}, ${input.total}.`,
        ...(day ? [`Elle est valide jusqu’au ${day}.`] : []),
        "",
        `Consultez-la et acceptez-la ici${NB}: ${input.link}`,
        "",
        `Pour l’ouvrir, connectez-vous avec cette adresse courriel, ou créez un compte avec elle sur ${input.facilityOrigin}.`,
      ].join("\n"),
      sms: `${input.facilityName}${NB}: estimation ${input.number}, ${input.total}. ${input.link}`,
    };
  }
  return {
    subject: `${input.facilityName}: estimate ${input.number}`,
    text: [
      greeting("en", input.clientName),
      "",
      `${input.facilityName} sent you estimate ${input.number}: ${what(input)}, ${input.total}.`,
      ...(day ? [`It is open until ${day}.`] : []),
      "",
      `View it and accept it here: ${input.link}`,
      "",
      `To open it, sign in with this email address, or create an account with it at ${input.facilityOrigin}.`,
    ].join("\n"),
    sms: `${input.facilityName}: estimate ${input.number}, ${input.total}. ${input.link}`,
  };
}

/** The warning before an open estimate expires. Email only. */
export function expiryWarningMessage(input: EstimateMessageInput): {
  subject: string;
  text: string;
} {
  const day = expiryDay(input) ?? "";
  if (input.locale === "fr") {
    return {
      subject: `Votre estimation de ${input.facilityName} expire le ${day}`,
      text: [
        greeting("fr", input.clientName),
        "",
        `L’estimation ${input.number} (${what(input)}, ${input.total}) expire le ${day}.`,
        "",
        `Consultez-la et acceptez-la ici${NB}: ${input.link}`,
      ].join("\n"),
    };
  }
  return {
    subject: `Your estimate from ${input.facilityName} expires ${day}`,
    text: [
      greeting("en", input.clientName),
      "",
      `Estimate ${input.number} (${what(input)}, ${input.total}) expires on ${day}.`,
      "",
      `View it and accept it here: ${input.link}`,
    ].join("\n"),
  };
}
