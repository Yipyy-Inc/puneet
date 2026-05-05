export type Currency = "CAD" | "USD";

export interface Denomination {
  id: string;
  label: string;
  value: number; // face value in dollars
  type: "coin" | "bill";
  currency: Currency;
}

export const CAD_DENOMINATIONS: Denomination[] = [
  { id: "cad-001", label: "1¢", value: 0.01, type: "coin", currency: "CAD" },
  { id: "cad-005", label: "5¢", value: 0.05, type: "coin", currency: "CAD" },
  { id: "cad-010", label: "10¢", value: 0.1, type: "coin", currency: "CAD" },
  { id: "cad-025", label: "25¢", value: 0.25, type: "coin", currency: "CAD" },
  { id: "cad-100", label: "$1 Loonie", value: 1.0, type: "coin", currency: "CAD" },
  { id: "cad-200", label: "$2 Toonie", value: 2.0, type: "coin", currency: "CAD" },
  { id: "cad-b005", label: "$5", value: 5.0, type: "bill", currency: "CAD" },
  { id: "cad-b010", label: "$10", value: 10.0, type: "bill", currency: "CAD" },
  { id: "cad-b020", label: "$20", value: 20.0, type: "bill", currency: "CAD" },
  { id: "cad-b050", label: "$50", value: 50.0, type: "bill", currency: "CAD" },
  { id: "cad-b100", label: "$100", value: 100.0, type: "bill", currency: "CAD" },
];

export const USD_DENOMINATIONS: Denomination[] = [
  { id: "usd-001", label: "1¢ Penny", value: 0.01, type: "coin", currency: "USD" },
  { id: "usd-005", label: "5¢ Nickel", value: 0.05, type: "coin", currency: "USD" },
  { id: "usd-010", label: "10¢ Dime", value: 0.1, type: "coin", currency: "USD" },
  { id: "usd-025", label: "25¢ Quarter", value: 0.25, type: "coin", currency: "USD" },
  { id: "usd-050", label: "50¢ Half Dollar", value: 0.5, type: "coin", currency: "USD" },
  { id: "usd-100", label: "$1 Dollar", value: 1.0, type: "coin", currency: "USD" },
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
  tip_payout: "Staff tip-out",
  petty_cash_out: "Pulled for petty cash",
  petty_cash_in: "Returned from petty cash",
  safe_deposit: "Moved to safe",
  safe_withdrawal: "Pulled from safe",
  error_correction: "Correction",
  other: "Other",
};

export interface DenominationCount {
  denominationId: string;
  count: number;
}

export interface CashMovement {
  id: string;
  direction: "in" | "out";
  amount: number;
  reason: AdjustmentReason;
  note: string;
  occurredAt: string;
  staffName: string;
}

export interface OpeningCount {
  countedAt: string;
  countedBy: string;
  denominationCounts: DenominationCount[];
  floatTotal: number;
  note: string;
}

export interface ClosingCount {
  countedAt: string;
  countedBy: string;
  denominationCounts: DenominationCount[];
  drawerTotal: number;
  note: string;
}

export type SessionStatus = "open" | "closed";
export type VarianceStatus = "balanced" | "over" | "short";

/**
 * Snapshot of a single cash payment captured against a session, so closed
 * sessions remain auditable even if the underlying payment record changes.
 * Live (open) sessions don't store these — they're computed from payments.ts
 * on demand by getSessionCashPayments().
 */
export interface CapturedCashTxn {
  paymentId: string;
  invoiceId?: string;
  bookingId?: number;
  clientId: number;
  amount: number;
  description: string;
  source: "service" | "retail" | "deposit" | "other";
  capturedAt: string;
  staffName: string;
}

export interface RegisterSession {
  id: string;
  facilityId: number;
  locationId: string;
  /** YYYY-MM-DD — natural key for "the day this session covers". */
  businessDate: string;
  status: SessionStatus;
  opening: OpeningCount;
  closing: ClosingCount | null;
  movements: CashMovement[];
  /** Stored once at close-out for closed sessions; empty for open sessions. */
  capturedTxns: CapturedCashTxn[];
  /** Sum of capturedTxns. For open sessions this stays 0 until close-out. */
  cashCaptured: number;
  /** opening.floatTotal + cashCaptured + sum(movements). Stored at close-out. */
  trackedTotal: number;
  /** closing.drawerTotal − trackedTotal. Null until closed. */
  variance: number | null;
  varianceStatus: VarianceStatus | null;
  managerNote: string;
  lockedAt: string | null;
}

// ---------------------------------------------------------------------------
// Mock sessions
// ---------------------------------------------------------------------------
//
// Today is 2026-05-05. The first entry below is an OPEN session for today;
// the rest are CLOSED historical sessions covering the prior ~10 days.

const STAFF_MARIE = "Marie Tremblay";
const STAFF_AMELIE = "Amélie Dubois";
const STAFF_OLIVIER = "Olivier Bernard";

export const mockRegisterSessions: RegisterSession[] = [
  // ---- OPEN session for today (2026-05-05) ----
  {
    id: "rs-2026-05-05",
    facilityId: 11,
    locationId: "loc-dv-main",
    businessDate: "2026-05-05",
    status: "open",
    opening: {
      countedAt: "2026-05-05T09:04:00",
      countedBy: STAFF_MARIE,
      denominationCounts: [
        { denominationId: "cad-025", count: 40 }, // $10
        { denominationId: "cad-100", count: 20 }, // $20
        { denominationId: "cad-200", count: 10 }, // $20
        { denominationId: "cad-b005", count: 14 }, // $70
        { denominationId: "cad-b010", count: 8 }, // $80
        { denominationId: "cad-b020", count: 5 }, // $100
      ],
      floatTotal: 300.0,
      note: "Morning float counted by Marie.",
    },
    closing: null,
    movements: [
      {
        id: "mv-2026-05-05-1",
        direction: "out",
        amount: 25.0,
        reason: "petty_cash_out",
        note: "Coffee run for staff lunch.",
        occurredAt: "2026-05-05T11:42:00",
        staffName: STAFF_MARIE,
      },
    ],
    capturedTxns: [],
    cashCaptured: 0,
    trackedTotal: 0,
    variance: null,
    varianceStatus: null,
    managerNote: "",
    lockedAt: null,
  },

  // ---- CLOSED prior sessions ----
  {
    id: "rs-2026-05-04",
    facilityId: 11,
    locationId: "loc-dv-main",
    businessDate: "2026-05-04",
    status: "closed",
    opening: {
      countedAt: "2026-05-04T09:00:00",
      countedBy: STAFF_AMELIE,
      denominationCounts: [],
      floatTotal: 300.0,
      note: "",
    },
    closing: {
      countedAt: "2026-05-04T18:08:00",
      countedBy: STAFF_AMELIE,
      denominationCounts: [],
      drawerTotal: 942.0,
      note: "Smooth close.",
    },
    movements: [
      {
        id: "mv-2026-05-04-1",
        direction: "out",
        amount: 80.0,
        reason: "tip_payout",
        note: "Daily tip pool — split between Amélie and Olivier.",
        occurredAt: "2026-05-04T17:30:00",
        staffName: STAFF_AMELIE,
      },
    ],
    capturedTxns: [
      { paymentId: "pay-cash-2026-05-04-1", invoiceId: "inv-cash-104", bookingId: 1, clientId: 15, amount: 220.0, description: "Daycare bundle — Buddy", source: "service", capturedAt: "2026-05-04T10:14:00", staffName: STAFF_AMELIE },
      { paymentId: "pay-cash-2026-05-04-2", clientId: 16, amount: 64.0, description: "Retail — premium kibble bag", source: "retail", capturedAt: "2026-05-04T13:22:00", staffName: STAFF_AMELIE },
      { paymentId: "pay-cash-2026-05-04-3", invoiceId: "inv-cash-105", bookingId: 5, clientId: 29, amount: 140.0, description: "Grooming + nail trim", source: "service", capturedAt: "2026-05-04T15:01:00", staffName: STAFF_OLIVIER },
      { paymentId: "pay-cash-2026-05-04-4", clientId: 28, amount: 38.0, description: "Retail — toys & treats", source: "retail", capturedAt: "2026-05-04T16:40:00", staffName: STAFF_AMELIE },
      { paymentId: "pay-cash-2026-05-04-5", invoiceId: "inv-cash-106", bookingId: 2, clientId: 16, amount: 60.0, description: "Boarding deposit", source: "deposit", capturedAt: "2026-05-04T11:55:00", staffName: STAFF_AMELIE },
    ],
    cashCaptured: 522.0,
    trackedTotal: 742.0, // 300 + 522 - 80
    variance: 200.0,
    varianceStatus: "over",
    managerNote: "Investigate $200 surplus — possibly missed a tip-out entry.",
    lockedAt: "2026-05-04T18:09:00",
  },
  {
    id: "rs-2026-05-03",
    facilityId: 11,
    locationId: "loc-dv-main",
    businessDate: "2026-05-03",
    status: "closed",
    opening: { countedAt: "2026-05-03T09:00:00", countedBy: STAFF_MARIE, denominationCounts: [], floatTotal: 300.0, note: "" },
    closing: { countedAt: "2026-05-03T18:00:00", countedBy: STAFF_MARIE, denominationCounts: [], drawerTotal: 712.0, note: "Balanced." },
    movements: [],
    capturedTxns: [
      { paymentId: "pay-cash-2026-05-03-1", invoiceId: "inv-cash-101", bookingId: 3, clientId: 15, amount: 175.0, description: "Daycare half-day + add-ons", source: "service", capturedAt: "2026-05-03T10:10:00", staffName: STAFF_MARIE },
      { paymentId: "pay-cash-2026-05-03-2", clientId: 29, amount: 92.0, description: "Retail — leash + harness", source: "retail", capturedAt: "2026-05-03T12:30:00", staffName: STAFF_MARIE },
      { paymentId: "pay-cash-2026-05-03-3", invoiceId: "inv-cash-102", bookingId: 6, clientId: 15, amount: 85.0, description: "Grooming — Whiskers", source: "service", capturedAt: "2026-05-03T14:00:00", staffName: STAFF_OLIVIER },
      { paymentId: "pay-cash-2026-05-03-4", clientId: 16, amount: 60.0, description: "Boarding deposit — Cooper", source: "deposit", capturedAt: "2026-05-03T16:20:00", staffName: STAFF_MARIE },
    ],
    cashCaptured: 412.0,
    trackedTotal: 712.0,
    variance: 0,
    varianceStatus: "balanced",
    managerNote: "",
    lockedAt: "2026-05-03T18:01:00",
  },
  {
    id: "rs-2026-05-02",
    facilityId: 11,
    locationId: "loc-dv-main",
    businessDate: "2026-05-02",
    status: "closed",
    opening: { countedAt: "2026-05-02T09:05:00", countedBy: STAFF_OLIVIER, denominationCounts: [], floatTotal: 300.0, note: "" },
    closing: { countedAt: "2026-05-02T18:30:00", countedBy: STAFF_OLIVIER, denominationCounts: [], drawerTotal: 1023.5, note: "Saturday — busy." },
    movements: [
      { id: "mv-2026-05-02-1", direction: "out", amount: 100.0, reason: "safe_deposit", note: "Mid-day safe drop.", occurredAt: "2026-05-02T13:00:00", staffName: STAFF_OLIVIER },
    ],
    capturedTxns: [
      { paymentId: "pay-cash-2026-05-02-1", invoiceId: "inv-cash-098", bookingId: 1, clientId: 15, amount: 240.0, description: "Daycare full-day", source: "service", capturedAt: "2026-05-02T09:35:00", staffName: STAFF_OLIVIER },
      { paymentId: "pay-cash-2026-05-02-2", clientId: 28, amount: 145.5, description: "Retail — food + chew toys", source: "retail", capturedAt: "2026-05-02T11:10:00", staffName: STAFF_OLIVIER },
      { paymentId: "pay-cash-2026-05-02-3", invoiceId: "inv-cash-099", bookingId: 4, clientId: 29, amount: 220.0, description: "Grooming + tooth brushing", source: "service", capturedAt: "2026-05-02T13:50:00", staffName: STAFF_AMELIE },
      { paymentId: "pay-cash-2026-05-02-4", invoiceId: "inv-cash-100", bookingId: 7, clientId: 16, amount: 218.0, description: "Boarding 2 nights", source: "service", capturedAt: "2026-05-02T16:10:00", staffName: STAFF_OLIVIER },
    ],
    cashCaptured: 823.5,
    trackedTotal: 1023.5, // 300 + 823.5 - 100
    variance: 0,
    varianceStatus: "balanced",
    managerNote: "",
    lockedAt: "2026-05-02T18:31:00",
  },
  {
    id: "rs-2026-05-01",
    facilityId: 11,
    locationId: "loc-dv-main",
    businessDate: "2026-05-01",
    status: "closed",
    opening: { countedAt: "2026-05-01T09:00:00", countedBy: STAFF_AMELIE, denominationCounts: [], floatTotal: 300.0, note: "" },
    closing: { countedAt: "2026-05-01T18:05:00", countedBy: STAFF_AMELIE, denominationCounts: [], drawerTotal: 614.0, note: "Quiet weekday." },
    movements: [],
    capturedTxns: [
      { paymentId: "pay-cash-2026-05-01-1", invoiceId: "inv-cash-095", bookingId: 5, clientId: 15, amount: 180.0, description: "Grooming bundle", source: "service", capturedAt: "2026-05-01T10:25:00", staffName: STAFF_AMELIE },
      { paymentId: "pay-cash-2026-05-01-2", clientId: 16, amount: 49.0, description: "Retail — shampoo + brush", source: "retail", capturedAt: "2026-05-01T12:40:00", staffName: STAFF_AMELIE },
      { paymentId: "pay-cash-2026-05-01-3", invoiceId: "inv-cash-096", bookingId: 2, clientId: 29, amount: 85.0, description: "Daycare half-day", source: "service", capturedAt: "2026-05-01T15:00:00", staffName: STAFF_OLIVIER },
    ],
    cashCaptured: 314.0,
    trackedTotal: 614.0,
    variance: 0,
    varianceStatus: "balanced",
    managerNote: "",
    lockedAt: "2026-05-01T18:06:00",
  },
  {
    id: "rs-2026-04-30",
    facilityId: 11,
    locationId: "loc-dv-main",
    businessDate: "2026-04-30",
    status: "closed",
    opening: { countedAt: "2026-04-30T09:00:00", countedBy: STAFF_MARIE, denominationCounts: [], floatTotal: 300.0, note: "" },
    closing: { countedAt: "2026-04-30T18:15:00", countedBy: STAFF_MARIE, denominationCounts: [], drawerTotal: 982.0, note: "" },
    movements: [
      { id: "mv-2026-04-30-1", direction: "out", amount: 60.0, reason: "tip_payout", note: "Tips for Olivier.", occurredAt: "2026-04-30T17:30:00", staffName: STAFF_MARIE },
    ],
    capturedTxns: [
      { paymentId: "pay-cash-2026-04-30-1", invoiceId: "inv-cash-088", bookingId: 1, clientId: 15, amount: 220.0, description: "Daycare + treats", source: "service", capturedAt: "2026-04-30T09:50:00", staffName: STAFF_MARIE },
      { paymentId: "pay-cash-2026-04-30-2", clientId: 28, amount: 76.5, description: "Retail — food", source: "retail", capturedAt: "2026-04-30T11:30:00", staffName: STAFF_MARIE },
      { paymentId: "pay-cash-2026-04-30-3", invoiceId: "inv-cash-089", bookingId: 6, clientId: 29, amount: 165.0, description: "Grooming", source: "service", capturedAt: "2026-04-30T14:25:00", staffName: STAFF_OLIVIER },
      { paymentId: "pay-cash-2026-04-30-4", invoiceId: "inv-cash-090", bookingId: 3, clientId: 16, amount: 280.5, description: "Training session 1-on-1", source: "service", capturedAt: "2026-04-30T16:00:00", staffName: STAFF_AMELIE },
    ],
    cashCaptured: 742.0,
    trackedTotal: 982.0, // 300 + 742 - 60
    variance: 0,
    varianceStatus: "balanced",
    managerNote: "",
    lockedAt: "2026-04-30T18:16:00",
  },
  {
    id: "rs-2026-04-29",
    facilityId: 11,
    locationId: "loc-dv-main",
    businessDate: "2026-04-29",
    status: "closed",
    opening: { countedAt: "2026-04-29T09:00:00", countedBy: STAFF_AMELIE, denominationCounts: [], floatTotal: 300.0, note: "" },
    closing: { countedAt: "2026-04-29T18:10:00", countedBy: STAFF_AMELIE, denominationCounts: [], drawerTotal: 762.0, note: "Short by $8 — likely change error." },
    movements: [
      { id: "mv-2026-04-29-1", direction: "out", amount: 80.0, reason: "tip_payout", note: "", occurredAt: "2026-04-29T17:45:00", staffName: STAFF_AMELIE },
    ],
    capturedTxns: [
      { paymentId: "pay-cash-2026-04-29-1", invoiceId: "inv-cash-082", bookingId: 4, clientId: 15, amount: 195.0, description: "Daycare + add-ons", source: "service", capturedAt: "2026-04-29T10:20:00", staffName: STAFF_AMELIE },
      { paymentId: "pay-cash-2026-04-29-2", clientId: 16, amount: 55.0, description: "Retail — collar", source: "retail", capturedAt: "2026-04-29T12:10:00", staffName: STAFF_AMELIE },
      { paymentId: "pay-cash-2026-04-29-3", invoiceId: "inv-cash-083", bookingId: 7, clientId: 29, amount: 300.0, description: "Boarding 3 nights", source: "service", capturedAt: "2026-04-29T15:30:00", staffName: STAFF_OLIVIER },
    ],
    cashCaptured: 550.0,
    trackedTotal: 770.0, // 300 + 550 - 80
    variance: -8.0,
    varianceStatus: "short",
    managerNote: "Marked for follow-up. Cashier said they may have given a $10 instead of $5 for change.",
    lockedAt: "2026-04-29T18:11:00",
  },
  {
    id: "rs-2026-04-28",
    facilityId: 11,
    locationId: "loc-dv-main",
    businessDate: "2026-04-28",
    status: "closed",
    opening: { countedAt: "2026-04-28T09:00:00", countedBy: STAFF_MARIE, denominationCounts: [], floatTotal: 300.0, note: "" },
    closing: { countedAt: "2026-04-28T18:00:00", countedBy: STAFF_MARIE, denominationCounts: [], drawerTotal: 856.0, note: "" },
    movements: [],
    capturedTxns: [
      { paymentId: "pay-cash-2026-04-28-1", invoiceId: "inv-cash-076", bookingId: 1, clientId: 15, amount: 220.0, description: "Daycare", source: "service", capturedAt: "2026-04-28T09:55:00", staffName: STAFF_MARIE },
      { paymentId: "pay-cash-2026-04-28-2", clientId: 28, amount: 41.0, description: "Retail — chew toy", source: "retail", capturedAt: "2026-04-28T11:00:00", staffName: STAFF_MARIE },
      { paymentId: "pay-cash-2026-04-28-3", invoiceId: "inv-cash-077", bookingId: 5, clientId: 29, amount: 150.0, description: "Grooming", source: "service", capturedAt: "2026-04-28T14:00:00", staffName: STAFF_OLIVIER },
      { paymentId: "pay-cash-2026-04-28-4", invoiceId: "inv-cash-078", bookingId: 2, clientId: 16, amount: 145.0, description: "Boarding deposit", source: "deposit", capturedAt: "2026-04-28T16:30:00", staffName: STAFF_MARIE },
    ],
    cashCaptured: 556.0,
    trackedTotal: 856.0,
    variance: 0,
    varianceStatus: "balanced",
    managerNote: "",
    lockedAt: "2026-04-28T18:01:00",
  },
  {
    id: "rs-2026-04-27",
    facilityId: 11,
    locationId: "loc-dv-main",
    businessDate: "2026-04-27",
    status: "closed",
    opening: { countedAt: "2026-04-27T09:00:00", countedBy: STAFF_OLIVIER, denominationCounts: [], floatTotal: 300.0, note: "" },
    closing: { countedAt: "2026-04-27T18:00:00", countedBy: STAFF_OLIVIER, denominationCounts: [], drawerTotal: 668.5, note: "" },
    movements: [
      { id: "mv-2026-04-27-1", direction: "out", amount: 200.0, reason: "safe_deposit", note: "Weekly safe drop.", occurredAt: "2026-04-27T17:00:00", staffName: STAFF_OLIVIER },
    ],
    capturedTxns: [
      { paymentId: "pay-cash-2026-04-27-1", invoiceId: "inv-cash-070", bookingId: 6, clientId: 15, amount: 312.5, description: "Grooming + spa add-on", source: "service", capturedAt: "2026-04-27T10:30:00", staffName: STAFF_OLIVIER },
      { paymentId: "pay-cash-2026-04-27-2", clientId: 16, amount: 76.0, description: "Retail — food + treats", source: "retail", capturedAt: "2026-04-27T12:45:00", staffName: STAFF_OLIVIER },
      { paymentId: "pay-cash-2026-04-27-3", invoiceId: "inv-cash-071", bookingId: 3, clientId: 29, amount: 180.0, description: "Daycare full-day", source: "service", capturedAt: "2026-04-27T15:20:00", staffName: STAFF_AMELIE },
    ],
    cashCaptured: 568.5,
    trackedTotal: 668.5, // 300 + 568.5 - 200
    variance: 0,
    varianceStatus: "balanced",
    managerNote: "",
    lockedAt: "2026-04-27T18:01:00",
  },
];
