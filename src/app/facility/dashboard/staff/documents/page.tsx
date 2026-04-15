"use client";

import { useMemo, useState } from "react";
import {
  FileSignature,
  Search,
  Sparkles,
  ShieldCheck,
  Users as UsersIcon,
  FileText,
  Clock,
  MapPin,
  Smartphone,
  Globe,
  Fingerprint,
  ChevronRight,
  Download,
  Eye,
  Shield,
  FileCheck2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  employeeDocumentSubmissions,
  employeeDocumentTemplates,
  scheduleEmployees,
} from "@/data/scheduling";
import type {
  EmployeeDocTemplateType,
  EmployeeDocumentSubmission,
  EmployeeDocumentTemplate,
} from "@/types/scheduling";

const TYPE_LABELS: Record<EmployeeDocTemplateType, string> = {
  employment_agreement: "Employment Agreement",
  nda: "Confidentiality / NDA",
  policy_acknowledgement: "Policy Acknowledgement",
  health_declaration: "Health Declaration",
  emergency_contact: "Emergency Contact",
  direct_deposit: "Direct Deposit",
  tax_form: "Tax Form",
  custom: "Custom Document",
};

const TYPE_TONES: Record<EmployeeDocTemplateType, string> = {
  employment_agreement: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  nda: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  policy_acknowledgement:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  health_declaration: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  emergency_contact: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  direct_deposit: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  tax_form: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  custom: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
};

type EmployeeGroup = {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  role?: string;
  submissions: EmployeeDocumentSubmission[];
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function templateFor(
  id: string,
): EmployeeDocumentTemplate | undefined {
  return employeeDocumentTemplates.find((t) => t.id === id);
}

export default function StaffDocumentsPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<EmployeeDocTemplateType | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "signed" | "pending"
  >("all");
  const [viewing, setViewing] = useState<EmployeeGroup | null>(null);
  const [viewingDoc, setViewingDoc] =
    useState<EmployeeDocumentSubmission | null>(null);

  const filteredSubs = useMemo(() => {
    return employeeDocumentSubmissions.filter((s) => {
      if (typeFilter !== "all") {
        const tmpl = templateFor(s.templateId);
        if (!tmpl || tmpl.type !== typeFilter) return false;
      }
      if (statusFilter === "signed" && s.status !== "signed") return false;
      if (statusFilter === "pending" && s.status !== "pending") return false;
      if (query) {
        const q = query.toLowerCase();
        const haystack = [s.templateTitle, s.employeeName]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [query, typeFilter, statusFilter]);

  const groupedByEmployee = useMemo<EmployeeGroup[]>(() => {
    const byId = new Map<string, EmployeeGroup>();
    for (const sub of filteredSubs) {
      const emp = scheduleEmployees.find((e) => e.id === sub.employeeId);
      if (!byId.has(sub.employeeId)) {
        byId.set(sub.employeeId, {
          id: sub.employeeId,
          name: sub.employeeName,
          avatar: emp?.avatar,
          initials: emp?.initials ?? sub.employeeName.slice(0, 2).toUpperCase(),
          role: emp?.role,
          submissions: [],
        });
      }
      byId.get(sub.employeeId)!.submissions.push(sub);
    }
    return Array.from(byId.values()).sort((a, b) => {
      const aLatest = Math.max(
        ...a.submissions.map((s) => new Date(s.submittedAt).getTime()),
      );
      const bLatest = Math.max(
        ...b.submissions.map((s) => new Date(s.submittedAt).getTime()),
      );
      return bLatest - aLatest;
    });
  }, [filteredSubs]);

  const stats = useMemo(() => {
    const total = employeeDocumentSubmissions.length;
    const signed = employeeDocumentSubmissions.filter(
      (s) => s.status === "signed",
    ).length;
    const pending = employeeDocumentSubmissions.filter(
      (s) => s.status === "pending",
    ).length;
    const employeesWithDocs = new Set(
      employeeDocumentSubmissions.map((s) => s.employeeId),
    ).size;
    return { total, signed, pending, employeesWithDocs };
  }, []);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-6">
        <div className="bg-primary/5 pointer-events-none absolute -top-24 -right-20 size-64 rounded-full blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <Sparkles className="size-3" /> Signed documents vault
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              Every agreement, signed &amp; sealed
            </h2>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              The manager can audit every signed document, and staff can review
              what they&apos;ve signed at any time. Each signature captures
              timestamp, IP, device fingerprint &amp; the signature image.
            </p>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill
            icon={FileCheck2}
            label="Total signed"
            value={stats.signed}
            tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          />
          <StatPill
            icon={UsersIcon}
            label="Employees"
            value={stats.employeesWithDocs}
            tone="bg-primary/10 text-primary"
          />
          <StatPill
            icon={AlertCircle}
            label="Pending"
            value={stats.pending}
            tone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
          />
          <StatPill
            icon={FileSignature}
            label="All records"
            value={stats.total}
            tone="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by employee or document…"
            className="h-9 pl-9"
          />
        </div>

        <Select
          value={typeFilter}
          onValueChange={(v) =>
            setTypeFilter(v as EmployeeDocTemplateType | "all")
          }
        >
          <SelectTrigger className="h-9 w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All document types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="bg-muted ml-auto flex rounded-md p-0.5">
          {(["all", "signed", "pending"] as const).map((s) => (
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
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <Tabs defaultValue="employees">
        <TabsList>
          <TabsTrigger value="employees">By employee</TabsTrigger>
          <TabsTrigger value="documents">By document</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-4">
          {groupedByEmployee.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupedByEmployee.map((group) => (
                <EmployeeDocCard
                  key={group.id}
                  group={group}
                  onOpen={() => setViewing(group)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          {filteredSubs.length === 0 ? (
            <EmptyState />
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground text-xs">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium">
                          Document
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium">
                          Employee
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium">
                          Signed
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium">
                          IP address
                        </th>
                        <th className="px-4 py-2.5 text-left font-medium">
                          Status
                        </th>
                        <th className="px-4 py-2.5 text-right font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubs.map((sub) => {
                        const tmpl = templateFor(sub.templateId);
                        const type = tmpl?.type ?? "custom";
                        const emp = scheduleEmployees.find(
                          (e) => e.id === sub.employeeId,
                        );
                        return (
                          <tr
                            key={sub.id}
                            onClick={() => setViewingDoc(sub)}
                            className="border-border/50 hover:bg-muted/40 cursor-pointer border-t"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={cn(
                                    "flex size-8 items-center justify-center rounded-lg",
                                    TYPE_TONES[type],
                                  )}
                                >
                                  <FileText className="size-4" />
                                </div>
                                <div>
                                  <div className="font-semibold">
                                    {sub.templateTitle}
                                  </div>
                                  <div className="text-muted-foreground text-[11px]">
                                    {TYPE_LABELS[type]}
                                    {tmpl && ` · v${tmpl.version}`}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar className="size-7">
                                  <AvatarImage
                                    src={emp?.avatar}
                                    alt={sub.employeeName}
                                  />
                                  <AvatarFallback className="bg-slate-100 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {emp?.initials ??
                                      sub.employeeName.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">
                                  {sub.employeeName}
                                </span>
                              </div>
                            </td>
                            <td className="text-muted-foreground px-4 py-3 text-xs">
                              {formatDateTime(sub.signedAt ?? sub.submittedAt)}
                            </td>
                            <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                              {sub.ipAddress ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={sub.status} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="sm">
                                <Eye className="size-3.5" /> View
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Per-employee dialog */}
      <EmployeeDocsDialog
        group={viewing}
        onOpenChange={(v) => !v && setViewing(null)}
        onOpenDoc={(sub) => {
          setViewing(null);
          setViewingDoc(sub);
        }}
      />

      {/* Single doc viewer */}
      <SignedDocumentDialog
        submission={viewingDoc}
        onOpenChange={(v) => !v && setViewingDoc(null)}
      />
    </div>
  );
}

// ===========================================================================
// Sub-components
// ===========================================================================

function StatPill({
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
  return (
    <div className="border-border/60 bg-card/80 flex items-center gap-3 rounded-xl border p-3 backdrop-blur-sm">
      <div className={cn("rounded-lg p-2", tone)}>
        <Icon className="size-4" />
      </div>
      <div>
        <div className="text-xl leading-none font-bold">{value}</div>
        <div className="text-muted-foreground mt-0.5 text-[11px]">{label}</div>
      </div>
    </div>
  );
}

function EmployeeDocCard({
  group,
  onOpen,
}: {
  group: EmployeeGroup;
  onOpen: () => void;
}) {
  const signed = group.submissions.filter((s) => s.status === "signed").length;
  const pending = group.submissions.filter((s) => s.status === "pending")
    .length;
  const latest = group.submissions.reduce<EmployeeDocumentSubmission | null>(
    (acc, s) => {
      if (!acc) return s;
      return new Date(s.submittedAt) > new Date(acc.submittedAt) ? s : acc;
    },
    null,
  );

  return (
    <button
      onClick={onOpen}
      className={cn(
        "group border-border/60 bg-card hover:border-primary/40 relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 text-left transition-all",
        "hover:-translate-y-0.5 hover:shadow-md",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar className="size-12 ring-2 ring-white dark:ring-slate-900">
          <AvatarImage src={group.avatar} alt={group.name} />
          <AvatarFallback className="bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {group.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{group.name}</div>
          {group.role && (
            <div className="text-muted-foreground truncate text-[11px]">
              {group.role}
            </div>
          )}
        </div>
        <ChevronRight className="text-muted-foreground group-hover:text-primary size-4 transition-colors" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {signed > 0 && (
          <Badge className="border-0 bg-emerald-500/10 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
            <FileCheck2 className="mr-1 size-3" /> {signed} signed
          </Badge>
        )}
        {pending > 0 && (
          <Badge className="border-0 bg-amber-500/10 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            <Clock className="mr-1 size-3" /> {pending} pending
          </Badge>
        )}
      </div>

      <div className="border-border/50 mt-auto border-t pt-3">
        <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Latest
        </div>
        <div className="mt-0.5 truncate text-xs font-semibold">
          {latest?.templateTitle ?? "—"}
        </div>
        <div className="text-muted-foreground text-[11px]">
          {latest ? formatDate(latest.signedAt ?? latest.submittedAt) : ""}
        </div>
      </div>
    </button>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <FileSignature className="text-muted-foreground size-8 opacity-40" />
        <div className="font-semibold">No signed documents match</div>
        <p className="text-muted-foreground max-w-sm text-sm">
          Try clearing filters or send a document to an employee to sign from
          the onboarding &rsaquo; templates tab.
        </p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "signed" | "pending" | "revoked" }) {
  if (status === "signed") {
    return (
      <Badge className="border-0 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-400">
        <FileCheck2 className="mr-1 size-3" /> Signed
      </Badge>
    );
  }
  if (status === "pending") {
    return (
      <Badge className="border-0 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
        <Clock className="mr-1 size-3" /> Pending
      </Badge>
    );
  }
  return (
    <Badge className="border-0 bg-rose-500/10 text-[10px] text-rose-700 dark:text-rose-400">
      Revoked
    </Badge>
  );
}

function EmployeeDocsDialog({
  group,
  onOpenChange,
  onOpenDoc,
}: {
  group: EmployeeGroup | null;
  onOpenChange: (v: boolean) => void;
  onOpenDoc: (s: EmployeeDocumentSubmission) => void;
}) {
  if (!group) return null;
  return (
    <Dialog open={!!group} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-12 ring-2 ring-white dark:ring-slate-900">
              <AvatarImage src={group.avatar} alt={group.name} />
              <AvatarFallback className="bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {group.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{group.name}</DialogTitle>
              <DialogDescription>
                {group.submissions.length}{" "}
                {group.submissions.length === 1 ? "document" : "documents"} on
                file
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-2">
            {group.submissions.map((sub) => {
              const tmpl = templateFor(sub.templateId);
              const type = tmpl?.type ?? "custom";
              return (
                <button
                  key={sub.id}
                  onClick={() => onOpenDoc(sub)}
                  className="group border-border/60 hover:border-primary/40 hover:bg-muted/40 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all"
                >
                  <div
                    className={cn(
                      "flex size-10 items-center justify-center rounded-lg",
                      TYPE_TONES[type],
                    )}
                  >
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {sub.templateTitle}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                      <span>{TYPE_LABELS[type]}</span>
                      {tmpl && <span>· v{tmpl.version}</span>}
                      <span>
                        · Signed{" "}
                        {formatDateTime(sub.signedAt ?? sub.submittedAt)}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={sub.status} />
                  <ChevronRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SignedDocumentDialog({
  submission,
  onOpenChange,
}: {
  submission: EmployeeDocumentSubmission | null;
  onOpenChange: (v: boolean) => void;
}) {
  if (!submission) return null;
  const tmpl = templateFor(submission.templateId);
  const type = tmpl?.type ?? "custom";
  const emp = scheduleEmployees.find((e) => e.id === submission.employeeId);

  return (
    <Dialog open={!!submission} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden sm:max-w-3xl">
        <DialogHeader className="shrink-0">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                TYPE_TONES[type],
              )}
            >
              <FileText className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate">
                {submission.templateTitle}
              </DialogTitle>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="text-[10px]">
                  {TYPE_LABELS[type]}
                </Badge>
                {tmpl && (
                  <Badge variant="outline" className="text-[10px]">
                    v{tmpl.version}
                  </Badge>
                )}
                <StatusBadge status={submission.status} />
              </div>
            </div>
            <div className="bg-muted/60 flex shrink-0 items-center gap-2 rounded-full border py-1 pr-3 pl-1">
              <Avatar className="size-7">
                <AvatarImage src={emp?.avatar} alt={submission.employeeName} />
                <AvatarFallback className="bg-slate-100 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {emp?.initials ?? submission.employeeName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold">
                {submission.employeeName}
              </span>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-5 pr-2">
            {/* Filled fields */}
            {Object.keys(submission.fieldValues).length > 0 && (
              <section>
                <SectionHeader title="Information provided" icon={FileText} />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(submission.fieldValues).map(([key, val]) => {
                    const field = tmpl?.fields.find((f) => f.id === key);
                    return (
                      <div
                        key={key}
                        className="border-border/60 bg-card rounded-lg border p-3"
                      >
                        <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                          {field?.label ?? key.replace(/_/g, " ")}
                        </div>
                        <div className="mt-0.5 truncate text-sm font-semibold">
                          {val || "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Document body */}
            {tmpl && (
              <section>
                <SectionHeader title="Document text" icon={FileText} />
                <div className="bg-muted/20 rounded-xl border p-5">
                  <pre className="text-foreground font-sans text-sm/relaxed whitespace-pre-wrap">
                    {tmpl.content}
                  </pre>
                </div>
              </section>
            )}

            {/* Signature */}
            {submission.signatureData && (
              <section>
                <SectionHeader title="Signature" icon={FileSignature} />
                <div className="from-muted/20 rounded-xl border bg-linear-to-br to-transparent p-4">
                  <div className="bg-background flex h-32 items-center justify-center rounded-lg border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={submission.signatureData}
                      alt="Employee signature"
                      className="max-h-24 object-contain"
                    />
                  </div>
                  <p className="text-muted-foreground mt-2 text-[11px]">
                    Electronically signed by{" "}
                    <span className="text-foreground font-semibold">
                      {submission.employeeName}
                    </span>{" "}
                    on {formatDateTime(submission.signedAt)}.
                  </p>
                </div>
              </section>
            )}

            {/* Audit trail */}
            <section>
              <SectionHeader title="Audit trail" icon={ShieldCheck} />
              <div className="border-border/60 bg-card rounded-xl border">
                <AuditRow
                  icon={Clock}
                  label="Signed timestamp"
                  value={formatDateTime(submission.signedAt)}
                  sub={
                    submission.signedAt
                      ? `ISO: ${submission.signedAt}`
                      : undefined
                  }
                />
                <AuditRow
                  icon={MapPin}
                  label="IP address"
                  value={submission.ipAddress ?? "—"}
                />
                <AuditRow
                  icon={Globe}
                  label="Timezone"
                  value={submission.timezone ?? "—"}
                />
                <AuditRow
                  icon={Fingerprint}
                  label="Device fingerprint"
                  value={submission.deviceId ?? "—"}
                  sub="Browser-equivalent of MAC — hashed userAgent + screen + language + timezone"
                />
                <AuditRow
                  icon={Smartphone}
                  label="User-agent"
                  value={submission.userAgent ?? "—"}
                  mono
                  last
                />
              </div>
              <div className="text-muted-foreground mt-2 flex items-start gap-1.5 text-[11px]">
                <Shield className="mt-0.5 size-3 shrink-0" />
                <span>
                  Browsers block real MAC address access for privacy. The device
                  fingerprint is the strongest portable identifier available and
                  is captured alongside signature, timestamp &amp; IP.
                </span>
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="bg-background/80 flex shrink-0 items-center justify-between gap-2 border-t pt-4 backdrop-blur-sm">
          <div className="text-muted-foreground text-[11px]">
            Submission ID:{" "}
            <span className="font-mono">{submission.id}</span>
          </div>
          <Button variant="outline" size="sm">
            <Download className="size-3.5" /> Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
      <Icon className="size-3" /> {title}
    </div>
  );
}

function AuditRow({
  icon: Icon,
  label,
  value,
  sub,
  mono,
  last,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3",
        !last && "border-border/60 border-b",
      )}
    >
      <div className="bg-muted text-muted-foreground mt-0.5 rounded-md p-1.5">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {label}
        </div>
        <div
          className={cn(
            "mt-0.5 text-sm break-all",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </div>
        {sub && (
          <div className="text-muted-foreground mt-0.5 text-[11px]">{sub}</div>
        )}
      </div>
    </div>
  );
}
