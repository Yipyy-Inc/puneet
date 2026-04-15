"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  X,
  Search,
  SlidersHorizontal,
  MoreHorizontal,
  ChevronDown,
  Calendar,
  Clock,
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
  enhancedShiftSwaps as initialSwaps,
  departments,
  scheduleEmployees,
} from "@/data/scheduling";
import type { EnhancedShiftSwap } from "@/types/scheduling";

type StatusFilter = "pending" | "approved" | "denied" | "all";

function formatShiftDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    approved:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    denied: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
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

function EmployeeChip({
  id,
  name,
  align = "left",
}: {
  id: string;
  name: string;
  align?: "left" | "right";
}) {
  const emp = scheduleEmployees.find((e) => e.id === id);
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <Avatar className="size-7 shrink-0">
        <AvatarImage src={emp?.avatar} alt={name} />
        <AvatarFallback className="bg-muted text-[10px] font-semibold">
          {emp?.initials ?? name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-medium">{name}</span>
    </div>
  );
}

function ShiftCell({ date, time }: { date: string; time: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-foreground flex items-center gap-1 text-xs font-medium">
        <Calendar className="size-3 opacity-60" />
        {formatShiftDate(date)}
      </span>
      <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
        <Clock className="size-3 opacity-60" />
        {time}
      </span>
    </div>
  );
}

function SwapRow({
  swap,
  expanded,
  onToggle,
  onDecide,
}: {
  swap: EnhancedShiftSwap;
  expanded: boolean;
  onToggle: () => void;
  onDecide: (id: string, status: "approved" | "denied", notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const dept = departments.find((d) => d.id === swap.departmentId);
  const isPending = swap.status === "pending";

  return (
    <>
      <tr
        className={cn(
          "border-t transition-colors hover:bg-muted/30",
          expanded && "bg-muted/20",
        )}
      >
        {/* Swap participants */}
        <td className="py-3 pl-5 pr-3">
          <div className="flex items-center gap-2">
            <EmployeeChip
              id={swap.requestingEmployeeId}
              name={swap.requestingEmployeeName}
            />
            <ArrowLeftRight className="text-muted-foreground size-3.5 shrink-0" />
            <EmployeeChip
              id={swap.targetEmployeeId}
              name={swap.targetEmployeeName}
            />
          </div>
        </td>

        {/* Requester shift */}
        <td className="px-3 py-3">
          <ShiftCell
            date={swap.requestingShiftDate}
            time={swap.requestingShiftTime}
          />
        </td>

        {/* Target shift */}
        <td className="px-3 py-3">
          <ShiftCell
            date={swap.targetShiftDate}
            time={swap.targetShiftTime}
          />
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

        {/* Requested */}
        <td className="px-3 py-3">
          <span className="text-muted-foreground text-xs">
            {swap.requestedAt}
          </span>
        </td>

        {/* Status */}
        <td className="px-3 py-3">
          <StatusBadge status={swap.status} />
        </td>

        {/* Actions */}
        <td className="py-3 pl-3 pr-5">
          <div className="flex items-center justify-end gap-1">
            {isPending && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="hidden h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:inline-flex dark:border-rose-800 dark:hover:bg-rose-950/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecide(swap.id, "denied", "");
                  }}
                  aria-label="Deny"
                >
                  <X className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  className="hidden h-8 bg-emerald-600 text-white hover:bg-emerald-700 sm:inline-flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDecide(swap.id, "approved", "");
                  }}
                  aria-label="Approve"
                >
                  <Check className="size-3.5" />
                </Button>
              </>
            )}
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
                      onClick={() => onDecide(swap.id, "approved", "")}
                    >
                      <Check className="mr-2 size-3.5 text-emerald-600" />
                      Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDecide(swap.id, "denied", "")}
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
          <td colSpan={7} className="px-5 py-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="space-y-3">
                <div>
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    Reason
                  </p>
                  <p className="text-foreground mt-1 text-sm italic">
                    "{swap.reason}"
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                    Swap summary
                  </p>
                  <div className="mt-2 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground shrink-0">
                        {swap.requestingEmployeeName} gives up
                      </span>
                      <span className="text-foreground text-right font-medium">
                        {formatShiftDate(swap.requestingShiftDate)} ·{" "}
                        {swap.requestingShiftTime}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground shrink-0">
                        {swap.targetEmployeeName} gives up
                      </span>
                      <span className="text-foreground text-right font-medium">
                        {formatShiftDate(swap.targetShiftDate)} ·{" "}
                        {swap.targetShiftTime}
                      </span>
                    </div>
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
                        onClick={() => onDecide(swap.id, "denied", notes)}
                      >
                        <X className="mr-1.5 size-3.5" />
                        Deny
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={() => onDecide(swap.id, "approved", notes)}
                      >
                        <Check className="mr-1.5 size-3.5" />
                        Approve
                      </Button>
                    </div>
                  </>
                ) : (
                  swap.reviewedAt && (
                    <div className="bg-background rounded-lg border p-3 text-xs">
                      <p className="text-muted-foreground">
                        Reviewed on{" "}
                        <span className="text-foreground font-medium">
                          {swap.reviewedAt}
                        </span>
                      </p>
                      {swap.reviewNotes && (
                        <p className="text-foreground mt-1.5 italic">
                          "{swap.reviewNotes}"
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

export default function ShiftSwapsPage() {
  const [swaps, setSwaps] = useState<EnhancedShiftSwap[]>(initialSwaps);
  const [tab, setTab] = useState<StatusFilter>("pending");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      pending: swaps.filter((s) => s.status === "pending").length,
      approved: swaps.filter((s) => s.status === "approved").length,
      denied: swaps.filter((s) => s.status === "denied").length,
      all: swaps.length,
    }),
    [swaps],
  );

  const filtered = useMemo(() => {
    const base = tab === "all" ? swaps : swaps.filter((s) => s.status === tab);
    if (!query.trim()) return base;
    const q = query.toLowerCase();
    return base.filter(
      (s) =>
        s.requestingEmployeeName.toLowerCase().includes(q) ||
        s.targetEmployeeName.toLowerCase().includes(q) ||
        s.reason.toLowerCase().includes(q),
    );
  }, [swaps, tab, query]);

  const decide = (
    id: string,
    status: "approved" | "denied",
    notes: string,
  ) => {
    setSwaps((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              status,
              reviewedAt: new Date().toISOString().split("T")[0],
              reviewedBy: "emp-1",
              reviewNotes: notes || undefined,
            }
          : s,
      ),
    );
    setExpandedId(null);
    toast.success(
      status === "approved" ? "Shift swap approved" : "Shift swap denied",
      {
        description:
          status === "approved"
            ? "Both employees have been notified."
            : undefined,
      },
    );
  };

  return (
    <div className="flex w-full min-w-0 flex-col p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">Shift Swaps</h2>
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
                  <th className="py-3 pl-5 pr-3 text-left">Swap</th>
                  <th className="px-3 py-3 text-left">Requester Shift</th>
                  <th className="px-3 py-3 text-left">Target Shift</th>
                  <th className="px-3 py-3 text-left">Department</th>
                  <th className="px-3 py-3 text-left">Requested</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="py-3 pl-3 pr-5 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((swap) => (
                  <SwapRow
                    key={swap.id}
                    swap={swap}
                    expanded={expandedId === swap.id}
                    onToggle={() =>
                      setExpandedId((cur) => (cur === swap.id ? null : swap.id))
                    }
                    onDecide={decide}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center py-16 text-center">
            <ArrowLeftRight className="mb-3 size-10 opacity-25" />
            <p className="font-medium">
              {query
                ? "No matches"
                : tab === "pending"
                  ? "No pending swaps"
                  : "Nothing here yet"}
            </p>
            <p className="mt-1 text-sm">
              {query
                ? "Try a different search term."
                : tab === "pending"
                  ? "All caught up — no swaps to review."
                  : "Swap requests will appear here once submitted."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
