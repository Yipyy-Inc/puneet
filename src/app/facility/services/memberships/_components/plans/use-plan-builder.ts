"use client";

import { useState, useCallback } from "react";
import type {
  MembershipPlan,
  MembershipBillingCycle,
  CancellationPolicy,
  WeeklyBillingDay,
  MembershipDiscountRule,
  MembershipIncludedItem,
  MembershipChangePolicy,
  ServiceCategory,
} from "@/data/services-pricing";
import { defaultMembershipChangePolicy } from "@/data/services-pricing";

export interface PlanBuilderData {
  name: string;
  tierLabel: string;
  description: string;
  isActive: boolean;
  isPopular: boolean;
  availableOnline: boolean;
  termsText: string;
  termsUrl: string;
  badgeColor: string;

  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  taxAmount: number;
  billingCycle: MembershipBillingCycle;
  weeklyBillingDay?: WeeklyBillingDay;
  weeklyBillingTime: string;
  gracePeriodDays: number;

  discountRules: MembershipDiscountRule[];
  includedItems: MembershipIncludedItem[];
  perks: string[];
  applicableServices: ServiceCategory[];

  cancellationPolicy: CancellationPolicy;
  credits: number;
  discountPercentage: number;

  changePolicy: MembershipChangePolicy;
  upgradePlanIds: string[];
  downgradePlanIds: string[];
}

export const emptyPlan: PlanBuilderData = {
  name: "",
  tierLabel: "Silver",
  description: "",
  isActive: true,
  isPopular: false,
  availableOnline: true,
  termsText: "",
  termsUrl: "",
  badgeColor: "#D4AF37",

  monthlyPrice: 0,
  quarterlyPrice: 0,
  annualPrice: 0,
  taxAmount: 0,
  billingCycle: "monthly",
  weeklyBillingDay: "mon",
  weeklyBillingTime: "09:00",
  gracePeriodDays: 7,

  discountRules: [],
  includedItems: [],
  perks: [],
  applicableServices: [],

  cancellationPolicy: "end_of_cycle",
  credits: 0,
  discountPercentage: 0,

  changePolicy: { ...defaultMembershipChangePolicy },
  upgradePlanIds: [],
  downgradePlanIds: [],
};

export function planToBuilderData(plan: MembershipPlan): PlanBuilderData {
  return {
    name: plan.name,
    tierLabel: plan.tierLabel ?? "Silver",
    description: plan.description,
    isActive: plan.isActive,
    isPopular: plan.isPopular,
    availableOnline: plan.availableOnline,
    termsText: plan.termsText ?? "",
    termsUrl: plan.termsUrl ?? "",
    badgeColor: plan.badgeColor,

    monthlyPrice: plan.monthlyPrice,
    quarterlyPrice: plan.quarterlyPrice,
    annualPrice: plan.annualPrice,
    taxAmount: plan.taxAmount,
    billingCycle: plan.billingCycle,
    weeklyBillingDay: plan.weeklyBillingDay ?? "mon",
    weeklyBillingTime: plan.weeklyBillingTime ?? "09:00",
    gracePeriodDays: plan.gracePeriodDays,

    discountRules: plan.discountRules,
    includedItems: plan.includedItems,
    perks: plan.perks,
    applicableServices: plan.applicableServices,

    cancellationPolicy: plan.cancellationPolicy,
    credits: plan.credits,
    discountPercentage: plan.discountPercentage,

    changePolicy: plan.changePolicy ?? { ...defaultMembershipChangePolicy },
    upgradePlanIds: plan.upgradePlanIds ?? [],
    downgradePlanIds: plan.downgradePlanIds ?? [],
  };
}

export function usePlanBuilder(initial?: MembershipPlan) {
  const [data, setData] = useState<PlanBuilderData>(
    initial ? planToBuilderData(initial) : emptyPlan,
  );
  const [currentStep, setCurrentStep] = useState(0);

  const update = useCallback((patch: Partial<PlanBuilderData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback((next?: MembershipPlan) => {
    setData(next ? planToBuilderData(next) : emptyPlan);
    setCurrentStep(0);
  }, []);

  const canProceedFrom = useCallback(
    (step: number): boolean => {
      switch (step) {
        case 0:
          return (
            data.name.trim().length > 0 &&
            data.description.trim().length > 0 &&
            data.tierLabel.trim().length > 0
          );
        case 1:
          return (
            data.monthlyPrice > 0 ||
            data.quarterlyPrice > 0 ||
            data.annualPrice > 0
          );
        default:
          return true;
      }
    },
    [data],
  );

  return {
    data,
    update,
    reset,
    currentStep,
    setCurrentStep,
    canProceedFrom,
  };
}
