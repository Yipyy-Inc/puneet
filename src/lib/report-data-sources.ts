import { REFERENCE_DATE } from "@/data/churn";
import { adminUsers, roleDisplayNames } from "@/data/admin-users";
import { facilitySubscriptions } from "@/data/facility-subscriptions";
import { buildPlatformInvoices } from "@/data/platform-invoices";
import { revenueData } from "@/data/revenue";
import { buildSupportCallLog } from "@/data/support-call-log";
import { supportTickets } from "@/data/support-tickets";

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
