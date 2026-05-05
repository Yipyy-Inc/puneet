"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Star,
  Search,
  Send,
  Globe,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Minus,
  Mail,
  Smartphone,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { reputationQueries } from "@/lib/api/reputation";
import type {
  ReputationRequest,
  ReputationRequestStatus,
  ReputationRating,
} from "@/types/reputation";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  ReputationRequestStatus,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  not_sent: {
    label: "Not Sent",
    cls: "bg-muted text-muted-foreground",
    icon: <Minus className="h-3 w-3" />,
  },
  sent: {
    label: "Sent",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    icon: <Send className="h-3 w-3" />,
  },
  reminder_sent: {
    label: "Reminder",
    cls: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
    icon: <RotateCcw className="h-3 w-3" />,
  },
  rating_received: {
    label: "Rated",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    icon: <Star className="h-3 w-3" />,
  },
  public_push_sent: {
    label: "Public",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    icon: <Globe className="h-3 w-3" />,
  },
  closed: {
    label: "Closed",
    cls: "bg-muted text-muted-foreground",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
};

function StatusPill({ status }: { status: ReputationRequestStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
        s.cls,
      )}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

function RatingBadge({ rating }: { rating: ReputationRating }) {
  const color =
    rating >= 4
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      : rating === 3
        ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
        : "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        color,
      )}
    >
      <Star className="h-3 w-3 fill-current" />
      {rating}
    </span>
  );
}

// ─── Status tabs (group raw statuses into intuitive buckets) ──────────────────

type StatusTab = "all" | "outreach" | "rated" | "public" | "closed";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "outreach", label: "Outreach" },
  { value: "rated", label: "Rated" },
  { value: "public", label: "Public" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

function matchesTab(status: ReputationRequestStatus, tab: StatusTab) {
  if (tab === "all") return true;
  if (tab === "outreach")
    return status === "not_sent" || status === "sent" || status === "reminder_sent";
  if (tab === "rated") return status === "rating_received";
  if (tab === "public") return status === "public_push_sent";
  if (tab === "closed") return status === "closed";
  return true;
}

// ─── Audit log (rendered inline in expanded row) ──────────────────────────────

function AuditLog({ req }: { req: ReputationRequest }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        <div className="bg-background rounded-lg border p-3">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            Trail
          </p>
          <div className="mt-2 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Channel</span>
              <span className="text-foreground inline-flex items-center gap-1 font-medium">
                {req.channel === "sms" ? (
                  <Smartphone className="size-3" />
                ) : (
                  <Mail className="size-3" />
                )}
                {req.channel.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Reminders</span>
              <span className="text-foreground font-medium tabular-nums">
                {req.remindersCount}
              </span>
            </div>
            {req.publicLinkClicked && req.publicPlatform && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Pushed to</span>
                <span className="text-foreground font-medium capitalize">
                  {req.publicPlatform}
                </span>
              </div>
            )}
          </div>
        </div>

        {req.clientComment && (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              Client comment
            </p>
            <p className="text-foreground mt-1 text-xs italic">
              "{req.clientComment}"
            </p>
          </div>
        )}
        {req.feedbackText && (
          <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 dark:border-rose-900 dark:bg-rose-950/30">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-400">
              <AlertCircle className="mr-1 inline size-3" />
              Internal feedback
            </p>
            <p className="text-foreground mt-1 text-xs">{req.feedbackText}</p>
          </div>
        )}
      </div>

      <div>
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Audit log
        </p>
        <div className="border-muted relative mt-2 space-y-2.5 border-l-2 pl-4">
          {req.auditLog.map((entry) => (
            <div key={entry.id} className="relative">
              <div className="bg-primary absolute -left-[1.1rem] top-1 h-2 w-2 rounded-full" />
              <p className="text-xs font-medium leading-none">{entry.action}</p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {new Date(entry.timestamp).toLocaleString("en-CA", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Request row ──────────────────────────────────────────────────────────────

function RequestRow({
  req,
  expanded,
  onToggle,
}: {
  req: ReputationRequest;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isNeg = req.rating !== undefined && req.rating <= 2;

  return (
    <>
      <tr
        className={cn(
          "cursor-pointer border-t transition-colors hover:bg-muted/30",
          expanded && "bg-muted/20",
          isNeg && !expanded && "bg-rose-50/40 dark:bg-rose-950/10",
        )}
        onClick={onToggle}
      >
        {/* Client / pet */}
        <td className="py-3 pl-5 pr-3">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                isNeg
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300"
                  : req.rating && req.rating >= 4
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {req.clientName.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-none">
                {req.clientName}
              </p>
              <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                {req.petName}
              </p>
            </div>
          </div>
        </td>

        {/* Service */}
        <td className="px-3 py-3">
          <span className="text-foreground text-xs capitalize">
            {req.serviceLabel}
          </span>
        </td>

        {/* Channel */}
        <td className="px-3 py-3">
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            {req.channel === "sms" ? (
              <Smartphone className="size-3 opacity-60" />
            ) : (
              <Mail className="size-3 opacity-60" />
            )}
            <span className="uppercase">{req.channel}</span>
          </span>
        </td>

        {/* Status */}
        <td className="px-3 py-3">
          <StatusPill status={req.status} />
        </td>

        {/* Rating */}
        <td className="px-3 py-3">
          {req.rating ? (
            <div className="flex items-center gap-1.5">
              <RatingBadge rating={req.rating} />
              {isNeg && <AlertCircle className="size-3.5 text-rose-500" />}
              {req.publicLinkClicked && (
                <ExternalLink className="size-3.5 text-emerald-500" />
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </td>

        {/* Sent */}
        <td className="px-3 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground inline-flex items-center gap-1 text-xs">
              <Clock className="size-3 opacity-60" />
              {new Date(req.sentAt).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
              })}
            </span>
            {req.remindersCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400">
                <RotateCcw className="size-3" />
                {req.remindersCount} reminder{req.remindersCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </td>

        {/* Staff */}
        <td className="py-3 pl-3 pr-5">
          <span className="text-muted-foreground text-xs">
            {req.staffName ?? "—"}
          </span>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-muted/10 border-t">
          <td colSpan={7} className="px-5 py-4">
            <AuditLog req={req} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Requests tab ─────────────────────────────────────────────────────────────

export function ReputationRequestsTab() {
  const { data: requests = [] } = useQuery(reputationQueries.requests());

  const [tab, setTab] = useState<StatusTab>("all");
  const [search, setSearch] = useState("");
  const [filterService, setFilterService] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"sentAt" | "rating">("sentAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const counts = useMemo(
    () => ({
      all: requests.length,
      outreach: requests.filter((r) => matchesTab(r.status, "outreach")).length,
      rated: requests.filter((r) => matchesTab(r.status, "rated")).length,
      public: requests.filter((r) => matchesTab(r.status, "public")).length,
      closed: requests.filter((r) => matchesTab(r.status, "closed")).length,
    }),
    [requests],
  );

  const filtered = useMemo(() => {
    let list = requests.filter((r) => matchesTab(r.status, tab));

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.clientName.toLowerCase().includes(q) ||
          r.petName.toLowerCase().includes(q),
      );
    }
    if (filterService !== "all")
      list = list.filter((r) => r.service === filterService);
    if (filterRating !== "all") {
      if (filterRating === "negative")
        list = list.filter((r) => r.rating !== undefined && r.rating <= 2);
      else list = list.filter((r) => r.rating === parseInt(filterRating));
    }

    list.sort((a, b) => {
      if (sortField === "sentAt") {
        const diff =
          new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
        return sortDir === "asc" ? diff : -diff;
      } else {
        const ra = a.rating ?? 0;
        const rb = b.rating ?? 0;
        return sortDir === "asc" ? ra - rb : rb - ra;
      }
    });

    return list;
  }, [requests, tab, search, filterService, filterRating, sortField, sortDir]);

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field ? (
      sortDir === "asc" ? (
        <ChevronUp className="size-3" />
      ) : (
        <ChevronDown className="size-3" />
      )
    ) : (
      <ChevronDown className="text-muted-foreground/40 size-3" />
    );

  const services = [...new Set(requests.map((r) => r.service))];

  return (
    <div className="flex w-full min-w-0 flex-col">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Requests</h2>
          <span className="text-muted-foreground bg-muted inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold">
            {counts.all}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search anything here..."
              className="h-9 w-56 pl-8 text-sm"
            />
          </div>
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="h-9 w-32 text-sm">
              <SlidersHorizontal className="mr-1 size-3.5" />
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              {services.map((s) => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="h-9 w-32 text-sm">
              <Star className="mr-1 size-3.5" />
              <SelectValue placeholder="Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              <SelectItem value="5">★★★★★ 5 stars</SelectItem>
              <SelectItem value="4">★★★★ 4 stars</SelectItem>
              <SelectItem value="3">★★★ 3 stars</SelectItem>
              <SelectItem value="negative">★★ Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex border-b">
        {STATUS_TABS.map((t) => {
          const isActive = tab === t.value;
          const count = counts[t.value];
          return (
            <button
              key={t.value}
              onClick={() => {
                setTab(t.value);
                setExpandedId(null);
              }}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <span className="bg-primary absolute inset-x-0 -bottom-px h-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-muted/30">
                <tr className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                  <th className="py-3 pl-5 pr-3 text-left">Client / Pet</th>
                  <th className="px-3 py-3 text-left">Service</th>
                  <th className="px-3 py-3 text-left">Channel</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th
                    className="hover:text-foreground cursor-pointer px-3 py-3 text-left"
                    onClick={() => toggleSort("rating")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Rating <SortIcon field="rating" />
                    </span>
                  </th>
                  <th
                    className="hover:text-foreground cursor-pointer px-3 py-3 text-left"
                    onClick={() => toggleSort("sentAt")}
                  >
                    <span className="inline-flex items-center gap-1">
                      Sent <SortIcon field="sentAt" />
                    </span>
                  </th>
                  <th className="py-3 pl-3 pr-5 text-left">Staff</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    expanded={expandedId === req.id}
                    onToggle={() =>
                      setExpandedId((cur) => (cur === req.id ? null : req.id))
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center py-16 text-center">
            <Search className="mb-3 size-10 opacity-25" />
            <p className="font-medium">
              {search || filterService !== "all" || filterRating !== "all"
                ? "No matches"
                : "Nothing here yet"}
            </p>
            <p className="mt-1 text-sm">
              {search || filterService !== "all" || filterRating !== "all"
                ? "Try a different search or filter."
                : "Requests will appear here once sent."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
