import type { EstimateFollowUps } from "@/lib/settings/estimate-follow-ups";

// ============================================================================
// Which reminder an estimate is owed, and what it says. Pure, so the timing,
// the key and the words are unit-tested; lib/estimates/follow-up-tick.ts does
// the reading and the queueing.
//
// ── WHEN ──────────────────────────────────────────────────────────────────
//
// An open estimate nobody has opened is owed the NOT-VIEWED reminder every
// `delayDays` after it was sent; once opened, the VIEWED one every `delayDays`
// after it was opened. Each stops at its `maxFollowUps`. Nothing is owed once
// the estimate is accepted, declined, converted or expired, or once the
// customer has booked anything since it was sent — a reminder after any of
// those is the business nagging somebody who already answered.
//
// ── ONCE ──────────────────────────────────────────────────────────────────
//
// The key names the estimate, the reminder, its anchor and its number, so a
// tick every five minutes queues each reminder once, and a re-sent estimate
// (a new `sent_at`) starts its count again. After an outage only the latest
// reminder due is queued, never a burst of the ones missed.
// ============================================================================

export type FollowUpVariant = "not_viewed" | "viewed";

export interface FollowUpEstimate {
  status: string;
  sentAt: string | null;
  viewedAt: string | null;
  expiresAt: string | null;
}

export interface DueFollowUp {
  variant: FollowUpVariant;
  /** 1 for the first reminder of this variant. */
  number: number;
  /** The instant the delay counts from: sent, or viewed. */
  anchor: string;
}

const DAY_MS = 86_400_000;

export function dueFollowUp(
  estimate: FollowUpEstimate,
  settings: EstimateFollowUps,
  now: Date,
  bookedSince: boolean,
): DueFollowUp | null {
  if (!settings.enabled || bookedSince) return null;
  if (estimate.status !== "sent" || !estimate.sentAt) return null;
  if (estimate.expiresAt && Date.parse(estimate.expiresAt) <= now.getTime()) {
    return null;
  }

  const variant: FollowUpVariant = estimate.viewedAt ? "viewed" : "not_viewed";
  const rule = variant === "viewed" ? settings.viewed : settings.notViewed;
  const anchor = estimate.viewedAt ?? estimate.sentAt;
  if (!rule.enabled) return null;

  const from = Date.parse(anchor);
  if (Number.isNaN(from)) return null;
  const periods = Math.floor(
    (now.getTime() - from) / (rule.delayDays * DAY_MS),
  );
  const number = Math.min(rule.maxFollowUps, periods);
  return number >= 1 ? { variant, number, anchor } : null;
}

export function followUpKey(
  estimateId: string,
  due: DueFollowUp,
  channel: "email" | "sms",
): string {
  const anchor = Math.floor(Date.parse(due.anchor) / 1000);
  return `estimate_follow_up:${estimateId}:${due.variant}:${anchor}:${due.number}:${channel}`;
}

// ── THE WORDS ─────────────────────────────────────────────────────────────
//
// The standard messages, in the customer's language. The settings screen shows
// the same sentences (settings.sections.estimate-settings) as the placeholder
// for an empty message; keep the two in step.

const COPY = {
  en: {
    subject: {
      not_viewed: (facility: string) => `Your estimate from ${facility}`,
      viewed: (facility: string) =>
        `Your estimate from ${facility} is still open`,
    },
    email: {
      not_viewed:
        "Hi {{customer_name}}, we sent you an estimate for {{service_name}}. You can view it here: {{estimate_link}}. Contact us if you have any questions.",
      viewed:
        "Hi {{customer_name}}, thank you for looking at the estimate for {{pet_name}}. When you are ready, you can accept it here: {{estimate_link}}. Contact us if you would like anything changed.",
    },
    sms: {
      not_viewed:
        "Hi {{customer_name}}, your estimate for {{service_name}} is ready: {{estimate_link}}",
      viewed:
        "Hi {{customer_name}}, ready to book {{pet_name}}? Your estimate: {{estimate_link}}",
    },
  },
  fr: {
    subject: {
      not_viewed: (facility: string) => `Votre estimation de ${facility}`,
      viewed: (facility: string) =>
        `Votre estimation de ${facility} est toujours ouverte`,
    },
    email: {
      not_viewed:
        "Bonjour {{customer_name}}, nous vous avons envoyé une estimation pour {{service_name}}. Vous pouvez la consulter ici : {{estimate_link}}. Communiquez avec nous si vous avez des questions.",
      viewed:
        "Bonjour {{customer_name}}, merci d’avoir consulté l’estimation pour {{pet_name}}. Quand vous serez prêt, vous pouvez l’accepter ici : {{estimate_link}}. Communiquez avec nous si vous souhaitez y apporter des changements.",
    },
    sms: {
      not_viewed:
        "Bonjour {{customer_name}}, votre estimation pour {{service_name}} est prête : {{estimate_link}}",
      viewed:
        "Bonjour {{customer_name}}, prêt à réserver pour {{pet_name}}? Votre estimation : {{estimate_link}}",
    },
  },
} as const;

export interface FollowUpValues {
  customer_name: string;
  pet_name: string;
  service_name: string;
  estimate_total: string;
  estimate_link: string;
}

const TAG = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * A template with its tags filled. An unknown tag becomes nothing rather than
 * reaching a customer as `{{typo}}`, and a message that does not carry the
 * link gets it on its own line: a reminder the customer cannot act on is noise.
 */
export function fillFollowUp(template: string, values: FollowUpValues): string {
  const hasLink = /\{\{\s*estimate_link\s*\}\}/.test(template);
  const filled = template
    .replace(TAG, (_match, key: string) =>
      key in values ? values[key as keyof FollowUpValues] : "",
    )
    .trim();
  return hasLink ? filled : `${filled}\n\n${values.estimate_link}`;
}

export function followUpMessage(input: {
  locale: "en" | "fr";
  variant: FollowUpVariant;
  facilityName: string;
  emailTemplate: string;
  smsTemplate: string;
  values: FollowUpValues;
}): { subject: string; email: string; sms: string } {
  const copy = COPY[input.locale];
  const email = input.emailTemplate.trim() || copy.email[input.variant];
  const sms = input.smsTemplate.trim() || copy.sms[input.variant];
  return {
    subject: copy.subject[input.variant](input.facilityName),
    email: fillFollowUp(email, input.values),
    sms: fillFollowUp(sms, input.values),
  };
}
