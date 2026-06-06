import type { RedemptionRecord } from "@/types/loyalty";

export type { RedemptionRecord } from "@/types/loyalty";

/**
 * Mock loyalty redemption records — the analytics-facing log created whenever a
 * customer redeems points, uses a credit, or triggers a loyalty discount.
 * Replace `redemptionRecords` with a real query when the API lands.
 */
export const redemptionRecords: RedemptionRecord[] = [
  {
    id: "rdm-1001",
    facilityId: 1,
    customerId: 15,
    rewardType: "credit_balance",
    rewardValue: 10,
    redeemMethod: "portal_self",
    bookingId: null,
    invoiceId: "inv-50231",
    redeemedAt: "2026-05-28T14:12:00Z",
    expiresAt: "2026-08-26T00:00:00Z",
    status: "used",
  },
  {
    id: "rdm-1002",
    facilityId: 1,
    customerId: 2,
    rewardType: "free_service",
    rewardValue: "Free Daycare Day",
    redeemMethod: "staff_applied",
    bookingId: "bkg-88012",
    invoiceId: null,
    redeemedAt: "2026-05-30T09:45:00Z",
    expiresAt: "2026-07-29T00:00:00Z",
    status: "active",
  },
  {
    id: "rdm-1003",
    facilityId: 1,
    customerId: 7,
    rewardType: "discount_code",
    rewardValue: 15,
    redeemMethod: "checkout_applied",
    bookingId: "bkg-88019",
    invoiceId: "inv-50240",
    redeemedAt: "2026-06-01T16:30:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-1004",
    facilityId: 1,
    customerId: 22,
    rewardType: "auto_apply",
    rewardValue: "10th Visit Free",
    redeemMethod: "auto_applied",
    bookingId: "bkg-88031",
    invoiceId: "inv-50255",
    redeemedAt: "2026-06-02T11:05:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-1005",
    facilityId: 1,
    customerId: 15,
    rewardType: "credit_balance",
    rewardValue: 25,
    redeemMethod: "portal_self",
    bookingId: null,
    invoiceId: null,
    redeemedAt: "2026-06-02T18:20:00Z",
    expiresAt: "2026-09-01T00:00:00Z",
    status: "active",
  },
  {
    id: "rdm-1006",
    facilityId: 1,
    customerId: 9,
    rewardType: "free_service",
    rewardValue: "Free Nail Trim",
    redeemMethod: "staff_applied",
    bookingId: "bkg-87740",
    invoiceId: "inv-49980",
    redeemedAt: "2026-04-18T13:00:00Z",
    expiresAt: "2026-05-18T00:00:00Z",
    status: "expired",
  },
  {
    id: "rdm-1007",
    facilityId: 1,
    customerId: 31,
    rewardType: "discount_code",
    rewardValue: 10,
    redeemMethod: "checkout_applied",
    bookingId: null,
    invoiceId: "inv-50190",
    redeemedAt: "2026-05-22T10:15:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-1008",
    facilityId: 1,
    customerId: 2,
    rewardType: "credit_balance",
    rewardValue: 50,
    redeemMethod: "portal_self",
    bookingId: null,
    invoiceId: null,
    redeemedAt: "2026-06-03T08:40:00Z",
    expiresAt: "2026-09-01T00:00:00Z",
    status: "active",
  },
  {
    id: "rdm-1009",
    facilityId: 1,
    customerId: 7,
    rewardType: "free_service",
    rewardValue: "Free Bath",
    redeemMethod: "auto_applied",
    bookingId: "bkg-88044",
    invoiceId: null,
    redeemedAt: "2026-03-11T15:25:00Z",
    expiresAt: "2026-04-10T00:00:00Z",
    status: "expired",
  },
  {
    id: "rdm-1010",
    facilityId: 1,
    customerId: 44,
    rewardType: "discount_code",
    rewardValue: 20,
    redeemMethod: "staff_applied",
    bookingId: "bkg-88050",
    invoiceId: "inv-50261",
    redeemedAt: "2026-06-01T12:50:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-1011",
    facilityId: 1,
    customerId: 15,
    rewardType: "free_service",
    rewardValue: "Free Add-on",
    redeemMethod: "portal_self",
    bookingId: "bkg-88061",
    invoiceId: null,
    redeemedAt: "2026-06-03T09:10:00Z",
    expiresAt: "2026-08-02T00:00:00Z",
    status: "active",
  },
  {
    id: "rdm-1012",
    facilityId: 1,
    customerId: 31,
    rewardType: "credit_balance",
    rewardValue: 15,
    redeemMethod: "checkout_applied",
    bookingId: "bkg-88066",
    invoiceId: "inv-50270",
    redeemedAt: "2026-06-02T17:35:00Z",
    expiresAt: "2026-09-01T00:00:00Z",
    status: "active",
  },
  {
    // Active discount voucher scoped to grooming, expiring soon — demonstrates
    // the rewards wallet's service scope + amber "Expiring soon" badge.
    id: "rdm-1013",
    facilityId: 1,
    customerId: 15,
    rewardType: "discount_pct",
    rewardValue: 5,
    redeemMethod: "checkout_applied",
    bookingId: null,
    invoiceId: null,
    issuedAt: "2026-05-12T10:00:00Z",
    redeemedAt: "2026-05-12T10:00:00Z",
    expiresAt: "2026-06-11T00:00:00Z",
    status: "active",
    appliesToServiceTypes: ["grooming"],
  },
  // Reward-mix samples — issuedAt + redeemedAt across all four buckets, used to
  // demonstrate the reward-type breakdown + time-to-redeem analytics.
  {
    id: "rdm-rt-c1",
    facilityId: 1,
    customerId: 15,
    rewardType: "credit",
    rewardValue: 10,
    redeemMethod: "portal_self",
    bookingId: null,
    invoiceId: null,
    issuedAt: "2026-05-15T10:00:00Z",
    redeemedAt: "2026-05-29T10:00:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-rt-c2",
    facilityId: 1,
    customerId: 2,
    rewardType: "credit",
    rewardValue: 20,
    redeemMethod: "portal_self",
    bookingId: null,
    invoiceId: null,
    issuedAt: "2026-04-10T10:00:00Z",
    redeemedAt: "2026-04-26T10:00:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-rt-d1",
    facilityId: 1,
    customerId: 7,
    rewardType: "discount_pct",
    rewardValue: 10,
    redeemMethod: "checkout_applied",
    bookingId: "bkg-rt-01",
    invoiceId: null,
    issuedAt: "2026-04-25T10:00:00Z",
    redeemedAt: "2026-05-27T10:00:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-rt-d2",
    facilityId: 1,
    customerId: 22,
    rewardType: "discount_fixed",
    rewardValue: 5,
    redeemMethod: "checkout_applied",
    bookingId: "bkg-rt-02",
    invoiceId: null,
    issuedAt: "2026-05-01T10:00:00Z",
    redeemedAt: "2026-06-03T10:00:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-rt-f1",
    facilityId: 1,
    customerId: 2,
    rewardType: "free_service",
    rewardValue: "Free Nail Trim",
    redeemMethod: "staff_applied",
    bookingId: null,
    invoiceId: null,
    issuedAt: "2026-05-05T10:00:00Z",
    redeemedAt: "2026-05-26T10:00:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-rt-f2",
    facilityId: 1,
    customerId: 31,
    rewardType: "freebie",
    rewardValue: "Free Bandana",
    redeemMethod: "staff_applied",
    bookingId: null,
    invoiceId: null,
    issuedAt: "2026-04-08T10:00:00Z",
    redeemedAt: "2026-04-30T10:00:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-rt-g1",
    facilityId: 1,
    customerId: 22,
    rewardType: "gift_card",
    rewardValue: 25,
    redeemMethod: "portal_self",
    bookingId: null,
    invoiceId: null,
    issuedAt: "2026-05-20T10:00:00Z",
    redeemedAt: "2026-05-29T10:00:00Z",
    expiresAt: null,
    status: "used",
  },
  {
    id: "rdm-rt-g2",
    facilityId: 1,
    customerId: 15,
    rewardType: "gift_card",
    rewardValue: 50,
    redeemMethod: "portal_self",
    bookingId: null,
    invoiceId: null,
    issuedAt: "2026-04-18T10:00:00Z",
    redeemedAt: "2026-04-28T10:00:00Z",
    expiresAt: null,
    status: "used",
  },
];

export function getRedemptionsByFacility(
  facilityId: number,
): RedemptionRecord[] {
  return redemptionRecords.filter((r) => r.facilityId === facilityId);
}

/**
 * A customer's currently-usable discount vouchers: active, not expired, and of a
 * discount reward type. Used to auto-apply a loyalty discount at checkout.
 */
export function getActiveDiscountRedemptions(
  facilityId: number,
  customerId: number,
): RedemptionRecord[] {
  const now = new Date().toISOString();
  return redemptionRecords.filter(
    (r) =>
      r.facilityId === facilityId &&
      r.customerId === customerId &&
      r.status === "active" &&
      (r.rewardType === "discount_pct" || r.rewardType === "discount_fixed") &&
      (r.expiresAt == null || r.expiresAt > now),
  );
}

/**
 * All of a customer's currently-usable reward vouchers (any type): active and
 * not past expiry. Powers the customer portal's "Your Rewards" wallet.
 */
export function getActiveRedemptionsForCustomer(
  facilityId: number,
  customerId: number,
): RedemptionRecord[] {
  const now = new Date().toISOString();
  return redemptionRecords.filter(
    (r) =>
      r.facilityId === facilityId &&
      r.customerId === customerId &&
      r.status === "active" &&
      (r.expiresAt == null || r.expiresAt > now),
  );
}

/** Mark a redemption voucher as used (idempotent — only flips an active one). */
export function consumeRedemption(redemptionId: string): void {
  const r = redemptionRecords.find((x) => x.id === redemptionId);
  if (r && r.status === "active") {
    r.status = "used";
  }
}
