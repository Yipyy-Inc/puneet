import type {
  FacilityLoyaltyConfig,
  LoyaltySettings,
  CustomerLoyalty,
  LoyaltyReward,
  SimplePointsEarningRule,
  ReferralCode,
  Badge,
  ReferralRelationship,
  ReferralEvent,
  RedemptionRecord,
  CustomerLoyaltyAccount,
  LoyaltyTransaction,
} from "@/types/loyalty";

import { getTransactionsByCustomer } from "@/data/loyalty-transactions";

import {
  redemptionRecords,
  getRedemptionsByFacility,
} from "@/data/loyalty-redemptions";

import {
  loyaltyAccounts,
  getLoyaltyAccountsByFacility,
  getLoyaltyAccount,
} from "@/data/loyalty-accounts";

import {
  loyaltySettings,
  customerLoyaltyData,
  loyaltyRewards,
  pointsEarningRules,
  referralCodes,
  badges,
} from "@/data/marketing";

import { getFacilityLoyaltyConfig } from "@/data/facility-loyalty-config";

import {
  referralRelationships,
  getReferralRelationshipsByReferrer,
  getReferralEvents,
} from "@/data/referral-tracking";

export const loyaltyQueries = {
  settings: () => ({
    queryKey: ["loyalty", "settings"] as const,
    queryFn: async (): Promise<LoyaltySettings> => loyaltySettings,
  }),

  facilityConfig: (facilityId: number) => ({
    queryKey: ["loyalty", "facilityConfig", facilityId] as const,
    queryFn: async (): Promise<FacilityLoyaltyConfig | null> =>
      getFacilityLoyaltyConfig(facilityId),
  }),

  customerLoyalty: (clientId: number) => ({
    queryKey: ["loyalty", "customer", clientId] as const,
    queryFn: async (): Promise<CustomerLoyalty | undefined> =>
      customerLoyaltyData.find((c) => c.clientId === clientId),
  }),

  allCustomerLoyalty: () => ({
    queryKey: ["loyalty", "customers"] as const,
    queryFn: async (): Promise<CustomerLoyalty[]> => customerLoyaltyData,
  }),

  rewards: () => ({
    queryKey: ["loyalty", "rewards"] as const,
    queryFn: async (): Promise<LoyaltyReward[]> => loyaltyRewards,
  }),

  earningRules: () => ({
    queryKey: ["loyalty", "earningRules"] as const,
    queryFn: async (): Promise<SimplePointsEarningRule[]> => pointsEarningRules,
  }),

  referralCodes: () => ({
    queryKey: ["loyalty", "referralCodes"] as const,
    queryFn: async (): Promise<ReferralCode[]> => referralCodes,
  }),

  badges: () => ({
    queryKey: ["loyalty", "badges"] as const,
    queryFn: async (): Promise<Badge[]> => badges,
  }),

  referralRelationships: (referrerId?: number) => ({
    queryKey: ["loyalty", "referralRelationships", referrerId] as const,
    queryFn: async (): Promise<ReferralRelationship[]> =>
      referrerId
        ? getReferralRelationshipsByReferrer(referrerId)
        : referralRelationships,
  }),

  referralEvents: (relationshipId: string) => ({
    queryKey: ["loyalty", "referralEvents", relationshipId] as const,
    queryFn: async (): Promise<ReferralEvent[]> =>
      getReferralEvents(relationshipId),
  }),

  redemptions: (facilityId?: number) => ({
    queryKey: ["loyalty", "redemptions", facilityId] as const,
    queryFn: async (): Promise<RedemptionRecord[]> =>
      facilityId ? getRedemptionsByFacility(facilityId) : redemptionRecords,
  }),

  accounts: (facilityId?: number) => ({
    queryKey: ["loyalty", "accounts", facilityId] as const,
    queryFn: async (): Promise<CustomerLoyaltyAccount[]> =>
      facilityId ? getLoyaltyAccountsByFacility(facilityId) : loyaltyAccounts,
  }),

  account: (facilityId: number, customerId: number) => ({
    queryKey: ["loyalty", "account", facilityId, customerId] as const,
    queryFn: async (): Promise<CustomerLoyaltyAccount | undefined> =>
      getLoyaltyAccount(facilityId, customerId),
  }),

  transactions: (facilityId: number, customerId: number) => ({
    queryKey: ["loyalty", "transactions", facilityId, customerId] as const,
    queryFn: async (): Promise<LoyaltyTransaction[]> =>
      getTransactionsByCustomer(facilityId, customerId),
  }),
};
