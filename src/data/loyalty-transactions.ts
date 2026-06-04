import type { LoyaltyTransaction } from "@/types/loyalty";
import { loyaltyAccounts } from "@/data/loyalty-accounts";

export type { LoyaltyTransaction } from "@/types/loyalty";

/**
 * Mock loyalty point transactions (the customer's points history). Manual staff
 * adjustments are appended here via addManualAdjustment.
 */
export const loyaltyTransactions: LoyaltyTransaction[] = [
  {
    id: "txn-15-001",
    customerId: 15,
    facilityId: 1,
    transactionType: "earned",
    points: 120,
    description: "Earned on grooming visit",
    source: "booking",
    bookingId: "bkg-88061",
    createdAt: "2026-05-20T14:00:00Z",
  },
  {
    id: "txn-15-002",
    customerId: 15,
    facilityId: 1,
    transactionType: "redeemed",
    points: -500,
    description: "Redeemed $10 account credit",
    source: "manual",
    invoiceId: "inv-50231",
    createdAt: "2026-05-28T14:12:00Z",
  },
  {
    id: "txn-15-003",
    customerId: 15,
    facilityId: 1,
    transactionType: "manual_adjustment",
    points: 50,
    description: "Staff adjustment: Goodwill for a service delay",
    reason: "Goodwill for a service delay",
    staffId: "emp-1",
    staffName: "Sarah Johnson",
    source: "manual",
    createdAt: "2026-06-01T10:30:00Z",
  },
  {
    id: "txn-2-001",
    customerId: 2,
    facilityId: 1,
    transactionType: "earned",
    points: 80,
    description: "Earned on daycare visit",
    source: "booking",
    createdAt: "2026-05-30T09:45:00Z",
  },
  {
    id: "txn-2-002",
    customerId: 2,
    facilityId: 1,
    transactionType: "manual_adjustment",
    points: -25,
    description: "Staff adjustment: Reversed points from a cancelled booking",
    reason: "Reversed points from a cancelled booking",
    staffId: "emp-1",
    staffName: "Sarah Johnson",
    source: "manual",
    createdAt: "2026-06-02T16:05:00Z",
  },
];

export function getTransactionsByCustomer(
  facilityId: number,
  customerId: number,
): LoyaltyTransaction[] {
  return loyaltyTransactions
    .filter((t) => t.facilityId === facilityId && t.customerId === customerId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

let adjustmentSeq = 0;

/**
 * Record a manual staff points adjustment: appends a "manual_adjustment"
 * transaction and updates the customer's account balance. Positive points add,
 * negative remove (floored at zero).
 */
export function addManualAdjustment(input: {
  facilityId: number;
  customerId: number;
  points: number;
  reason: string;
  staffId: string;
  staffName: string;
}): LoyaltyTransaction {
  const now = new Date().toISOString();
  adjustmentSeq += 1;
  const txn: LoyaltyTransaction = {
    id: `txn-adj-${input.facilityId}-${input.customerId}-${Date.now()}-${adjustmentSeq}`,
    customerId: input.customerId,
    facilityId: input.facilityId,
    transactionType: "manual_adjustment",
    points: input.points,
    description: `Staff adjustment: ${input.reason}`,
    reason: input.reason,
    staffId: input.staffId,
    staffName: input.staffName,
    source: "manual",
    createdAt: now,
  };
  loyaltyTransactions.push(txn);

  const account = loyaltyAccounts.find(
    (a) =>
      a.facilityId === input.facilityId && a.customerId === input.customerId,
  );
  if (account) {
    account.pointsBalance = Math.max(0, account.pointsBalance + input.points);
    if (input.points > 0) {
      account.lifetimePointsEarned += input.points;
    }
    account.lastActivityAt = now;
    account.updatedAt = now;
  }

  return txn;
}
