import { REFERENCE_DATE } from "@/data/churn";
import { adminUsers, roleDisplayNames } from "@/data/admin-users";
import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { buildPlatformInvoices } from "@/data/platform-invoices";
import { revenueData } from "@/data/revenue";
import { buildSupportCallLog } from "@/data/support-call-log";
import { supportTickets } from "@/data/support-tickets";
import { getAllTransactions } from "@/data/retail";
import { bookings } from "@/data/bookings";
import { groomingAppointments } from "@/data/grooming";
import {
  boardingGuests,
  boardingCapacity,
  getCurrentGuests,
} from "@/data/boarding";
import { daycareCheckIns, daycareRates } from "@/data/daycare";
import { getTotalDaycareCapacity } from "@/data/daycare-areas";
import { clients } from "@/data/clients";
import {
  scheduleShifts,
  scheduleEmployees,
  positions,
  timeClockEntries,
} from "@/data/scheduling";
import { hoursByEmployee } from "@/lib/scheduling-reports";
import {
  getSalesByCategory,
  getTopProducts,
  getProfitMarginReport,
  type SalesByCategory,
  type TopProduct,
  type ProfitMarginReport,
} from "@/lib/retail-reports";
import {
  getAllServiceModules,
  toDate,
  endOfDay,
  inDateRange,
  periodKey,
  enumeratePeriods,
} from "@/lib/analytics-utils";
import type {
  DateRange,
  ReportFilterOpts,
  RevenuePeriodPoint,
  RevenueByServicePoint,
  BookingsPeriodPoint,
  OccupancyPoint,
  UtilizationPoint,
  ClientMetrics,
  AcquisitionSourcePoint,
  StaffPerformancePoint,
  LaborCostPoint,
  RevenueSummary,
  PaymentMethodPoint,
  BookingsByServiceOverTime,
  BookingSourcePoint,
  BookingRates,
  HeatmapCell,
  CapacityUtilizationPoint,
  GroomingAnalytics,
  BoardingAnalytics,
  DaycareAnalytics,
  ClientTrendPoint,
  TopClientPoint,
  ClientBase,
  RetentionCurvePoint,
} from "@/types/facility-analytics";

// The data + engine for the custom Report Builder. Six REAL list-shaped data
// sources from the data layer, each flattened to primitive fields so the engine
// can filter / sort / group / preview generically. Pure + server-safe; the now-
// dependent builders are anchored to REFERENCE_DATE for determinism.

export type FieldType = "text" | "number" | "currency" | "date" | "enum";

export interface ReportField {
  key: string;
  label: string;
  type: FieldType;
  options?: string[]; // populated for enum fields from the real rows
}

export type ReportRow = Record<string, string | number | null>;

export interface ReportDataSource {
  id: string;
  label: string;
  description: string;
  fields: ReportField[];
  rows: ReportRow[];
}

const REF = new Date(REFERENCE_DATE);
const REF_MS = REF.getTime();

function distinct(rows: ReportRow[], key: string): string[] {
  return [
    ...new Set(
      rows
        .map((r) => r[key])
        .filter((v) => v !== null && v !== "")
        .map(String),
    ),
  ].sort();
}

function makeSource(
  id: string,
  label: string,
  description: string,
  fieldDefs: ReportField[],
  rows: ReportRow[],
): ReportDataSource {
  const fields = fieldDefs.map((f) =>
    f.type === "enum" ? { ...f, options: distinct(rows, f.key) } : f,
  );
  return { id, label, description, fields, rows };
}

// --- source rows (flattened from real data) --------------------------------

const subscriptionRows: ReportRow[] = facilitySubscriptions.map((s) => ({
  facilityName: s.facilityName,
  tierName: s.tierName,
  status: s.status,
  billingCycle: s.billingCycle,
  totalCost: s.billing?.totalCost ?? null,
  monthlyReservations: s.usage?.monthlyReservations ?? null,
  startDate: s.startDate,
}));

const invoiceRows: ReportRow[] = buildPlatformInvoices(REF).map((inv) => ({
  number: inv.number,
  facilityName: inv.facilityName,
  planName: inv.planName,
  amount: inv.amount,
  status: inv.status,
  billingCycle: inv.billingCycle,
  issuedDate: inv.issuedDate,
  dueDate: inv.dueDate,
}));

const ticketRows: ReportRow[] = supportTickets.map((t) => ({
  id: t.id,
  title: t.title,
  status: t.status,
  priority: t.priority,
  category: t.category,
  facility: t.facility,
  assignedTo: t.assignedTo ?? "Unassigned",
  breaches: t.sla?.breachCount ?? 0,
  createdAt: t.createdAt,
}));

const callRows: ReportRow[] = buildSupportCallLog(REF_MS).map((c) => ({
  direction: c.direction,
  status: c.status,
  department: c.department,
  durationSeconds: c.durationSeconds,
  handler: c.handledBy?.kind ?? "missed",
  team: c.team,
  followUpStatus: c.followUpStatus,
  at: c.at,
}));

const userRows: ReportRow[] = adminUsers.map((u) => ({
  name: u.name,
  email: u.email,
  role: roleDisplayNames[u.role] ?? u.role,
  status: u.status,
  accessLevel: u.accessLevel,
  department: u.department,
  lastLogin: u.lastLogin,
}));

const revenueRows: ReportRow[] = revenueData.map((r) => ({
  facilityName: r.facilityName,
  period: r.period,
  totalRevenue: r.totalRevenue,
  subscriptionRevenue: r.subscriptionRevenue,
  transactionRevenue: r.transactionRevenue,
  growthRate: r.growthRate,
}));

export const REPORT_SOURCES: ReportDataSource[] = [
  makeSource(
    "subscriptions",
    "Facility Subscriptions",
    "Active subscriptions by plan, status, billing cycle and cost",
    [
      { key: "facilityName", label: "Facility", type: "text" },
      { key: "tierName", label: "Plan", type: "enum" },
      { key: "status", label: "Status", type: "enum" },
      { key: "billingCycle", label: "Billing Cycle", type: "enum" },
      { key: "totalCost", label: "Total Cost", type: "currency" },
      { key: "monthlyReservations", label: "Reservations", type: "number" },
      { key: "startDate", label: "Start Date", type: "date" },
    ],
    subscriptionRows,
  ),
  makeSource(
    "invoices",
    "Platform Invoices",
    "Subscription invoices by facility, amount, status and dates",
    [
      { key: "number", label: "Invoice #", type: "text" },
      { key: "facilityName", label: "Facility", type: "text" },
      { key: "planName", label: "Plan", type: "enum" },
      { key: "amount", label: "Amount", type: "currency" },
      { key: "status", label: "Status", type: "enum" },
      { key: "billingCycle", label: "Billing Cycle", type: "enum" },
      { key: "issuedDate", label: "Issued", type: "date" },
      { key: "dueDate", label: "Due", type: "date" },
    ],
    invoiceRows,
  ),
  makeSource(
    "tickets",
    "Support Tickets",
    "Support tickets by status, priority, category and assignee",
    [
      { key: "id", label: "Ticket", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "status", label: "Status", type: "enum" },
      { key: "priority", label: "Priority", type: "enum" },
      { key: "category", label: "Category", type: "enum" },
      { key: "facility", label: "Facility", type: "text" },
      { key: "assignedTo", label: "Assigned To", type: "enum" },
      { key: "breaches", label: "SLA Breaches", type: "number" },
      { key: "createdAt", label: "Created", type: "date" },
    ],
    ticketRows,
  ),
  makeSource(
    "calls",
    "Support Calls",
    "Call log by direction, status, department, duration and handler",
    [
      { key: "direction", label: "Direction", type: "enum" },
      { key: "status", label: "Status", type: "enum" },
      { key: "department", label: "Department", type: "enum" },
      { key: "durationSeconds", label: "Duration (s)", type: "number" },
      { key: "handler", label: "Handler", type: "enum" },
      { key: "team", label: "Team", type: "enum" },
      { key: "followUpStatus", label: "Follow-up", type: "enum" },
      { key: "at", label: "Time", type: "date" },
    ],
    callRows,
  ),
  makeSource(
    "admins",
    "Admin Users",
    "Platform admin team by role, status, access level and department",
    [
      { key: "name", label: "Name", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "role", label: "Role", type: "enum" },
      { key: "status", label: "Status", type: "enum" },
      { key: "accessLevel", label: "Access Level", type: "enum" },
      { key: "department", label: "Department", type: "enum" },
      { key: "lastLogin", label: "Last Login", type: "date" },
    ],
    userRows,
  ),
  makeSource(
    "revenue",
    "Revenue by Facility",
    "Monthly revenue per facility, split by subscription and transactions",
    [
      { key: "facilityName", label: "Facility", type: "text" },
      { key: "period", label: "Period", type: "text" },
      { key: "totalRevenue", label: "Total Revenue", type: "currency" },
      { key: "subscriptionRevenue", label: "Subscription", type: "currency" },
      { key: "transactionRevenue", label: "Transactions", type: "currency" },
      { key: "growthRate", label: "Growth %", type: "number" },
    ],
    revenueRows,
  ),
];

export function getSource(id: string): ReportDataSource | undefined {
  return REPORT_SOURCES.find((s) => s.id === id);
}

// --- filters / config ------------------------------------------------------

export type FilterOp =
  | "contains"
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "before"
  | "after";

export const OPS_BY_TYPE: Record<FieldType, { op: FilterOp; label: string }[]> =
  {
    text: [
      { op: "contains", label: "contains" },
      { op: "eq", label: "is" },
      { op: "neq", label: "is not" },
    ],
    enum: [
      { op: "eq", label: "is" },
      { op: "neq", label: "is not" },
    ],
    number: [
      { op: "eq", label: "=" },
      { op: "neq", label: "≠" },
      { op: "gt", label: ">" },
      { op: "lt", label: "<" },
      { op: "gte", label: "≥" },
      { op: "lte", label: "≤" },
    ],
    currency: [
      { op: "eq", label: "=" },
      { op: "neq", label: "≠" },
      { op: "gt", label: ">" },
      { op: "lt", label: "<" },
      { op: "gte", label: "≥" },
      { op: "lte", label: "≤" },
    ],
    date: [
      { op: "after", label: "after" },
      { op: "before", label: "before" },
      { op: "eq", label: "on" },
    ],
  };

export interface ReportFilter {
  field: string;
  op: FilterOp;
  value: string;
}

export type ReportFrequency = "once" | "daily" | "weekly" | "monthly";
export type ExportFormat = "csv" | "xlsx" | "pdf";

export interface ReportConfig {
  sourceId: string;
  columns: string[];
  filters: ReportFilter[];
  sortField: string; // "" = none
  sortDir: "asc" | "desc";
  groupField: string; // "" = none
  schedule: { frequency: ReportFrequency; exportFormat: ExportFormat };
}

export function defaultConfig(sourceId: string): ReportConfig {
  const src = getSource(sourceId);
  return {
    sourceId,
    columns: src ? src.fields.map((f) => f.key) : [],
    filters: [],
    sortField: "",
    sortDir: "asc",
    groupField: "",
    schedule: { frequency: "once", exportFormat: "csv" },
  };
}

// --- the engine ------------------------------------------------------------

function isNumeric(t: FieldType): boolean {
  return t === "number" || t === "currency";
}

function matchFilter(
  row: ReportRow,
  f: ReportFilter,
  src: ReportDataSource,
): boolean {
  const field = src.fields.find((x) => x.key === f.field);
  if (!field) return true;
  const raw = row[f.field];
  switch (f.op) {
    case "contains":
      return String(raw ?? "")
        .toLowerCase()
        .includes(f.value.toLowerCase());
    case "eq":
      return isNumeric(field.type)
        ? Number(raw) === Number(f.value)
        : field.type === "date"
          ? String(raw).slice(0, 10) === f.value
          : String(raw) === f.value;
    case "neq":
      return isNumeric(field.type)
        ? Number(raw) !== Number(f.value)
        : String(raw) !== f.value;
    case "gt":
      return Number(raw) > Number(f.value);
    case "lt":
      return Number(raw) < Number(f.value);
    case "gte":
      return Number(raw) >= Number(f.value);
    case "lte":
      return Number(raw) <= Number(f.value);
    case "after":
      return new Date(String(raw)).getTime() > new Date(f.value).getTime();
    case "before":
      return new Date(String(raw)).getTime() < new Date(f.value).getTime();
    default:
      return true;
  }
}

export interface ReportResult {
  fields: ReportField[];
  rows: ReportRow[];
  total: number;
  groupField: string;
}

export function runReport(config: ReportConfig): ReportResult {
  const src = getSource(config.sourceId);
  if (!src) return { fields: [], rows: [], total: 0, groupField: "" };

  const active = config.filters.filter((f) => f.field && f.value !== "");
  let rows = src.rows.filter((r) =>
    active.every((f) => matchFilter(r, f, src)),
  );

  const order: { key: string; dir: "asc" | "desc" }[] = [];
  if (config.groupField) order.push({ key: config.groupField, dir: "asc" });
  if (config.sortField)
    order.push({ key: config.sortField, dir: config.sortDir });

  if (order.length) {
    rows = [...rows].sort((a, b) => {
      for (const o of order) {
        const fld = src.fields.find((x) => x.key === o.key);
        const av = a[o.key];
        const bv = b[o.key];
        let cmp: number;
        if (fld && isNumeric(fld.type)) cmp = Number(av ?? 0) - Number(bv ?? 0);
        else if (fld && fld.type === "date")
          cmp = new Date(String(av)).getTime() - new Date(String(bv)).getTime();
        else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
        if (cmp !== 0) return o.dir === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }

  const fields = src.fields.filter((f) => config.columns.includes(f.key));
  return { fields, rows, total: rows.length, groupField: config.groupField };
}

export function formatCell(
  value: string | number | null,
  type: FieldType,
): string {
  if (value === null || value === "") return "—";
  if (type === "currency") return `$${Number(value).toLocaleString()}`;
  if (type === "number") return Number(value).toLocaleString();
  if (type === "date") {
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
  }
  return String(value);
}

export function buildReportCsv(result: ReportResult): string {
  const headers = result.fields.map((f) => f.label);
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [
    headers.map(cell).join(","),
    ...result.rows.map((row) =>
      result.fields.map((f) => cell(row[f.key])).join(","),
    ),
  ].join("\n");
}

// ============================================================================
// Derived report selectors
// ----------------------------------------------------------------------------
// Every report metric below is DERIVED from the real operational stores —
// retail transactions, booking + grooming-appointment seeds, clients and
// scheduled shifts — never from a dedicated static analytics dataset. Each
// selector is pure, takes a {from, to} range (+ optional location/service),
// returns a typed series, and is memoized (the stores are static, so a given
// (range, opts) always yields the same result). Report components consume
// THESE selectors, not the raw stores.
// ============================================================================

const memoCache = new Map<string, unknown>();

function memo<T>(key: string, compute: () => T): T {
  if (memoCache.has(key)) return memoCache.get(key) as T;
  const value = compute();
  memoCache.set(key, value);
  return value;
}

function cacheKey(
  name: string,
  range: DateRange,
  opts?: ReportFilterOpts,
): string {
  return [
    name,
    toDate(range.from).getTime(),
    endOfDay(range.to).getTime(),
    opts?.granularity ?? "",
    opts?.locationId ?? "",
    opts?.service ?? "",
  ].join("|");
}

/** Service display names + palette, reused from the analytics registry. */
function serviceMeta(service: string): { name: string; color: string } {
  const mod = getAllServiceModules().find(
    (m) => m.id.toLowerCase() === service.toLowerCase(),
  );
  return { name: mod?.name ?? service, color: mod?.color ?? "#6b7280" };
}

// ── Revenue by period (retail transactions) ─────────────────────────────────

export function revenueByPeriod(
  range: DateRange,
  opts?: ReportFilterOpts,
): RevenuePeriodPoint[] {
  const g = opts?.granularity ?? "day";
  return memo(cacheKey("revenueByPeriod", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const txns = getAllTransactions().filter(
      (t) =>
        t.status !== "voided" &&
        inDateRange(new Date(t.createdAt), from, to) &&
        (!opts?.locationId || t.locationId === opts.locationId),
    );

    const buckets = new Map<string, RevenuePeriodPoint>();
    for (const key of enumeratePeriods(from, to, g)) {
      buckets.set(key, {
        period: key,
        revenue: 0,
        subtotal: 0,
        tax: 0,
        tips: 0,
        discounts: 0,
        refunds: 0,
        transactions: 0,
      });
    }

    for (const t of txns) {
      const key = periodKey(new Date(t.createdAt), g);
      const p = buckets.get(key);
      if (!p) continue;
      p.revenue += t.total ?? 0;
      p.subtotal += t.subtotal ?? 0;
      p.tax += t.taxTotal ?? 0;
      p.tips += t.tipAmount ?? 0;
      p.discounts += t.discountTotal ?? 0;
      const refund =
        t.returns?.reduce((s, r) => s + (r.refundTotal ?? 0), 0) ??
        (t.status === "refunded" ? (t.total ?? 0) : 0);
      p.refunds += refund;
      p.transactions += 1;
    }

    return [...buckets.values()].sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  });
}

// ── Revenue by service (bookings + retail line) ─────────────────────────────

export function revenueByService(
  range: DateRange,
  opts?: ReportFilterOpts,
): RevenueByServicePoint[] {
  return memo(cacheKey("revenueByService", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);

    // Service lines come from the authoritative booking store (avoids double-
    // counting a booking's payment against its retail transaction).
    const totals = new Map<string, { revenue: number; bookings: number }>();
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      if (opts?.service && b.service !== opts.service) continue;
      if (!inDateRange(new Date(b.startDate), from, to)) continue;
      const e = totals.get(b.service) ?? { revenue: 0, bookings: 0 };
      e.revenue += b.totalCost ?? 0;
      e.bookings += 1;
      totals.set(b.service, e);
    }

    // Retail line = product-item revenue from POS transactions.
    if (!opts?.service || opts.service === "retail") {
      let retailRevenue = 0;
      let retailTxns = 0;
      for (const t of getAllTransactions()) {
        if (t.status !== "completed") continue;
        if (!inDateRange(new Date(t.createdAt), from, to)) continue;
        if (opts?.locationId && t.locationId !== opts.locationId) continue;
        const productRevenue = t.items
          .filter((i) => i.itemType === "product")
          .reduce((s, i) => s + (i.total ?? 0), 0);
        if (productRevenue <= 0) continue;
        retailRevenue += productRevenue;
        retailTxns += 1;
      }
      if (retailRevenue > 0) {
        const e = totals.get("retail") ?? { revenue: 0, bookings: 0 };
        e.revenue += retailRevenue;
        e.bookings += retailTxns;
        totals.set("retail", e);
      }
    }

    const grand = [...totals.values()].reduce((s, e) => s + e.revenue, 0);
    return [...totals.entries()]
      .map(([service, e]) => {
        const meta = serviceMeta(service);
        return {
          service: meta.name,
          revenue: e.revenue,
          bookings: e.bookings,
          percentage:
            grand > 0 ? Math.round((e.revenue / grand) * 1000) / 10 : 0,
          color: meta.color,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  });
}

// ── Retail category / product / margin (delegate to retail-reports) ─────────

export function salesByCategory(range: DateRange): SalesByCategory[] {
  return memo(cacheKey("salesByCategory", range), () =>
    getSalesByCategory(toDate(range.from), endOfDay(range.to)),
  );
}

export function topProducts(
  range: DateRange,
  limit = 10,
  sortBy: "revenue" | "quantity" = "revenue",
): TopProduct[] {
  return memo(cacheKey(`topProducts:${limit}:${sortBy}`, range), () =>
    getTopProducts(limit, sortBy, toDate(range.from), endOfDay(range.to)),
  );
}

export function profitMargin(
  range: DateRange,
  opts?: ReportFilterOpts,
): ProfitMarginReport[] {
  const g = opts?.granularity ?? "day";
  return memo(cacheKey("profitMargin", range, opts), () =>
    getProfitMarginReport(g, toDate(range.from), endOfDay(range.to)),
  );
}

// ── Bookings by period (bookings + grooming appointments) ───────────────────

export function bookingsByPeriod(
  range: DateRange,
  opts?: ReportFilterOpts,
): BookingsPeriodPoint[] {
  const g = opts?.granularity ?? "day";
  return memo(cacheKey("bookingsByPeriod", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);

    const buckets = new Map<string, BookingsPeriodPoint>();
    for (const key of enumeratePeriods(from, to, g)) {
      buckets.set(key, {
        period: key,
        bookings: 0,
        completed: 0,
        cancelled: 0,
        noShows: 0,
      });
    }
    const bump = (dateStr: string, status: string) => {
      if (!inDateRange(new Date(dateStr), from, to)) return;
      const p = buckets.get(periodKey(new Date(dateStr), g));
      if (!p) return;
      p.bookings += 1;
      if (status === "completed") p.completed += 1;
      else if (status === "cancelled") p.cancelled += 1;
      else if (status === "no_show" || status === "no-show") p.noShows += 1;
    };

    // Bookings seed only — it already carries grooming bookings, so folding in
    // the separate groomingAppointments store would double-count grooming. This
    // keeps the total equal to bookingRates / bookingsByServiceOverTime.
    for (const b of bookings) {
      if (opts?.service && b.service !== opts.service) continue;
      bump(b.startDate, b.status);
    }

    return [...buckets.values()].sort((a, b) =>
      a.period.localeCompare(b.period),
    );
  });
}

// ── Occupancy (boarding) ────────────────────────────────────────────────────

// Boarding kennel capacity. No capacity store is wired yet, so this mirrors the
// established 20-kennel assumption already used across the reports module.
const BOARDING_CAPACITY = 20;

export function occupancy(
  range: DateRange,
  _opts?: ReportFilterOpts,
): OccupancyPoint[] {
  return memo(cacheKey("occupancy", range), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const boarding = bookings.filter(
      (b) => b.service === "boarding" && b.status !== "cancelled",
    );

    const out: OccupancyPoint[] = [];
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const day = new Date(d);
      const active = boarding.filter(
        (b) => new Date(b.startDate) <= day && new Date(b.endDate) >= day,
      );
      const revenue = active.reduce((s, b) => {
        const nights =
          (new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) /
            (1000 * 60 * 60 * 24) || 1;
        return s + (b.totalCost ?? 0) / nights;
      }, 0);
      out.push({
        date: day.toISOString().split("T")[0],
        occupied: active.length,
        capacity: BOARDING_CAPACITY,
        occupancyRate:
          Math.round((active.length / BOARDING_CAPACITY) * 10000) / 100,
        revenue: Math.round(revenue * 100) / 100,
      });
    }
    return out;
  });
}

// ── Utilization by service ──────────────────────────────────────────────────

// Documented service capacities (per day). Consistent with the boarding
// assumption above; replace with a real capacity store when one exists.
const SERVICE_CAPACITY: Record<string, number> = {
  boarding: 20,
  daycare: 40,
  grooming: 8,
  training: 6,
};

export function utilization(
  range: DateRange,
  opts?: ReportFilterOpts,
): UtilizationPoint[] {
  return memo(cacheKey("utilization", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const days = Math.max(
      1,
      Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );

    const services = Object.keys(SERVICE_CAPACITY).filter(
      (s) => !opts?.service || opts.service === s,
    );
    return services.map((service) => {
      const booked = bookings.filter(
        (b) =>
          b.service === service &&
          b.status !== "cancelled" &&
          inDateRange(new Date(b.startDate), from, to),
      ).length;
      const capacity = SERVICE_CAPACITY[service] * days;
      return {
        service: serviceMeta(service).name,
        booked,
        capacity,
        utilizationRate:
          capacity > 0 ? Math.round((booked / capacity) * 10000) / 100 : 0,
      };
    });
  });
}

// ── Client metrics (derived from transaction history) ───────────────────────

export function clientMetrics(
  range: DateRange,
  opts?: ReportFilterOpts,
): ClientMetrics {
  return memo(cacheKey("clientMetrics", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const txns = getAllTransactions().filter(
      (t) =>
        t.status !== "voided" &&
        t.customerId &&
        (!opts?.locationId || t.locationId === opts.locationId),
    );

    // Clients carry no join-date or acquisition-source field, so both are
    // inferred from the customer's transaction history: first-ever transaction
    // date (new vs returning) and the service they first came in for (source).
    const firstTxn = new Map<string, { at: number; source: string }>();
    const lifetimeSpend = new Map<string, number>();
    for (const t of txns) {
      const id = t.customerId as string;
      const at = new Date(t.createdAt).getTime();
      const prior = firstTxn.get(id);
      const source =
        t.bookingService ??
        (t.items.some((i) => i.itemType === "product") ? "Retail" : "Other");
      if (!prior || at < prior.at) firstTxn.set(id, { at, source });
      lifetimeSpend.set(id, (lifetimeSpend.get(id) ?? 0) + (t.total ?? 0));
    }

    const activeInRange = new Set(
      txns
        .filter((t) => inDateRange(new Date(t.createdAt), from, to))
        .map((t) => t.customerId as string),
    );

    let newClients = 0;
    let returningClients = 0;
    const acquisition = new Map<string, number>();
    for (const id of activeInRange) {
      const first = firstTxn.get(id);
      if (first && first.at >= from.getTime()) {
        newClients += 1;
        acquisition.set(first.source, (acquisition.get(first.source) ?? 0) + 1);
      } else {
        returningClients += 1;
      }
    }

    const spends = [...lifetimeSpend.values()];
    const avgLtv =
      spends.length > 0 ? spends.reduce((s, v) => s + v, 0) / spends.length : 0;

    const acquisitionBySource: AcquisitionSourcePoint[] = [
      ...acquisition.entries(),
    ]
      .map(([source, clients]) => ({ source, clients }))
      .sort((a, b) => b.clients - a.clients);

    return {
      newClients,
      returningClients,
      activeClients: activeInRange.size,
      retentionRate:
        activeInRange.size > 0
          ? Math.round((returningClients / activeInRange.size) * 10000) / 100
          : 0,
      avgLtv: Math.round(avgLtv * 100) / 100,
      acquisitionBySource,
    };
  });
}

// ── Staff performance (sales attribution + scheduled hours) ─────────────────

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function staffPerformance(
  range: DateRange,
  opts?: ReportFilterOpts,
): StaffPerformancePoint[] {
  return memo(cacheKey("staffPerformance", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);

    const staff = new Map<string, StaffPerformancePoint>();
    const get = (id: string, name: string): StaffPerformancePoint => {
      const key = normalizeName(name);
      let row = staff.get(key);
      if (!row) {
        row = {
          staffId: id,
          staffName: name,
          transactions: 0,
          revenue: 0,
          itemsSold: 0,
          hoursWorked: 0,
          salesPerHour: 0,
        };
        staff.set(key, row);
      }
      return row;
    };

    // Retail sales by cashier.
    for (const t of getAllTransactions()) {
      if (t.status !== "completed") continue;
      if (!inDateRange(new Date(t.createdAt), from, to)) continue;
      if (opts?.locationId && t.locationId !== opts.locationId) continue;
      const row = get(
        t.cashierId || "unknown",
        t.cashierName || "Unknown Staff",
      );
      row.transactions += 1;
      row.revenue += t.total ?? 0;
      row.itemsSold += t.items.reduce((s, i) => s + i.quantity, 0);
    }

    // Grooming appointment revenue by stylist.
    for (const a of groomingAppointments) {
      if (!inDateRange(new Date(a.date), from, to)) continue;
      const row = get(a.stylistId, a.stylistName);
      row.transactions += 1;
      row.revenue += a.totalPrice ?? 0;
      row.itemsSold += 1;
    }

    // Attach scheduled hours where the roster name matches.
    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];
    const hours = hoursByEmployee(
      scheduleShifts,
      scheduleEmployees,
      positions,
      timeClockEntries,
      { start: fromStr, end: toStr },
    );
    for (const h of hours) {
      const row = staff.get(normalizeName(h.employee.name));
      if (row) row.hoursWorked += h.actualHours || h.scheduledHours;
    }

    return [...staff.values()]
      .map((row) => ({
        ...row,
        salesPerHour:
          row.hoursWorked > 0
            ? Math.round((row.revenue / row.hoursWorked) * 100) / 100
            : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  });
}

// ── Labor cost (scheduled shifts × pay rate) ────────────────────────────────

export function laborCost(
  range: DateRange,
  opts?: ReportFilterOpts,
): LaborCostPoint[] {
  return memo(cacheKey("laborCost", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const fromStr = from.toISOString().split("T")[0];
    const toStr = to.toISOString().split("T")[0];

    const hours = hoursByEmployee(
      scheduleShifts,
      scheduleEmployees,
      positions,
      timeClockEntries,
      { start: fromStr, end: toStr },
    );
    const perf = staffPerformance(range, opts);
    const revenueByName = new Map(
      perf.map((p) => [normalizeName(p.staffName), p.revenue]),
    );

    return hours
      .filter((h) => h.scheduledHours > 0 || h.cost > 0)
      .map((h) => {
        const worked = h.actualHours || h.scheduledHours;
        const revenue = revenueByName.get(normalizeName(h.employee.name)) ?? 0;
        return {
          staffId: h.employee.id,
          staffName: h.employee.name,
          hoursWorked: Math.round(worked * 100) / 100,
          laborCost: Math.round(h.cost * 100) / 100,
          revenue: Math.round(revenue * 100) / 100,
          laborCostPct:
            revenue > 0 ? Math.round((h.cost / revenue) * 10000) / 100 : 0,
        };
      })
      .sort((a, b) => b.laborCost - a.laborCost);
  });
}

// ── Revenue summary + payment methods (financial reports) ───────────────────

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Reconciled revenue totals for the range. Derived by summing the daily
 * revenueByPeriod buckets — so the daily table (same source) sums to exactly
 * these figures — and independently cross-checked against the raw transaction
 * total (`rawTotal`). `totalCollected` == sum of Transaction.total; `netRevenue`
 * subtracts refunds. Gift-card redemptions are a payment method (already-
 * recognized revenue) and the retail seed has no gift-card-sale line items or
 * deposit deferrals to defer, so recognition == collected here.
 */
export function revenueSummary(
  range: DateRange,
  opts?: ReportFilterOpts,
): RevenueSummary {
  return memo(cacheKey("revenueSummary", range, opts), () => {
    const days = revenueByPeriod(range, { ...opts, granularity: "day" });
    const acc = days.reduce(
      (a, d) => {
        a.subtotal += d.subtotal;
        a.discounts += d.discounts;
        a.tax += d.tax;
        a.tips += d.tips;
        a.totalCollected += d.revenue;
        a.refunds += d.refunds;
        a.transactions += d.transactions;
        return a;
      },
      {
        subtotal: 0,
        discounts: 0,
        tax: 0,
        tips: 0,
        totalCollected: 0,
        refunds: 0,
        transactions: 0,
      },
    );

    // Independent reconciliation leg: raw sum of Transaction.total in range.
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const rawTotal = getAllTransactions()
      .filter(
        (t) =>
          t.status !== "voided" &&
          inDateRange(new Date(t.createdAt), from, to) &&
          (!opts?.locationId || t.locationId === opts.locationId),
      )
      .reduce((s, t) => s + (t.total ?? 0), 0);

    const totalCollected = round2(acc.totalCollected);
    const refunds = round2(acc.refunds);
    return {
      subtotal: round2(acc.subtotal),
      discounts: round2(acc.discounts),
      tax: round2(acc.tax),
      tips: round2(acc.tips),
      totalCollected,
      refunds,
      netRevenue: round2(totalCollected - refunds),
      transactions: acc.transactions,
      avgTransaction:
        acc.transactions > 0 ? round2(totalCollected / acc.transactions) : 0,
      reconciled: Math.abs(totalCollected - round2(rawTotal)) < 0.005,
      rawTotal: round2(rawTotal),
    };
  });
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit: "Card",
  debit: "Card",
  cash: "Cash",
  gift_card: "Gift Card",
  store_credit: "Store Credit",
  add_to_booking: "Account / Booking",
  charge_to_account: "Account / Booking",
  charge_to_active_stay: "Account / Booking",
  split: "Other",
  custom: "Other",
};

function paymentLabel(method: string, customName?: string): string {
  if (method === "custom" && customName) return customName;
  return PAYMENT_METHOD_LABELS[method] ?? "Other";
}

/**
 * Tender mix from Transaction.payments (card/cash/gift card/store credit/…).
 * Sums the actual split payment amounts, so the breakdown total equals the
 * gross collected. Falls back to the transaction's headline paymentMethod when
 * a row has no itemized payments.
 */
export function paymentMethodBreakdown(
  range: DateRange,
  opts?: ReportFilterOpts,
): PaymentMethodPoint[] {
  return memo(cacheKey("paymentMethodBreakdown", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const buckets = new Map<string, { amount: number; count: number }>();

    for (const t of getAllTransactions()) {
      if (t.status === "voided") continue;
      if (!inDateRange(new Date(t.createdAt), from, to)) continue;
      if (opts?.locationId && t.locationId !== opts.locationId) continue;

      const splits =
        t.payments && t.payments.length > 0
          ? t.payments
          : [{ method: t.paymentMethod, amount: t.total ?? 0 }];
      for (const p of splits) {
        const label = paymentLabel(p.method, p.customMethodName);
        const b = buckets.get(label) ?? { amount: 0, count: 0 };
        b.amount += p.amount ?? 0;
        b.count += 1;
        buckets.set(label, b);
      }
    }

    const grand = [...buckets.values()].reduce((s, b) => s + b.amount, 0);
    return [...buckets.entries()]
      .map(([label, b]) => ({
        method: label,
        label,
        amount: round2(b.amount),
        count: b.count,
        percentage: grand > 0 ? round2((b.amount / grand) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  });
}

// ── Booking & occupancy analytics ───────────────────────────────────────────
// Core counts derive from the BOOKINGS seed only, so totals match bookings.ts
// for the range. Grooming appointments (a separate seed) supply only the two
// fields bookings lack: online/in-person source and a booked-at timestamp for
// lead time.

const rangeDays = (from: Date, to: Date) =>
  Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );

/** Bookings over time, split by service, as stacked-chart rows. */
export function bookingsByServiceOverTime(
  range: DateRange,
  opts?: ReportFilterOpts,
): BookingsByServiceOverTime {
  const g = opts?.granularity ?? "month";
  return memo(cacheKey("bookingsByServiceOverTime", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    // All statuses (incl. cancelled) so the stacked total equals the
    // bookingRates headline for the same range (check: KPI == detail sum).
    const inRange = bookings.filter(
      (b) =>
        inDateRange(new Date(b.startDate), from, to) &&
        (!opts?.service || b.service === opts.service),
    );
    const services = [
      ...new Set(inRange.map((b) => serviceMeta(b.service).name)),
    ].sort();

    const rowByPeriod = new Map<string, Record<string, string | number>>();
    for (const key of enumeratePeriods(from, to, g)) {
      const row: Record<string, string | number> = { period: key };
      for (const s of services) row[s] = 0;
      rowByPeriod.set(key, row);
    }
    for (const b of inRange) {
      const row = rowByPeriod.get(periodKey(new Date(b.startDate), g));
      if (!row) continue;
      const name = serviceMeta(b.service).name;
      row[name] = (Number(row[name]) || 0) + 1;
    }
    return {
      services,
      data: [...rowByPeriod.values()].sort((a, b) =>
        String(a.period).localeCompare(String(b.period)),
      ),
    };
  });
}

/**
 * Booking-source mix. Grooming appointments carry a real online/in-person flag;
 * core bookings have no channel field, so they are attributed to Staff/Direct
 * (documented heuristic).
 */
export function bookingSourceMix(
  range: DateRange,
  opts?: ReportFilterOpts,
): BookingSourcePoint[] {
  return memo(cacheKey("bookingSourceMix", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    let online = 0;
    let inPerson = 0;
    for (const a of groomingAppointments) {
      if (!inDateRange(new Date(a.date), from, to)) continue;
      if (a.onlineBooking) online += 1;
      else inPerson += 1;
    }
    const staff = bookings.filter(
      (b) =>
        b.status !== "cancelled" &&
        inDateRange(new Date(b.startDate), from, to),
    ).length;

    const total = online + inPerson + staff;
    return [
      { source: "Online", bookings: online },
      { source: "In-Person", bookings: inPerson },
      { source: "Staff / Direct", bookings: staff },
    ]
      .filter((s) => s.bookings > 0)
      .map((s) => ({
        ...s,
        percentage:
          total > 0 ? Math.round((s.bookings / total) * 1000) / 10 : 0,
      }));
  });
}

/** Headline booking rates for the range (bookings seed; lead time from grooming). */
export function bookingRates(
  range: DateRange,
  opts?: ReportFilterOpts,
): BookingRates {
  return memo(cacheKey("bookingRates", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const inRange = bookings.filter((b) =>
      inDateRange(new Date(b.startDate), from, to),
    );
    const total = inRange.length;
    const completed = inRange.filter((b) => b.status === "completed").length;
    const cancelled = inRange.filter((b) => b.status === "cancelled").length;
    const noShows = inRange.filter((b) => b.status === "no_show").length;
    const revenue = inRange
      .filter((b) => b.status !== "cancelled")
      .reduce((s, b) => s + (b.totalCost ?? 0), 0);

    // Lead time: grooming appointments are the only records with a booked-at
    // (createdAt) timestamp to compare against the appointment date.
    const leadTimes: number[] = [];
    for (const a of groomingAppointments) {
      if (!inDateRange(new Date(a.date), from, to)) continue;
      const days =
        (new Date(a.date).getTime() - new Date(a.createdAt).getTime()) /
        (24 * 60 * 60 * 1000);
      if (Number.isFinite(days) && days >= 0) leadTimes.push(days);
    }
    const avgLeadTimeDays =
      leadTimes.length > 0
        ? Math.round(
            (leadTimes.reduce((s, d) => s + d, 0) / leadTimes.length) * 10,
          ) / 10
        : 0;

    const pct = (n: number) =>
      total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
    return {
      total,
      completed,
      cancelled,
      noShows,
      completionRate: pct(completed),
      cancellationRate: pct(cancelled),
      noShowRate: pct(noShows),
      avgLeadTimeDays,
      revenue: Math.round(revenue * 100) / 100,
      avgBookingValue:
        total > 0 ? Math.round((revenue / total) * 100) / 100 : 0,
    };
  });
}

// Business-hours window for the day-of-week × hour heatmap.
const HEATMAP_HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 06:00–20:00

/** Day-of-week × hour booking density (bookings seed, by startDate + checkInTime). */
export function bookingHeatmap(
  range: DateRange,
  opts?: ReportFilterOpts,
): HeatmapCell[] {
  return memo(cacheKey("bookingHeatmap", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const grid = new Map<string, number>();
    for (let dow = 0; dow < 7; dow++)
      for (const hour of HEATMAP_HOURS) grid.set(`${dow}-${hour}`, 0);

    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      if (opts?.service && b.service !== opts.service) continue;
      const start = new Date(b.startDate);
      if (!inDateRange(start, from, to)) continue;
      const dow = start.getUTCDay();
      const hour = Number((b.checkInTime ?? "09:00").slice(0, 2));
      const key = `${dow}-${Math.min(20, Math.max(6, hour))}`;
      if (grid.has(key)) grid.set(key, (grid.get(key) ?? 0) + 1);
    }
    return [...grid.entries()].map(([k, count]) => {
      const [dow, hour] = k.split("-").map(Number);
      return { dow, hour, count };
    });
  });
}

/**
 * Capacity used vs available per service, in the standard daily-occupancy
 * framing: for each day in the range we count concurrent bookings per service
 * (boarding spans start→end nights; single-day services occupy their start
 * day), then report peak and average daily occupancy against the daily slot
 * count. revenuePerAvailableSlot spreads period revenue across the slots.
 */
export function capacityUtilization(
  range: DateRange,
  opts?: ReportFilterOpts,
): CapacityUtilizationPoint[] {
  return memo(cacheKey("capacityUtilization", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const days = rangeDays(from, to);

    return Object.keys(SERVICE_CAPACITY)
      .filter((s) => !opts?.service || opts.service === s)
      .map((service) => {
        const rows = bookings.filter(
          (b) => b.service === service && b.status !== "cancelled",
        );
        const inRangeRows = rows.filter((b) =>
          inDateRange(new Date(b.startDate), from, to),
        );

        // Daily concurrent occupancy across the range.
        let peakUsed = 0;
        let usedDaySum = 0;
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const day = new Date(d);
          const concurrent = rows.filter((b) => {
            const start = new Date(b.startDate);
            const end = new Date(b.endDate);
            return service === "boarding"
              ? start <= day && end >= day
              : start.toISOString().split("T")[0] ===
                  day.toISOString().split("T")[0];
          }).length;
          peakUsed = Math.max(peakUsed, concurrent);
          usedDaySum += concurrent;
        }

        const capacity = SERVICE_CAPACITY[service];
        const avgUsed = Math.round((usedDaySum / days) * 100) / 100;
        const revenue = inRangeRows.reduce((s, b) => s + (b.totalCost ?? 0), 0);
        return {
          service: serviceMeta(service).name,
          capacity,
          peakUsed,
          avgUsed,
          utilizationRate:
            capacity > 0 ? Math.round((avgUsed / capacity) * 10000) / 100 : 0,
          peakUtilizationRate:
            capacity > 0 ? Math.round((peakUsed / capacity) * 10000) / 100 : 0,
          bookings: inRangeRows.length,
          revenue: Math.round(revenue * 100) / 100,
          revenuePerAvailableSlot:
            capacity > 0 ? Math.round((revenue / capacity) * 100) / 100 : 0,
        };
      });
  });
}

// ── Per-service-module analytics ────────────────────────────────────────────
// Each derives from the module's OWN store (the one its dashboard already
// trusts), so the numbers stay consistent within the module page.

/** Grooming analytics from groomingAppointments (range-based; appts roll to today). */
export function groomingAnalytics(
  range: DateRange,
  opts?: ReportFilterOpts,
): GroomingAnalytics {
  return memo(cacheKey("groomingAnalytics", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const inRange = groomingAppointments.filter((a) =>
      inDateRange(new Date(a.date), from, to),
    );
    const active = inRange.filter(
      (a) => a.status !== "cancelled" && a.status !== "no-show",
    );
    const revenue = active.reduce((s, a) => s + (a.totalPrice ?? 0), 0);
    const tips = active.reduce((s, a) => s + (a.tipAmount ?? 0), 0);

    // Rebook proxy: clients (ownerId) with more than one appointment in range.
    const byOwner = new Map<number, number>();
    for (const a of inRange)
      byOwner.set(a.ownerId, (byOwner.get(a.ownerId) ?? 0) + 1);
    const repeatOwners = [...byOwner.values()].filter((n) => n > 1).length;
    const rebookRate =
      byOwner.size > 0
        ? Math.round((repeatOwners / byOwner.size) * 1000) / 10
        : 0;

    // Service mix by package.
    const mix = new Map<string, { count: number; revenue: number }>();
    for (const a of active) {
      const name = a.packageName || "Other";
      const e = mix.get(name) ?? { count: 0, revenue: 0 };
      e.count += 1;
      e.revenue += a.totalPrice ?? 0;
      mix.set(name, e);
    }

    // Per-groomer productivity.
    const groomers = new Map<
      string,
      { name: string; appointments: number; revenue: number }
    >();
    for (const a of active) {
      const e = groomers.get(a.stylistId) ?? {
        name: a.stylistName,
        appointments: 0,
        revenue: 0,
      };
      e.appointments += 1;
      e.revenue += a.totalPrice ?? 0;
      groomers.set(a.stylistId, e);
    }

    return {
      appointments: inRange.length,
      completed: inRange.filter((a) => a.status === "completed").length,
      cancelled: inRange.filter((a) => a.status === "cancelled").length,
      noShows: inRange.filter((a) => a.status === "no-show").length,
      revenue: Math.round(revenue * 100) / 100,
      tips: Math.round(tips * 100) / 100,
      avgTicket:
        active.length > 0
          ? Math.round((revenue / active.length) * 100) / 100
          : 0,
      rebookRate,
      serviceMix: [...mix.entries()]
        .map(([name, e]) => ({
          name,
          count: e.count,
          revenue: Math.round(e.revenue * 100) / 100,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      byGroomer: [...groomers.entries()]
        .map(([stylistId, e]) => ({
          stylistId,
          name: e.name,
          appointments: e.appointments,
          revenue: Math.round(e.revenue * 100) / 100,
          avgTicket:
            e.appointments > 0
              ? Math.round((e.revenue / e.appointments) * 100) / 100
              : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  });
}

/** Boarding analytics from boardingGuests (status-based, so never empty). */
export function boardingAnalytics(): BoardingAnalytics {
  return memo("boardingAnalytics", () => {
    const current = getCurrentGuests();
    // ADR / length-of-stay reflect on-site guests; fall back to the full book
    // when nothing is checked in so the figures are never blank.
    const basis = current.length > 0 ? current : boardingGuests;
    const nights = basis.reduce((s, g) => s + (g.totalNights ?? 0), 0);
    const adr = basis.reduce((s, g) => s + (g.nightlyRate ?? 0), 0);
    const revenue = current.reduce((s, g) => s + (g.totalPrice ?? 0), 0);
    return {
      currentGuests: current.length,
      capacity: boardingCapacity.total,
      occupancyRate:
        boardingCapacity.total > 0
          ? Math.round((current.length / boardingCapacity.total) * 10000) / 100
          : 0,
      adr: basis.length > 0 ? Math.round((adr / basis.length) * 100) / 100 : 0,
      avgLengthOfStay:
        basis.length > 0 ? Math.round((nights / basis.length) * 10) / 10 : 0,
      revenue: Math.round(revenue * 100) / 100,
      totalGuests: boardingGuests.length,
    };
  });
}

/** Daycare analytics from daycareCheckIns + the real size/rate card. */
export function daycareAnalytics(): DaycareAnalytics {
  return memo("daycareAnalytics", () => {
    const active = daycareCheckIns.filter(
      (c) => c.status === "checked-in" || c.status === "checked-out",
    );
    const currentCount = daycareCheckIns.filter(
      (c) => c.status === "checked-in",
    ).length;
    const checkedOutToday = daycareCheckIns.filter(
      (c) => c.status === "checked-out",
    ).length;

    // Average visit length (hours) from check-in → checkout/scheduled.
    const durations: number[] = [];
    for (const c of active) {
      const start = new Date(c.checkInTime).getTime();
      const end = new Date(c.checkOutTime ?? c.scheduledCheckOut).getTime();
      const hours = (end - start) / (1000 * 60 * 60);
      if (Number.isFinite(hours) && hours > 0) durations.push(hours);
    }
    const avgStayHours =
      durations.length > 0
        ? Math.round(
            (durations.reduce((s, h) => s + h, 0) / durations.length) * 10,
          ) / 10
        : 0;

    // Recognized revenue from the real rate card (size-priced).
    const rateFor = (rateType: string, size: string): number => {
      const rate = daycareRates.find((r) => r.type === rateType);
      if (!rate) return 0;
      const sp = rate.sizePricing as Record<string, number> | undefined;
      return sp?.[size] ?? rate.basePrice;
    };
    const todayRevenue = active.reduce(
      (s, c) => s + rateFor(c.rateType, c.petSize),
      0,
    );

    const capacity = getTotalDaycareCapacity();
    return {
      currentCount,
      checkedOutToday,
      capacity,
      occupancyRate:
        capacity > 0 ? Math.round((currentCount / capacity) * 10000) / 100 : 0,
      avgStayHours,
      todayRevenue: Math.round(todayRevenue * 100) / 100,
    };
  });
}

// ── Client analytics (extends clientMetrics) ────────────────────────────────

/** New vs returning clients over time, from transaction history. */
export function clientTrends(
  range: DateRange,
  opts?: ReportFilterOpts,
): ClientTrendPoint[] {
  const g = opts?.granularity ?? "month";
  return memo(cacheKey("clientTrends", range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const txns = getAllTransactions().filter(
      (t) => t.status !== "voided" && t.customerId,
    );

    // First-ever transaction period per customer.
    const firstPeriod = new Map<string, string>();
    const firstAt = new Map<string, number>();
    for (const t of txns) {
      const id = t.customerId as string;
      const at = new Date(t.createdAt).getTime();
      if (!firstAt.has(id) || at < (firstAt.get(id) ?? Infinity)) {
        firstAt.set(id, at);
        firstPeriod.set(id, periodKey(new Date(t.createdAt), g));
      }
    }

    // Active customers per in-range period.
    const activeByPeriod = new Map<string, Set<string>>();
    for (const key of enumeratePeriods(from, to, g))
      activeByPeriod.set(key, new Set());
    for (const t of txns) {
      const d = new Date(t.createdAt);
      if (!inDateRange(d, from, to)) continue;
      activeByPeriod.get(periodKey(d, g))?.add(t.customerId as string);
    }

    return [...activeByPeriod.entries()]
      .map(([period, set]) => {
        let newClients = 0;
        for (const id of set)
          if (firstPeriod.get(id) === period) newClients += 1;
        return { period, newClients, returningClients: set.size - newClients };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
  });
}

/** Top clients by spend, from transaction history in the range. */
export function topClientsBySpend(
  range: DateRange,
  limit = 10,
  opts?: ReportFilterOpts,
): TopClientPoint[] {
  return memo(cacheKey(`topClientsBySpend:${limit}`, range, opts), () => {
    const from = toDate(range.from);
    const to = endOfDay(range.to);
    const map = new Map<string, { spend: number; transactions: number }>();
    for (const t of getAllTransactions()) {
      if (t.status === "voided") continue;
      if (!inDateRange(new Date(t.createdAt), from, to)) continue;
      const name = t.customerName || "Walk-in";
      const e = map.get(name) ?? { spend: 0, transactions: 0 };
      e.spend += t.total ?? 0;
      e.transactions += 1;
      map.set(name, e);
    }
    return [...map.entries()]
      .map(([name, e]) => ({
        name,
        spend: round2(e.spend),
        transactions: e.transactions,
      }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, limit);
  });
}

/** Client-base composition + reactivation opportunities, from the roster. */
export function clientBase(): ClientBase {
  return memo("clientBase", () => {
    const total = clients.length;
    const active = clients.filter((c) => c.status === "active").length;
    const totalPets = clients.reduce((s, c) => s + (c.pets?.length ?? 0), 0);

    const now = Date.now();
    const reactivation = clients
      .filter((c) => c.lastVisitDate)
      .map((c) => {
        const daysSince = Math.round(
          (now - new Date(c.lastVisitDate as string).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return {
          id: c.id,
          name: c.name,
          lastVisit: c.lastVisitDate as string,
          daysSince,
        };
      })
      .filter((c) => c.daysSince >= 60)
      .sort((a, b) => b.daysSince - a.daysSince);

    return {
      totalClients: total,
      activeClients: active,
      inactiveClients: total - active,
      totalPets,
      avgPetsPerClient:
        total > 0 ? Math.round((totalPets / total) * 10) / 10 : 0,
      reactivation,
    };
  });
}

/**
 * Client recency/retention curve: of clients with a recorded last visit, the
 * cumulative share who visited within N days of today. A rising curve whose
 * shape shows how quickly the base lapses (the complement of the reactivation
 * list). Uses the roster's lastVisitDate so it and reactivation share a source.
 */
export function retentionCurve(): RetentionCurvePoint[] {
  return memo("retentionCurve", () => {
    const now = Date.now();
    const recencies = clients
      .filter((c) => c.lastVisitDate)
      .map(
        (c) =>
          (now - new Date(c.lastVisitDate as string).getTime()) /
          (1000 * 60 * 60 * 24),
      );
    const total = recencies.length;
    const windows: { window: string; days: number }[] = [
      { window: "30d", days: 30 },
      { window: "60d", days: 60 },
      { window: "90d", days: 90 },
      { window: "180d", days: 180 },
      { window: "365d", days: 365 },
    ];
    return windows.map(({ window, days }) => {
      const count = recencies.filter((d) => d <= days).length;
      return {
        window,
        days,
        clients: count,
        percentage: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      };
    });
  });
}
