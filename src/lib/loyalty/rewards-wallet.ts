import type { RedemptionRecord } from "@/types/loyalty";

/**
 * Customer "rewards wallet" view model: turns active RewardRedemptions into
 * display cards (icon, title, value, applicable services, expiry). Pure — `now`
 * is injected — so it's safe to call during render and easy to test.
 */

const DAY_MS = 86_400_000;
const EXPIRING_SOON_DAYS = 7;

export type WalletIcon = "credit" | "discount" | "freebie" | "gift_card";

export interface WalletReward {
  id: string;
  icon: WalletIcon;
  /** Headline, e.g. "5% off your next grooming" / "Account credit". */
  title: string;
  /** Compact value chip, e.g. "$25" / "5% off" / "Free". */
  valueChip: string;
  /** "Any service" or the specific service(s). */
  servicesText: string;
  expiresAt: string | null;
  /** Whole days until expiry (null = never expires). */
  expiresInDays: number | null;
  /** Expires within the next 7 days. */
  isExpiringSoon: boolean;
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function iconFor(rewardType: string): WalletIcon {
  switch (rewardType) {
    case "credit":
    case "credit_balance":
      return "credit";
    case "gift_card":
      return "gift_card";
    case "discount":
    case "discount_pct":
    case "discount_fixed":
    case "discount_code":
      return "discount";
    default:
      // free_service, freebie, auto_apply, and anything unknown
      return "freebie";
  }
}

/** Lowercased single service for the title verb, or null. */
function singleService(services: string[] | null | undefined): string | null {
  return services && services.length === 1 ? services[0] : null;
}

function titleFor(record: RedemptionRecord): string {
  const v = record.rewardValue;
  const svc = singleService(record.appliesToServiceTypes);
  const target = svc ? svc : "visit";
  switch (record.rewardType) {
    case "credit":
    case "credit_balance":
      return "Account credit";
    case "gift_card":
      return "Gift card";
    case "discount":
    case "discount_pct":
    case "discount_code":
      return `${v}% off your next ${target}`;
    case "discount_fixed":
      return `$${v} off your next ${target}`;
    default:
      // freebie / free_service / auto_apply: the value is usually the name.
      return typeof v === "string" && v.trim() ? v : "Free service";
  }
}

function valueChipFor(record: RedemptionRecord): string {
  const v = record.rewardValue;
  switch (record.rewardType) {
    case "credit":
    case "credit_balance":
    case "gift_card":
      return `$${v}`;
    case "discount":
    case "discount_pct":
    case "discount_code":
      return `${v}% off`;
    case "discount_fixed":
      return `$${v} off`;
    default:
      return "Free";
  }
}

function servicesTextFor(services: string[] | null | undefined): string {
  if (!services || services.length === 0) return "Any service";
  return services.map(cap).join(", ");
}

/** Build a single wallet card view from a redemption record. */
export function toWalletReward(
  record: RedemptionRecord,
  nowMs: number,
): WalletReward {
  const expiresAt = record.expiresAt ?? null;
  const expiresInDays = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - nowMs) / DAY_MS))
    : null;
  return {
    id: record.id,
    icon: iconFor(record.rewardType),
    title: titleFor(record),
    valueChip: valueChipFor(record),
    servicesText: servicesTextFor(record.appliesToServiceTypes),
    expiresAt,
    expiresInDays,
    isExpiringSoon: expiresInDays != null && expiresInDays <= EXPIRING_SOON_DAYS,
  };
}

/**
 * Build the wallet from a customer's active redemptions, soonest-expiring first
 * (never-expiring rewards last).
 */
export function buildRewardsWallet(
  records: RedemptionRecord[],
  nowMs: number,
): WalletReward[] {
  return records
    .map((r) => toWalletReward(r, nowMs))
    .sort((a, b) => {
      const ax = a.expiresInDays ?? Infinity;
      const bx = b.expiresInDays ?? Infinity;
      return ax - bx;
    });
}
