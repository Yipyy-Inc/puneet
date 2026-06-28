"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Download,
  Eye,
  FileText,
  Globe,
  History,
  Lock,
  Monitor,
  Shield,
  User,
} from "lucide-react";

import { useAdminTeam } from "@/lib/admin-team-store";
import {
  actionTypeOptions,
  buildActivityEntries,
  buildAuditCsv,
  buildAuditEntries,
  buildLoginEntries,
  EMPTY_FILTERS,
  filterEntries,
  memberOptions,
  type ActivityFilters,
  type TeamLogEntry,
} from "@/lib/api/team-activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { cn } from "@/lib/utils";

import { ActivityFilterBar } from "./_components/activity-filter-bar";

const tabs = [
  { id: "activity", name: "Activity Log", icon: Activity },
  { id: "logins", name: "Login History", icon: History },
  { id: "audit", name: "Audit Trail", icon: Shield },
];

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function UserCell({ entry }: { entry: TeamLogEntry }) {
  return (
    <div>
      <div className="font-medium">{entry.userName}</div>
      <div className="text-muted-foreground text-xs">{entry.userRole}</div>
    </div>
  );
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

export default function ActivityTrackingPage() {
  const team = useAdminTeam();
  const [activeTab, setActiveTab] = useState("activity");
  const [filters, setFilters] = useState<ActivityFilters>(EMPTY_FILTERS);
  const [todayStr] = useState(() => new Date().toDateString());

  const activity = useMemo(() => buildActivityEntries(team), [team]);
  const logins = useMemo(() => buildLoginEntries(team), [team]);
  const audit = useMemo(() => buildAuditEntries(), []);

  const members = useMemo(
    () => memberOptions(activity, logins, audit),
    [activity, logins, audit],
  );
  const actionTypes = useMemo(
    () => actionTypeOptions(activity, logins, audit),
    [activity, logins, audit],
  );

  const fActivity = useMemo(
    () => filterEntries(activity, filters),
    [activity, filters],
  );
  const fLogins = useMemo(
    () => filterEntries(logins, filters),
    [logins, filters],
  );
  const fAudit = useMemo(() => filterEntries(audit, filters), [audit, filters]);

  const todayLogins = logins.filter(
    (l) => new Date(l.timestamp).toDateString() === todayStr,
  ).length;
  const uniqueLocations = new Set(logins.map((l) => l.location).filter(Boolean))
    .size;

  const activityColumns: ColumnDef<TeamLogEntry>[] = [
    {
      key: "userName",
      label: "Name",
      icon: User,
      defaultVisible: true,
      render: (e) => <UserCell entry={e} />,
    },
    {
      key: "action",
      label: "Action",
      icon: Activity,
      defaultVisible: true,
      render: (e) => <div className="font-medium">{e.action}</div>,
    },
    {
      key: "actionType",
      label: "Type",
      icon: FileText,
      defaultVisible: true,
      render: (e) => (
        <Badge variant="outline" className="text-xs">
          {e.actionType}
        </Badge>
      ),
    },
    { key: "target", label: "Target", icon: Eye, defaultVisible: true },
    {
      key: "details",
      label: "Details",
      icon: FileText,
      defaultVisible: true,
      render: (e) => (
        <div className="text-muted-foreground max-w-[220px] truncate text-sm">
          {e.details}
        </div>
      ),
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
      key: "timestamp",
      label: "Timestamp",
      icon: Clock,
      defaultVisible: true,
      sortable: true,
      sortValue: (e) => new Date(e.timestamp).getTime(),
      render: (e) => <TimeCell value={e.timestamp} />,
    },
  ];

  const loginColumns: ColumnDef<TeamLogEntry>[] = [
    {
      key: "userName",
      label: "Name",
      icon: User,
      defaultVisible: true,
      render: (e) => <UserCell entry={e} />,
    },
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
      key: "ip",
      label: "IP Address",
      icon: Globe,
      defaultVisible: true,
      render: (e) => (
        <code className="bg-muted rounded-sm px-2 py-1 text-xs">{e.ip}</code>
      ),
    },
    {
      key: "device",
      label: "Device",
      icon: Monitor,
      defaultVisible: true,
      render: (e) => (
        <Badge variant="outline" className="text-xs">
          {e.device}
        </Badge>
      ),
    },
    { key: "location", label: "Location", icon: Globe, defaultVisible: true },
  ];

  const auditColumns: ColumnDef<TeamLogEntry>[] = [
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
      render: (e) => <UserCell entry={e} />,
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

  const renderTabContent = () => {
    switch (activeTab) {
      case "activity":
        return (
          <DataTable
            key="activity"
            data={fActivity}
            columns={activityColumns}
            searchKey="userName"
            searchPlaceholder="Quick search by name…"
            itemsPerPage={10}
            emptyState={{
              icon: Activity,
              title: "No activity recorded",
              description:
                "Admin user actions will appear here as they happen.",
            }}
          />
        );
      case "logins":
        return (
          <DataTable
            key="logins"
            data={fLogins}
            columns={loginColumns}
            searchKey="userName"
            searchPlaceholder="Quick search by name…"
            itemsPerPage={10}
            emptyState={{
              icon: History,
              title: "No login history",
              description: "Admin sign-in sessions will be listed here.",
            }}
          />
        );
      case "audit":
        return (
          <div className="space-y-3">
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
                onClick={() =>
                  downloadCsv(
                    `audit_trail_${todayStr.replace(/\s+/g, "_")}.csv`,
                    buildAuditCsv(fAudit),
                  )
                }
              >
                <Download className="mr-2 size-4" />
                Export CSV
              </Button>
            </div>
            <DataTable
              key="audit"
              data={fAudit}
              columns={auditColumns}
              searchKey="userName"
              searchPlaceholder="Quick search by user…"
              itemsPerPage={10}
              emptyState={{
                icon: Shield,
                title: "No audit entries",
                description:
                  "Security-relevant events recorded to the immutable audit trail will appear here.",
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="bg-muted/50 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="px-6 py-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {"Activity Tracking"}
            </h2>
            <p className="text-muted-foreground mt-1">
              Monitor admin user actions, login history, and the immutable audit
              trail
            </p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  "hover:bg-muted/50",
                  isActive
                    ? "border-primary bg-background text-primary border-b-2"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex-1 space-y-6 p-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Actions
              </CardTitle>
              <Activity className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activity.length}</div>
              <p className="text-muted-foreground text-xs">
                Across all admin users
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Audit Entries
              </CardTitle>
              <Shield className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audit.length}</div>
              <p className="text-muted-foreground text-xs">
                Immutable audit trail
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Today&apos;s Logins
              </CardTitle>
              <History className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {todayLogins}
              </div>
              <p className="text-muted-foreground text-xs">
                Login sessions today
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unique Locations
              </CardTitle>
              <Globe className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueLocations}</div>
              <p className="text-muted-foreground text-xs">Access locations</p>
            </CardContent>
          </Card>
        </div>

        {/* Search + filter bar */}
        <ActivityFilterBar
          filters={filters}
          onChange={setFilters}
          members={members}
          actionTypes={actionTypes}
        />

        {renderTabContent()}
      </div>
    </div>
  );
}
