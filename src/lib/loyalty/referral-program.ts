import type {
  FacilityLoyaltyConfig,
  ReferralProgram,
  ReferralRewardConfig,
  EarnRuleRewardType,
  ReferralRewardTrigger,
} from "@/types/loyalty";
import type { AppLocale } from "@/lib/language-settings";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import {
  formatList,
  formatMoney,
  formatNumber,
  formatPercent,
} from "@/lib/i18n/format";

/**
 * Whether a facility's referral program is active. Reads the canonical
 * `referralProgramSetup` model (edited by the Configure Program wizard) and
 * falls back to the legacy nested `referralProgram` so older configs still work.
 * Single source of truth for the customer-portal "Refer a Friend" gate.
 */
export function isReferralProgramEnabled(
  config:
    | Pick<FacilityLoyaltyConfig, "referralProgramSetup" | "referralProgram">
    | null
    | undefined,
): boolean {
  if (!config) return false;
  return (
    config.referralProgramSetup?.enabled === true ||
    config.referralProgram?.enabled === true
  );
}

/**
 * Pure helpers for the referral-program setup wizard: human-readable reward and
 * trigger labels, service-scope / expiry text, and template-token rendering for
 * the welcome / share message previews. Referrer and referee rewards share the
 * same EarnRule reward-type enum so any combination is expressible.
 */

export const REFERRAL_REWARD_TYPE_LABELS: Record<EarnRuleRewardType, string> = {
  points: "Points",
  credit: "Account credit ($)",
  gift_card: "Gift card ($)",
  freebie: "Free service / item",
  discount_pct: "Discount (%)",
  discount_fixed: "Discount ($)",
};

export const REFERRAL_TRIGGER_LABELS: Record<ReferralRewardTrigger, string> = {
  on_signup: "On signup",
  on_first_booking: "On first booking",
  on_first_paid_booking: "On first paid booking",
};

export const REFERRAL_TRIGGER_HINTS: Record<ReferralRewardTrigger, string> = {
  on_signup: "Reward fires as soon as the friend creates an account.",
  on_first_booking:
    "Reward fires when the friend completes their first booking.",
  on_first_paid_booking:
    "Reward fires only after the friend's first paid (non-refunded) booking.",
};

/** Reward type that carries an item/service name rather than a numeric value. */
export function isItemReward(type: EarnRuleRewardType): boolean {
  return type === "freebie";
}

/**
 * "$25 account credit", "10% off", "100 points", "Free Nail Trim".
 *
 * `locale` defaults to English, which is byte-for-byte what this returned
 * before it took one: the facility's wizard preview and a facility's own share
 * template still read the English. The customer's page passes theirs. French
 * puts the amount after the noun and a space before `$` and `%` (§5q).
 */
export function referralRewardText(
  type: EarnRuleRewardType,
  value: number | string,
  locale: AppLocale = "en",
): string {
  if (locale === "fr") return frRewardText(type, value);
  switch (type) {
    case "points":
      return `${value} points`;
    case "credit":
      return `$${value} account credit`;
    case "gift_card":
      return `$${value} gift card`;
    case "discount_pct":
      return `${value}% off`;
    case "discount_fixed":
      return `$${value} off`;
    case "freebie":
      return typeof value === "string" && value.trim()
        ? `Free ${value}`
        : "Free item";
  }
}

function frRewardText(type: EarnRuleRewardType, value: number | string) {
  const n = Number(value);
  const money = formatMoney(n, "fr", { whole: Number.isInteger(n) });
  switch (type) {
    case "points":
      return `${formatNumber(n, "fr")} points`;
    case "credit":
      return `${money} de crédit au compte`;
    case "gift_card":
      return `carte-cadeau de ${money}`;
    case "discount_pct":
      return `${formatPercent(n, "fr")} de rabais`;
    case "discount_fixed":
      return `${money} de rabais`;
    case "freebie":
      return typeof value === "string" && value.trim()
        ? `Gratuit : ${value}`
        : "Article gratuit";
  }
}

/** "all services" or "grooming, daycare" (capitalised by the UI as needed). */
export function referralServiceScopeText(
  appliesToServiceTypes: string[] | null,
): string {
  if (!appliesToServiceTypes || appliesToServiceTypes.length === 0) {
    return "all services";
  }
  return appliesToServiceTypes.join(", ");
}

/**
 * Full one-line summary of a reward side: reward · service scope (when limited)
 * · expiry (when set). e.g. "10% off · grooming only · expires in 30 days".
 */
export function referralRewardFullText(
  config: ReferralRewardConfig,
  locale: AppLocale = "en",
): string {
  const parts = [
    referralRewardText(config.rewardType, config.rewardValue, locale),
  ];
  const scope = config.appliesToServiceTypes ?? [];
  if (scope.length > 0) {
    parts.push(
      locale === "fr"
        ? `${formatList(
            scope.map((s) => serviceTypeLabel("fr", s).toLowerCase()),
            "fr",
          )} seulement`
        : `${scope.join(", ")} only`,
    );
  }
  if (config.expiresAfterDays != null) {
    parts.push(
      locale === "fr"
        ? `expire dans ${config.expiresAfterDays} jours`
        : `expires in ${config.expiresAfterDays} days`,
    );
  }
  return parts.join(" · ");
}

/**
 * Replace {token} placeholders in a message template. Unknown tokens are left
 * as-is so the facility can spot typos in the live preview.
 */
export function renderReferralTemplate(
  template: string,
  tokens: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in tokens ? tokens[key] : match,
  );
}

/** Sample tokens for the wizard's live message preview. */
export function previewTokens(
  program: ReferralProgram,
): Record<string, string> {
  return {
    code: "BUDDY-7K2M",
    referrerName: "Alex",
    refereeReward: referralRewardText(
      program.refereeReward.rewardType,
      program.refereeReward.rewardValue,
    ),
    referrerReward: referralRewardText(
      program.referrerReward.rewardType,
      program.referrerReward.rewardValue,
    ),
  };
}
