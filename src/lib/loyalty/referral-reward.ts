import type { EarnRuleRewardType } from "@/types/loyalty";
import { referralRewardText } from "./referral-program";

/**
 * "Referral reward applied" messaging — sent (portal + email) to the referrer
 * and (separately) the referee when their referral reward fires. Each message
 * states what they received and how to use it. Pure.
 */

/** Plain-English "how to use it" guidance per reward type. */
export function howToUseReferralReward(type: EarnRuleRewardType): string {
  switch (type) {
    case "points":
      return "The points are in your balance — redeem them anytime from your rewards page.";
    case "credit":
      return "Your credit will be applied automatically at your next checkout.";
    case "gift_card":
      return "Find your gift card in your rewards wallet.";
    case "freebie":
      return "It's waiting in your rewards wallet — claim it on your next visit.";
    case "discount_pct":
    case "discount_fixed":
      return "It'll be applied automatically at your next booking.";
  }
}

export interface ReferralRewardMessage {
  /** Portal notification title. */
  title: string;
  /** Portal notification body. */
  body: string;
  emailSubject: string;
  emailBody: string;
}

const TITLE = "Your referral reward has been applied! 🎉";

/**
 * Build the portal + email message for one side of a completed referral.
 * `counterpartName` is the friend's name (for the referrer) or the referrer's
 * name (for the referee).
 */
export function buildReferralRewardMessage(vars: {
  side: "referrer" | "referee";
  reward: { rewardType: EarnRuleRewardType; rewardValue: number | string };
  facilityName: string;
  portalLink: string;
  customerFirstName?: string;
  counterpartName?: string;
}): ReferralRewardMessage {
  const desc = referralRewardText(
    vars.reward.rewardType,
    vars.reward.rewardValue,
  );
  const how = howToUseReferralReward(vars.reward.rewardType);
  const reason =
    vars.side === "referrer"
      ? vars.counterpartName
        ? ` for referring ${vars.counterpartName}`
        : " for referring a friend"
      : vars.counterpartName
        ? `, courtesy of ${vars.counterpartName}`
        : " as a welcome";
  const greeting = vars.customerFirstName
    ? `Hi ${vars.customerFirstName}! `
    : "";
  return {
    title: TITLE,
    body: `You've received ${desc}${reason}. ${how}`,
    emailSubject: "Your referral reward has been applied!",
    emailBody:
      `${greeting}${TITLE}\n\nYou've received ${desc}${reason}. ${how}\n\n` +
      `Book at ${vars.facilityName}: ${vars.portalLink}`,
  };
}
