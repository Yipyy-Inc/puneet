import type { RedemptionRecord } from "@/types/loyalty";

/**
 * Reward-expiry reminder: a natural description of a redemption reward, the
 * window check, and the warning-email builder. Pure — `now` is injected — so the
 * nightly cron stays deterministic and testable.
 */

const DAY_MS = 86_400_000;
export const EXPIRY_WARNING_DAYS = 7;

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Whole days until expiry (negative if already past). */
export function daysUntil(expiresAt: string, now: string): number {
  return Math.ceil(
    (new Date(expiresAt).getTime() - new Date(now).getTime()) / DAY_MS,
  );
}

/** "$25 account credit", "5% off your next grooming", "Free Add-on". */
export function rewardDescription(record: RedemptionRecord): string {
  const v = record.rewardValue;
  const service =
    record.appliesToServiceTypes?.length === 1
      ? ` your next ${record.appliesToServiceTypes[0]}`
      : "";
  switch (record.rewardType) {
    case "credit":
    case "credit_balance":
      return `$${v} account credit`;
    case "gift_card":
      return `$${v} gift card`;
    case "discount":
    case "discount_pct":
    case "discount_code":
      return `${v}% off${service}`;
    case "discount_fixed":
      return `$${v} off${service}`;
    default:
      return typeof v === "string" && v.trim() ? v : "free reward";
  }
}

/** "June 12, 2026" — for the "book before [date]" line. */
function formatExpiryDate(expiresAt: string): string {
  return new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export interface ExpiryWarningEmail {
  subject: string;
  body: string;
}

/**
 * "Your [reward] expires in N days — book before [date] to use it." Subject and
 * body share that line; the body adds a greeting and a "Book now" CTA.
 */
export function buildExpiryWarningEmail(vars: {
  record: RedemptionRecord;
  facilityName: string;
  portalLink: string;
  now: string;
  customerFirstName?: string;
}): ExpiryWarningEmail {
  const { record } = vars;
  const desc = rewardDescription(record);
  const days = Math.max(0, daysUntil(record.expiresAt ?? vars.now, vars.now));
  const dayWord = days === 1 ? "day" : "days";
  const byDate = record.expiresAt ? formatExpiryDate(record.expiresAt) : "soon";
  const lead = vars.customerFirstName
    ? `Hi ${vars.customerFirstName} — your`
    : "Your";
  const headline = `${lead} ${desc} expires in ${days} ${dayWord} — book before ${byDate} to use it.`;
  return {
    subject: `Your ${cap(desc)} expires in ${days} ${dayWord}`,
    body:
      `${headline}\n\n` +
      `Book now to use your reward at ${vars.facilityName}: ${vars.portalLink}`,
  };
}
