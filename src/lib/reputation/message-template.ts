import { buildReviewLink } from "@/lib/reputation/review-link";
import type { ReputationSequenceStep } from "@/types/reputation";

export interface ReputationVar {
  token: string;
  label: string;
  description: string;
  sample: string;
}

/**
 * Deep-data placeholder token matrix — `{{namespace.field}}` tokens resolved
 * from real booking-system data, with sample values for the live preview.
 */
export const REPUTATION_VARIABLES: ReputationVar[] = [
  {
    token: "{{client.first_name}}",
    label: "Client first name",
    description: "Greets the primary account holder by name.",
    sample: "Alex",
  },
  {
    token: "{{pet.names}}",
    label: "Pet name(s)",
    description: "Comma-separated list of pets checked out (e.g. “Nala & Buddy”).",
    sample: "Nala & Buddy",
  },
  {
    token: "{{service.name}}",
    label: "Service",
    description: "The exact checkout category (e.g. “Luxury Boarding”).",
    sample: "Grooming",
  },
  {
    token: "{{staff.first_name}}",
    label: "Staff first name",
    description: "The core staff member on the booking — a human connection.",
    sample: "Jordan",
  },
  {
    token: "{{survey.link}}",
    label: "Survey link",
    description: "The trackable secure URL to the micro-survey landing page.",
    sample: "yipyy.co/r/aZ9xQ",
  },
];

function firstName(full?: string): string {
  return (full ?? "").trim().split(/\s+/)[0] ?? "";
}

/** Format a pet list: "Nala", "Nala & Buddy", "Nala, Coco & Buddy". */
export function formatNames(names: string[]): string {
  const list = names.map((n) => n.trim()).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} & ${list[list.length - 1]}`;
}

/** Substitute variables with sample (or provided) values for the live preview. */
export function renderTemplate(
  text: string,
  overrides?: Record<string, string>,
): string {
  let out = text ?? "";
  for (const v of REPUTATION_VARIABLES) {
    const val = overrides?.[v.token] ?? v.sample;
    out = out.split(v.token).join(val);
  }
  return out;
}

/** SMS segment count (GSM-7: 160 chars single, 153/segment when concatenated). */
export function smsSegments(length: number): number {
  if (length === 0) return 0;
  if (length <= 160) return 1;
  return Math.ceil(length / 153);
}

// ─── Real send rendering (for the audit trail) ───────────────────────────────

/** Display labels for supported locales. */
export const LOCALE_LABELS: Record<string, string> = {
  en: "English (US)",
  fr: "Français (CA)",
  es: "Español",
};

export function localeLabel(code: string): string {
  return LOCALE_LABELS[code] ?? code.toUpperCase();
}

/** Clean layout marker separating stacked bilingual segments. */
export const STACK_DIVIDER = "— — — — — — — — — —";

export interface MessageContext {
  id: string;
  clientName: string;
  petNames: string[];
  serviceLabel: string;
  staffName?: string;
  /** Resolved client locale; picks a localized step variant when present. */
  locale?: string;
  /** When set, stack these locales into one payload (Condition Beta). */
  stackLocales?: string[];
}

function localeContent(step: ReputationSequenceStep, locale?: string) {
  const loc = locale ? step.localized?.[locale] : undefined;
  return {
    sms: loc?.smsBody ?? step.smsBody ?? "",
    subject: loc?.emailSubject ?? step.emailSubject ?? "",
    body: loc?.emailBody ?? step.emailBody ?? "",
  };
}

/** Variable values for a real request (not the sample data). */
export function buildMessageOverrides(
  ctx: MessageContext,
  linkLocale?: string,
): Record<string, string> {
  return {
    "{{client.first_name}}": firstName(ctx.clientName) || ctx.clientName,
    "{{pet.names}}": formatNames(ctx.petNames) || "your pet",
    "{{service.name}}": ctx.serviceLabel,
    "{{staff.first_name}}": firstName(ctx.staffName) || "our team",
    // Survey link inherits the segment's language (?lang=…) downstream.
    "{{survey.link}}": buildReviewLink(ctx.id, linkLocale ?? ctx.locale),
  };
}

/** The authored message for a step, rendered with the request's real values. */
export function renderStepMessage(
  step: ReputationSequenceStep,
  ctx: MessageContext,
): string {
  // Condition Beta — stack each locale's content into one block, divider-joined.
  // Each segment's overrides carry its own ?lang= survey link.
  const locales =
    ctx.stackLocales && ctx.stackLocales.length > 0
      ? ctx.stackLocales
      : [ctx.locale];

  if (step.channel === "sms") {
    return locales
      .map((l) => renderTemplate(localeContent(step, l).sms, buildMessageOverrides(ctx, l)))
      .filter(Boolean)
      .join(`\n${STACK_DIVIDER}\n`);
  }

  const subject = locales
    .map((l) =>
      renderTemplate(localeContent(step, l).subject, buildMessageOverrides(ctx, l)),
    )
    .filter(Boolean)
    .join(" / ");
  const body = locales
    .map((l) =>
      renderTemplate(localeContent(step, l).body, buildMessageOverrides(ctx, l)),
    )
    .filter(Boolean)
    .join(`\n${STACK_DIVIDER}\n`);
  return `“${subject}” — ${body}`;
}
