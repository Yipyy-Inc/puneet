"use client";

import { useMemo, useState } from "react";
import {
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Award,
  Shield,
  CreditCard,
  FileText,
  File,
  Heart,
  UserCheck,
  User,
  Calendar,
  Users,
  Eye,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { employeeFiles } from "@/data/employee-files";
import { facilityStaff } from "@/data/facility-staff";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { ROLE_META } from "@/types/facility-staff";
import type { EmployeeDocument, EmployeeDocType } from "@/types/scheduling";

// ── Type metadata ─────────────────────────────────────────────────────────────

const TYPE_META: Record<
  EmployeeDocType,
  { label: string; icon: React.ElementType; bg: string; text: string }
> = {
  work_permit: {
    label: "Work Permit",
    icon: Shield,
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
  },
  id_document: {
    label: "ID Document",
    icon: CreditCard,
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  },
  certification: {
    label: "Certification",
    icon: Award,
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  contract: {
    label: "Contract",
    icon: FileText,
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  tax_form: {
    label: "Tax Form",
    icon: File,
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
  },
  emergency_contact: {
    label: "Emergency Contact",
    icon: UserCheck,
    bg: "bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
  },
  health_record: {
    label: "Health Record",
    icon: Heart,
    bg: "bg-pink-500/10",
    text: "text-pink-600 dark:text-pink-400",
  },
  other: {
    label: "Other",
    icon: File,
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isExpired(date?: string): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

function isExpiringSoon(date?: string): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > 0 && diffDays <= 90;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", { dateStyle: "medium" });
}

// ── Types ─────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "valid" | "expiring" | "expired";

type EmployeeGroup = {
  id: string;
  name: string;
  avatarUrl?: string;
  roleLabel: string;
  docs: EmployeeDocument[];
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StaffDocumentsPage() {
  const { can, viewer, viewerId } = useFacilityRbac();
  const isManager = can("manage_staff");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<EmployeeDocType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  // ── Personal (non-manager) view ───────────────────────────────────────────
  if (!isManager) {
    const myDocs = employeeFiles.filter(
      (d) => d.employeeId === viewerId && d.visibleToEmployee,
    );
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/40 dark:bg-sky-950/30">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <div>
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">
              Your employee files
            </p>
            <p className="mt-0.5 text-xs text-sky-600/80 dark:text-sky-400/70">
              Documents your employer has shared with you. Contact your manager
              if you believe something is missing or incorrect.
            </p>
          </div>
        </div>

        {myDocs.length === 0 ? (
          <div className="border-border/60 flex flex-col items-center rounded-xl border border-dashed p-12 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <FolderOpen className="text-muted-foreground size-6 opacity-60" />
            </div>
            <p className="font-semibold">No documents shared yet</p>
            <p className="text-muted-foreground mt-1 max-w-xs text-sm">
              Your manager hasn&apos;t shared any documents with you yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {myDocs.map((doc) => (
              <DocRow key={doc.id} doc={doc} isManager={false} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Manager view (compliance dashboard) ──────────────────────────────────
  return <ComplianceDashboard
    search={search}
    setSearch={setSearch}
    typeFilter={typeFilter}
    setTypeFilter={setTypeFilter}
    statusFilter={statusFilter}
    setStatusFilter={setStatusFilter}
    expandedEmployee={expandedEmployee}
    setExpandedEmployee={setExpandedEmployee}
  />;
}

// ── Compliance dashboard (manager only) ───────────────────────────────────────

function ComplianceDashboard({
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  expandedEmployee,
  setExpandedEmployee,
}: {
  search: string;
  setSearch: (v: string) => void;
  typeFilter: EmployeeDocType | "all";
  setTypeFilter: (v: EmployeeDocType | "all") => void;
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  expandedEmployee: string | null;
  setExpandedEmployee: (v: string | null) => void;
}) {
  const allDocs = employeeFiles;

  const stats = useMemo(() => {
    const total = allDocs.length;
    const expired = allDocs.filter((d) => isExpired(d.expiresAt)).length;
    const expiring = allDocs.filter((d) => isExpiringSoon(d.expiresAt)).length;
    const employees = new Set(allDocs.map((d) => d.employeeId)).size;
    return { total, expired, expiring, employees };
  }, [allDocs]);

  const filtered = useMemo(() => {
    return allDocs.filter((d) => {
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (statusFilter === "expired" && !isExpired(d.expiresAt)) return false;
      if (statusFilter === "expiring" && !isExpiringSoon(d.expiresAt)) return false;
      if (statusFilter === "valid") {
        if (isExpired(d.expiresAt) || isExpiringSoon(d.expiresAt)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (
          !d.name.toLowerCase().includes(q) &&
          !d.employeeName.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [allDocs, typeFilter, statusFilter, search]);

  const groupedByEmployee = useMemo<EmployeeGroup[]>(() => {
    const map = new Map<string, EmployeeGroup>();
    for (const doc of filtered) {
      if (!map.has(doc.employeeId)) {
        const staff = facilityStaff.find((s) => s.id === doc.employeeId);
        map.set(doc.employeeId, {
          id: doc.employeeId,
          name: doc.employeeName,
          avatarUrl: staff?.avatarUrl,
          roleLabel: staff ? ROLE_META[staff.primaryRole].label : "Staff",
          docs: [],
        });
      }
      map.get(doc.employeeId)!.docs.push(doc);
    }
    // Sort: most compliance issues first, then alphabetically
    return Array.from(map.values()).sort((a, b) => {
      const aUrgent = a.docs.filter(
        (d) => isExpired(d.expiresAt) || isExpiringSoon(d.expiresAt),
      ).length;
      const bUrgent = b.docs.filter(
        (d) => isExpired(d.expiresAt) || isExpiringSoon(d.expiresAt),
      ).length;
      return bUrgent - aUrgent || a.name.localeCompare(b.name);
    });
  }, [filtered]);

  const groupedByType = useMemo(() => {
    const map = new Map<EmployeeDocType, EmployeeDocument[]>();
    for (const doc of filtered) {
      if (!map.has(doc.type)) map.set(doc.type, []);
      map.get(doc.type)!.push(doc);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  return (
    <div className="space-y-5">
      {/* Compliance alert */}
      {(stats.expired > 0 || stats.expiring > 0) && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/30">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Compliance action required
            </p>
            <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/70">
              {stats.expired > 0 &&
                `${stats.expired} document${stats.expired !== 1 ? "s" : ""} have expired`}
              {stats.expired > 0 && stats.expiring > 0 && " · "}
              {stats.expiring > 0 &&
                `${stats.expiring} expiring within 90 days`}
              . Open the employee profile to upload renewed versions.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={FolderOpen}
          label="Total documents"
          value={stats.total}
          iconBg="bg-primary/10"
          iconClass="text-primary"
        />
        <StatCard
          icon={Users}
          label="Employees"
          value={stats.employees}
          iconBg="bg-indigo-500/10"
          iconClass="text-indigo-600 dark:text-indigo-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Expired"
          value={stats.expired}
          iconBg="bg-red-500/10"
          iconClass="text-red-600 dark:text-red-400"
        />
        <StatCard
          icon={Clock}
          label="Expiring ≤ 90 days"
          value={stats.expiring}
          iconBg="bg-amber-500/10"
          iconClass="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee or document…"
            className="h-9 pl-9"
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as EmployeeDocType | "all")}
        >
          <SelectTrigger className="h-9 w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {(Object.keys(TYPE_META) as EmployeeDocType[]).map((k) => (
              <SelectItem key={k} value={k}>
                {TYPE_META[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="bg-muted ml-auto flex rounded-md p-0.5">
          {(["all", "valid", "expiring", "expired"] as StatusFilter[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "inline-flex items-center rounded-sm px-3 py-1 text-xs font-medium capitalize transition-colors",
                  statusFilter === s
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Views */}
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">By Employee</TabsTrigger>
          <TabsTrigger value="types">By Type</TabsTrigger>
        </TabsList>

        {/* ── By Employee ── */}
        <TabsContent value="employees" className="mt-4">
          {groupedByEmployee.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {groupedByEmployee.map((group) => {
                const isExpanded = expandedEmployee === group.id;
                const expiredCount = group.docs.filter((d) =>
                  isExpired(d.expiresAt),
                ).length;
                const expiringCount = group.docs.filter((d) =>
                  isExpiringSoon(d.expiresAt),
                ).length;
                const initials = group.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2);

                return (
                  <Card key={group.id} className="overflow-hidden">
                    <button
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                      onClick={() =>
                        setExpandedEmployee(isExpanded ? null : group.id)
                      }
                    >
                      <Avatar className="size-8 shrink-0">
                        <AvatarImage
                          src={group.avatarUrl}
                          alt={group.name}
                        />
                        <AvatarFallback className="bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold">
                            {group.name}
                          </span>
                          {expiredCount > 0 && (
                            <Badge className="border-0 bg-red-500/10 text-[10px] text-red-600 dark:text-red-400">
                              <AlertTriangle className="mr-0.5 size-2.5" />{" "}
                              {expiredCount} expired
                            </Badge>
                          )}
                          {expiringCount > 0 && (
                            <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                              <Clock className="mr-0.5 size-2.5" />{" "}
                              {expiringCount} expiring
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {group.roleLabel} ·{" "}
                          {group.docs.length} document
                          {group.docs.length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      <span className="text-muted-foreground text-[10px]">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </button>

                    {isExpanded && (
                      <CardContent className="border-t px-3 pb-3 pt-2.5">
                        <div className="space-y-2">
                          {group.docs.map((doc) => (
                            <DocRow
                              key={doc.id}
                              doc={doc}
                              isManager={true}
                            />
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── By Type ── */}
        <TabsContent value="types" className="mt-4">
          {groupedByType.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {groupedByType.map(([type, docs]) => {
                const meta = TYPE_META[type];
                const Icon = meta.icon;
                const expiredInType = docs.filter((d) =>
                  isExpired(d.expiresAt),
                ).length;
                const expiringInType = docs.filter((d) =>
                  isExpiringSoon(d.expiresAt),
                ).length;

                return (
                  <Card key={type} className="overflow-hidden">
                    <div
                      className={cn(
                        "flex items-center gap-2.5 border-b px-4 py-2.5",
                        meta.bg,
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-md bg-white/40 dark:bg-black/20",
                        )}
                      >
                        <Icon className={cn("size-3.5", meta.text)} />
                      </div>
                      <span className={cn("text-sm font-semibold", meta.text)}>
                        {meta.label}
                      </span>
                      <Badge
                        variant="secondary"
                        className="ml-0.5 text-[10px]"
                      >
                        {docs.length}
                      </Badge>
                      {expiredInType > 0 && (
                        <Badge className="border-0 bg-red-500/10 text-[10px] text-red-600 dark:text-red-400">
                          {expiredInType} expired
                        </Badge>
                      )}
                      {expiringInType > 0 && (
                        <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                          {expiringInType} expiring
                        </Badge>
                      )}
                    </div>
                    <div className="divide-y">
                      {docs.map((doc) => (
                        <DocRow
                          key={doc.id}
                          doc={doc}
                          isManager={true}
                          showEmployee
                          flat
                        />
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── DocRow ─────────────────────────────────────────────────────────────────────

function DocRow({
  doc,
  isManager,
  showEmployee,
  flat,
}: {
  doc: EmployeeDocument;
  isManager: boolean;
  showEmployee?: boolean;
  /** Flat variant for grouped-by-type: no border box, no type badge, divide-y rows inside a Card */
  flat?: boolean;
}) {
  const meta = TYPE_META[doc.type];
  const Icon = meta.icon;
  const expired = isExpired(doc.expiresAt);
  const expiring = isExpiringSoon(doc.expiresAt);

  if (flat) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-medium">{doc.name}</span>
            {expired && (
              <Badge className="border-0 bg-red-500/10 text-[10px] text-red-600 dark:text-red-400">
                <AlertTriangle className="mr-0.5 size-2.5" /> Expired
              </Badge>
            )}
            {expiring && !expired && (
              <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
                <Clock className="mr-0.5 size-2.5" /> Expiring soon
              </Badge>
            )}
            {!expired && !expiring && doc.expiresAt && (
              <Badge className="border-0 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="mr-0.5 size-2.5" /> Valid
              </Badge>
            )}
          </div>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
            {showEmployee && (
              <span className="flex items-center gap-1">
                <User className="size-2.5" /> {doc.employeeName}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="size-2.5" /> Uploaded{" "}
              {formatDate(doc.uploadedAt)}
            </span>
            {doc.expiresAt && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  expired && "font-medium text-red-500 dark:text-red-400",
                  expiring &&
                    !expired &&
                    "font-medium text-amber-500 dark:text-amber-400",
                )}
              >
                Expires {formatDate(doc.expiresAt)}
              </span>
            )}
            {isManager && doc.visibleToEmployee && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Eye className="size-2.5" /> Visible to employee
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border/50 flex items-start gap-3 rounded-xl border p-3">
      <div
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
          meta.bg,
        )}
      >
        <Icon className={cn("size-4", meta.text)} />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold">{doc.name}</span>
          <Badge className={cn("border-0 text-[10px]", meta.bg, meta.text)}>
            {meta.label}
          </Badge>
          {expired && (
            <Badge className="border-0 bg-red-500/10 text-[10px] text-red-600 dark:text-red-400">
              <AlertTriangle className="mr-0.5 size-2.5" /> Expired
            </Badge>
          )}
          {expiring && !expired && (
            <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400">
              <Clock className="mr-0.5 size-2.5" /> Expiring soon
            </Badge>
          )}
          {!expired && !expiring && doc.expiresAt && (
            <Badge className="border-0 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="mr-0.5 size-2.5" /> Valid
            </Badge>
          )}
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px]">
          {showEmployee && (
            <span className="flex items-center gap-1">
              <User className="size-2.5" /> {doc.employeeName}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="size-2.5" /> Uploaded{" "}
            {formatDate(doc.uploadedAt)}
          </span>
          {doc.expiresAt && (
            <span
              className={cn(
                "flex items-center gap-1",
                expired && "font-medium text-red-500 dark:text-red-400",
                expiring &&
                  !expired &&
                  "font-medium text-amber-500 dark:text-amber-400",
              )}
            >
              Expires {formatDate(doc.expiresAt)}
            </span>
          )}
          {isManager && doc.visibleToEmployee && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Eye className="size-2.5" /> Visible to employee
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  iconBg: string;
  iconClass: string;
}) {
  return (
    <div className="border-border/60 bg-card flex items-center gap-3 rounded-xl border p-3">
      <div className={cn("rounded-lg p-2", iconBg)}>
        <Icon className={cn("size-4", iconClass)} />
      </div>
      <div>
        <div className="text-xl leading-none font-bold">{value}</div>
        <div className="text-muted-foreground mt-0.5 text-[11px]">{label}</div>
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="border-border/60 flex flex-col items-center rounded-xl border border-dashed p-12 text-center">
      <FolderOpen className="text-muted-foreground mb-3 size-10 opacity-30" />
      <p className="font-semibold">No documents match</p>
      <p className="text-muted-foreground mt-1 max-w-xs text-sm">
        Try adjusting filters or upload documents from individual employee
        profiles.
      </p>
    </div>
  );
}
