import type { Tier, TierBenefit } from "@/types/loyalty";

/**
 * Tier-upgrade messaging: plain-English benefit descriptions for the portal
 * notification, and the branded email (subject + body) sent when a customer
 * reaches a new tier — a significant event that DOES warrant an email. Pure.
 */

/** "10% off services", "2× points on every visit", "Free add-ons", … */
export function describeTierBenefit(benefit: TierBenefit): string {
  const v = benefit.value;
  switch (benefit.type) {
    case "discount_pct":
      return `${v}% off services`;
    case "discount_fixed":
      return `$${v} off services`;
    case "credit":
      return `$${v} account credit`;
    case "free_service":
      return typeof v === "string" && v.trim() ? `Free ${v}` : "A free service";
    case "priority_booking":
      return typeof v === "string" && v.trim() ? String(v) : "Priority booking";
    case "bonus_points_multiplier":
      return `${v}× points on every visit`;
    case "custom_text":
      return String(v);
  }
}

export function tierBenefitList(tier: Tier): string[] {
  return tier.benefits.map(describeTierBenefit);
}

export interface TierUpgradeEmail {
  subject: string;
  body: string;
}

/**
 * Branded tier-upgrade email. Subject: "You've reached [Tier] at [Facility]!".
 * Body lists the newly-unlocked benefits and a "Book now to use your rewards"
 * CTA. The facility brand colour + tier badge are passed through on the email
 * record for the (real) HTML renderer; the mock body is plain text.
 */
export function buildTierUpgradeEmail(vars: {
  tier: Tier;
  facilityName: string;
  portalLink: string;
  customerFirstName?: string;
}): TierUpgradeEmail {
  const benefits = tierBenefitList(vars.tier);
  const greeting = vars.customerFirstName
    ? `Congratulations, ${vars.customerFirstName}!`
    : "Congratulations!";
  const benefitLines = benefits.length
    ? benefits.map((b) => `• ${b}`).join("\n")
    : "• New member perks";
  return {
    subject: `You've reached ${vars.tier.name} at ${vars.facilityName}!`,
    body:
      `${vars.tier.icon} ${greeting} You've reached ${vars.tier.name} at ${vars.facilityName}.\n\n` +
      `Here's what you've unlocked:\n${benefitLines}\n\n` +
      `Book now to use your rewards: ${vars.portalLink}`,
  };
}
