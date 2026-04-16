"use client";

import { useMemo, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  Pencil,
  User,
  Calendar,
  MessageSquare,
  PenLine,
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
import {
  issuedWarnings as initialWarnings,
  warningTemplates as initialTemplates,
} from "@/data/facility-warnings";
import { facilityStaff } from "@/data/facility-staff";
import { WarningTemplateBuilder } from "../_components/warning-template-builder";
import {
  WARNING_TYPE_META,
  type IssuedWarning,
  type WarningTemplate,
  type WarningType,
} from "@/types/facility-warnings";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { dateStyle: "medium" });
}

type EmployeeGroup = {
  id: string;
  name: string;
  warnings: IssuedWarning[];
};

export default function StaffWarningsPage() {
  const { can, viewer } = useFacilityRbac();
  const isManager = can("manage_staff");

  const [warnings, setWarnings] = useState<IssuedWarning[]>(initialWarnings);
  const [templates, setTemplates] = useState<WarningTemplate[]>(initialTemplates);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<WarningType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<IssuedWarning["status"] | "all">("all");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WarningTemplate | undefined>();
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return warnings.filter((w) => {
      if (typeFilter !== "all" && w.type !== typeFilter) return false;
      if (statusFilter !== "all" && w.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!w.employeeName.toLowerCase().includes(q) && !w.reason.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [warnings, typeFilter, statusFilter, search]);

  const groupedByEmployee = useMemo<EmployeeGroup[]>(() => {
    const map = new Map<string, EmployeeGroup>();
    for (const w of filtered) {
      if (!map.has(w.employeeId)) {
        map.set(w.employeeId, { id: w.employeeId, name: w.employeeName, warnings: [] });
      }
      map.get(w.employeeId)!.warnings.push(w);
    }
    return Array.from(map.values()).sort((a, b) => b.warnings.length - a.warnings.length);
  }, [filtered]);

  const stats = useMemo(() => {
    const total = warnings.length;
    const pending = warnings.filter((w) => w.status === "pending_signature").length;
    const affected = new Set(warnings.map((w) => w.employeeId)).size;
    const severe = warnings.filter((w) => w.type === "final" || w.type === "suspension" || w.type === "termination").length;
    return { total, pending, affected, severe };
  }, [warnings]);

  const handleSaveTemplate = (t: WarningTemplate) => {
    setTemplates((prev) => {
      const idx = prev.findIndex((x) => x.id === t.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = t;
        return updated;
      }
      return [...prev, t];
    });
    setEditingTemplate(undefined);
  };

  const openBuilder = (t?: WarningTemplate) => {
    setEditingTemplate(t);
    setBuilderOpen(true);
  };

  // ── Personal view (non-manager sees only their own warnings) ─────────────
  if (!isManager) {
    const myWarnings = warnings.filter((w) => w.employeeId === viewer.id);
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/40 dark:bg-sky-950/30">
          <Info className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <div>
            <p className="text-sm font-semibold text-sky-700 dark:text-sky-400">
              Your disciplinary record
            </p>
            <p className="mt-0.5 text-xs text-sky-600/80 dark:text-sky-400/70">
              Signing a warning acknowledges receipt — not necessarily agreement. Contact
              your manager if you believe a record is inaccurate.
            </p>
          </div>
        </div>

        {myWarnings.length === 0 ? (
          <div className="border-border/60 flex flex-col items-center rounded-xl border border-dashed p-12 text-center">
            <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="size-6 text-emerald-600" />
            </div>
            <p className="font-semibold">Clean disciplinary record</p>
            <p className="text-muted-foreground mt-1 max-w-xs text-sm">
              You have no warnings on record. Keep up the great work!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myWarnings.map((w) => (
              <WarningRow key={w.id} warning={w} onAcknowledge={(id) => {
                setWarnings((prev) =>
                  prev.map((x) =>
                    x.id === id
                      ? { ...x, status: "signed", signedAt: new Date().toISOString() }
                      : x,
                  ),
                );
              }} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={ShieldAlert} label="Total warnings" value={stats.total} tone="text-orange-600 bg-orange-500/10" />
        <StatCard icon={User} label="Employees on record" value={stats.affected} tone="text-primary bg-primary/10" />
        <StatCard icon={Clock} label="Pending signature" value={stats.pending} tone="text-amber-600 bg-amber-500/10" />
        <StatCard icon={AlertTriangle} label="Severe (final/suspension)" value={stats.severe} tone="text-red-600 bg-red-500/10" />
      </div>

      <Tabs defaultValue="tracker">
        <TabsList>
          <TabsTrigger value="tracker">Discipline Log</TabsTrigger>
          <TabsTrigger value="templates">
            Warning Templates
            <Badge variant="secondary" className="ml-1.5 text-[10px]">
              {templates.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Discipline Log ── */}
        <TabsContent value="tracker" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee or reason…"
                className="h-9 pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as WarningType | "all")}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(WARNING_TYPE_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as IssuedWarning["status"] | "all")}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending_signature">Pending signature</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="appealed">Appealed</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {groupedByEmployee.length === 0 ? (
            <EmptyLog />
          ) : (
            <div className="space-y-4">
              {groupedByEmployee.map((group) => {
                const isExpanded = expandedEmployee === group.id;
                const highestType = getHighestType(group.warnings);
                const hasPending = group.warnings.some((w) => w.status === "pending_signature");
                return (
                  <Card key={group.id} className="overflow-hidden">
                    <button
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/30"
                      onClick={() => setExpandedEmployee(isExpanded ? null : group.id)}
                    >
                      <Avatar className="size-7 shrink-0">
                        <AvatarImage
                          src={facilityStaff.find((s) => s.id === group.id)?.avatarUrl}
                          alt={group.name}
                        />
                        <AvatarFallback className="bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {group.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold">{group.name}</span>
                          {highestType && (
                            <Badge
                              className={cn(
                                "border-0 text-[10px]",
                                WARNING_TYPE_META[highestType].bg,
                                WARNING_TYPE_META[highestType].text,
                              )}
                            >
                              {WARNING_TYPE_META[highestType].label}
                            </Badge>
                          )}
                          {hasPending && (
                            <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
                              <Clock className="mr-0.5 size-2.5" /> Pending signature
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          {group.warnings.length} warning{group.warnings.length !== 1 ? "s" : ""} on record
                          {group.warnings.length >= 3 && (
                            <span className="ml-1.5 font-medium text-red-600 dark:text-red-400">
                              — review for termination protocol
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="text-muted-foreground text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {isExpanded && (
                      <CardContent className="border-t px-3 pb-3 pt-2.5">
                        <div className="space-y-3">
                          {group.warnings.map((w) => (
                            <WarningRow key={w.id} warning={w} onAcknowledge={(id) => {
                              setWarnings((prev) =>
                                prev.map((x) =>
                                  x.id === id
                                    ? { ...x, status: "signed", signedAt: new Date().toISOString() }
                                    : x,
                                ),
                              );
                            }} />
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

        {/* ── Warning Templates ── */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Warning Templates</p>
              <p className="text-muted-foreground text-xs">
                Build custom warning documents. When issuing a warning from a staff profile, managers select one of these templates.
              </p>
            </div>
            <Button size="sm" onClick={() => openBuilder()}>
              <Plus className="mr-1.5 size-3.5" /> Build Template
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const meta = WARNING_TYPE_META[t.defaultType];
              return (
                <div
                  key={t.id}
                  className="border-border/60 bg-card hover:border-primary/40 group flex flex-col gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("rounded-lg p-2", meta.bg)}>
                      <FileText className={cn("size-4", meta.text)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.title}</p>
                      <Badge className={cn("mt-1 border-0 text-[10px]", meta.bg, meta.text)}>
                        {meta.label}
                      </Badge>
                    </div>
                  </div>
                  {t.description && (
                    <p className="text-muted-foreground line-clamp-2 text-xs">{t.description}</p>
                  )}
                  <div className="text-muted-foreground mt-auto flex items-center justify-between text-[11px]">
                    <span>{t.fields.length} custom field{t.fields.length !== 1 ? "s" : ""}</span>
                    {t.requiresSignature && (
                      <span className="flex items-center gap-1">
                        <PenLine className="size-2.5" /> Requires signature
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => openBuilder(t)}
                  >
                    <Pencil className="mr-1.5 size-3" /> Edit Template
                  </Button>
                </div>
              );
            })}

            {/* "Add new" card */}
            <button
              onClick={() => openBuilder()}
              className="border-border/60 text-muted-foreground hover:border-primary/40 hover:text-primary flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed transition-colors"
            >
              <div className="text-center">
                <Plus className="mx-auto mb-1 size-5" />
                <p className="text-xs font-medium">New Template</p>
              </div>
            </button>
          </div>
        </TabsContent>
      </Tabs>

      <WarningTemplateBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        onSave={handleSaveTemplate}
        existing={editingTemplate}
      />
    </div>
  );
}

function WarningRow({
  warning: w,
  onAcknowledge,
}: {
  warning: IssuedWarning;
  onAcknowledge: (id: string) => void;
}) {
  const meta = WARNING_TYPE_META[w.type];
  return (
    <div className="border-border/50 flex items-start gap-3 rounded-xl border p-3">
      <div className={cn("mt-0.5 rounded-md p-1.5", meta.bg)}>
        <ShieldAlert className={cn("size-3.5", meta.text)} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">{w.templateTitle}</span>
          <Badge className={cn("border-0 text-[10px]", meta.bg, meta.text)}>{meta.label}</Badge>
          <StatusBadge status={w.status} />
        </div>
        <p className="text-muted-foreground text-xs">{w.reason}</p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1">
            <Calendar className="size-2.5" /> {formatDate(w.issuedAt)}
          </span>
          <span className="flex items-center gap-1">
            <User className="size-2.5" /> {w.issuedByName}
          </span>
          {w.witnessName && (
            <span className="flex items-center gap-1">
              <User className="size-2.5" /> Witness: {w.witnessName}
            </span>
          )}
        </div>
        {w.managerNotes && (
          <div className="bg-muted/40 rounded-md px-2.5 py-1.5">
            <p className="text-muted-foreground mb-0.5 flex items-center gap-1 text-[10px] font-medium">
              <MessageSquare className="size-2.5" /> Manager notes
            </p>
            <p className="text-xs">{w.managerNotes}</p>
          </div>
        )}
        {w.signedAt && (
          <p className="text-muted-foreground text-[11px]">
            Signed {new Date(w.signedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
            {w.ipAddress && ` · ${w.ipAddress}`}
          </p>
        )}
      </div>
      {w.status === "pending_signature" && (
        <Button variant="outline" size="sm" onClick={() => onAcknowledge(w.id)} className="shrink-0">
          <CheckCircle2 className="mr-1 size-3.5" /> Mark signed
        </Button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: IssuedWarning["status"] }) {
  if (status === "signed")
    return (
      <Badge className="border-0 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="mr-0.5 size-2.5" /> Signed
      </Badge>
    );
  if (status === "pending_signature")
    return (
      <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
        <Clock className="mr-0.5 size-2.5" /> Pending signature
      </Badge>
    );
  if (status === "appealed")
    return (
      <Badge className="border-0 bg-violet-500/10 text-[10px] text-violet-700 dark:text-violet-400">
        Appealed
      </Badge>
    );
  return (
    <Badge className="border-0 bg-slate-500/10 text-[10px] text-slate-700 dark:text-slate-400">
      Resolved
    </Badge>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: string;
}) {
  const [bg, text] = tone.split(" ");
  return (
    <div className="border-border/60 bg-card flex items-center gap-3 rounded-xl border p-3">
      <div className={cn("rounded-lg p-2", bg)}>
        <Icon className={cn("size-4", text)} />
      </div>
      <div>
        <div className="text-xl leading-none font-bold">{value}</div>
        <div className="text-muted-foreground mt-0.5 text-[11px]">{label}</div>
      </div>
    </div>
  );
}

function EmptyLog() {
  return (
    <div className="border-border/60 flex flex-col items-center rounded-xl border border-dashed p-12 text-center">
      <ShieldAlert className="text-muted-foreground mb-3 size-10 opacity-30" />
      <p className="font-semibold">No disciplinary records</p>
      <p className="text-muted-foreground mt-1 max-w-xs text-sm">
        Warnings issued from staff profiles will appear here for facility-wide tracking.
      </p>
    </div>
  );
}

/** Returns the most severe warning type in a list. */
function getHighestType(warnings: IssuedWarning[]): WarningType | null {
  const order: WarningType[] = ["termination", "suspension", "final", "written", "verbal", "custom"];
  for (const t of order) {
    if (warnings.some((w) => w.type === t)) return t;
  }
  return null;
}
