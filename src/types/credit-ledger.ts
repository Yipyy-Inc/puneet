// Platform credit & discount ledger (Yipyy → facility). A credit is an account
// balance Yipyy owes a facility (a liability); a discount is a recurring rate
// reduction (no cash liability). Status (active/expired) is derived from expiry.

export type LedgerKind = "credit" | "discount";
export type LedgerStatus = "active" | "expired";
export type LedgerValueType = "fixed" | "percent";

export interface LedgerEntry {
  id: string;
  facilityId: number;
  facilityName: string;
  kind: LedgerKind;
  /** Credits are always "fixed" dollars; discounts can be "fixed" or "percent". */
  valueType: LedgerValueType;
  /** Dollar amount for fixed credit/discount; 0 for percent discounts. */
  amount: number;
  /** Percentage for percent discounts; null otherwise. */
  percent: number | null;
  /** Outstanding credit balance (credits only); 0 for discounts. */
  remaining: number;
  reason: string;
  appliedBy: string;
  /** YYYY-MM-DD. */
  appliedOn: string;
  /** YYYY-MM-DD, or null for "never". */
  expiry: string | null;
  /** Discount duration label (e.g. "3 months", "Forever"); null for credits. */
  duration: string | null;
  note: string;
  currency: string;
}

export type LedgerRow = LedgerEntry & { status: LedgerStatus };
