import type { AppLocale } from "@/lib/language-settings";
import { formatList, formatMoney, formatPercent } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";

/**
 * What a wallet card needs from a reward, and nothing else.
 *
 * Named here rather than importing a row type: this module is pure formatting,
 * and the fields below are the ones a card actually shows. It took the fixture
 * `RedemptionRecord` until 2026-08-22, whose `appliesToServiceTypes` is the
 * same idea as a real voucher's `appliesToServices` under a different name.
 */
export interface WalletRewardSource {
  id: string;
  rewardType: string;
  rewardValue: number | string;
  expiresAt?: string | null;
  /** Null or empty means every service. */
  appliesToServices?: string[] | null;
}

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

// Money and percentages through `Intl` (§5q). A whole-dollar value keeps no
// cents, as the `$25` this replaced had none.
const money = (v: number | string, locale: AppLocale) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? formatMoney(n, locale, { whole: Number.isInteger(n) })
    : String(v);
};
const pct = (v: number | string, locale: AppLocale) => {
  const n = Number(v);
  return Number.isFinite(n) ? formatPercent(n, locale) : `${v}%`;
};

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

// French names a service in parentheses rather than folding it into the
// sentence — "votre prochaine visite (Toilettage)" — because the article
// would have to agree with a noun this module cannot see the gender of.
function titleFor(record: WalletRewardSource, locale: AppLocale): string {
  const v = record.rewardValue;
  const svc = singleService(record.appliesToServices);
  const fr = locale === "fr";
  const target = fr
    ? svc
      ? `votre prochaine visite (${serviceTypeLabel("fr", svc)})`
      : "votre prochaine visite"
    : `your next ${svc ? svc : "visit"}`;
  switch (record.rewardType) {
    case "credit":
    case "credit_balance":
      return fr ? "Crédit au compte" : "Account credit";
    case "gift_card":
      return fr ? "Carte-cadeau" : "Gift card";
    case "discount":
    case "discount_pct":
    case "discount_code":
      return fr
        ? `${pct(v, locale)} de rabais sur ${target}`
        : `${pct(v, locale)} off ${target}`;
    case "discount_fixed":
      return fr
        ? `${money(v, locale)} de rabais sur ${target}`
        : `${money(v, locale)} off ${target}`;
    default:
      // freebie / free_service / auto_apply: the value is usually the name,
      // which is the facility's own words and passes through untouched.
      return typeof v === "string" && v.trim()
        ? v
        : fr
          ? "Service gratuit"
          : "Free service";
  }
}

function valueChipFor(record: WalletRewardSource, locale: AppLocale): string {
  const v = record.rewardValue;
  const fr = locale === "fr";
  switch (record.rewardType) {
    case "credit":
    case "credit_balance":
    case "gift_card":
      return money(v, locale);
    case "discount":
    case "discount_pct":
    case "discount_code":
      return fr ? `${pct(v, locale)} de rabais` : `${pct(v, locale)} off`;
    case "discount_fixed":
      return fr ? `${money(v, locale)} de rabais` : `${money(v, locale)} off`;
    default:
      return fr ? "Gratuit" : "Free";
  }
}

function servicesTextFor(
  services: string[] | null | undefined,
  locale: AppLocale,
): string {
  if (!services || services.length === 0) {
    return locale === "fr" ? "Tous les services" : "Any service";
  }
  return formatList(
    services.map((s) => serviceTypeLabel(locale, s)),
    locale,
  );
}

/** Build a single wallet card view from a redemption record. */
export function toWalletReward(
  record: WalletRewardSource,
  nowMs: number,
  locale: AppLocale = "en",
): WalletReward {
  const expiresAt = record.expiresAt ?? null;
  const expiresInDays = expiresAt
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - nowMs) / DAY_MS))
    : null;
  return {
    id: record.id,
    icon: iconFor(record.rewardType),
    title: titleFor(record, locale),
    valueChip: valueChipFor(record, locale),
    servicesText: servicesTextFor(record.appliesToServices, locale),
    expiresAt,
    expiresInDays,
    isExpiringSoon:
      expiresInDays != null && expiresInDays <= EXPIRING_SOON_DAYS,
  };
}

/**
 * Build the wallet from a customer's active redemptions, soonest-expiring first
 * (never-expiring rewards last).
 */
export function buildRewardsWallet(
  records: WalletRewardSource[],
  nowMs: number,
  locale: AppLocale = "en",
): WalletReward[] {
  return records
    .map((r) => toWalletReward(r, nowMs, locale))
    .sort((a, b) => {
      const ax = a.expiresInDays ?? Infinity;
      const bx = b.expiresInDays ?? Infinity;
      return ax - bx;
    });
}
