"use client";

import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLoyaltyProgram } from "@/hooks/use-loyalty-program";
import {
  loyaltyLedgerQueries,
  useConsumeLoyaltyVoucher,
  useReleaseLoyaltyVoucher,
} from "@/lib/api/loyalty-ledger";
import {
  selectBestDiscount,
  discountLineLabel,
  type DiscountStrategy,
} from "@/lib/loyalty/discount";

// ============================================================================
// The loyalty reward that comes off this bill.
//
// ── WHAT THIS USED TO DO ──────────────────────────────────────────────────
//
//     const candidates = getActiveDiscountRedemptions(facilityId, customerId);
//     ...
//     const consume = () => { consumeRedemption(discount.redemptionId); };
//
// Both halves read `src/data/loyalty-redemptions`, a hand-authored file keyed
// by `facilityId: 1`. `consumeRedemption` spliced an in-memory array, so a
// refresh brought the voucher back and the same reward could come off bill
// after bill. It was inert only because all three fixture vouchers happened to
// be expired or already used.
//
// ── CONSUMING CAN FAIL NOW, AND THAT IS THE POINT ─────────────────────────
//
// `consume` returned `void`, because splicing an array cannot fail. It returns
// a promise that REJECTS when the reward has already been spent — and the
// caller must not go on to charge a discounted total for a discount it did not
// get. Two tills reaching the same voucher is exactly the case the fixture
// could not represent.
//
// ── AND THE DISCOUNT IS A LINE ON THE BILL, NOT A NUMBER IN A DIALOG ──────
//
// The checkout previews it by subtracting from what it shows. That preview is
// all it ever was: the callers rebuilt the charge from `booking.amountDue` and
// the discount never reached the money. For a TERMINAL payment it could not
// have — that charge is computed server-side from `amount_due`, so a number
// living in the browser was never going to be part of it.
//
// So the checkout writes a negative LINE ITEM, the way the late-pickup fee
// already writes a positive one, and `amount_due` (generated from
// `extras_total`) comes down before anything is charged. This hook does not
// write it — it reports the reward and spends it; the bill belongs to the
// screen that owns the bill.
// ============================================================================

export interface ActiveLoyaltyDiscount {
  voucherId: string;
  /** Invoice line-item label, e.g. "Loyalty reward: 10% discount". */
  label: string;
  /** Dollars off the eligible subtotal. */
  amount: number;
}

export function useActiveLoyaltyDiscount(params: {
  /** `clients.ref` — the number the screens and URLs use. */
  clientRef?: number;
  subtotal: number;
  serviceType?: string;
}): {
  discount: ActiveLoyaltyDiscount | null;
  /**
   * Spend it against a bill. REJECTS if it has already been spent — do not
   * charge if so. `bookingRef` is recorded on the voucher, so a reward can be
   * traced to the bill it came off.
   */
  consume: (bookingRef?: number) => Promise<void>;
  /** Give it back after a charge that did not happen. Never throws. */
  release: () => Promise<void>;
} {
  const { config } = useLoyaltyProgram();
  const consumeVoucher = useConsumeLoyaltyVoucher();
  const releaseVoucher = useReleaseLoyaltyVoucher();

  const { clientRef, subtotal, serviceType } = params;
  const enabled = config.enabled && clientRef !== undefined && subtotal > 0;

  const accountQuery = useQuery({
    ...loyaltyLedgerQueries.accountForClient(clientRef),
    enabled,
  });
  const accountId = accountQuery.data?.id;

  const vouchersQuery = useQuery({
    ...loyaltyLedgerQueries.spendableVouchers(accountId),
    enabled: enabled && Boolean(accountId),
  });

  const strategy = (config.discountSelectionStrategy ??
    "highest_value") as DiscountStrategy;

  const discount = useMemo<ActiveLoyaltyDiscount | null>(() => {
    if (!enabled) return null;
    const best = selectBestDiscount(
      vouchersQuery.data ?? [],
      subtotal,
      serviceType,
      strategy,
    );
    if (!best) return null;
    return {
      voucherId: best.voucher.id,
      label: discountLineLabel(best.voucher),
      amount: best.amount,
    };
  }, [enabled, vouchersQuery.data, subtotal, serviceType, strategy]);

  const consume = useCallback(
    async (bookingRef?: number) => {
      if (!discount) return;
      await consumeVoucher.mutateAsync({
        voucherId: discount.voucherId,
        bookingRef,
      });
    },
    [discount, consumeVoucher],
  );

  const release = useCallback(async () => {
    if (!discount) return;
    // Swallowed on purpose. This runs in the failure path of a payment that has
    // already gone wrong, and a second error about the reward would bury the
    // first one about the money. The voucher staying spent is the lesser
    // problem and is visible on the customer's account.
    await releaseVoucher
      .mutateAsync({ voucherId: discount.voucherId })
      .catch(() => undefined);
  }, [discount, releaseVoucher]);

  return { discount, consume, release };
}
