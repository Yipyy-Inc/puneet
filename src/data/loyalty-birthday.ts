import type { FacilityLoyaltyConfig } from "@/types/loyalty";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { getLoyaltyAccountsByFacility } from "@/data/loyalty-accounts";
import { recordLoyaltyEvent } from "@/data/loyalty-engine";
import { customerNotificationsStore } from "@/data/customer-notifications";
import {
  findBirthdayEarnRule,
  getBirthdayRecipients,
  type BirthdayClient,
} from "@/lib/loyalty/birthday-rewards";

/**
 * Nightly birthday-reward cron runner (the side-effecting wrapper around the pure
 * logic in lib/loyalty/birthday-rewards.ts). For a facility with an enabled
 * birthday earn rule, fires the rule for every customer whose pet birthday lands
 * today (or shifts onto today from a closed day) and sends the birthday
 * notification. Idempotent per customer per day.
 */

export interface BirthdayRunResult {
  fired: number;
  customerIds: number[];
}

export function runBirthdayRewards(
  facilityId: number,
  config: FacilityLoyaltyConfig,
  options?: { today?: string; isOpen?: (dateISO: string) => boolean },
): BirthdayRunResult {
  const rule = findBirthdayEarnRule(config);
  if (!config.enabled || !rule) return { fired: 0, customerIds: [] };

  const today = options?.today ?? new Date().toISOString().slice(0, 10);
  const isOpen = options?.isOpen ?? (() => true);

  const accounts = getLoyaltyAccountsByFacility(facilityId);
  const recipients = getBirthdayRecipients(
    accounts,
    clients as unknown as BirthdayClient[],
    today,
    isOpen,
  );
  const facilityName =
    facilities.find((f) => f.id === facilityId)?.name ?? "your facility";

  const customerIds: number[] = [];
  for (const recipient of recipients) {
    const notifId = `notif-bday-${facilityId}-${recipient.customerId}-${today}`;
    // Idempotent: a nightly re-run won't re-award a customer already handled today.
    if (
      customerNotificationsStore.getSnapshot().some((n) => n.id === notifId)
    ) {
      continue;
    }

    recordLoyaltyEvent(
      {
        type: "birthday",
        id: `bday-${recipient.customerId}-${today}`,
        facilityId,
        customerId: recipient.customerId,
        occurredAt: `${today}T09:00:00Z`,
      },
      config,
    );

    customerNotificationsStore.push({
      id: notifId,
      type: "reminder",
      title: `Happy birthday from ${facilityName}! 🎂`,
      message: "Your birthday reward is waiting.",
      read: false,
      createdAt: `${today}T09:00:00Z`,
      link: "/customer/rewards",
      category: "Rewards",
    });

    customerIds.push(recipient.customerId);
  }

  return { fired: customerIds.length, customerIds };
}
