"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Plus,
  Search,
  Send,
  CheckCircle,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { estimates } from "@/data/estimates";
import { EstimateCard } from "@/components/bookings/EstimateCard";
import { EstimateWizard } from "@/components/estimates/EstimateWizard";
import { formatBookingRef } from "@/lib/booking-id";
import { downloadReportCsv } from "@/lib/report-export";

type TabFilter =
  | "all"
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "converted";

const TAB_FILTERS: { key: TabFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "expired", label: "Expired" },
  { key: "converted", label: "Converted" },
];

type SortOption = "newest" | "oldest" | "highest" | "lowest" | "expiring";

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "highest", label: "Highest Value" },
  { key: "lowest", label: "Lowest Value" },
  { key: "expiring", label: "Expiring Soonest" },
];

type DatePreset = "today" | "week" | "month" | "last30" | "custom";

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "last30", label: "Last 30 Days" },
  { key: "custom", label: "Custom" },
];

const PRESET_LABEL: Record<DatePreset, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  last30: "Last 30 Days",
  custom: "Custom",
};

function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Resolve a preset to an inclusive [from, to] ISO range ending today. */
function presetRange(preset: Exclude<DatePreset, "custom">): {
  from: string;
  to: string;
} {
  const now = new Date();
  const today = toISODate(now);
  if (preset === "today") return { from: today, to: today };
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay()); // back to Sunday
    return { from: toISODate(start), to: today };
  }
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toISODate(start), to: today };
  }
  // last30
  const start = new Date(now);
  start.setDate(now.getDate() - 29);
  return { from: toISODate(start), to: today };
}

/** Format a YYYY-MM-DD string without timezone drift. */
function formatRangeDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EstimatesPage() {
  const searchParams = useSearchParams();
  const searchFromUrl = searchParams.get("q") ?? "";
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [now] = useState(() => new Date());
  const [datePreset, setDatePreset] = useState<DatePreset>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Service-date filter — separate from the creation-date filter above.
  const [serviceDateEnabled, setServiceDateEnabled] = useState(false);
  const [serviceFrom, setServiceFrom] = useState("");
  const [serviceTo, setServiceTo] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [wizardOpen, setWizardOpen] = useState(false);

  const hasDateFilter = dateFrom !== "" || dateTo !== "";
  const hasServiceDateFilter =
    serviceDateEnabled && (serviceFrom !== "" || serviceTo !== "");

  const toggleServiceDate = useCallback((on: boolean) => {
    setServiceDateEnabled(on);
    if (!on) {
      setServiceFrom("");
      setServiceTo("");
    }
  }, []);

  const clearServiceDateFilter = useCallback(() => {
    setServiceFrom("");
    setServiceTo("");
  }, []);

  const serviceRangeLabel =
    serviceFrom && serviceTo
      ? `${formatRangeDate(serviceFrom)} – ${formatRangeDate(serviceTo)}`
      : serviceFrom
        ? `From ${formatRangeDate(serviceFrom)}`
        : serviceTo
          ? `Until ${formatRangeDate(serviceTo)}`
          : "";

  const handlePresetChange = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const { from, to } = presetRange(preset);
    setDateFrom(from);
    setDateTo(to);
  }, []);

  const clearDateFilter = useCallback(() => {
    setDatePreset("custom");
    setDateFrom("");
    setDateTo("");
  }, []);

  const rangeLabel =
    datePreset !== "custom"
      ? PRESET_LABEL[datePreset]
      : dateFrom && dateTo
        ? `${formatRangeDate(dateFrom)} – ${formatRangeDate(dateTo)}`
        : dateFrom
          ? `From ${formatRangeDate(dateFrom)}`
          : dateTo
            ? `Until ${formatRangeDate(dateTo)}`
            : "";

  useEffect(() => {
    setSearchQuery(searchFromUrl);
  }, [searchFromUrl]);

  // Canonical estimate-create path: the dedicated EstimateWizard (spec's
  // multi-step create flow). Single create path — no second divergent flow.
  const openEstimateCreate = useCallback(() => {
    setWizardOpen(true);
  }, []);

  const filtered = useMemo(() => {
    let list = estimates;
    if (activeTab !== "all") {
      list = list.filter((e) => e.status === activeTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.clientName.toLowerCase().includes(q) ||
          e.clientEmail.toLowerCase().includes(q) ||
          e.service.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.estimateId.toLowerCase().includes(q) ||
          (e.convertedBookingId != null &&
            (String(e.convertedBookingId).includes(q) ||
              formatBookingRef(e.convertedBookingId)
                .toLowerCase()
                .includes(q))),
      );
    }
    if (dateFrom || dateTo) {
      list = list.filter((e) => {
        const created = e.createdAt.slice(0, 10); // YYYY-MM-DD
        if (dateFrom && created < dateFrom) return false;
        if (dateTo && created > dateTo) return false;
        return true;
      });
    }
    if (serviceDateEnabled && (serviceFrom || serviceTo)) {
      // Keep estimates whose service period (startDate–endDate) overlaps the
      // selected window, e.g. any boarding stay touching the Easter weekend.
      list = list.filter((e) => {
        const start = e.startDate.slice(0, 10);
        const end = e.endDate.slice(0, 10);
        if (serviceFrom && end < serviceFrom) return false;
        if (serviceTo && start > serviceTo) return false;
        return true;
      });
    }
    return list;
  }, [
    activeTab,
    searchQuery,
    dateFrom,
    dateTo,
    serviceDateEnabled,
    serviceFrom,
    serviceTo,
  ]);

  const sorted = useMemo(() => {
    const arr = [...filtered]; // copy — never sort the source `estimates` in place
    const nowMs = now.getTime();
    switch (sortBy) {
      case "oldest":
        return arr.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case "highest":
        return arr.sort((a, b) => b.total - a.total);
      case "lowest":
        return arr.sort((a, b) => a.total - b.total);
      case "expiring": {
        // Sent, still-unexpired estimates by nearest expiry; everything else
        // (drafts, terminal, or already-expired) sinks below, newest-first.
        const expiryRank = (e: (typeof arr)[number]) => {
          if (e.status !== "sent" || !e.expiresAt) return Infinity;
          const t = new Date(e.expiresAt).getTime();
          return t > nowMs ? t : Infinity;
        };
        return arr.sort((a, b) => {
          const ra = expiryRank(a);
          const rb = expiryRank(b);
          if (ra !== rb) return ra - rb;
          return b.createdAt.localeCompare(a.createdAt);
        });
      }
      case "newest":
      default:
        return arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [filtered, sortBy, now]);

  // Only estimates converted within the current calendar month feed the
  // "Converted this month" tile. Conversion time comes from the activity log's
  // "Converted" entry; estimates without one can't be dated and are excluded.
  const convertedThisMonth = useMemo(
    () =>
      estimates.filter((e) => {
        if (e.status !== "converted") return false;
        const at = e.activityLog?.find((a) => a.type === "Converted")?.at;
        if (!at) return false;
        const d = new Date(at);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      }),
    [now],
  );

  const stats = {
    draft: estimates.filter((e) => e.status === "draft").length,
    sent: estimates.filter((e) => e.status === "sent").length,
    accepted: estimates.filter((e) => e.status === "accepted").length,
    converted: convertedThisMonth,
  };
  const convertedTotal = convertedThisMonth.reduce((s, e) => s + e.total, 0);

  // Sent estimates expiring within the next 7 days — the "Value at Risk" prompt.
  const atRisk = useMemo(() => {
    const nowMs = now.getTime();
    const in7Days = nowMs + 7 * 24 * 60 * 60 * 1000;
    return estimates.filter((e) => {
      if (e.status !== "sent" || !e.expiresAt) return false;
      const t = new Date(e.expiresAt).getTime();
      return t > nowMs && t <= in7Days;
    });
  }, [now]);
  const atRiskTotal = atRisk.reduce((s, e) => s + e.total, 0);

  const followUpAtRisk = useCallback(() => {
    setActiveTab("sent");
    setSortBy("expiring");
  }, []);

  // Bulk selection — persists by id across filtering/sorting.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const resendSelected = useCallback(() => {
    const n = selectedIds.size;
    toast.success(`Resent ${n} estimate${n === 1 ? "" : "s"} to customers`);
    clearSelection();
  }, [selectedIds, clearSelection]);

  const exportSelected = useCallback(() => {
    const rows: (string | number)[][] = [
      [
        "Estimate ID",
        "Client",
        "Email",
        "Service",
        "Service Type",
        "Start Date",
        "End Date",
        "Status",
        "Total",
        "Created",
        "Expires",
      ],
      ...estimates
        .filter((e) => selectedIds.has(e.id))
        .map((e) => [
          e.estimateId,
          e.clientName,
          e.clientEmail,
          e.service,
          e.serviceType ?? "",
          e.startDate,
          e.endDate,
          e.status,
          e.total.toFixed(2),
          e.createdAt,
          e.expiresAt ?? "",
        ]),
    ];
    downloadReportCsv(`estimates-${toISODate(now)}.csv`, rows);
  }, [selectedIds, now]);

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estimates</h2>
          <p className="text-muted-foreground">
            Create, manage, and track service estimates for clients and
            prospects.
          </p>
        </div>
        <Button className="gap-2" onClick={openEstimateCreate}>
          <Plus className="size-4" />
          Create Estimate
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          {
            key: "draft" as const,
            label: "Draft",
            count: stats.draft,
            icon: FileText,
            iconColor: "text-slate-300",
            countColor: "",
            tab: "draft" as TabFilter,
          },
          {
            key: "sent" as const,
            label: "Sent",
            count: stats.sent,
            icon: Send,
            iconColor: "text-blue-300",
            countColor: "text-blue-600",
            tab: "sent" as TabFilter,
          },
          {
            key: "accepted" as const,
            label: "Accepted",
            count: stats.accepted,
            icon: CheckCircle,
            iconColor: "text-emerald-300",
            countColor: "text-emerald-600",
            tab: "accepted" as TabFilter,
          },
          {
            key: "converted" as const,
            label: "Converted this month",
            count: stats.converted.length,
            icon: TrendingUp,
            iconColor: "text-primary/30",
            countColor: "",
            tab: "converted" as TabFilter,
          },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = activeTab === s.tab;
          return (
            <Card
              key={s.key}
              className={cn(
                "cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md",
                isActive && "ring-primary/30 ring-2 ring-offset-2",
              )}
              onClick={() => setActiveTab(isActive ? "all" : s.tab)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">{s.label}</p>
                    <p className={cn("text-2xl font-bold", s.countColor)}>
                      {s.count}
                      {s.key === "converted" && (
                        <span className="text-muted-foreground ml-1 text-sm font-normal">
                          (${convertedTotal.toFixed(0)})
                        </span>
                      )}
                    </p>
                    {s.key === "converted" && (
                      <p className="text-muted-foreground text-[11px]">
                        This calendar month
                      </p>
                    )}
                  </div>
                  <Icon className={cn("size-8", s.iconColor)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Value at Risk — only when Sent estimates expire within 7 days */}
      {atRisk.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-amber-600" />
          <p className="text-amber-900">
            <span className="font-semibold">
              {atRisk.length} estimate{atRisk.length === 1 ? "" : "s"}
            </span>{" "}
            worth{" "}
            <span className="font-semibold">${atRiskTotal.toFixed(2)}</span>{" "}
            expire in the next 7 days.
          </p>
          <button
            type="button"
            onClick={followUpAtRisk}
            className="inline-flex items-center gap-1 font-medium text-amber-700 underline-offset-2 hover:underline"
          >
            Follow up now
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Scrollable on mobile: the 6 status pills need ~490px and were
            clipped by the page shell at 390px. */}
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {TAB_FILTERS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                activeTab === tab.key
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
          {/* Creation-date range filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Select
              value={datePreset}
              onValueChange={(v) => handlePresetChange(v as DatePreset)}
            >
              <SelectTrigger className="h-9 w-[140px] text-xs">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.key} value={p.key} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker
              value={dateFrom || undefined}
              onValueChange={(v) => {
                setDateFrom(v);
                setDatePreset("custom");
              }}
              placeholder="From"
              max={dateTo || undefined}
              className="h-9 w-[132px] text-xs"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <DatePicker
              value={dateTo || undefined}
              onValueChange={(v) => {
                setDateTo(v);
                setDatePreset("custom");
              }}
              placeholder="To"
              min={dateFrom || undefined}
              className="h-9 w-[132px] text-xs"
            />
          </div>
          <div className="relative w-full md:max-w-xs">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search estimates..."
              className="pl-10"
            />
          </div>
          {/* Sort */}
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Service-date filter — optional, separate from the creation-date filter */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-2">
          <Switch
            id="service-date-filter"
            checked={serviceDateEnabled}
            onCheckedChange={toggleServiceDate}
          />
          <Label
            htmlFor="service-date-filter"
            className="text-muted-foreground cursor-pointer text-xs"
          >
            Filter by service date
          </Label>
        </div>
        {serviceDateEnabled && (
          <div className="flex flex-wrap items-center gap-1.5">
            <DatePicker
              value={serviceFrom || undefined}
              onValueChange={setServiceFrom}
              placeholder="Service from"
              max={serviceTo || undefined}
              className="h-9 w-[140px] text-xs"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <DatePicker
              value={serviceTo || undefined}
              onValueChange={setServiceTo}
              placeholder="Service to"
              min={serviceFrom || undefined}
              className="h-9 w-[140px] text-xs"
            />
          </div>
        )}
      </div>

      {/* Active filter chips */}
      {(hasDateFilter || hasServiceDateFilter) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Filtering by:</span>
          {hasDateFilter && rangeLabel && (
            <button
              type="button"
              onClick={clearDateFilter}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 py-1 pr-2 pl-3 text-xs font-medium text-white transition-colors hover:bg-slate-700"
            >
              Created: {rangeLabel}
              <X className="size-3.5" />
            </button>
          )}
          {hasServiceDateFilter && serviceRangeLabel && (
            <button
              type="button"
              onClick={clearServiceDateFilter}
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 py-1 pr-2 pl-3 text-xs font-medium text-white transition-colors hover:bg-slate-700"
            >
              Service: {serviceRangeLabel}
              <X className="size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Estimate list */}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertCircle className="text-muted-foreground/20 size-12" />
          <p className="text-muted-foreground mt-3">No estimates found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sorted.map((estimate) => (
            <EstimateCard
              key={estimate.id}
              estimate={estimate}
              // Mock seams — the card surfaces toast feedback on each action;
              // a real API would mutate the estimate / create the booking here.
              onSend={() => {
                /* mark the estimate as (re)sent */
              }}
              onConvert={() => {
                /* create a booking from the estimate */
              }}
              onDecline={() => {
                /* mark the estimate as declined */
              }}
              onDuplicate={() => {
                /* duplicate the estimate as a new draft */
              }}
              selected={selectedIds.has(estimate.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* Bulk-selection action bar */}
      {selectedIds.size > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border bg-white px-4 py-2.5 shadow-lg">
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
            <span className="text-muted-foreground">—</span>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={resendSelected}
            >
              <Send className="size-3.5" />
              Resend All
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={exportSelected}
            >
              <Download className="size-3.5" />
              Export
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Canonical create flow */}
      <EstimateWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        facilityId={11}
      />
    </div>
  );
}
