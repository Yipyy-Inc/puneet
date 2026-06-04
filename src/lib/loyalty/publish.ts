import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { customerNotificationsStore } from "@/data/customer-notifications";
import type { Notification } from "@/components/customer/CustomerNotifications";

/**
 * In-app notifications broadcast to customers when a facility publishes its
 * loyalty program. In this mock layer they are collected here; wiring them into
 * the customer notification bell is a follow-up.
 */
export const loyaltyLaunchNotifications: Notification[] = [];

/**
 * Existing customers of a facility who are eligible to be notified. Clients are
 * keyed by facility *name* in the mock data; we resolve it from the facility id.
 * Blocked clients are treated as opted-out.
 */
export function getFacilityCustomers(facilityId: number) {
  const facilityName = facilities.find((f) => f.id === facilityId)?.name;
  if (!facilityName) return [];
  return clients.filter((c) => c.facility === facilityName && !c.isBlocked);
}

/**
 * Send the launch notification to all eligible customers of a facility.
 * Returns the number of customers notified. Customer loyalty accounts are NOT
 * bulk-created here — they are created lazily on the customer's next booking.
 */
export function notifyCustomersOfLoyaltyLaunch(
  facilityId: number,
  programName: string,
): number {
  const recipients = getFacilityCustomers(facilityId);
  const ts = new Date().toISOString();
  const prefix = `notif-loyalty-${facilityId}-`;
  const rows: Notification[] = recipients.map((c) => ({
    id: `${prefix}${c.id}`,
    type: "reminder",
    title: `${programName} is live! 🎉`,
    message:
      "We've launched a new rewards program — check your points balance!",
    read: false,
    createdAt: ts,
    link: "/customer/rewards",
    category: "Rewards",
  }));

  // Idempotent: drop any prior launch notifications for this facility so a
  // re-publish refreshes them instead of creating duplicate, id-colliding rows.
  for (let i = loyaltyLaunchNotifications.length - 1; i >= 0; i--) {
    if (loyaltyLaunchNotifications[i].id.startsWith(prefix)) {
      loyaltyLaunchNotifications.splice(i, 1);
    }
  }
  loyaltyLaunchNotifications.push(...rows);

  // Surface them in the live customer notification bell (idempotent by facility).
  customerNotificationsStore.setFacilityLaunchNotifications(facilityId, rows);

  return recipients.length;
}
