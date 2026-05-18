/**
 * Mock client training packages.
 *
 * Two packages for Buddy (petId 1, clientId 15 — Alice) so the demo
 * surfaces both the healthy state (3 of 6 left) and the renewal nudge
 * (2 of 10 left) side-by-side on the trainer profile + customer portal.
 */
import type { ClientTrainingPackage } from "@/lib/training-enrollment";

export const clientTrainingPackages: ClientTrainingPackage[] = [
  {
    id: "ctp-buddy-001",
    clientId: 15,
    petId: 1,
    petName: "Buddy",
    packageId: "basic-obedience",
    packageName: "Basic Obedience 6-Pack",
    classType: "group",
    sessionsPurchased: 6,
    sessionsUsed: 3,
    purchaseDate: "2026-02-15",
    expiresAt: "2026-08-15",
    pricePaid: 270,
    status: "active",
    lastRenewalReminderAt: null,
    notes:
      "Bundle purchased at the New-Year promo; transfer rules attached on file.",
  },
  {
    id: "ctp-buddy-002",
    clientId: 15,
    petId: 1,
    petName: "Buddy",
    packageId: "private-coaching",
    packageName: "Private Coaching 10-Pack",
    classType: "private",
    sessionsPurchased: 10,
    sessionsUsed: 8,
    purchaseDate: "2026-01-20",
    expiresAt: "2026-07-20",
    pricePaid: 850,
    status: "active",
    // Low balance, no reminder fired yet — trips the "Send renewal reminder"
    // prompt the moment the trainer opens Buddy's profile.
    lastRenewalReminderAt: null,
    notes:
      "Two-on-one structure for Buddy — Alice + Buddy. Marcus is the lead trainer.",
  },
];
