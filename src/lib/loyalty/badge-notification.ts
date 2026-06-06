import type { Badge } from "@/types/loyalty";
import { badgeRewardText } from "./badge-summary";

/**
 * Badge-earned messaging for the portal notification + email. A badge milestone
 * is a significant event that warrants an email. Pure.
 */

// Badge icons are stored as keys ("gem", "star", …). Map them to an emoji glyph
// so the badge graphic is visible in text notifications/emails; an icon that is
// already an emoji passes through unchanged.
const BADGE_EMOJI: Record<string, string> = {
  star: "⭐",
  gem: "💎",
  trophy: "🏆",
  target: "🎯",
  award: "🏅",
  medal: "🎖️",
  crown: "👑",
  heart: "💖",
  paw: "🐾",
};

export function badgeGlyph(icon: string): string {
  return BADGE_EMOJI[icon] ?? (icon || "🏅");
}

/** Title shared by the portal notification and the email subject. */
export function badgeEarnedTitle(badge: Badge): string {
  return `${badgeGlyph(badge.icon)} You've earned the ${badge.name} badge!`;
}

/** Reward types that land on the account and auto-apply at the next visit. */
export function isAutoAppliedBadgeReward(
  reward: NonNullable<Badge["reward"]>,
): boolean {
  return (
    reward.type === "credit" ||
    reward.type === "discount" ||
    reward.type === "discount_pct" ||
    reward.type === "discount_fixed"
  );
}

const AUTO_APPLY_SENTENCE =
  "Your reward has been added to your account and will be applied automatically at your next visit.";

/** Portal-notification body: "Your reward: X." (+ auto-apply note when relevant). */
export function badgeEarnedPortalBody(badge: Badge): string {
  if (!badge.reward) return badge.description;
  const rewardText = badgeRewardText(badge.reward);
  const autoApply = isAutoAppliedBadgeReward(badge.reward)
    ? ` ${AUTO_APPLY_SENTENCE}`
    : "";
  return `Your reward: ${rewardText}.${autoApply}`;
}

export interface BadgeEarnedEmail {
  subject: string;
  body: string;
}

/**
 * Branded badge-earned email. Subject carries the badge graphic (icon) + name;
 * body congratulates, states the reward, adds the auto-apply note for
 * discount/credit rewards, and links back to the badges page.
 */
export function buildBadgeEarnedEmail(vars: {
  badge: Badge;
  facilityName: string;
  portalLink: string;
  customerFirstName?: string;
}): BadgeEarnedEmail {
  const { badge } = vars;
  const greeting = vars.customerFirstName
    ? `Congratulations, ${vars.customerFirstName}!`
    : "Congratulations!";
  const rewardLine = badge.reward
    ? `\n\nYour reward: ${badgeRewardText(badge.reward)}.`
    : "";
  const autoApply =
    badge.reward && isAutoAppliedBadgeReward(badge.reward)
      ? `\n\n${AUTO_APPLY_SENTENCE}`
      : "";
  return {
    subject: badgeEarnedTitle(badge),
    body:
      `${badgeGlyph(badge.icon)} ${greeting} You've earned the ${badge.name} badge at ${vars.facilityName}.` +
      `${rewardLine}${autoApply}\n\nSee all your badges: ${vars.portalLink}`,
  };
}
