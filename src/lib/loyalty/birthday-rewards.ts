import type {
  CustomerLoyaltyAccount,
  EarnRule,
  FacilityLoyaltyConfig,
} from "@/types/loyalty";
import { getActiveEarnRules } from "./earn-rule-versioning";

/**
 * Pure "nightly cron" logic for birthday rewards. Given a facility's accounts and
 * its customers' pet birthdays, work out who should receive their birthday
 * reward today — firing on the birthday itself, or, when it lands on a day the
 * facility is closed, on the most recent open day before it. No I/O, no mutation;
 * `today` and an `isOpen` predicate are injected so it stays deterministic.
 *
 * (This platform tracks pet birthdays, not owner birthdays, so a customer "has a
 * birthday today" when any of their pets does; the reward goes to the owner's
 * loyalty account, deduped to once per customer per day.)
 */

/** The facility's active, enabled birthday earn rule, or null. */
export function findBirthdayEarnRule(
  config: FacilityLoyaltyConfig,
): EarnRule | null {
  return (
    getActiveEarnRules(config.earnRules ?? []).find(
      (r) => r.triggerType === "birthday" && r.enabled,
    ) ?? null
  );
}

/** MM-DD of an ISO date (YYYY-MM-DD…), or null. */
export function monthDayOf(iso: string): string | null {
  const m = iso.match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
}

function shiftDay(dateISO: string, days: number): string {
  const t = new Date(`${dateISO}T00:00:00Z`).getTime() + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/**
 * The date a birthday reward fires: the birthday itself if the facility is open
 * that day, otherwise the most recent open day before it (up to a week back).
 */
export function resolveBirthdayFireDate(
  birthdayDate: string,
  isOpen: (dateISO: string) => boolean,
): string {
  if (isOpen(birthdayDate)) return birthdayDate;
  let d = birthdayDate;
  for (let i = 0; i < 7; i++) {
    d = shiftDay(d, -1);
    if (isOpen(d)) return d;
  }
  return birthdayDate;
}

export interface BirthdayClient {
  id: number;
  name: string;
  pets: { name?: string; dateOfBirth?: string }[];
}

export interface BirthdayRecipient {
  account: CustomerLoyaltyAccount;
  customerId: number;
  customerName: string;
}

/**
 * Accounts whose customer has a pet birthday whose resolved fire date is `today`.
 * Deduped to one reward per customer per day.
 */
export function getBirthdayRecipients(
  accounts: CustomerLoyaltyAccount[],
  clients: BirthdayClient[],
  today: string,
  isOpen: (dateISO: string) => boolean,
): BirthdayRecipient[] {
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const recipients: BirthdayRecipient[] = [];
  const seen = new Set<number>();

  for (const account of accounts) {
    if (seen.has(account.customerId)) continue;
    const client = clientById.get(account.customerId);
    if (!client) continue;

    const fires = client.pets.some((pet) => {
      if (!pet.dateOfBirth) return false;
      const md = monthDayOf(pet.dateOfBirth);
      if (!md) return false;
      // Look ahead up to a week so a birthday on a closed day still fires today
      // (the last open day before it).
      for (let offset = 0; offset <= 7; offset++) {
        const candidate = shiftDay(today, offset);
        if (monthDayOf(candidate) !== md) continue;
        return resolveBirthdayFireDate(candidate, isOpen) === today;
      }
      return false;
    });

    if (fires) {
      seen.add(account.customerId);
      recipients.push({
        account,
        customerId: account.customerId,
        customerName: client.name,
      });
    }
  }

  return recipients;
}
