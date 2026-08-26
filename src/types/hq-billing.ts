export type HqSubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "suspended"
  | "cancelled";

export interface HqNetworkSubscription {
  tierId: string;
  tierName: string;
  status: HqSubscriptionStatus;
  billingCycle: string;
  amountCents: number;
  currency: string;
  trialEndsAt: string | null;
  periodEnd: string | null;
  /** From the tier catalogue. `null` means the tier has no location cap. */
  maxLocations: number | null;
}
