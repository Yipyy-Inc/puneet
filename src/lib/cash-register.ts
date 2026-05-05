import type { Payment } from "@/types/payments";
import type {
  CapturedCashTxn,
  CashMovement,
  RegisterSession,
  VarianceStatus,
} from "@/data/cash-drawer";

export interface PeriodBucket {
  /** YYYY-MM-DD for day, YYYY-Www for week, YYYY-MM for month */
  key: string;
  label: string;
  rangeStart: string;
  rangeEnd: string;
  sessions: RegisterSession[];
  cashCaptured: number;
  movementsNet: number;
  variance: number;
  txnCount: number;
}

export function getActiveSession(
  sessions: RegisterSession[],
  facilityId: number,
  locationId: string,
): RegisterSession | null {
  return (
    sessions.find(
      (s) =>
        s.facilityId === facilityId &&
        s.locationId === locationId &&
        s.status === "open",
    ) ?? null
  );
}

export function getSessionForDate(
  sessions: RegisterSession[],
  facilityId: number,
  locationId: string,
  businessDate: string,
): RegisterSession | null {
  return (
    sessions.find(
      (s) =>
        s.facilityId === facilityId &&
        s.locationId === locationId &&
        s.businessDate === businessDate,
    ) ?? null
  );
}

export function movementsNet(movements: CashMovement[]): number {
  return movements.reduce(
    (sum, m) => sum + (m.direction === "in" ? m.amount : -m.amount),
    0,
  );
}

/**
 * Pulls the live cash payments for an open session from the global payments
 * list. For closed sessions the captured snapshot is on the session itself —
 * use session.capturedTxns directly.
 */
export function getLivePayments(
  session: RegisterSession,
  allPayments: Payment[],
): Payment[] {
  const start = session.opening.countedAt;
  return allPayments.filter(
    (p) =>
      p.facilityId === session.facilityId &&
      p.paymentMethod === "cash" &&
      p.status === "completed" &&
      p.createdAt >= start,
  );
}

/**
 * Heuristic source classifier — mock data has no explicit category, so we
 * infer from the payment description / bookingId / invoice tag. Real backend
 * would replace this with a stored field.
 */
export function classifySource(
  payment: Pick<Payment, "description" | "bookingId">,
): CapturedCashTxn["source"] {
  const desc = payment.description.toLowerCase();
  if (desc.includes("retail") || desc.includes("kibble") || desc.includes("toy") || desc.includes("collar") || desc.includes("food")) {
    return "retail";
  }
  if (desc.includes("deposit")) return "deposit";
  if (payment.bookingId) return "service";
  return "other";
}

export function paymentToCapturedTxn(
  payment: Payment,
): CapturedCashTxn {
  return {
    paymentId: payment.id,
    invoiceId: payment.invoiceId,
    bookingId: payment.bookingId,
    clientId: payment.clientId,
    amount: payment.totalAmount,
    description: payment.description,
    source: classifySource(payment),
    capturedAt: payment.createdAt,
    staffName: payment.processedBy,
  };
}

export interface SourceBreakdown {
  service: number;
  retail: number;
  deposit: number;
  other: number;
  total: number;
}

export function summarizeBySource(
  txns: CapturedCashTxn[],
): SourceBreakdown {
  const out: SourceBreakdown = { service: 0, retail: 0, deposit: 0, other: 0, total: 0 };
  for (const t of txns) {
    out[t.source] += t.amount;
    out.total += t.amount;
  }
  return out;
}

export function liveCashCaptured(
  session: RegisterSession,
  allPayments: Payment[],
): { txns: CapturedCashTxn[]; total: number } {
  if (session.status === "closed") {
    return {
      txns: session.capturedTxns,
      total: session.cashCaptured,
    };
  }
  const txns = getLivePayments(session, allPayments).map(paymentToCapturedTxn);
  const total = txns.reduce((s, t) => s + t.amount, 0);
  return { txns, total };
}

export function computeTrackedTotal(
  floatTotal: number,
  cashCaptured: number,
  movements: CashMovement[],
): number {
  return floatTotal + cashCaptured + movementsNet(movements);
}

export function classifyVariance(variance: number): VarianceStatus {
  if (Math.abs(variance) < 0.005) return "balanced";
  return variance > 0 ? "over" : "short";
}

// ---------------------------------------------------------------------------
// Reports — bucket closed sessions into day / week / month rows
// ---------------------------------------------------------------------------

function isoWeekKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const week = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function weekRange(weekKey: string): { start: string; end: string; label: string } {
  // weekKey like "2026-W18"
  const [y, w] = weekKey.split("-W");
  const year = parseInt(y, 10);
  const week = parseInt(w, 10);
  // ISO week: Monday of the given ISO week
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = (jan4.getUTCDay() + 6) % 7;
  const weekMonday = new Date(jan4);
  weekMonday.setUTCDate(jan4.getUTCDate() - jan4Day + (week - 1) * 7);
  const weekSunday = new Date(weekMonday);
  weekSunday.setUTCDate(weekMonday.getUTCDate() + 6);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const labelFmt = (d: Date) =>
    d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  return {
    start: fmt(weekMonday),
    end: fmt(weekSunday),
    label: `${labelFmt(weekMonday)} – ${labelFmt(weekSunday)}, ${year}`,
  };
}

export function aggregateByPeriod(
  sessions: RegisterSession[],
  period: "day" | "week" | "month",
): PeriodBucket[] {
  const closed = sessions.filter((s) => s.status === "closed");
  const buckets = new Map<string, RegisterSession[]>();

  for (const s of closed) {
    let key: string;
    if (period === "day") key = s.businessDate;
    else if (period === "week") key = isoWeekKey(s.businessDate);
    else key = s.businessDate.slice(0, 7); // YYYY-MM
    const arr = buckets.get(key) ?? [];
    arr.push(s);
    buckets.set(key, arr);
  }

  const result: PeriodBucket[] = [];
  for (const [key, group] of buckets.entries()) {
    const cashCaptured = group.reduce((s, sess) => s + sess.cashCaptured, 0);
    const moveNet = group.reduce((s, sess) => s + movementsNet(sess.movements), 0);
    const variance = group.reduce((s, sess) => s + (sess.variance ?? 0), 0);
    const txnCount = group.reduce((s, sess) => s + sess.capturedTxns.length, 0);

    let label = key;
    let rangeStart = key;
    let rangeEnd = key;
    if (period === "day") {
      const d = new Date(key + "T00:00:00");
      label = d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      rangeStart = key;
      rangeEnd = key;
    } else if (period === "week") {
      const wr = weekRange(key);
      label = wr.label;
      rangeStart = wr.start;
      rangeEnd = wr.end;
    } else {
      const [y, m] = key.split("-");
      const monthDate = new Date(parseInt(y), parseInt(m) - 1, 1);
      label = monthDate.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
      rangeStart = `${key}-01`;
      const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
      rangeEnd = `${key}-${String(lastDay).padStart(2, "0")}`;
    }

    result.push({
      key,
      label,
      rangeStart,
      rangeEnd,
      sessions: group.sort((a, b) => b.businessDate.localeCompare(a.businessDate)),
      cashCaptured,
      movementsNet: moveNet,
      variance,
      txnCount,
    });
  }

  return result.sort((a, b) => b.key.localeCompare(a.key));
}

export const SOURCE_LABELS: Record<CapturedCashTxn["source"], string> = {
  service: "Service",
  retail: "Retail",
  deposit: "Deposit",
  other: "Other",
};
