"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  Calendar,
  Users,
  Clock,
  Shield,
  MapPin,
  Star,
  Search,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ReportSheet } from "./report-sheet";

type ReportTier = "Essential" | "Beneficial";

export interface ReportEntry {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  tier?: ReportTier;
}

interface ReportCategory {
  id: string;
  label: string;
  tier: ReportTier;
  Icon: React.ComponentType<{ className?: string }>;
  reports: ReportEntry[];
}

interface KPIs {
  totalBookings: number;
  totalRevenue: number;
  occupancyRate: number;
  retentionRate: number;
  activeClients: number;
  aov: number;
}

const CATALOG: ReportCategory[] = [
  {
    id: "financial",
    label: "Financial",
    tier: "Essential",
    Icon: DollarSign,
    reports: [
      { id: "payment-summary", name: "Payment Summary", description: "By method, date, status", implemented: false },
      { id: "payment-transaction", name: "Payment Transaction", description: "Detailed per-transaction view", implemented: false },
      { id: "sales-invoice", name: "Sales Invoice", description: "All issued invoices", implemented: false },
      { id: "outstanding-balances", name: "Outstanding Balances", description: "Unpaid & overdue", implemented: false },
      { id: "total-revenue", name: "Total Revenue", description: "By date range & location", implemented: true },
      { id: "revenue-by-service", name: "Revenue by Service", description: "Daycare, boarding, grooming, etc.", implemented: true },
      { id: "sales-summary", name: "Sales Summary", description: "Gross, net, discounts, refunds", implemented: false },
      { id: "retail-pos-sales", name: "Retail / POS Sales", description: "Product sales & item breakdown", implemented: false },
      { id: "revenue-by-line-item", name: "Revenue by Line Item", description: "Add-ons, packages, services", implemented: false },
      { id: "retail-inventory-value", name: "Retail Inventory Value", description: "Current stock valuation", tier: "Beneficial", implemented: false },
      { id: "retail-inventory-changes", name: "Retail Inventory Changes", description: "Restock, shrinkage, adjustments", tier: "Beneficial", implemented: false },
      { id: "customers-with-credit", name: "Customers with Credit", description: "Account credit balances", tier: "Beneficial", implemented: false },
      { id: "prepaid-package-purchases", name: "Prepaid Package Purchases", description: "Packages sold & usage", tier: "Beneficial", implemented: false },
      { id: "promo-code-performance", name: "Promo Code Performance", description: "Redemptions & revenue impact", tier: "Beneficial", implemented: false },
      { id: "tips-report", name: "Tips Report", description: "Tips collected per staff/service", tier: "Beneficial", implemented: false },
    ],
  },
  {
    id: "appointments",
    label: "Appointments & Operations",
    tier: "Essential",
    Icon: Calendar,
    reports: [
      { id: "grooming-appointment-summary", name: "Grooming Appointment Summary", description: "By source, status, payment", implemented: false },
      { id: "grooming-appointment-list", name: "Grooming Appointment List", description: "Detailed schedule view", implemented: false },
      { id: "boarding-appointment-list", name: "Boarding Appointment List", description: "All boarding schedules", implemented: false },
      { id: "daycare-appointment-list", name: "Daycare Appointment List", description: "All daycare schedules", implemented: false },
      { id: "training-appointment-list", name: "Training Appointment List", description: "Classes & enrollments", implemented: false },
      { id: "occupancy-report", name: "Occupancy Report", description: "Daycare & boarding fill rates", implemented: true },
      { id: "check-in-checkout-log", name: "Check-in / Check-out Log", description: "Daily arrivals & departures", implemented: false },
      { id: "booking-requests", name: "Booking Requests", description: "Pending, approved, declined", implemented: false },
      { id: "cancelled-bookings", name: "Cancelled Bookings", description: "Cancellations & no-shows", implemented: true },
      { id: "custom-service-appointment-list", name: "Custom Service Appointment List", description: "Splash, transport, etc.", tier: "Beneficial", implemented: false },
      { id: "pending-bookings", name: "Pending Bookings", description: "Awaiting confirmation", tier: "Beneficial", implemented: false },
      { id: "daycare-availability-calendar", name: "Daycare Availability Calendar", description: "Capacity by date", tier: "Beneficial", implemented: false },
      { id: "daycare-occupancy-by-time", name: "Daycare Occupancy by Time of Day", description: "Peak hours analysis", tier: "Beneficial", implemented: false },
      { id: "no-shows", name: "No-Shows", description: "Missed appointments tracking", implemented: true },
      { id: "transport-route-report", name: "Transport Route Report", description: "Paws Express stops & revenue", tier: "Beneficial", implemented: false },
    ],
  },
  {
    id: "clients-pets",
    label: "Clients & Pets",
    tier: "Essential",
    Icon: Users,
    reports: [
      { id: "client-pet-summary", name: "Client & Pet Summary", description: "Demographics & distribution", implemented: false },
      { id: "new-clients", name: "New Clients", description: "Acquired by date range", implemented: false },
      { id: "vaccinations-due", name: "Vaccinations Due / Expiring", description: "Compliance tracking", implemented: false },
      { id: "customer-value", name: "Customer Value", description: "LTV, spend, booking frequency", implemented: true },
      { id: "pets-by-breed", name: "Pets by Breed", description: "Breed distribution", implemented: false },
      { id: "pet-status-report", name: "Pet Status Report", description: "Active, inactive, flagged", implemented: false },
      { id: "boarded-daycare-usage", name: "Boarded & Daycare Usage by Pet", description: "Per-pet service history", tier: "Beneficial", implemented: false },
      { id: "evaluation-status", name: "Evaluation Status", description: "Pending, approved, expired", implemented: false },
      { id: "signed-agreements", name: "Signed Agreements / Waivers", description: "Compliance per client", implemented: false },
      { id: "feeding-medication-log", name: "Feeding & Medication Log", description: "Care instruction adherence", tier: "Beneficial", implemented: false },
    ],
  },
  {
    id: "staff-payroll",
    label: "Staff & Payroll",
    tier: "Essential",
    Icon: Clock,
    reports: [
      { id: "staff-performance", name: "Staff Performance", description: "Sales, satisfaction, utilization", implemented: false },
      { id: "payroll", name: "Payroll", description: "By date range & location", implemented: false },
      { id: "attendance", name: "Attendance", description: "Clock-in/out, absences", implemented: false },
      { id: "commission-report", name: "Commission Report", description: "Groomer & trainer earnings", implemented: false },
      { id: "total-service-hours", name: "Total Daycare / Service Hours", description: "Labor hours by department", implemented: false },
      { id: "shift-schedule-summary", name: "Shift Schedule Summary", description: "Scheduled vs. actual hours", implemented: false },
    ],
  },
  {
    id: "marketing-loyalty",
    label: "Marketing & Loyalty",
    tier: "Beneficial",
    Icon: Star,
    reports: [
      { id: "loyalty-program-report", name: "Loyalty Program Report", description: "Points issued, redeemed, balance", implemented: false },
      { id: "referral-analytics", name: "Referral Analytics", description: "Conversion, revenue from referrals", implemented: false },
      { id: "email-campaign-performance", name: "Email Campaign Performance", description: "Open rate, click rate, sent", implemented: false },
      { id: "sms-campaign-performance", name: "SMS Campaign Performance", description: "Delivery, engagement rates", implemented: false },
      { id: "bounced-emails", name: "Bounced Emails", description: "Invalid contact cleanup", implemented: false },
      { id: "playdate-alert-performance", name: "Playdate Alert Performance", description: "Alerts sent & bookings triggered", implemented: false },
    ],
  },
  {
    id: "multi-location",
    label: "Multi-Location (HQ)",
    tier: "Beneficial",
    Icon: MapPin,
    reports: [
      { id: "hq-overview", name: "HQ Overview", description: "Revenue, bookings, occupancy across all locations", implemented: false },
      { id: "location-comparison", name: "Location Comparison", description: "Side-by-side financial & operational", implemented: false },
      { id: "staff-pool-utilization", name: "Staff Pool Utilization", description: "Cross-location staffing efficiency", implemented: false },
      { id: "transfer-history", name: "Transfer History", description: "Inter-location booking transfers", implemented: false },
    ],
  },
  {
    id: "safety-compliance",
    label: "Safety & Compliance",
    tier: "Essential",
    Icon: Shield,
    reports: [
      { id: "incident-report", name: "Incident Report", description: "Injuries, illness, behavioral", implemented: false },
      { id: "waiver-agreement-status", name: "Waiver & Agreement Status", description: "Valid, expired, missing", implemented: false },
      { id: "report-cards", name: "Report Cards", description: "Grooming, daycare, boarding notes", implemented: false },
      { id: "user-activity-log", name: "User Activity Log", description: "Staff actions & system changes", implemented: false },
    ],
  },
];

// Flat lookup for any report by id
const ALL_REPORTS = CATALOG.flatMap((cat) =>
  cat.reports.map((r) => ({ ...r, categoryTier: cat.tier })),
);

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 space-y-1 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function ReportCard({
  report,
  categoryTier,
  onClick,
}: {
  report: ReportEntry;
  categoryTier: ReportTier;
  onClick: () => void;
}) {
  const tier = report.tier ?? categoryTier;
  return (
    <button
      onClick={onClick}
      className="group relative flex items-start gap-3 rounded-xl border bg-card p-4 text-left transition-all duration-150 hover:border-primary/40 hover:shadow-md hover:shadow-black/5 hover:-translate-y-px active:translate-y-0"
    >
      <span
        className={cn(
          "mt-[3px] size-2.5 shrink-0 rounded-full",
          tier === "Essential" ? "bg-emerald-500" : "bg-blue-500",
        )}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
          {report.name}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground leading-relaxed">
          {report.description}
        </span>
      </span>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground transition-all -translate-x-1 group-hover:translate-x-0" />
    </button>
  );
}

function CategorySection({
  category,
  onOpen,
}: {
  category: ReportCategory;
  onOpen: (reportId: string) => void;
}) {
  const { Icon } = category;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-bold uppercase tracking-widest">
          {category.label}
        </h2>
        <Badge
          variant="outline"
          className={cn(
            "px-2 py-0.5 text-[11px] font-semibold",
            category.tier === "Essential"
              ? "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
              : "border-blue-500/40 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
          )}
        >
          {category.tier}
        </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {category.reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            categoryTier={category.tier}
            onClick={() => onOpen(report.id)}
          />
        ))}
      </div>
    </section>
  );
}

// ── Main Hub ──────────────────────────────────────────────────────────────────

export function ReportsHub({
  kpis,
  facilityId,
}: {
  kpis: KPIs;
  facilityId: number;
}) {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | ReportTier>("all");
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search && tierFilter === "all") return CATALOG;
    return CATALOG.flatMap((cat) => {
      const matched = cat.reports.filter((r) => {
        const reportTier = r.tier ?? cat.tier;
        const matchTier = tierFilter === "all" || reportTier === tierFilter;
        const q = search.toLowerCase();
        const matchSearch =
          !search ||
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q);
        return matchTier && matchSearch;
      });
      return matched.length ? [{ ...cat, reports: matched }] : [];
    });
  }, [search, tierFilter]);

  const totalReports = filtered.reduce(
    (sum, cat) => sum + cat.reports.length,
    0,
  );

  const openReport = openReportId
    ? ALL_REPORTS.find((r) => r.id === openReportId) ?? null
    : null;

  return (
    <div className="space-y-8 p-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Reports &amp; Analytics
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Reports curated for Yipyy — pet care facilities running daycare,
          boarding, grooming, training, and custom services.
        </p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          label="Revenue (MTD)"
          value={`$${kpis.totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          sub="Month to date"
        />
        <KpiTile
          label="Bookings (MTD)"
          value={kpis.totalBookings.toString()}
          sub="Month to date"
        />
        <KpiTile
          label="Occupancy"
          value={`${kpis.occupancyRate.toFixed(1)}%`}
          sub="Boarding fill rate"
        />
        <KpiTile
          label="Retention"
          value={`${kpis.retentionRate.toFixed(1)}%`}
          sub="3-month window"
        />
        <KpiTile
          label="Active Clients"
          value={kpis.activeClients.toString()}
          sub="With bookings"
        />
        <KpiTile
          label="Avg Order"
          value={`$${kpis.aov.toFixed(0)}`}
          sub="Per booking"
        />
      </div>

      {/* ── Tier legend ── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b pb-6 text-sm">
        <span className="font-semibold text-muted-foreground">
          Report Tiers:
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-emerald-500 inline-block" />
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            Essential
          </span>
          <span className="text-muted-foreground">
            Must-have for day-to-day operations
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-blue-500 inline-block" />
          <span className="font-semibold text-blue-700 dark:text-blue-400">
            Beneficial
          </span>
          <span className="text-muted-foreground">Adds strategic value</span>
        </span>
      </div>

      {/* ── Search + filter ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border p-1">
          {(["all", "Essential", "Beneficial"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                tierFilter === t
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "all" ? "All" : t}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-muted-foreground">
          {totalReports} report{totalReports !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Catalog ── */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Search className="mx-auto mb-3 size-8 opacity-30" />
          <p className="font-medium">No reports match your search.</p>
        </div>
      ) : (
        <div className="space-y-10">
          {filtered.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              onOpen={setOpenReportId}
            />
          ))}
        </div>
      )}

      {/* ── Report detail sheet ── */}
      <ReportSheet
        report={openReport}
        facilityId={facilityId}
        onClose={() => setOpenReportId(null)}
      />
    </div>
  );
}
