"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarOff,
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
import { Skeleton } from "@/components/ui/skeleton";
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
  schedulingQueries,
  timeOffQueries,
  useDecideTimeOff,
} from "@/lib/api/scheduling";
import { staffQueries } from "@/lib/api/staff";
import type { TimeOffRequest } from "@/lib/api/mappers/scheduling";
import type { StaffProfile } from "@/types/facility-staff";
import type { Department } from "@/types/scheduling";

type StatusFilter = "pending" | "approved" | "denied" | "all";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "all", label: "All" },
];

const TYPE_INFO: Record<string, { label: string; class: string }> = {
  vacation: {
    label: "Vacation",
    class:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  sick_leave: {
    label: "Sick Leave",
    class: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  },
  personal: {
    label: "Personal",
    class:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  },
  bereavement: {
    label: "Bereavement",
    class:
      "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
  },
  parental: {
    label: "Parental",
    class:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  unpaid: {
    label: "Unpaid",
    class: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  },
  other: {
    label: "Other",
    class: "bg-muted text-muted-foreground",
  },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dayCount(start: string, end: string) {
  return (
    Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) /
        (1000 * 60 * 60 * 24),
    ) + 1
  );
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
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide",
        map[status] ?? map.pending,
      )}
    >
      {status.toUpperCase()}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const info = TYPE_INFO[type] ?? TYPE_INFO.other;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        info.class,
      )}
    >
      {info.label}
    </span>
  );
}

/** Two letters from a name the server already assembled. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "??";
}

function RequestRow({
  req,
  emp,
  dept,
  expanded,
  onToggle,
  onDecide,
}: {
  req: TimeOffRequest;
  /** Resolved by the container: one lookup for the list, not one per row. */
  emp?: StaffProfile;
  /**
   * The requester's department, which the REQUEST does not carry — a person
   * belongs to a department, a day off does not. Derived from the org chart.
   */
  dept?: Department;
  expanded: boolean;
  onToggle: () => void;
  onDecide: (id: string, status: "approved" | "denied", notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const isPending = req.status === "pending";
  const days = dayCount(req.startDate, req.endDate);

  return (
    <>
      <tr
        className={cn(
          "hover:bg-muted/30 border-t transition-colors",
          expanded && "bg-muted/20",
        )}
      >
        {/* Name */}
        <td className="py-3 pr-3 pl-5">
          <div className="flex items-center gap-3">
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={emp?.avatarUrl} alt={req.employeeName} />
              <AvatarFallback className="bg-muted text-xs font-semibold">
                {initialsOf(req.employeeName)}
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

        {/* Type */}
        <td className="px-3 py-3">
          <TypeBadge type={req.type} />
        </td>

        {/* Dates */}
        <td className="px-3 py-3">
          <p className="text-sm font-medium">
            {formatDate(req.startDate)}
            {req.startDate !== req.endDate && ` — ${formatDate(req.endDate)}`}
          </p>
          <p className="text-muted-foreground text-[11px]">
            {days} day{days !== 1 ? "s" : ""} · requested {req.requestedAt}
          </p>
        </td>

        {/* Status */}
        <td className="px-3 py-3">
          <StatusBadge status={req.status} />
        </td>

        {/* Actions */}
        <td className="py-3 pr-5 pl-3">
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
                  <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                    Reason
                  </p>
                  <p className="text-foreground mt-1 text-sm italic">
                    &quot;{req.reason}&quot;
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                      Start
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(req.startDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                      End
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {formatDate(req.endDate)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {isPending ? (
                  <>
                    <div>
                      <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
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
                          &quot;{req.reviewNotes}&quot;
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

export default function TimeOffPage() {
  const [tab, setTab] = useState<StatusFilter>("pending");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Everything, once. The tabs need counts as well as rows, and leave is not a
  // volume where a query per tab buys anything — it would cost the counts.
  const { data, isPending: loading } = useQuery(timeOffQueries.list("all"));
  const { data: structure } = useQuery(schedulingQueries.structure());
  const { data: staff } = useQuery(staffQueries.profiles());
  const decideTimeOff = useDecideTimeOff();

  const requests = useMemo(() => data?.requests ?? [], [data]);

  // `staff_shifts.staff_id` and this table's `staff_id` are the ROW's uuid.
  // `StaffProfile.id` is a legacy string and matches nothing.
  const staffById = useMemo(() => {
    const map = new Map<string, StaffProfile>();
    for (const member of staff ?? []) {
      if (member.rowId) map.set(member.rowId, member);
    }
    return map;
  }, [staff]);

  const departmentByStaff = useMemo(() => {
    const map = new Map<string, Department>();
    for (const dept of structure?.departments ?? []) {
      for (const id of dept.employeeIds) map.set(id, dept);
    }
    return map;
  }, [structure]);

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

  const decide = (id: string, status: "approved" | "denied", notes: string) => {
    decideTimeOff.mutate(
      { id, status, notes: notes || undefined },
      {
        onSuccess: (decided) => {
          setExpandedId(null);
          if (status === "denied") {
            toast.success("Time off request denied");
            return;
          }
          // THE POINT OF THE WHOLE FEATURE. Somebody can be granted leave they
          // are still rostered to work, and the screen this replaced could not
          // see it — it had no roster to compare against.
          const clashes = decided.conflicts?.length ?? 0;
          toast.success("Time off request approved", {
            description:
              clashes > 0
                ? `Still rostered for ${clashes} shift${clashes === 1 ? "" : "s"} in that window — reassign or cancel ${clashes === 1 ? "it" : "them"}.`
                : undefined,
            duration: clashes > 0 ? 8000 : undefined,
          });
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  return (
    <div className="flex w-full min-w-0 flex-col p-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight">
            Time Off Requests
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
      <div className="mb-4 flex overflow-x-auto border-b">
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
      <div className="bg-card overflow-hidden rounded-xl border">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-muted/30">
                <tr className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  <th className="py-3 pr-3 pl-5 text-left">Name</th>
                  <th className="px-3 py-3 text-left">Department</th>
                  <th className="px-3 py-3 text-left">Type</th>
                  <th className="px-3 py-3 text-left">Dates</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="py-3 pr-5 pl-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    emp={staffById.get(req.employeeId)}
                    dept={departmentByStaff.get(req.employeeId)}
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
        ) : loading ? (
          // "No pending requests" while the list is still in flight is a claim
          // about the data, not a description of the screen.
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground flex flex-col items-center py-16 text-center">
            <CalendarOff className="mb-3 size-10 opacity-25" />
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
                  ? "All caught up — no time off to review."
                  : "Requests will appear here once submitted."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
