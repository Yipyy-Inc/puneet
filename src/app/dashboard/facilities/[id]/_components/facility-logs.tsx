"use client";

import { useQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/badge";
import type { AuditLogEntry } from "@/lib/api/audit-log";

// ============================================================================
// What has happened at this facility, and who did it.
//
// The first of the five "nothing stores this yet" tabs to get a real source.
// Until today there was no activity table at all; `audit_log` now records
// provisioning, subscription-status changes, invitations, access grants and
// removals, with the actor taken from the JWT rather than from an argument.
//
// ── AN EMPTY LOG IS TWO DIFFERENT ANSWERS ─────────────────────────────────
//
// "Nothing has happened here" and "we were not recording then" look identical
// on screen and mean completely different things — the second is the normal
// state for every facility provisioned before the trail existed. So the empty
// state says which one it is, using the date the first entry anywhere was
// written.
//
// ── READ-ONLY, WITH NO ACTIONS, ON PURPOSE ────────────────────────────────
//
// No edit, no delete, no "clear log" — the database refuses all three for every
// role including the table owner. A button that would raise 42501 is worse than
// no button.
// ============================================================================

interface LogsResponse {
  entries: AuditLogEntry[];
  recordingSince: string | null;
}

const SEVERITY_TONE: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  High: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  Medium: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  Low: "bg-muted text-muted-foreground",
};

function when(timestamp: string): string {
  // Fixed locale and UTC: this renders on the client, and formatting to the
  // viewer's locale is a hydration mismatch. An audit trail wants one
  // unambiguous reading anyway.
  return new Date(timestamp)
    .toISOString()
    .replace("T", " ")
    .slice(0, 16)
    .concat(" UTC");
}

const columns: ColumnDef<AuditLogEntry>[] = [
  {
    key: "timestamp",
    label: "When",
    sortable: true,
    render: (entry) => (
      <span className="text-muted-foreground whitespace-nowrap tabular-nums">
        {when(entry.timestamp)}
      </span>
    ),
  },
  {
    key: "action",
    label: "What happened",
    sortable: true,
    render: (entry) => (
      <div className="min-w-0">
        <p className="font-medium">{entry.action}</p>
        {entry.description && (
          <p className="text-muted-foreground truncate text-xs">
            {entry.description}
          </p>
        )}
      </div>
    ),
  },
  {
    key: "userName",
    label: "Who",
    sortable: true,
    render: (entry) => (
      <span
        className={entry.userId === "system" ? "text-muted-foreground" : ""}
      >
        {entry.userName}
      </span>
    ),
  },
  {
    key: "severity",
    label: "Severity",
    sortable: true,
    render: (entry) => (
      <Badge
        variant="secondary"
        className={SEVERITY_TONE[entry.severity] ?? SEVERITY_TONE.Low}
      >
        {entry.severity}
      </Badge>
    ),
  },
  { key: "category", label: "Category", sortable: true },
];

export function FacilityLogs({ facilityId }: { facilityId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "facility", facilityId, "logs"],
    queryFn: async (): Promise<LogsResponse> => {
      const response = await fetch(`/api/facilities/${facilityId}/logs`);
      if (!response.ok) throw new Error("Could not load this facility's log.");
      return (await response.json()) as LogsResponse;
    },
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading activity…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-destructive p-6 text-sm">
        Could not load this facility&apos;s log. Try again.
      </p>
    );
  }

  const since = data.recordingSince?.slice(0, 10) ?? null;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Every entry here is permanent — the database refuses to change or delete
        one, for anybody.
        {since && ` Recording began on ${since}.`}
      </p>

      <DataTable
        data={data.entries}
        columns={columns}
        searchKeys={["action", "userName", "description"]}
        searchPlaceholder="Search this facility's activity…"
        filters={[
          {
            key: "severity",
            label: "Severity",
            options: [
              { value: "Critical", label: "Critical" },
              { value: "High", label: "High" },
              { value: "Medium", label: "Medium" },
              { value: "Low", label: "Low" },
            ],
          },
        ]}
        emptyState={{
          icon: History,
          title: since
            ? "Nothing recorded for this facility"
            : "Recording has not started",
          description: since
            ? `The trail has been running since ${since}. Anything that happened here before that date was not recorded — this is not the same as nothing having happened.`
            : "No activity has been recorded anywhere yet. Entries appear as soon as something happens.",
        }}
      />
    </div>
  );
}
