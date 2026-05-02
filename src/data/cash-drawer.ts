export type Currency = "CAD" | "USD";

export interface Denomination {
  id: string;
  label: string;
  value: number; // face value in dollars
  type: "coin" | "bill";
  currency: Currency;
}

export const CAD_DENOMINATIONS: Denomination[] = [
  // Coins
  { id: "cad-001", label: "1¢", value: 0.01, type: "coin", currency: "CAD" },
  { id: "cad-005", label: "5¢", value: 0.05, type: "coin", currency: "CAD" },
  { id: "cad-010", label: "10¢", value: 0.1, type: "coin", currency: "CAD" },
  { id: "cad-025", label: "25¢", value: 0.25, type: "coin", currency: "CAD" },
  { id: "cad-100", label: "$1 Loonie", value: 1.0, type: "coin", currency: "CAD" },
  { id: "cad-200", label: "$2 Toonie", value: 2.0, type: "coin", currency: "CAD" },
  // Bills
  { id: "cad-b005", label: "$5", value: 5.0, type: "bill", currency: "CAD" },
  { id: "cad-b010", label: "$10", value: 10.0, type: "bill", currency: "CAD" },
  { id: "cad-b020", label: "$20", value: 20.0, type: "bill", currency: "CAD" },
  { id: "cad-b050", label: "$50", value: 50.0, type: "bill", currency: "CAD" },
  { id: "cad-b100", label: "$100", value: 100.0, type: "bill", currency: "CAD" },
];

export const USD_DENOMINATIONS: Denomination[] = [
  // Coins
  { id: "usd-001", label: "1¢ Penny", value: 0.01, type: "coin", currency: "USD" },
  { id: "usd-005", label: "5¢ Nickel", value: 0.05, type: "coin", currency: "USD" },
  { id: "usd-010", label: "10¢ Dime", value: 0.1, type: "coin", currency: "USD" },
  { id: "usd-025", label: "25¢ Quarter", value: 0.25, type: "coin", currency: "USD" },
  { id: "usd-050", label: "50¢ Half Dollar", value: 0.5, type: "coin", currency: "USD" },
  { id: "usd-100", label: "$1 Dollar", value: 1.0, type: "coin", currency: "USD" },
  // Bills
  { id: "usd-b001", label: "$1", value: 1.0, type: "bill", currency: "USD" },
  { id: "usd-b002", label: "$2", value: 2.0, type: "bill", currency: "USD" },
  { id: "usd-b005", label: "$5", value: 5.0, type: "bill", currency: "USD" },
  { id: "usd-b010", label: "$10", value: 10.0, type: "bill", currency: "USD" },
  { id: "usd-b020", label: "$20", value: 20.0, type: "bill", currency: "USD" },
  { id: "usd-b050", label: "$50", value: 50.0, type: "bill", currency: "USD" },
  { id: "usd-b100", label: "$100", value: 100.0, type: "bill", currency: "USD" },
];

export type AdjustmentReason =
  | "tip_payout"
  | "petty_cash_out"
  | "petty_cash_in"
  | "safe_deposit"
  | "safe_withdrawal"
  | "error_correction"
  | "other";

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  tip_payout: "Tip Payout to Staff",
  petty_cash_out: "Petty Cash Out",
  petty_cash_in: "Petty Cash In",
  safe_deposit: "Deposit to Safe",
  safe_withdrawal: "Withdrawal from Safe",
  error_correction: "Error Correction",
  other: "Other",
};

export interface CashAdjustment {
  id: string;
  direction: "in" | "out";
  amount: number;
  reason: AdjustmentReason;
  note: string;
  createdAt: string;
  staffName: string;
}

export interface DenominationCount {
  denominationId: string;
  count: number;
}

export type ReconcileStatus = "balanced" | "over" | "short";

export interface DrawerSession {
  id: string;
  date: string; // YYYY-MM-DD
  sessionType: "open" | "close";
  locationId: string;
  facilityId: number;
  staffName: string;
  startBalance: number;
  reportedTotal: number; // cash sales recorded in POS
  adjustments: CashAdjustment[];
  denominationCounts: DenominationCount[];
  countedTotal: number;
  expectedTotal: number;
  difference: number;
  status: ReconcileStatus;
  comment: string;
  reconciledAt: string | null;
  isReconciled: boolean;
}

export const mockDrawerSessions: DrawerSession[] = [
  {
    id: "ds-001",
    date: "2026-04-30",
    sessionType: "close",
    locationId: "loc-dv-main",
    facilityId: 11,
    staffName: "Marie Tremblay",
    startBalance: 300.0,
    reportedTotal: 847.5,
    adjustments: [
      {
        id: "adj-001",
        direction: "out",
        amount: 120.0,
        reason: "tip_payout",
        note: "Staff tips – Jean-François & Sophie",
        createdAt: "2026-04-30T17:30:00",
        staffName: "Marie Tremblay",
      },
      {
        id: "adj-002",
        direction: "out",
        amount: 40.0,
        reason: "petty_cash_out",
        note: "Office supplies – pens, tape",
        createdAt: "2026-04-30T14:00:00",
        staffName: "Marie Tremblay",
      },
    ],
    denominationCounts: [
      { denominationId: "cad-001", count: 15 },
      { denominationId: "cad-005", count: 22 },
      { denominationId: "cad-010", count: 30 },
      { denominationId: "cad-025", count: 48 },
      { denominationId: "cad-100", count: 12 },
      { denominationId: "cad-200", count: 8 },
      { denominationId: "cad-b005", count: 10 },
      { denominationId: "cad-b010", count: 15 },
      { denominationId: "cad-b020", count: 25 },
      { denominationId: "cad-b050", count: 6 },
      { denominationId: "cad-b100", count: 8 },
    ],
    countedTotal: 987.5,
    expectedTotal: 987.5,
    difference: 0,
    status: "balanced",
    comment: "Clean close. All tips distributed.",
    reconciledAt: "2026-04-30T18:05:00",
    isReconciled: true,
  },
  {
    id: "ds-002",
    date: "2026-04-29",
    sessionType: "close",
    locationId: "loc-dv-main",
    facilityId: 11,
    staffName: "Amélie Dubois",
    startBalance: 300.0,
    reportedTotal: 612.0,
    adjustments: [
      {
        id: "adj-003",
        direction: "out",
        amount: 80.0,
        reason: "tip_payout",
        note: "Staff tips for the day",
        createdAt: "2026-04-29T17:45:00",
        staffName: "Amélie Dubois",
      },
    ],
    denominationCounts: [],
    countedTotal: 824.0,
    expectedTotal: 832.0,
    difference: -8.0,
    status: "short",
    comment: "Slight short — likely change given in error. Monitoring.",
    reconciledAt: "2026-04-29T18:10:00",
    isReconciled: true,
  },
  {
    id: "ds-003",
    date: "2026-04-28",
    sessionType: "close",
    locationId: "loc-dv-main",
    facilityId: 11,
    staffName: "Amélie Dubois",
    startBalance: 300.0,
    reportedTotal: 723.0,
    adjustments: [],
    denominationCounts: [],
    countedTotal: 1028.5,
    expectedTotal: 1023.0,
    difference: 5.5,
    status: "over",
    comment: "Over by $5.50 — possible double-counted a bill. Noted.",
    reconciledAt: "2026-04-28T17:55:00",
    isReconciled: true,
  },
  {
    id: "ds-004",
    date: "2026-04-27",
    sessionType: "close",
    locationId: "loc-dv-main",
    facilityId: 11,
    staffName: "Marie Tremblay",
    startBalance: 300.0,
    reportedTotal: 554.0,
    adjustments: [
      {
        id: "adj-004",
        direction: "out",
        amount: 200.0,
        reason: "safe_deposit",
        note: "Weekly safe deposit",
        createdAt: "2026-04-27T17:00:00",
        staffName: "Marie Tremblay",
      },
    ],
    denominationCounts: [],
    countedTotal: 654.0,
    expectedTotal: 654.0,
    difference: 0,
    status: "balanced",
    comment: "Perfect balance. Safe deposit made.",
    reconciledAt: "2026-04-27T18:00:00",
    isReconciled: true,
  },
];
