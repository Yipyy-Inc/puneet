"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type ColumnDef } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppLocale } from "@/hooks/use-app-locale";
import { auditLogQueries, type AuditLogEntry } from "@/lib/api/audit-log";
import { downloadReportCsv } from "@/lib/report-export";

// ============================================================================
// THE AUDIT TRAIL — THE REAL ONE.
//
// This screen listed `auditLog` from `src/data/system-administration.ts`, and
// its "Export Log" button had no `onClick` at all: not a stub, not a TODO, a
// control that looked live and did nothing.
//
// Meanwhile `/api/audit-log` reads `public.audit_log` — rows written by
// triggers through `private.record_audit()`, which has EXECUTE revoked from
// `authenticated`, so nothing a caller sends can forge a line — and
// `auditLogQueries` was already serving five other screens.
//
// ── SCOPED BY RLS, NOT BY THIS FILE ──────────────────────────────────────
//
// `audit_log_facility_read` admits a facility admin to rows carrying their own
// facility_id. No `.eq()` here, deliberately: a filter written in TypeScript is
// a second opinion about the boundary, and it is the one that drifts. A groomer
// asking gets an empty array, which is the truthful answer to "what may I see".
//
// ── EXPORT WRITES WHAT IS ON SCREEN ──────────────────────────────────────
//
// The same rows, in the same order, through the helper the reports already use.
// Not a server-side export: there is no endpoint for one, and adding a second
// read path over an authorisation-sensitive table to save a round trip is a
// poor trade.
// ============================================================================

/** One line per change, so a multi-field edit is not one unreadable cell. */
function changeLines(entry: AuditLogEntry): string {
  return entry.changes
    .map((c) => `${c.field}: ${c.oldValue ?? "—"} → ${c.newValue ?? "—"}`)
    .join("; ");
}

export function AuditSection() {
  // The viewer's own locale, never a literal (§5q). French time is `14 h 30`,
  // and `Intl` is the only thing that knows that.
  const locale = useAppLocale();
  const { data, isPending, isError, error } = useQuery(auditLogQueries.all());

  const stamp = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      accessorKey: "timestamp",
      header: "Date & time",
      cell: ({ row }) => (
        <div className="text-sm tabular-nums">
          {stamp(row.original.timestamp)}
        </div>
      ),
    },
    { accessorKey: "userName", header: "User" },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.action}
        </Badge>
      ),
    },
    { accessorKey: "entityType", header: "Area" },
    { accessorKey: "entityName", header: "Record" },
    {
      accessorKey: "changes",
      header: "Changes",
      cell: ({ row }) => (
        <div className="text-sm">{changeLines(row.original) || "—"}</div>
      ),
    },
  ];

  const exportCsv = () => {
    if (!data?.length) return;
    downloadReportCsv("audit-log", [
      ["Date & time", "User", "Action", "Area", "Record", "Changes"],
      ...data.map((e) => [
        stamp(e.timestamp),
        e.userName,
        e.action,
        e.entityType,
        e.entityName,
        changeLines(e),
      ]),
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Audit log</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Every change to this facility&rsquo;s records, and who made it.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={exportCsv}
            disabled={isPending || !data?.length}
          >
            <Download className="mr-2 size-4" />
            Export log
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-64 w-full rounded-lg" />
        ) : isError ? (
          <p className="text-destructive text-sm">
            {error instanceof Error
              ? error.message
              : "Could not read the audit trail."}
          </p>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            searchColumn="entityName"
            searchPlaceholder="Search the audit log..."
          />
        )}
      </CardContent>
    </Card>
  );
}
