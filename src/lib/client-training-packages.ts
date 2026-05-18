/**
 * Client training packages — purchased balance + reminder helpers.
 *
 * Distinct from `TrainingEnrollment` (which binds a pet to a single series)
 * and the generic `CustomerPackagePurchase` (which is service-agnostic with
 * no per-pet binding). Drives the "Sessions Remaining" badge on the trainer
 * profile + customer portal and the auto-renewal-reminder prompt.
 */
import type { QueryClient } from "@tanstack/react-query";
import type { ClientTrainingPackage } from "@/lib/training-enrollment";

/** When sessions remaining ≤ this number, the owner gets nudged to renew. */
export const LOW_BALANCE_THRESHOLD = 2;

/** How many days the auto-reminder must wait before re-firing — keeps us
 *  from spamming the owner every time the trainer opens the profile. */
export const REMINDER_COOLDOWN_DAYS = 7;

/** Days of warning before expiry. Drives the "Expiring soon" badge. */
export const EXPIRY_WARNING_DAYS = 14;

export function getSessionsRemaining(pkg: ClientTrainingPackage): number {
  return Math.max(0, pkg.sessionsPurchased - pkg.sessionsUsed);
}

export function getProgressPct(pkg: ClientTrainingPackage): number {
  if (pkg.sessionsPurchased <= 0) return 0;
  return Math.round((pkg.sessionsUsed / pkg.sessionsPurchased) * 100);
}

export function isLowBalance(
  pkg: ClientTrainingPackage,
  threshold: number = LOW_BALANCE_THRESHOLD,
): boolean {
  if (pkg.status !== "active") return false;
  const remaining = getSessionsRemaining(pkg);
  return remaining > 0 && remaining <= threshold;
}

export function isExhausted(pkg: ClientTrainingPackage): boolean {
  return getSessionsRemaining(pkg) === 0 || pkg.status === "exhausted";
}

/** True when the package's expiry is within `EXPIRY_WARNING_DAYS` from
 *  `today`. Already-expired packages return false (they're handled by the
 *  `expired` status instead). */
export function isExpiringSoon(
  pkg: ClientTrainingPackage,
  today: string,
  windowDays: number = EXPIRY_WARNING_DAYS,
): boolean {
  if (!pkg.expiresAt) return false;
  if (pkg.status !== "active") return false;
  const days = daysBetween(today, pkg.expiresAt);
  return days >= 0 && days <= windowDays;
}

/** Decides whether the trainer-side UI should offer a "Send renewal
 *  reminder" prompt: balance is low (or zero) AND we haven't fired one in
 *  the last `REMINDER_COOLDOWN_DAYS`. */
export function shouldSendRenewalReminder(
  pkg: ClientTrainingPackage,
  today: string,
): boolean {
  if (pkg.status !== "active") return false;
  if (!isLowBalance(pkg) && !isExhausted(pkg)) return false;
  if (!pkg.lastRenewalReminderAt) return true;
  const days = daysBetween(
    pkg.lastRenewalReminderAt.slice(0, 10),
    today,
  );
  return days >= REMINDER_COOLDOWN_DAYS;
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO.slice(0, 10)}T00:00:00Z`).getTime();
  const to = new Date(`${toISO.slice(0, 10)}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

export interface ClientTrainingPackageRow {
  pkg: ClientTrainingPackage;
  sessionsRemaining: number;
  progressPct: number;
  lowBalance: boolean;
  exhausted: boolean;
  expiringSoon: boolean;
  reminderDue: boolean;
}

function decoratePackage(
  pkg: ClientTrainingPackage,
  today: string,
): ClientTrainingPackageRow {
  return {
    pkg,
    sessionsRemaining: getSessionsRemaining(pkg),
    progressPct: getProgressPct(pkg),
    lowBalance: isLowBalance(pkg),
    exhausted: isExhausted(pkg),
    expiringSoon: isExpiringSoon(pkg, today),
    reminderDue: shouldSendRenewalReminder(pkg, today),
  };
}

/** Active packages for a single pet — used by the trainer profile header
 *  + Overview tab "Training packages" panel. */
export function aggregateActivePackagesForPet(
  petId: number,
  packages: ClientTrainingPackage[],
  today: string,
): ClientTrainingPackageRow[] {
  return packages
    .filter((p) => p.petId === petId && p.status === "active")
    .map((p) => decoratePackage(p, today))
    .sort((a, b) => {
      // Low-balance + reminder-due rise to the top so trainers see action
      // items first; otherwise newest first.
      if (a.reminderDue !== b.reminderDue) return a.reminderDue ? -1 : 1;
      if (a.lowBalance !== b.lowBalance) return a.lowBalance ? -1 : 1;
      return b.pkg.purchaseDate.localeCompare(a.pkg.purchaseDate);
    });
}

/** Active packages for one client (the customer-portal view). */
export function aggregateActivePackagesForClient(
  clientId: number,
  packages: ClientTrainingPackage[],
  today: string,
): ClientTrainingPackageRow[] {
  return packages
    .filter((p) => p.clientId === clientId && p.status === "active")
    .map((p) => decoratePackage(p, today))
    .sort((a, b) => {
      if (a.lowBalance !== b.lowBalance) return a.lowBalance ? -1 : 1;
      return b.pkg.purchaseDate.localeCompare(a.pkg.purchaseDate);
    });
}

/** Total active sessions remaining across every package belonging to one
 *  client — used by the customer dashboard's "Training Credits" widget. */
export function totalSessionsRemainingForClient(
  clientId: number,
  packages: ClientTrainingPackage[],
): number {
  let total = 0;
  for (const p of packages) {
    if (p.clientId !== clientId) continue;
    if (p.status !== "active") continue;
    total += getSessionsRemaining(p);
  }
  return total;
}

/** Insert-or-replace a package record across every cached query scope.
 *  Scopes we recognize as the third query-key segment:
 *   - `"all"`
 *   - `["pet", petId]`
 *   - `["client", clientId]` */
export function fanOutClientTrainingPackageUpsert(
  queryClient: QueryClient,
  record: ClientTrainingPackage,
): void {
  const cache = queryClient.getQueryCache();
  cache
    .findAll({ queryKey: ["training", "client-packages"] })
    .forEach((query) => {
      const key = query.queryKey;
      if (key.length < 3) return;
      const scope = key[2];
      let accepts = false;
      if (scope === "all") accepts = true;
      else if (scope === "pet" && key[3] === record.petId) accepts = true;
      else if (scope === "client" && key[3] === record.clientId) accepts = true;
      if (!accepts) {
        queryClient.setQueryData<ClientTrainingPackage[]>(key, (prev = []) =>
          prev.filter((p) => p.id !== record.id),
        );
        return;
      }
      queryClient.setQueryData<ClientTrainingPackage[]>(key, (prev = []) => {
        const idx = prev.findIndex((p) => p.id === record.id);
        if (idx === -1) return [record, ...prev];
        const next = prev.slice();
        next[idx] = record;
        return next;
      });
    });
}

export function fanOutClientTrainingPackageDelete(
  queryClient: QueryClient,
  id: string,
): void {
  const cache = queryClient.getQueryCache();
  cache
    .findAll({ queryKey: ["training", "client-packages"] })
    .forEach((query) => {
      queryClient.setQueryData<ClientTrainingPackage[]>(
        query.queryKey,
        (prev = []) => prev.filter((p) => p.id !== id),
      );
    });
}

/** Stamp the reminder timestamp so the auto-reminder prompt cools down. */
export function markRenewalReminderSent(
  queryClient: QueryClient,
  pkg: ClientTrainingPackage,
): ClientTrainingPackage {
  const updated: ClientTrainingPackage = {
    ...pkg,
    lastRenewalReminderAt: new Date().toISOString(),
  };
  fanOutClientTrainingPackageUpsert(queryClient, updated);
  return updated;
}
