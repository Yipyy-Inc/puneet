"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  CalendarPlus,
  CalendarCog,
  CalendarMinus,
  UserPlus,
  UserMinus,
  Send,
  Megaphone,
  Sparkles,
  Trash2,
  Move,
  Copy,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  Filter,
  User,
  Bot,
  Briefcase,
} from "lucide-react";
import {
  getScheduleAuditLog,
  type ScheduleAuditEntry,
  type ScheduleAuditAction,
} from "@/lib/schedule-audit";
import { departments as allDepartments } from "@/data/scheduling";

// ─── helpers ──────────────────────────────────────────

const ACTION_META: Record<
  ScheduleAuditAction,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  shift_created: {
    label: "Shift Created",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <CalendarPlus className="size-4 text-emerald-600" />,
  },
  shift_updated: {
    label: "Shift Updated",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: <CalendarCog className="size-4 text-amber-600" />,
  },
  shift_deleted: {
    label: "Shift Deleted",
    color: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
    icon: <Trash2 className="size-4 text-rose-600" />,
  },
  shift_assigned: {
    label: "Shift Assigned",
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    icon: <UserPlus className="size-4 text-indigo-600" />,
  },
  shift_unassigned: {
    label: "Shift Unassigned",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    icon: <UserMinus className="size-4 text-orange-600" />,
  },
  shift_moved: {
    label: "Shift Moved",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    icon: <Move className="size-4 text-violet-600" />,
  },
  shift_copied: {
    label: "Shift Copied",
    color: "text-sky-700",
    bg: "bg-sky-50 border-sky-200",
    icon: <Copy className="size-4 text-sky-600" />,
  },
  schedule_published: {
    label: "Schedule Published",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <Send className="size-4 text-emerald-600" />,
  },
  draft_discarded: {
    label: "Draft Discarded",
    color: "text-slate-700",
    bg: "bg-slate-50 border-slate-200",
    icon: <CalendarMinus className="size-4 text-slate-600" />,
  },
  open_shift_posted: {
    label: "Open Shift Posted",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: <Megaphone className="size-4 text-amber-600" />,
  },
  open_shift_claimed: {
    label: "Open Shift Claimed",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <Sparkles className="size-4 text-emerald-600" />,
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

function getDescription(entry: ScheduleAuditEntry): string {
  const actor = entry.actorName ?? "Staff";
  switch (entry.action) {
    case "shift_created":
      return `${actor} created a shift for ${entry.employeeName ?? "an open slot"} on ${entry.shiftDate}`;
    case "shift_updated":
      return `${actor} updated ${entry.employeeName ?? "open"} shift (${entry.changes?.length ?? 0} field${(entry.changes?.length ?? 0) === 1 ? "" : "s"})`;
    case "shift_deleted":
      return `${actor} deleted ${entry.employeeName ?? "open"} shift on ${entry.shiftDate}`;
    case "shift_assigned":
      return `${actor} assigned shift to ${entry.employeeName ?? "an employee"}`;
    case "shift_unassigned":
      return `${actor} removed ${entry.previousEmployeeName ?? "employee"} — shift is now open`;
    case "shift_moved":
      return `${actor} moved shift${entry.previousEmployeeName ? ` from ${entry.previousEmployeeName}` : ""}${entry.employeeName ? ` to ${entry.employeeName}` : ""}`;
    case "shift_copied":
      return `${actor} duplicated a shift on ${entry.shiftDate}`;
    case "schedule_published":
      return `${actor} published ${entry.count ?? 0} shift${entry.count === 1 ? "" : "s"} for ${entry.departmentName}`;
    case "draft_discarded":
      return `${actor} discarded ${entry.count ?? 0} draft shift${entry.count === 1 ? "" : "s"}`;
    case "open_shift_posted":
      return `${actor} posted an open shift for ${entry.positionName ?? "a position"} on ${entry.shiftDate}`;
    case "open_shift_claimed":
      return `${actor} claimed an open shift on ${entry.shiftDate}`;
    default:
      return "";
  }
}

// ─── detail sub-components ────────────────────────────

function ChangesTable({
  changes,
}: {
  changes: { field: string; oldValue: string; newValue: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40">
            <th className="text-muted-foreground p-2 text-left font-medium">
              Field
            </th>
            <th className="text-muted-foreground p-2 text-left font-medium">
              Before
            </th>
            <th className="text-muted-foreground p-2 text-left font-medium">
              After
            </th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c, i) => (
            <tr key={i} className="border-t">
              <td className="p-2 font-medium">{c.field}</td>
              <td className="text-muted-foreground p-2">
                {c.oldValue || (
                  <span className="text-muted-foreground/50 italic">empty</span>
                )}
              </td>
              <td className="text-foreground p-2 font-medium">{c.newValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── single audit row ─────────────────────────────────

function AuditRow({ entry }: { entry: ScheduleAuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[entry.action];
  const hasDetail =
    (entry.changes && entry.changes.length > 0) ||
    entry.shiftId !== undefined ||
    entry.count !== undefined;

  return (
    <div
      className={`rounded-lg border transition-all ${
        expanded ? meta.bg : `bg-background hover:bg-muted/30`
      }`}
    >
      <button
        type="button"
        onClick={() => hasDetail && setExpanded(!expanded)}
        className={`flex w-full items-start gap-3 p-3 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
      >
        {/* timeline dot */}
        <div className={`mt-0.5 shrink-0 rounded-full border p-1.5 ${meta.bg}`}>
          {meta.icon}
        </div>

        {/* content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] ${meta.color} border-current/20`}
            >
              {meta.label}
            </Badge>
            {entry.departmentName && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Briefcase className="size-2.5" />
                {entry.departmentName}
              </Badge>
            )}
            <span className="text-muted-foreground text-xs">
              {formatRelative(entry.timestamp)}
            </span>
          </div>
          <p className="mt-1 text-sm font-medium">
            {entry.positionName
              ? `${entry.positionName}${entry.shiftTimeRange ? ` · ${entry.shiftTimeRange}` : ""}`
              : entry.action === "schedule_published"
                ? `${entry.count ?? 0} shifts published`
                : entry.action === "draft_discarded"
                  ? `${entry.count ?? 0} drafts discarded`
                  : entry.shiftDate ?? "Schedule change"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {getDescription(entry)}
          </p>
        </div>

        {/* actor chip */}
        <div className="text-muted-foreground mt-0.5 flex shrink-0 items-center gap-1.5 text-xs">
          {entry.actorType === "employee" ? (
            <User className="size-3" />
          ) : entry.actorType === "system" ? (
            <Bot className="size-3" />
          ) : (
            <Shield className="size-3" />
          )}
          <span className="hidden sm:inline">
            {entry.actorName ?? String(entry.actorId ?? "System")}
          </span>
        </div>

        {/* expand chevron */}
        {hasDetail && (
          <div className="text-muted-foreground mt-1 shrink-0">
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </div>
        )}
      </button>

      {expanded && (
        <div className="space-y-3 px-3 pb-3 pl-12">
          <Separator />

          {/* Field changes table */}
          {entry.changes && entry.changes.length > 0 && (
            <div className="space-y-2">
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <span>
                  {entry.changes.length} field
                  {entry.changes.length === 1 ? "" : "s"} changed
                </span>
              </div>
              <ChangesTable changes={entry.changes} />
            </div>
          )}

          {/* Shift detail */}
          {entry.shiftId &&
            (entry.shiftDate ||
              entry.shiftTimeRange ||
              entry.employeeName) && (
              <div className="text-muted-foreground space-y-1 text-xs">
                {entry.shiftId && (
                  <p>
                    Shift ID:{" "}
                    <span className="text-foreground font-mono font-medium">
                      {entry.shiftId}
                    </span>
                  </p>
                )}
                {entry.shiftDate && (
                  <p>
                    Date:{" "}
                    <span className="text-foreground font-medium">
                      {entry.shiftDate}
                    </span>
                    {entry.shiftTimeRange && (
                      <>
                        {" · "}
                        <span className="text-foreground font-medium">
                          {entry.shiftTimeRange}
                        </span>
                      </>
                    )}
                  </p>
                )}
                {entry.employeeName && (
                  <p>
                    Employee:{" "}
                    <span className="text-foreground font-medium">
                      {entry.employeeName}
                    </span>
                  </p>
                )}
                {entry.previousEmployeeName && (
                  <p>
                    Previously assigned to:{" "}
                    <span className="text-foreground font-medium">
                      {entry.previousEmployeeName}
                    </span>
                  </p>
                )}
                <p>
                  At: {formatDate(entry.timestamp)} ·{" "}
                  {formatTime(entry.timestamp)}
                </p>
              </div>
            )}

          {/* Bulk action detail */}
          {entry.count !== undefined && !entry.shiftId && (
            <div className="text-muted-foreground space-y-1 text-xs">
              <p>
                Affected:{" "}
                <span className="text-foreground font-medium">
                  {entry.count} shift{entry.count === 1 ? "" : "s"}
                </span>
              </p>
              {entry.metadata &&
                Boolean((entry.metadata as Record<string, unknown>).weekStart) && (
                  <p>
                    Week starting:{" "}
                    <span className="text-foreground font-medium">
                      {String(
                        (entry.metadata as Record<string, unknown>).weekStart,
                      )}
                    </span>
                  </p>
                )}
              <p>
                At: {formatDate(entry.timestamp)} ·{" "}
                {formatTime(entry.timestamp)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────

interface ScheduleAuditTrailProps {
  facilityId?: number;
}

export function ScheduleAuditTrail({
  facilityId = 11,
}: ScheduleAuditTrailProps) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const allEntries = useMemo(
    () => getScheduleAuditLog({ facilityId }),
    [facilityId],
  );

  const filtered = useMemo(() => {
    let list = allEntries;
    if (actionFilter !== "all")
      list = list.filter((e) => e.action === actionFilter);
    if (deptFilter !== "all")
      list = list.filter((e) => e.departmentId === deptFilter);
    return list;
  }, [allEntries, actionFilter, deptFilter]);

  // Stats
  const publishCount = allEntries.filter(
    (e) => e.action === "schedule_published",
  ).length;
  const shiftChangeCount = allEntries.filter((e) =>
    [
      "shift_created",
      "shift_updated",
      "shift_deleted",
      "shift_moved",
      "shift_copied",
    ].includes(e.action),
  ).length;
  const assignmentCount = allEntries.filter((e) =>
    ["shift_assigned", "shift_unassigned"].includes(e.action),
  ).length;
  const openShiftCount = allEntries.filter((e) =>
    ["open_shift_posted", "open_shift_claimed"].includes(e.action),
  ).length;

  const stats = [
    {
      label: "Publishes",
      count: publishCount,
      icon: <Send className="size-4 text-emerald-500" />,
      bg: "bg-emerald-50",
    },
    {
      label: "Shift Changes",
      count: shiftChangeCount,
      icon: <CalendarCog className="size-4 text-amber-500" />,
      bg: "bg-amber-50",
    },
    {
      label: "Assignments",
      count: assignmentCount,
      icon: <UserPlus className="size-4 text-indigo-500" />,
      bg: "bg-indigo-50",
    },
    {
      label: "Open Shifts",
      count: openShiftCount,
      icon: <Megaphone className="size-4 text-orange-500" />,
      bg: "bg-orange-50",
    },
  ];

  // Group by date for timeline effect
  const groupedByDate = useMemo(() => {
    const groups: { date: string; entries: ScheduleAuditEntry[] }[] = [];
    let currentDate = "";
    for (const entry of filtered) {
      const d = formatDate(entry.timestamp);
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, entries: [] });
      }
      groups[groups.length - 1].entries.push(entry);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Shield className="text-primary size-5" />
          <h2 className="text-2xl font-bold">Schedule Audit Trail</h2>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Complete compliance log — every shift change, publish, assignment, and
          open-shift claim.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2 ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-muted-foreground text-xs">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <Filter className="size-4" />
              <span className="font-medium">Filters</span>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="schedule_published">
                  Schedule Published
                </SelectItem>
                <SelectItem value="shift_created">Shift Created</SelectItem>
                <SelectItem value="shift_updated">Shift Updated</SelectItem>
                <SelectItem value="shift_deleted">Shift Deleted</SelectItem>
                <SelectItem value="shift_moved">Shift Moved</SelectItem>
                <SelectItem value="shift_copied">Shift Copied</SelectItem>
                <SelectItem value="shift_assigned">Shift Assigned</SelectItem>
                <SelectItem value="shift_unassigned">
                  Shift Unassigned
                </SelectItem>
                <SelectItem value="open_shift_posted">
                  Open Shift Posted
                </SelectItem>
                <SelectItem value="open_shift_claimed">
                  Open Shift Claimed
                </SelectItem>
                <SelectItem value="draft_discarded">Draft Discarded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {allDepartments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(actionFilter !== "all" || deptFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setActionFilter("all");
                  setDeptFilter("all");
                }}
              >
                Clear filters
              </Button>
            )}
            <div className="text-muted-foreground ml-auto text-xs">
              {filtered.length} event{filtered.length === 1 ? "" : "s"}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="text-muted-foreground mx-auto mb-3 size-8" />
            <p className="text-muted-foreground font-medium">
              No audit events
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {actionFilter !== "all" || deptFilter !== "all"
                ? "Try adjusting your filters"
                : "Events will appear here as the schedule changes"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map((group) => (
            <div key={group.date}>
              <div className="mb-3 flex items-center gap-3">
                <div className="bg-border h-px flex-1" />
                <span className="text-muted-foreground shrink-0 text-xs font-medium">
                  {group.date}
                </span>
                <div className="bg-border h-px flex-1" />
              </div>
              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
