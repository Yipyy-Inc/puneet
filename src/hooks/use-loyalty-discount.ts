"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import {
  getActiveDiscountRedemptions,
  consumeRedemption,
} from "@/data/loyalty-redemptions";
import {
  selectBestDiscount,
  discountLineLabel,
  type DiscountStrategy,
} from "@/lib/loyalty/discount";

export interface ActiveLoyaltyDiscount {
  redemptionId: string;
  /** Invoice line-item label, e.g. "Loyalty reward: 10% discount". */
  label: string;
  /** Dollars off the eligible subtotal. */
  amount: number;
}

/**
 * Resolve the single loyalty discount voucher to auto-apply to an invoice for a
 * customer, per the facility's selection strategy. Returns the preview (label +
 * amount to show as a "Loyalty discount applied" line) plus `consume`, which
 * marks the voucher used — call it when the payment/invoice is finalized.
 *
 * No clock or mock-data access happens in render scope (the data layer stamps
 * `now`), keeping this hook pure for the React Compiler / purity rules.
 */
export function useActiveLoyaltyDiscount(params: {
  customerId?: number;
  subtotal: number;
  serviceType?: string;
}): { discount: ActiveLoyaltyDiscount | null; consume: () => void } {
  const { config, facilityId } = useLoyaltyProgram();
  const queryClient = useQueryClient();
  const strategy = (config.discountSelectionStrategy ??
    "highest_value") as DiscountStrategy;

  const { customerId, subtotal, serviceType } = params;

  const discount = useMemo<ActiveLoyaltyDiscount | null>(() => {
    if (!config.enabled || customerId == null || subtotal <= 0) return null;
    const candidates = getActiveDiscountRedemptions(facilityId, customerId);
    const best = selectBestDiscount(candidates, subtotal, serviceType, strategy);
    if (!best) return null;
    return {
      redemptionId: best.redemption.id,
      label: discountLineLabel(best.redemption),
      amount: best.amount,
    };
  }, [config.enabled, facilityId, customerId, subtotal, serviceType, strategy]);

  const consume = useCallback(() => {
    if (!discount) return;
    consumeRedemption(discount.redemptionId);
    queryClient.invalidateQueries({ queryKey: ["loyalty"] });
  }, [discount, queryClient]);

  return { discount, consume };
}
