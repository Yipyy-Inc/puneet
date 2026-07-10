import type { BookingTransfer } from "@/types/location";

// Per-transfer impact computations, shared by the Transfer Center cards and the
// standalone Transfer Impact report.

export interface TransferImpact {
  priceDelta: number;
  /** Formatted price change, e.g. "+$8", "-$4", "$0". */
  priceLabel: string;
  /** Whether the customer stayed after the move (mock: a completed transfer
   *  means retained, unless a required customer approval never came through). */
  retained: boolean;
  /** The staff member who authorized/initiated the transfer. */
  authorizedBy: string;
  /** Their note or reason for the move, if any. */
  note?: string;
}

export function getTransferImpact(t: BookingTransfer): TransferImpact {
  return {
    priceDelta: t.priceDelta,
    priceLabel:
      t.priceDelta === 0
        ? "$0"
        : `${t.priceDelta > 0 ? "+" : ""}$${t.priceDelta}`,
    retained:
      t.status === "completed" &&
      (!t.requiresCustomerApproval || Boolean(t.customerApprovedAt)),
    authorizedBy: t.initiatedBy,
    note: t.notes ?? t.reason,
  };
}
