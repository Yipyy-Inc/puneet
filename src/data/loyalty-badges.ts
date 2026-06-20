import type { CustomerBadge } from "@/types/loyalty";

export type { CustomerBadge } from "@/types/loyalty";

/**
 * Mock store of earned achievement badges — one record per
 * (customer, facility, badge), created by the loyalty automation engine the
 * first time a customer meets a badge's condition. Seeded with facility-1 earns
 * (kept in sync with each account's `earnedBadgeIds`) so the badge-achievement
 * report has data; more records accrue at runtime as customers earn badges. Swap
 * for a real query when the API lands.
 */
export const customerBadges: CustomerBadge[] = [
  // badge-001 Frequent Visitor (most-earned)
  {
    id: "cb-1-22-badge-001",
    facilityId: 1,
    customerId: 22,
    badgeId: "badge-001",
    earnedAt: "2025-11-03T12:00:00Z",
  },
  {
    id: "cb-1-15-badge-001",
    facilityId: 1,
    customerId: 15,
    badgeId: "badge-001",
    earnedAt: "2026-01-15T12:00:00Z",
  },
  {
    id: "cb-1-31-badge-001",
    facilityId: 1,
    customerId: 31,
    badgeId: "badge-001",
    earnedAt: "2026-02-12T12:00:00Z",
  },
  {
    id: "cb-1-2-badge-001",
    facilityId: 1,
    customerId: 2,
    badgeId: "badge-001",
    earnedAt: "2026-03-05T12:00:00Z",
  },
  {
    id: "cb-1-7-badge-001",
    facilityId: 1,
    customerId: 7,
    badgeId: "badge-001",
    earnedAt: "2026-04-22T12:00:00Z",
  },
  // badge-002 Big Spender
  {
    id: "cb-1-22-badge-002",
    facilityId: 1,
    customerId: 22,
    badgeId: "badge-002",
    earnedAt: "2025-12-18T12:00:00Z",
  },
  {
    id: "cb-1-15-badge-002",
    facilityId: 1,
    customerId: 15,
    badgeId: "badge-002",
    earnedAt: "2026-02-22T12:00:00Z",
  },
  {
    id: "cb-1-31-badge-002",
    facilityId: 1,
    customerId: 31,
    badgeId: "badge-002",
    earnedAt: "2026-04-03T12:00:00Z",
  },
  // badge-003 Loyal Friend
  {
    id: "cb-1-22-badge-003",
    facilityId: 1,
    customerId: 22,
    badgeId: "badge-003",
    earnedAt: "2026-01-22T12:00:00Z",
  },
  {
    id: "cb-1-15-badge-003",
    facilityId: 1,
    customerId: 15,
    badgeId: "badge-003",
    earnedAt: "2026-03-12T12:00:00Z",
  },
  // badge-004 Super Referrer (rarest)
  {
    id: "cb-1-22-badge-004",
    facilityId: 1,
    customerId: 22,
    badgeId: "badge-004",
    earnedAt: "2026-03-06T12:00:00Z",
  },
];

export function getCustomerBadges(
  facilityId: number,
  customerId: number,
): CustomerBadge[] {
  return customerBadges.filter(
    (b) => b.facilityId === facilityId && b.customerId === customerId,
  );
}

export function getCustomerBadgesByFacility(
  facilityId: number,
): CustomerBadge[] {
  return customerBadges.filter((b) => b.facilityId === facilityId);
}
