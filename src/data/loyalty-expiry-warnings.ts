import type { FacilityLoyaltyConfig } from "@/types/loyalty";
import { redemptionRecords } from "@/data/loyalty-redemptions";
import { getClientById } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { sendLoyaltyEmail } from "@/data/loyalty-emails";
import { customerNotificationsStore } from "@/data/customer-notifications";
import {
  buildExpiryWarningEmail,
  rewardDescription,
  daysUntil,
  EXPIRY_WARNING_DAYS,
} from "@/lib/loyalty/reward-expiry";

/**
 * Nightly reward-expiry-warning cron runner. For a facility, finds every active
 * RewardRedemption expiring within 7 days that has not yet been warned, sends the
 * reminder email (+ a portal nudge), and stamps `expiryWarningAt` so it is never
 * warned twice. Idempotent — re-running the same night is a no-op.
 */

export interface ExpiryWarningRunResult {
  warned: number;
  redemptionIds: string[];
}

export function runRewardExpiryWarnings(
  facilityId: number,
  config: FacilityLoyaltyConfig,
  options?: { now?: string },
): ExpiryWarningRunResult {
  const settings = config.notificationSettings;
  if (!config.enabled || settings?.rewardExpiryEnabled === false) {
    return { warned: 0, redemptionIds: [] };
  }

  const now = options?.now ?? new Date().toISOString();
  const windowDays = settings?.rewardExpiryDays ?? EXPIRY_WARNING_DAYS;
  const facilityName =
    facilities.find((f) => f.id === facilityId)?.name ??
    config.programName ??
    "your facility";

  const redemptionIds: string[] = [];
  for (const record of redemptionRecords) {
    if (record.facilityId !== facilityId) continue;
    if (record.status !== "active") continue;
    if (!record.expiresAt) continue;
    if (record.expiryWarningAt) continue; // already warned → no duplicate send

    const days = daysUntil(record.expiresAt, now);
    if (days < 0 || days > windowDays) continue; // outside the window

    const client = getClientById(record.customerId);
    const firstName = client?.name?.split(/\s+/)[0];

    // Email channel (reward expiry is a significant, time-sensitive event).
    if (client?.email) {
      const email = buildExpiryWarningEmail({
        record,
        facilityName,
        portalLink: "/customer/rewards",
        now,
        customerFirstName: firstName,
      });
      sendLoyaltyEmail({
        facilityId,
        customerId: record.customerId,
        to: client.email,
        subject: email.subject,
        body: email.body,
        template: "reward_expiry_warning",
        sentAt: now,
      });
    }

    // Portal nudge.
    customerNotificationsStore.push({
      id: `notif-expiry-${record.id}`,
      type: "reminder",
      title: "A reward is expiring soon ⏳",
      message: `Your ${rewardDescription(record)} expires in ${Math.max(0, days)} ${
        days === 1 ? "day" : "days"
      } — book now to use it.`,
      read: false,
      createdAt: now,
      link: "/customer/rewards",
      category: "Rewards",
    });

    // Mark so the next nightly run won't warn again.
    record.expiryWarningAt = now;
    redemptionIds.push(record.id);
  }

  return { warned: redemptionIds.length, redemptionIds };
}
