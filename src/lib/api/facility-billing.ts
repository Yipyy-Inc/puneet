import {
  buildSubscriptionInvoices,
  getAccountCredit,
  getCurrentSubscription,
  getPaymentMethod,
  type AccountCredit,
} from "@/data/facility-billing";
import { subscriptionTiers } from "@/data/subscription-tiers";
import type {
  CurrentSubscription,
  PaymentMethodOnFile,
  SubscriptionInvoice,
} from "@/types/facility-billing";
import type { SubscriptionTier } from "@/data/subscription-tiers";

// Query factory for the facility profile Billing tab.
export const facilityBillingQueries = {
  subscription: (facilityId: number) => ({
    queryKey: ["facility-billing", "subscription", facilityId] as const,
    queryFn: async (): Promise<CurrentSubscription | null> =>
      getCurrentSubscription(facilityId),
  }),

  invoices: (facilityId: number) => ({
    queryKey: ["facility-billing", "invoices", facilityId] as const,
    queryFn: async (): Promise<SubscriptionInvoice[]> =>
      buildSubscriptionInvoices(facilityId),
  }),

  paymentMethod: (facilityId: number) => ({
    queryKey: ["facility-billing", "payment-method", facilityId] as const,
    queryFn: async (): Promise<PaymentMethodOnFile | null> =>
      getPaymentMethod(facilityId),
  }),

  creditBalance: (facilityId: number) => ({
    queryKey: ["facility-billing", "credit", facilityId] as const,
    queryFn: async (): Promise<AccountCredit> => getAccountCredit(facilityId),
  }),

  tiers: () => ({
    queryKey: ["facility-billing", "tiers"] as const,
    queryFn: async (): Promise<SubscriptionTier[]> =>
      subscriptionTiers.filter((t) => t.isActive),
  }),
};
