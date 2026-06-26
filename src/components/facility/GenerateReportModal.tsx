"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { facilitiesQueries } from "@/lib/api/facilities";
import { downloadReportCsv, downloadReportPdf } from "@/lib/report-export";
import { facilityStaff } from "@/data/facility-staff";
import { users } from "@/data/users";
import type { FacilityReport } from "@/types/facility-analytics";

type ReportType = "revenue" | "retention" | "service" | "staff" | "bookings";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "revenue", label: "Revenue Summary" },
  { value: "retention", label: "Client Retention" },
  { value: "service", label: "Service Utilization" },
  { value: "staff", label: "Staff Performance" },
  { value: "bookings", label: "Booking Trends" },
];

// facility-staff.ts holds facility 11's staff; others come from users.ts by name.
const FACILITY_STAFF_FACILITY_ID = 11;

function isoMonthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 10);
}
function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
function fmtMoney(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getReportStaff(
  facilityId: number,
  facilityName: string,
): { name: string; role: string }[] {
  if (facilityId === FACILITY_STAFF_FACILITY_ID) {
    return facilityStaff.map((s) => ({
      name: `${s.firstName} ${s.lastName}`,
      role: s.primaryRole,
    }));
  }
  return users
    .filter((u) => u.facility === facilityName)
    .map((u) => ({ name: u.name, role: u.role }));
}

interface ReportContent {
  title: string;
  lines: string[];
  rows: (string | number)[][];
}

function buildReportContent(
  type: ReportType,
  facilityName: string,
  period: string,
  data: FacilityReport,
  staff: { name: string; role: string }[],
): ReportContent {
  const s = data.summary;
  const header = (label: string) => [
    `${label} — ${facilityName}`,
    `Period: ${period}`,
    "",
  ];
  const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

  switch (type) {
    case "revenue":
      return {
        title: `Revenue Summary — ${facilityName}`,
        lines: [
          ...header("Revenue Summary"),
          `Total Revenue: ${fmtMoney(s.totalRevenue)}`,
          `Revenue Growth: ${pct(s.revenueGrowth)}`,
          `Total Bookings: ${s.totalBookings}`,
          `Avg Booking Value: ${fmtMoney(s.avgBookingValue)}`,
          "",
          "Monthly Revenue:",
          ...data.monthlyRevenue.map(
            (m) =>
              `  ${m.month}: ${fmtMoney(m.revenue)} (${m.bookings} bookings)`,
          ),
          "",
          "Revenue by Service:",
          ...data.revenueByService.map(
            (r) => `  ${r.name}: ${fmtMoney(r.value)} (${r.percentage}%)`,
          ),
        ],
        rows: [
          ["Revenue Summary", facilityName],
          ["Period", period],
          [],
          ["Metric", "Value"],
          ["Total Revenue", s.totalRevenue],
          ["Revenue Growth %", s.revenueGrowth.toFixed(1)],
          ["Total Bookings", s.totalBookings],
          ["Avg Booking Value", s.avgBookingValue],
          [],
          ["Month", "Revenue", "Bookings"],
          ...data.monthlyRevenue.map((m) => [m.month, m.revenue, m.bookings]),
          [],
          ["Service", "Revenue", "Percentage"],
          ...data.revenueByService.map((r) => [r.name, r.value, r.percentage]),
        ],
      };

    case "retention":
      return {
        title: `Client Retention — ${facilityName}`,
        lines: [
          ...header("Client Retention"),
          `Active Clients: ${s.activeClients}`,
          `Client Growth: ${pct(s.clientGrowth)}`,
          "",
          "New vs Returning (by month):",
          ...data.clientGrowth.map(
            (c) =>
              `  ${c.month}: ${c.newClients} new, ${c.returning} returning`,
          ),
          "",
          "Top Clients:",
          ...data.topClients.map(
            (c, i) =>
              `  ${i + 1}. ${c.name} — ${c.visits} visits, ${fmtMoney(c.spent)}`,
          ),
        ],
        rows: [
          ["Client Retention", facilityName],
          ["Period", period],
          [],
          ["Active Clients", s.activeClients],
          ["Client Growth %", s.clientGrowth.toFixed(1)],
          [],
          ["Month", "New Clients", "Returning"],
          ...data.clientGrowth.map((c) => [c.month, c.newClients, c.returning]),
          [],
          ["Rank", "Client", "Visits", "Spent"],
          ...data.topClients.map((c, i) => [i + 1, c.name, c.visits, c.spent]),
        ],
      };

    case "service":
      return {
        title: `Service Utilization — ${facilityName}`,
        lines: [
          ...header("Service Utilization"),
          `Total Bookings: ${s.totalBookings}`,
          `Services Offered: ${data.revenueByService.length}`,
          "",
          "Revenue & Share by Service:",
          ...data.revenueByService.map(
            (r) =>
              `  ${r.name}: ${fmtMoney(r.value)} (${r.percentage}% of revenue)`,
          ),
          "",
          "Bookings by Day of Week:",
          ...data.bookingsByDay.map(
            (d) =>
              `  ${d.day}: ${d.bookings} bookings (${d.completed} completed)`,
          ),
        ],
        rows: [
          ["Service Utilization", facilityName],
          ["Period", period],
          [],
          ["Service", "Revenue", "Percentage"],
          ...data.revenueByService.map((r) => [r.name, r.value, r.percentage]),
          [],
          ["Day", "Bookings", "Completed"],
          ...data.bookingsByDay.map((d) => [d.day, d.bookings, d.completed]),
        ],
      };

    case "staff": {
      const avgPerStaff = staff.length
        ? Math.round(s.totalBookings / staff.length)
        : 0;
      return {
        title: `Staff Performance — ${facilityName}`,
        lines: [
          ...header("Staff Performance"),
          `Total Staff: ${staff.length}`,
          `Total Bookings (period): ${s.totalBookings}`,
          `Avg Bookings per Staff: ${avgPerStaff}`,
          "",
          "Staff Roster:",
          ...(staff.length
            ? staff.map((m, i) => `  ${i + 1}. ${m.name} — ${m.role}`)
            : ["  No staff records for this facility."]),
        ],
        rows: [
          ["Staff Performance", facilityName],
          ["Period", period],
          [],
          ["Total Staff", staff.length],
          ["Total Bookings", s.totalBookings],
          ["Avg Bookings per Staff", avgPerStaff],
          [],
          ["Name", "Role"],
          ...staff.map((m) => [m.name, m.role]),
        ],
      };
    }

    case "bookings":
      return {
        title: `Booking Trends — ${facilityName}`,
        lines: [
          ...header("Booking Trends"),
          `Total Bookings: ${s.totalBookings}`,
          `Booking Growth: ${pct(s.bookingGrowth)}`,
          `Completion Rate: ${data.bookingMetrics.completionRate}%`,
          `Cancellation Rate: ${data.bookingMetrics.cancellationRate}%`,
          `No-Show Rate: ${data.bookingMetrics.noShowRate}%`,
          "",
          "Bookings by Month:",
          ...data.monthlyRevenue.map(
            (m) => `  ${m.month}: ${m.bookings} bookings`,
          ),
          "",
          "Bookings by Day of Week:",
          ...data.bookingsByDay.map(
            (d) => `  ${d.day}: ${d.bookings} (${d.completed} completed)`,
          ),
        ],
        rows: [
          ["Booking Trends", facilityName],
          ["Period", period],
          [],
          ["Metric", "Value"],
          ["Total Bookings", s.totalBookings],
          ["Booking Growth %", s.bookingGrowth.toFixed(1)],
          ["Completion Rate %", data.bookingMetrics.completionRate],
          ["Cancellation Rate %", data.bookingMetrics.cancellationRate],
          ["No-Show Rate %", data.bookingMetrics.noShowRate],
          [],
          ["Month", "Bookings"],
          ...data.monthlyRevenue.map((m) => [m.month, m.bookings]),
          [],
          ["Day", "Bookings", "Completed"],
          ...data.bookingsByDay.map((d) => [d.day, d.bookings, d.completed]),
        ],
      };
  }
}

export interface GenerateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  facilityName: string;
}

export function GenerateReportModal({
  open,
  onOpenChange,
  facilityId,
  facilityName,
}: GenerateReportModalProps) {
  const [reportType, setReportType] = useState<ReportType>("revenue");
  const [startDate, setStartDate] = useState(isoMonthsAgo(6));
  const [endDate, setEndDate] = useState(isoToday());
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");

  const monthSpan = useMemo(() => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const months =
      (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
    return Math.min(24, Math.max(1, months || 1));
  }, [startDate, endDate]);

  const { data, isLoading } = useQuery({
    ...facilitiesQueries.report(facilityId, monthSpan),
    enabled: open,
  });

  const generate = () => {
    if (!data) return;
    const staff = getReportStaff(facilityId, facilityName);
    const period = `${fmtDate(startDate)} – ${fmtDate(endDate)}`;
    const { title, lines, rows } = buildReportContent(
      reportType,
      facilityName,
      period,
      data,
      staff,
    );
    const base = `${facilityName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${reportType}-report`;
    if (format === "pdf") downloadReportPdf(`${base}.pdf`, title, lines);
    else downloadReportCsv(`${base}.csv`, rows);

    const typeLabel = REPORT_TYPES.find((r) => r.value === reportType)?.label;
    toast.success(`${typeLabel} (${format.toUpperCase()}) downloaded.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate report</DialogTitle>
          <DialogDescription>
            Choose a report type and period for {facilityName}, then download a
            PDF or CSV of the real data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="report-type">Report type</Label>
            <Select
              value={reportType}
              onValueChange={(v) => setReportType(v as ReportType)}
            >
              <SelectTrigger id="report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From</Label>
              <DatePicker
                value={startDate}
                onValueChange={(v) => v && setStartDate(v)}
                max={endDate}
                displayMode="dialog"
                className="w-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label>To</Label>
              <DatePicker
                value={endDate}
                onValueChange={(v) => v && setEndDate(v)}
                min={startDate}
                max={isoToday()}
                displayMode="dialog"
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Format</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={format === "pdf" ? "default" : "outline"}
                className="justify-start gap-2"
                onClick={() => setFormat("pdf")}
              >
                <FileText className="size-4" />
                PDF
              </Button>
              <Button
                type="button"
                variant={format === "csv" ? "default" : "outline"}
                className="justify-start gap-2"
                onClick={() => setFormat("csv")}
              >
                <FileSpreadsheet className="size-4" />
                CSV
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={isLoading || !data} onClick={generate}>
            <Download className="mr-2 size-4" />
            {isLoading ? "Loading…" : `Generate ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
