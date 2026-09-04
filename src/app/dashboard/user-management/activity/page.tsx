"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  Clock,
  Download,
  Eye,
  FileText,
  Globe,
  Lock,
  Shield,
  User,
} from "lucide-react";

import { auditLogQueries } from "@/lib/api/audit-log";
import {
  categoryOptions,
  buildAuditCsv,
  buildAuditEntries,
  EMPTY_FILTERS,
  filterEntries,
  memberOptions,
  type ActivityFilters,
  type TeamLogEntry,
} from "@/lib/api/team-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";

import { ActivityFilterBar } from "./_components/activity-filter-bar";
import { PageHeader } from "@/components/ui/page-header";

// ============================================================================
// The audit trail. One tab, because there was only ever one real source.
//
// ── WHAT WENT, AND WHY ────────────────────────────────────────────────────
//
// This page had three tabs. Two of them were fiction:
//
//   Activity Log   — buildActivityEntries(team), where `team` was the five
//                    invented people in src/data/admin-users.ts and each
//                    carried a hand-written activityLog.
//   Login History  — the same five people's loginHistory: invented IP
//                    addresses, devices and cities, presented in a security
//                    console as a record of who signed in from where.
//
// Neither had a source. Nothing in this system records a sign-in: WorkOS holds
// the authentication events and nothing ingests them, `audit_log.ip_address`
// and `user_agent` exist but every row has them null, and there is no table of
// per-person actions at all. So those tabs could not be repaired — only
// deleted or invented more convincingly.
//
// A fabricated login history is the worst of the three to leave standing. It is
// the screen somebody opens to answer "did an attacker sign in", and it would
// have answered confidently, with addresses and cities, about people who do not
// exist.
//
// ── WHAT STAYED ───────────────────────────────────────────────────────────
//
// The Audit Trail: public.audit_log, written only by triggers via
// private.record_audit, immutable at the database level for every role
// including the owner. It is small — the acts it records are the sensitive ones
// — and it is true.
//
// The filter bar and the CSV export carry over unchanged; both already worked
// over audit entries.
// ============================================================================

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

function TimeCell({ value }: { value: string }) {
  const d = new Date(value);
  return (
    <div className="text-sm">
      <div>{d.toLocaleDateString()}</div>
      <div className="text-muted-foreground text-xs">
        {d.toLocaleTimeString()}
      </div>
    </div>
  );
}

interface StatTileProps {
  title: string;
  icon: React.ElementType;
  value: number;
  hint: string;
  loading: boolean;
  tone?: string;
}

function StatTile({
  title,
  icon: Icon,
  value,
  hint,
  loading,
  tone,
}: StatTileProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="text-muted-foreground size-4" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <div className={`text-2xl font-bold ${tone ?? ""}`}>{value}</div>
        )}
        <p className="text-muted-foreground text-xs">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function AuditTrailPage() {
  const [filters, setFilters] = useState<ActivityFilters>(EMPTY_FILTERS);
  const [todayStr] = useState(() => new Date().toDateString());

  const { data, isPending, error } = useQuery(auditLogQueries.all());

  const audit = useMemo(() => buildAuditEntries(data ?? []), [data]);

  const members = useMemo(() => memberOptions(audit), [audit]);
  const categories = useMemo(() => categoryOptions(audit), [audit]);
  const filtered = useMemo(
    () => filterEntries(audit, filters),
    [audit, filters],
  );

  const today = audit.filter(
    (e) => new Date(e.timestamp).toDateString() === todayStr,
  ).length;
  const facilities = new Set(
    audit.map((e) => e.facilityName).filter(Boolean) as string[],
  ).size;
  const elevated = audit.filter(
    (e) => e.severity === "High" || e.severity === "Critical",
  ).length;

  const columns: ColumnDef<TeamLogEntry>[] = [
    {
      key: "timestamp",
      label: "Timestamp",
      icon: Clock,
      defaultVisible: true,
      sortable: true,
      sortValue: (e) => new Date(e.timestamp).getTime(),
      render: (e) => <TimeCell value={e.timestamp} />,
    },
    {
      key: "userName",
      label: "User",
      icon: User,
      defaultVisible: true,
      render: (e) => (
        <div>
          <div className="font-medium">{e.userName}</div>
          <div className="text-muted-foreground text-xs">{e.userRole}</div>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      icon: Activity,
      defaultVisible: true,
      render: (e) => <div className="font-medium">{e.action}</div>,
    },
    {
      key: "category",
      label: "Category",
      icon: FileText,
      defaultVisible: true,
      render: (e) => (
        <Badge variant="outline" className="text-xs">
          {e.category}
        </Badge>
      ),
    },
    { key: "target", label: "Target", icon: Eye, defaultVisible: true },
    {
      key: "facilityName",
      label: "Facility",
      icon: Globe,
      defaultVisible: true,
      render: (e) => e.facilityName ?? "—",
    },
    {
      key: "severity",
      label: "Severity",
      icon: AlertTriangle,
      defaultVisible: true,
      render: (e) =>
        e.severity ? <StatusBadge type="severity" value={e.severity} /> : null,
    },
    {
      key: "status",
      label: "Status",
      icon: Shield,
      defaultVisible: true,
      render: (e) =>
        e.status ? <StatusBadge type="status" value={e.status} /> : null,
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Audit trail"
        description="Every sensitive act recorded against the platform, written by the database itself"
      />

      {error && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {(error as Error).message}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatTile
          title="Entries"
          icon={Shield}
          value={audit.length}
          hint="Recorded since the trail began"
          loading={isPending}
        />
        <StatTile
          title="Today"
          icon={CalendarClock}
          value={today}
          hint="Entries recorded today"
          loading={isPending}
        />
        <StatTile
          title="Facilities touched"
          icon={Building2}
          value={facilities}
          hint="Distinct businesses affected"
          loading={isPending}
        />
        <StatTile
          title="High or critical"
          icon={AlertTriangle}
          value={elevated}
          hint="Entries above medium severity"
          loading={isPending}
          tone={elevated > 0 ? "text-amber-600" : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex items-center gap-2 text-sm">
          <Lock className="size-4 text-amber-600 dark:text-amber-400" />
          <span className="text-amber-800 dark:text-amber-300">
            Read-only · Append-only — audit entries can never be edited or
            deleted, by any role.
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={filtered.length === 0}
          onClick={() =>
            downloadCsv(
              `audit_trail_${todayStr.replace(/\s+/g, "_")}.csv`,
              buildAuditCsv(filtered),
            )
          }
        >
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      <ActivityFilterBar
        filters={filters}
        onChange={setFilters}
        members={members}
        categories={categories}
      />

      <DataTable
        data={filtered}
        columns={columns}
        searchKey="userName"
        searchPlaceholder="Quick search by user…"
        itemsPerPage={10}
        emptyState={{
          pose: "reviewing",
          icon: Shield,
          title:
            audit.length === 0
              ? "No audit entries yet"
              : "No entries match those filters",
          description:
            audit.length === 0
              ? "Sensitive acts — suspending a business, granting a platform role, changing a subscription — are recorded here as they happen."
              : "Clear a filter to widen the search.",
        }}
      />
    </div>
  );
}
