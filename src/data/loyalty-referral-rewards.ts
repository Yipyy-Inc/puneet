import type {
  FacilityLoyaltyConfig,
  ReferralRelationship,
  ReferralRewardConfig,
} from "@/types/loyalty";
import type { LoyaltyNotification } from "@/lib/loyalty/engine";
import { getOrCreateLoyaltyAccount } from "@/data/loyalty-engine";
import { loyaltyTransactions } from "@/data/loyalty-transactions";
import { redemptionRecords } from "@/data/loyalty-redemptions";
import { customerNotificationsStore } from "@/data/customer-notifications";
import { sendLoyaltyEmail } from "@/data/loyalty-emails";
import { getClientById } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { buildReferralRewardMessage } from "@/lib/loyalty/referral-reward";
import { notificationChannels } from "@/lib/loyalty/notification-settings";

/**
 * Referral-completion reward issuance + notification. When a referral completes,
 * applies the referrer's reward to the referrer and the referee's reward to the
 * referee (independently), then sends each a "referral reward applied"
 * notification (portal + email). Idempotent per side — a side already marked
 * "issued" is skipped, so re-running is safe.
 *
 * This is the entrypoint a booking-completion / referral-completion hook calls.
 */

const DAY_MS = 86_400_000;

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString();
}

/** Apply one side's reward to the customer's account (points/credit) or issue a
 *  redeemable voucher (discount / gift card / freebie). */
function applyReferralReward(
  facilityId: number,
  customerId: number,
  reward: ReferralRewardConfig,
  relationshipId: string,
  side: "referrer" | "referee",
  now: string,
): void {
  const account = getOrCreateLoyaltyAccount(facilityId, customerId, now);
  const numeric =
    typeof reward.rewardValue === "number"
      ? reward.rewardValue
      : Number(reward.rewardValue) || 0;
  const txnId = `txn-ref-${facilityId}-${customerId}-${relationshipId}-${side}`;

  if (reward.rewardType === "points") {
    account.pointsBalance += numeric;
    account.lifetimePointsEarned += numeric;
    loyaltyTransactions.push({
      id: txnId,
      customerId,
      facilityId,
      transactionType: "referral",
      points: numeric,
      description: "Referral reward",
      source: "referral",
      sourceId: relationshipId,
      createdAt: now,
    });
  } else if (reward.rewardType === "credit") {
    account.creditBalance += numeric;
    loyaltyTransactions.push({
      id: txnId,
      customerId,
      facilityId,
      transactionType: "referral",
      points: 0,
      value: numeric,
      description: "Referral reward (account credit)",
      source: "referral",
      sourceId: relationshipId,
      createdAt: now,
    });
  } else {
    // discount_pct / discount_fixed / gift_card / freebie → active voucher.
    redemptionRecords.push({
      id: `rdm-ref-${facilityId}-${customerId}-${relationshipId}`,
      facilityId,
      customerId,
      rewardType: reward.rewardType,
      rewardValue: reward.rewardValue,
      redeemMethod: "auto_applied",
      bookingId: null,
      invoiceId: null,
      issuedAt: now,
      redeemedAt: now,
      expiresAt:
        reward.expiresAfterDays != null
          ? addDays(now, reward.expiresAfterDays)
          : null,
      status: "active",
      appliesToServiceTypes: reward.appliesToServiceTypes ?? null,
    });
  }

  account.lastActivityAt = now;
  account.updatedAt = now;
  account.expiryEmailSentAt = null; // fresh activity resets points-expiry warning
}

export interface ReferralCompletionResult {
  referrerIssued: boolean;
  refereeIssued: boolean;
}

export function completeReferralRewards(
  relationship: ReferralRelationship,
  config: FacilityLoyaltyConfig,
  options?: { now?: string },
): ReferralCompletionResult {
  const program = config.referralProgramSetup;
  if (!config.enabled || !program?.enabled) {
    return { referrerIssued: false, refereeIssued: false };
  }

  const now = options?.now ?? new Date().toISOString();
  const { facilityId } = relationship;
  const facilityName =
    facilities.find((f) => f.id === facilityId)?.name ??
    config.programName ??
    "your facility";

  const referrer = getClientById(relationship.referrerId);
  const referee = getClientById(relationship.referredCustomerId);
  const channels = notificationChannels(
    config.notificationSettings,
    "referral_reward_applied",
  );

  let referrerIssued = false;
  let refereeIssued = false;

  // --- Referrer reward ---
  if (relationship.referrerRewardStatus !== "issued") {
    applyReferralReward(
      facilityId,
      relationship.referrerId,
      program.referrerReward,
      relationship.id,
      "referrer",
      now,
    );
    relationship.referrerRewardStatus = "issued";
    relationship.referrerRewardValue = program.referrerReward.rewardValue;
    relationship.referrerRewardIssuedAt = now;
    notifyReferralReward(
      facilityId,
      relationship.referrerId,
      buildReferralRewardMessage({
        side: "referrer",
        reward: program.referrerReward,
        facilityName,
        portalLink: "/customer/rewards",
        customerFirstName: referrer?.name?.split(/\s+/)[0],
        counterpartName: referee?.name?.split(/\s+/)[0],
      }),
      referrer?.email,
      channels,
      now,
    );
    referrerIssued = true;
  }

  // --- Referee reward ---
  if (relationship.refereeRewardStatus !== "issued") {
    applyReferralReward(
      facilityId,
      relationship.referredCustomerId,
      program.refereeReward,
      relationship.id,
      "referee",
      now,
    );
    relationship.refereeRewardStatus = "issued";
    relationship.refereeRewardValue = program.refereeReward.rewardValue;
    relationship.refereeRewardIssuedAt = now;
    notifyReferralReward(
      facilityId,
      relationship.referredCustomerId,
      buildReferralRewardMessage({
        side: "referee",
        reward: program.refereeReward,
        facilityName,
        portalLink: "/customer/rewards",
        customerFirstName: referee?.name?.split(/\s+/)[0],
        counterpartName: referrer?.name?.split(/\s+/)[0],
      }),
      referee?.email,
      channels,
      now,
    );
    refereeIssued = true;
  }

  if (
    relationship.referrerRewardStatus === "issued" &&
    relationship.refereeRewardStatus === "issued"
  ) {
    relationship.status = "completed";
  }

  return { referrerIssued, refereeIssued };
}

function notifyReferralReward(
  facilityId: number,
  customerId: number,
  message: ReturnType<typeof buildReferralRewardMessage>,
  email: string | undefined,
  channels: { portal: boolean; email: boolean },
  now: string,
): void {
  if (channels.portal) {
    const notification: LoyaltyNotification = {
      type: "referral_reward_applied",
      title: message.title,
      body: message.body,
      facilityId,
      customerId,
    };
    customerNotificationsStore.pushLoyaltyNotifications([notification]);
  }

  if (channels.email && email) {
    sendLoyaltyEmail({
      facilityId,
      customerId,
      to: email,
      subject: message.emailSubject,
      body: message.emailBody,
      template: "referral_reward",
      sentAt: now,
    });
  }
}
