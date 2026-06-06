import type { FacilityLoyaltyConfig } from "@/types/loyalty";
import { getLoyaltyAccountsByFacility } from "@/data/loyalty-accounts";
import { getClientById } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { sendLoyaltyEmail } from "@/data/loyalty-emails";
import { customerNotificationsStore } from "@/data/customer-notifications";
import {
  runPointsExpiry,
  buildPointsExpiryEmail,
} from "@/lib/loyalty/points-expiry";

/**
 * Nightly points-expiry-warning cron runner. When the facility has flat
 * inactivity-based points expiry enabled, finds accounts entering the 30-day
 * warning window (via the pure runPointsExpiry) that have points and haven't yet
 * been warned, sends the reminder email (+ portal nudge), and stamps
 * `expiryEmailSentAt` so they're warned only once per inactivity period.
 */

export interface PointsExpiryWarningRunResult {
  warned: number;
  customerIds: number[];
}

export function runPointsExpiryWarnings(
  facilityId: number,
  config: FacilityLoyaltyConfig,
  options?: { now?: string },
): PointsExpiryWarningRunResult {
  const expiryDays = config.pointsExpiryDays ?? 0;
  if (!config.enabled || !config.pointsExpiryEnabled || expiryDays <= 0) {
    return { warned: 0, customerIds: [] };
  }
  // Notification toggle (distinct from the expiry feature flag above).
  if (config.notificationSettings?.pointsExpiryEnabled === false) {
    return { warned: 0, customerIds: [] };
  }

  const now = options?.now ?? new Date().toISOString();
  const accounts = getLoyaltyAccountsByFacility(facilityId);
  const { warnings } = runPointsExpiry(
    accounts,
    { enabled: true, expiryDays },
    now,
  );

  const facilityName =
    facilities.find((f) => f.id === facilityId)?.name ??
    config.programName ??
    "your facility";

  const customerIds: number[] = [];
  for (const { account, daysUntilExpiry } of warnings) {
    // `account` is the live array element — already warned this period? skip.
    if (account.expiryEmailSentAt) continue;
    if (account.pointsBalance <= 0) continue;

    const client = getClientById(account.customerId);
    const firstName = client?.name?.split(/\s+/)[0];

    if (client?.email) {
      const email = buildPointsExpiryEmail({
        account,
        expiryDays,
        facilityName,
        portalLink: "/customer/rewards",
        customerFirstName: firstName,
      });
      sendLoyaltyEmail({
        facilityId,
        customerId: account.customerId,
        to: client.email,
        subject: email.subject,
        body: email.body,
        template: "points_expiry_warning",
        sentAt: now,
      });
    }

    customerNotificationsStore.push({
      id: `notif-points-expiry-${facilityId}-${account.customerId}`,
      type: "reminder",
      title: "Your points are expiring soon ⏳",
      message: `${account.pointsBalance.toLocaleString()} points expire in ${daysUntilExpiry} ${
        daysUntilExpiry === 1 ? "day" : "days"
      } — book now to keep them.`,
      read: false,
      createdAt: now,
      link: "/customer/rewards",
      category: "Rewards",
    });

    // Mark so the next nightly run won't warn again (cleared on new activity).
    account.expiryEmailSentAt = now;
    customerIds.push(account.customerId);
  }

  return { warned: customerIds.length, customerIds };
}
