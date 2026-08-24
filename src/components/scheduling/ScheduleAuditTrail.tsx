"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarClock,
  ChevronDown,
  History,
  Search,
  Shield,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  auditLogQueries,
  type AuditLogEntry,
  type AuditSeverity,
} from "@/lib/api/audit-log";

// ============================================================================
// What actually happened to the roster.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `getScheduleAuditLog()` from `src/lib/schedule-audit.ts` — a module-level
// array holding a seeded history plus whatever the current browser tab had
// done. `ScheduleView` genuinely appended to it, against a roster that is real
// Postgres, so shifts moved and the record of who moved them died with the
// process. On serverless it was not even shared between two requests of the
// same session.
//
// Entries now come from `public.audit_log`, written by triggers on
// `staff_shifts`, `staff_time_off_requests` and `shift_swap_requests`
// (20260824200000). A trigger fires for every writer — including
// `apply_schedule_template`, which writes shifts directly and would have been
// invisible to any logger living in this app.
//
// ── THE FACILITY SCOPE IS NOT SET HERE ────────────────────────────────────
//
// There is no `facilityId` prop any more. This component used to take one and
// the page passed `facilityId={11}` — a hardcoded legacy number that meant
// every facility saw the same fixture. The rows are scoped by
// `audit_log_facility_read`, which admits a facility ADMIN to their own
// facility's entries. Asking the browser which facility it wants would be a
// filter wearing a boundary's clothes.
//
// ── AN EMPTY TRAIL IS A REAL ANSWER ───────────────────────────────────────
//
// Nothing is seeded. A facility that has not touched its roster since the
// triggers landed sees nothing, and the empty state says why rather than
// implying the screen is broken.
// ============================================================================

const SEVERITY_STYLE: Record<AuditSeverity, string> = {
  Low: "bg-slate-100 text-slate-700",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-orange-100 text-orange-800",
  Critical: "bg-red-100 text-red-800",
};

/** Actions the roster triggers produce, and how to draw each. */
const ACTION_ICON: Record<string, React.ElementType> = {
  "Shift created": CalendarClock,
  "Shift changed": CalendarClock,
  "Shift published": Shield,
  "Shift assigned": UserPlus,
  "Shift unassigned": UserMinus,
  "Shift deleted": UserMinus,
  "Shift swap approved": ArrowRightLeft,
  "Shift swap denied": ArrowRightLeft,
};

/** "assigned_to" reads badly in a column somebody scans. */
const FIELD_LABEL: Record<string, string> = {
  assigned_to: "Assigned to",
  starts_at: "Starts",
  ends_at: "Ends",
  status: "Status",
  position_id: "Position",
};

function when(timestamp: string): string {
  const at = new Date(timestamp);
  return at.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AuditRow({ entry }: { entry: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const Icon = ACTION_ICON[entry.action] ?? History;
  const hasDetail = entry.changes.length > 0;

  return (
    <div className="border-b last:border-b-0">
      <button
        type="button"
        disabled={!hasDetail}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-start gap-3 px-4 py-3 text-left",
          hasDetail && "hover:bg-muted/50",
        )}
      >
        <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{entry.action}</span>
            <Badge
              variant="secondary"
              className={cn("text-[10px]", SEVERITY_STYLE[entry.severity])}
            >
              {entry.severity}
            </Badge>
          </div>
          {entry.description && (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {entry.description}
            </p>
          )}
        </div>
        <div className="text-muted-foreground shrink-0 text-right text-xs">
          <div>{when(entry.timestamp)}</div>
          {/* "System" is the truthful reading of an act with no signed-in
              person behind it — a migration, a scheduled job — not a gap. */}
          <div>{entry.userName}</div>
        </div>
        {hasDetail && (
          <ChevronDown
            className={cn(
              "text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {open && hasDetail && (
        <div className="bg-muted/30 space-y-1 px-11 pb-3">
          {entry.changes.map((change) => (
            <div
              key={change.field}
              className="flex flex-wrap items-center gap-2 text-xs"
            >
              <span className="text-muted-foreground w-24 shrink-0">
                {FIELD_LABEL[change.field] ?? change.field}
              </span>
              <span className="text-muted-foreground line-through">
                {change.oldValue}
              </span>
              <span aria-hidden>→</span>
              <span className="font-medium">{change.newValue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScheduleAuditTrail() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const { data, isPending, isError, error } = useQuery(
    auditLogQueries.scheduling(),
  );

  const entries = useMemo<AuditLogEntry[]>(() => data ?? [], [data]);

  const actions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries],
  );

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (actionFilter !== "all" && entry.action !== actionFilter) return false;
      if (!needle) return true;
      return (
        entry.entityName.toLowerCase().includes(needle) ||
        entry.userName.toLowerCase().includes(needle) ||
        entry.description.toLowerCase().includes(needle)
      );
    });
  }, [entries, actionFilter, search]);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
          <History className="size-5" />
          Schedule Audit Trail
        </h2>
        <p className="text-muted-foreground text-sm">
          Every change to the roster, recorded by the database as it happened.
          Entries cannot be edited or removed by anyone.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-1">
          <Label htmlFor="audit-search" className="text-[11px] font-normal">
            Search
          </Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
            <Input
              id="audit-search"
              className="pl-8"
              placeholder="A person, or what changed"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-normal">Action</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {actions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-muted-foreground flex flex-col items-center py-16 text-center">
              <AlertTriangle className="mb-3 size-8 text-red-500 opacity-70" />
              <p>Could not read the audit trail.</p>
              <p className="mt-1 text-sm">
                {error instanceof Error ? error.message : "Please try again."}
              </p>
            </div>
          ) : shown.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center py-16 text-center">
              <History className="mb-3 size-8 opacity-50" />
              <p>
                {entries.length === 0
                  ? "Nothing recorded yet."
                  : "No entries match that."}
              </p>
              <p className="mt-1 max-w-sm text-sm">
                {entries.length === 0
                  ? "Changes to shifts, leave and swaps appear here as they are made. Nothing is seeded — an empty trail means nothing has changed."
                  : "Try a different action or clear the search."}
              </p>
            </div>
          ) : (
            <>
              {shown.map((entry) => (
                <AuditRow key={entry.id} entry={entry} />
              ))}
              {/* The route caps at 500. Saying so beats a list that silently
                  stops being the whole story. */}
              {entries.length >= 500 && (
                <p className="text-muted-foreground border-t px-4 py-2 text-xs">
                  Showing the 500 most recent entries.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
