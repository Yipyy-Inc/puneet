"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  Check,
  X,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  availabilityChangeRequests as initialRequests,
  departments,
  scheduleEmployees,
} from "@/data/scheduling";
import type {
  AvailabilityChangeRequest,
  AvailabilityDay,
} from "@/types/scheduling";

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type StatusFilter = "pending" | "approved" | "denied" | "all";
type DayDiffKind = "unchanged-on" | "unchanged-off" | "added" | "removed" | "time";

function formatTime(t?: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const suffix = hour >= 12 ? "pm" : "am";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return m === "00" ? `${display}${suffix}` : `${display}:${m}${suffix}`;
}

function classifyDay(
  cur: AvailabilityDay | undefined,
  prop: AvailabilityDay,
): DayDiffKind {
  const curOn = !!cur?.isAvailable;
  const propOn = prop.isAvailable;
  if (!curOn && !propOn) return "unchanged-off";
  if (curOn && !propOn) return "removed";
  if (!curOn && propOn) return "added";
  if (
    cur?.startTime !== prop.startTime ||
    cur?.endTime !== prop.endTime
  )
    return "time";
  return "unchanged-on";
}

function DayPill({
  letter,
  kind,
}: {
  letter: string;
  kind: DayDiffKind;
}) {
  const styles: Record<DayDiffKind, string> = {
    "unchanged-on":
      "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
    "unchanged-off":
      "bg-muted text-muted-foreground/60",
    added:
      "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-400/50 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/40",
    removed:
      "bg-rose-100 text-rose-600 line-through opacity-70 dark:bg-rose-500/20 dark:text-rose-300",
    time:
      "bg-indigo-100 text-indigo-700 ring-1 ring-indigo-400/50 dark:bg-indigo-500/20 dark:text-indigo-300 dark:ring-indigo-500/40",
  };
  return (
    <span
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
        styles[kind],
      )}
    >
      {letter}
    </span>
  );
}

function DayPills({ req }: { req: AvailabilityChangeRequest }) {
  return (
    <div className="flex items-center gap-1">
      {DAY_LETTERS.map((letter, i) => {
        const cur = req.currentAvailability.find((d) => d.dayOfWeek === i);
        const prop = req.proposedAvailability.find((d) => d.dayOfWeek === i);
        if (!prop) return <DayPill key={i} letter={letter} kind="unchanged-off" />;
        return <DayPill key={i} letter={letter} kind={classifyDay(cur, prop)} />;
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    approved:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    denied:
      "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    cancelled: "bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    pending: "PENDING",
    approved: "APPROVED",
    denied: "DENIED",
    cancelled: "CANCELLED",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide",
        map[status] ?? map.pending,
      )}
    >
      {labels[status] ?? status.toUpperCase()}
    </span>
  );
}

function DiffDetail({ req }: { req: AvailabilityChangeRequest }) {
  const changes = req.proposedAvailability
    .filter((prop) => {
      const cur = req.currentAvailability.find(
        (c) => c.dayOfWeek === prop.dayOfWeek,
      );
      if (!cur) return prop.isAvailable;
      return (
        cur.isAvailable !== prop.isAvailable ||
        cur.startTime !== prop.startTime ||
        cur.endTime !== prop.endTime
      );
    })
    .map((prop) => ({
      day: prop.dayOfWeek,
      cur: req.currentAvailability.find((c) => c.dayOfWeek === prop.dayOfWeek),
      prop,
    }))
    .sort((a, b) => a.day - b.day);

  if (changes.length === 0)
    return <p className="text-muted-foreground text-xs">No changes.</p>;

  return (
    <div className="grid gap-1.5 sm:grid-cols-2">
      {changes.map((c) => {
        const curLabel = c.cur?.isAvailable
          ? `${formatTime(c.cur.startTime)}–${formatTime(c.cur.endTime)}`
          : "Off";
        const propLabel = c.prop.isAvailable
          ? `${formatTime(c.prop.startTime)}–${formatTime(c.prop.endTime)}`
          : "Off";
        const isRemoving = c.cur?.isAvailable && !c.prop.isAvailable;
        const isAdding = !c.cur?.isAvailable && c.prop.isAvailable;
        return (
          <div
            key={c.day}
            className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs"
          >
            <span className="text-muted-foreground w-10 shrink-0 font-semibold uppercase tracking-wide">
              {DAY_LABELS[c.day]}
            </span>
            <span
              className={cn(
                "text-muted-foreground",
                isRemoving && "line-through",
              )}
            >
              {curLabel}
            </span>
            <span className="text-muted-foreground">→</span>
            <span
              className={cn(
                "font-medium",
                isAdding && "text-emerald-600 dark:text-emerald-400",
                isRemoving && "text-rose-500 dark:text-rose-400",
                !isAdding && !isRemoving && "text-foreground",
              )}
            >
              {propLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RequestRow({
  req,
  expanded,
  onToggle,
  onDecide,
}: {
  req: AvailabilityChangeRequest;
  expanded: boolean;
  onToggle: () => void;
  onDecide: (id: string, status: "approved" | "denied", notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const emp = scheduleEmployees.find((e) => e.id === req.employeeId);
  const dept = departments.find((d) => d.id === req.departmentId);
  const isPending = req.status === "pending";

  return (
    <>
      <tr
        className={cn(
          "border-t transition-colors hover:bg-muted/30",
          expanded && "bg-muted/20",
        )}
      >
        {/* Name */}
        <td className="py-3 pl-5 pr-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={emp?.avatar} alt={emp?.name} />
              <AvatarFallback className="bg-muted text-xs font-semibold">
                {emp?.initials ?? "??"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {req.employeeName}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {emp?.email ?? "—"}
              </p>
            </div>
          </div>
        </td>

        {/* Department */}
        <td className="px-3 py-3">
          {dept ? (
            <div className="flex items-center gap-1.5 text-xs">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: dept.color }}
              />
              <span className="text-foreground truncate">{dept.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </td>

        {/* Proposed days */}
        <td className="px-3 py-3">
          <DayPills req={req} />
        </td>

        {/* Effective */}
        <td className="px-3 py-3">
          <p className="text-sm font-medium">{req.effectiveFrom}</p>
          <p className="text-muted-foreground text-[11px]">
            requested {req.requestedAt}
          </p>
        </td>

        {/* Status */}
        <td className="px-3 py-3">
          <StatusBadge status={req.status} />
        </td>

        {/* Actions */}
        <td className="py-3 pl-3 pr-5">
          <div className="flex items-center justify-end gap-1">
            {isPending ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="hidden h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:inline-flex dark:border-rose-800 dark:hover:bg-rose-950/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecide(req.id, "denied", "");
                  }}
                >
                  <X className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  className="hidden h-8 bg-emerald-600 text-white hover:bg-emerald-700 sm:inline-flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecide(req.id, "approved", "");
                  }}
                >
                  <Check className="size-3.5" />
                </Button>
              </>
            ) : null}
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              onClick={onToggle}
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <ChevronDown
                className={cn(
                  "size-4 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label="More"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onToggle}>
                  View details
                </DropdownMenuItem>
                {isPending && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDecide(req.id, "approved", "")}
                    >
                      <Check className="mr-2 size-3.5 text-emerald-600" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDecide(req.id, "denied", "")}
                    >
                      <X className="mr-2 size-3.5 text-rose-600" />
                      Deny
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-muted/10 border-t">
          <td colSpan={6} className="px-5 py-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-3">
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    Reason
                  </p>
                  <p className="text-foreground mt-1 text-sm italic">
                    "{req.reason}"
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    Changes
                  </p>
                  <div className="mt-1.5">
                    <DiffDetail req={req} />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {isPending ? (
                  <>
                    <div>
                      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                        Review note
                      </p>
                      <Textarea
                        placeholder="Add a note (optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="mt-1.5 min-h-0 resize-none text-xs"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-800 dark:hover:bg-rose-950/30"
                        onClick={() => onDecide(req.id, "denied", notes)}
                      >
                        <X className="mr-1.5 size-3.5" />
                        Deny
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => onDecide(req.id, "approved", notes)}
                      >
                        <Check className="mr-1.5 size-3.5" />
                        Approve
                      </Button>
                    </div>
                  </>
                ) : (
                  req.reviewedByName && (
                    <div className="bg-background rounded-lg border p-3 text-xs">
                      <p className="text-muted-foreground">
                        Reviewed by{" "}
                        <span className="text-foreground font-medium">
                          {req.reviewedByName}
                        </span>{" "}
                        on {req.reviewedAt}
                      </p>
                      {req.reviewNotes && (
                        <p className="text-foreground mt-1.5 italic">
                          "{req.reviewNotes}"
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "all", label: "All" },
];

export default function AvailabilityChangesPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [tab, setTab] = useState<StatusFilter>("pending");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      denied: requests.filter((r) => r.status === "denied").length,
      all: requests.length,
    }),
    [requests],
  );

  const filtered = useMemo(() => {
    const base =
      tab === "all" ? requests : requests.filter((r) => r.status === tab);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q),
    );
  }, [requests, tab, query]);

  const decide = (
    id: string,
    status: "approved" | "denied",
    notes: string,
  ) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status,
              reviewedAt: new Date().toISOString().split("T")[0],
              reviewedBy: "emp-1",
              reviewedByName: "Sarah Johnson",
              reviewNotes: notes || undefined,
            }
          : r,
      ),
    );
    setExpandedId(null);
    toast.success(
      status === "approved" ? "Availability change approved" : "Request denied",
      {
        description:
          status === "approved"
            ? "New schedule will apply from the effective date."
            : undefined,
      },
    );
  };

  return (
    <div className="flex w-full min-w-0 flex-col p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Availability Changes
          </h2>
          <span className="text-muted-foreground bg-muted inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-semibold">
            {counts.all}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anything here..."
              className="h-9 w-64 pl-8 text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9">
            <SlidersHorizontal className="mr-1.5 size-3.5" />
            Filters
          </Button>
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
              onClick={() => setTab(t.value)}
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

      {/* Mobile search */}
      <div className="relative mb-4 sm:hidden">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or reason..."
          className="h-9 pl-8 text-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border bg-card">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-muted/30">
                <tr className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
                  <th className="py-3 pl-5 pr-3 text-left">Name</th>
                  <th className="px-3 py-3 text-left">Department</th>
                  <th className="px-3 py-3 text-left">Proposed Days</th>
                  <th className="px-3 py-3 text-left">Effective</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="py-3 pl-3 pr-5 text-right"></th>
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
                    onDecide={decide}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center py-16 text-center">
            <CalendarCheck className="mb-3 size-10 opacity-25" />
            <p className="font-medium">
              {query
                ? "No matches"
                : tab === "pending"
                  ? "No pending requests"
                  : "Nothing here yet"}
            </p>
            <p className="mt-1 text-sm">
              {query
                ? "Try a different search term."
                : tab === "pending"
                  ? "All caught up — no availability changes to review."
                  : "Requests will appear here once submitted."}
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      {filtered.length > 0 && (
        <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
          <span className="font-medium">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-sky-100 dark:bg-sky-500/20" />
            Working
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-emerald-100 ring-1 ring-emerald-400/50 dark:bg-emerald-500/20" />
            Adding
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-rose-100 dark:bg-rose-500/20" />
            Removing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-indigo-100 ring-1 ring-indigo-400/50 dark:bg-indigo-500/20" />
            Time change
          </span>
          <span className="flex items-center gap-1.5">
            <span className="bg-muted size-3 rounded-full" />
            Off
          </span>
        </div>
      )}
    </div>
  );
}
