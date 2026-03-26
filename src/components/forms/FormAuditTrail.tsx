"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  BookOpen,
  FileText,
  UserPen,
  GitMerge,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  ArrowRightLeft,
  Filter,
  User,
  Bot,
} from "lucide-react";
import {
  getFormAuditLog,
  type FormAuditEntry,
  type FormAuditAction,
} from "@/lib/form-audit";

// ─── helpers ──────────────────────────────────────────

const ACTION_META: Record<
  FormAuditAction,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  form_version_published: {
    label: "Version Published",
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    icon: <BookOpen className="h-4 w-4 text-indigo-600" />,
  },
  submission_received: {
    label: "Submission Received",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <FileText className="h-4 w-4 text-emerald-600" />,
  },
  staff_profile_edit: {
    label: "Profile Edit",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: <UserPen className="h-4 w-4 text-amber-600" />,
  },
  merge_decision: {
    label: "Merge Decision",
    color: "text-violet-700",
    bg: "bg-violet-50 border-violet-200",
    icon: <GitMerge className="h-4 w-4 text-violet-600" />,
  },
};

const MERGE_RULE_LABELS: Record<string, string> = {
  submitted_wins: "Submitted data wins",
  existing_wins: "Existing data wins",
  ask: "Manual review (ask)",
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
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

// ─── detail sub-components ────────────────────────────

function ChangesTable({
  changes,
}: {
  changes: { field: string; oldValue: string; newValue: string }[];
}) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40">
            <th className="text-left p-2 font-medium text-muted-foreground">Field</th>
            <th className="text-left p-2 font-medium text-muted-foreground">Before</th>
            <th className="text-left p-2 font-medium text-muted-foreground">After</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((c, i) => (
            <tr key={i} className="border-t">
              <td className="p-2 font-medium">{c.field}</td>
              <td className="p-2 text-muted-foreground">
                {c.oldValue || <span className="italic text-muted-foreground/50">empty</span>}
              </td>
              <td className="p-2 font-medium text-foreground">{c.newValue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OverridesTable({
  overrides,
  mergeRule,
}: {
  overrides: { field: string; submittedValue: string; existingValue: string }[];
  mergeRule?: string;
}) {
  return (
    <div className="space-y-2">
      {mergeRule && (
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-3.5 w-3.5 text-violet-500" />
          <span className="text-xs font-medium">
            Rule: {MERGE_RULE_LABELS[mergeRule] ?? mergeRule}
          </span>
        </div>
      )}
      {overrides.length > 0 ? (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left p-2 font-medium text-muted-foreground">Field</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Submitted</th>
                <th className="text-left p-2 font-medium text-muted-foreground">Existing</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 font-medium">{o.field}</td>
                  <td className="p-2 font-medium text-foreground">{o.submittedValue}</td>
                  <td className="p-2 text-muted-foreground">
                    {o.existingValue || <span className="italic text-muted-foreground/50">empty</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">No field overrides — clean merge</p>
      )}
    </div>
  );
}

// ─── single audit row ─────────────────────────────────

function AuditRow({ entry }: { entry: FormAuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[entry.action];
  const hasDetail =
    (entry.changes && entry.changes.length > 0) ||
    (entry.overrides !== undefined) ||
    entry.versionNumber !== undefined;

  return (
    <div className={`rounded-lg border transition-all ${expanded ? meta.bg : "bg-background hover:bg-muted/30"}`}>
      <button
        type="button"
        onClick={() => hasDetail && setExpanded(!expanded)}
        className={`w-full flex items-start gap-3 p-3 text-left ${hasDetail ? "cursor-pointer" : "cursor-default"}`}
      >
        {/* timeline dot */}
        <div className={`mt-0.5 shrink-0 rounded-full p-1.5 border ${meta.bg}`}>
          {meta.icon}
        </div>

        {/* content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] ${meta.color} border-current/20`}>
              {meta.label}
            </Badge>
            <span className="text-xs text-muted-foreground">{formatRelative(entry.timestamp)}</span>
          </div>
          <p className="text-sm font-medium mt-1">{entry.formName ?? entry.formId}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{getDescription(entry)}</p>
        </div>

        {/* actor chip */}
        <div className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
          {entry.actorType === "customer" ? (
            <User className="h-3 w-3" />
          ) : entry.actorType === "system" ? (
            <Bot className="h-3 w-3" />
          ) : (
            <Shield className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">{entry.actorName ?? String(entry.actorId ?? "System")}</span>
        </div>

        {/* expand chevron */}
        {hasDetail && (
          <div className="shrink-0 mt-1 text-muted-foreground">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pl-12 space-y-3">
          <Separator />
          {/* Publish detail */}
          {entry.action === "form_version_published" && entry.versionNumber && (
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="text-[10px]">v{entry.versionNumber}</Badge>
              <span className="text-muted-foreground">
                Published on {formatDate(entry.timestamp)} at {formatTime(entry.timestamp)}
              </span>
            </div>
          )}
          {/* Staff edit detail */}
          {entry.action === "staff_profile_edit" && entry.changes && entry.changes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Target: <span className="font-medium text-foreground capitalize">{entry.targetType}</span> #{entry.targetId}</span>
                <span>·</span>
                <span>{entry.changes.length} field{entry.changes.length > 1 ? "s" : ""} changed</span>
              </div>
              <ChangesTable changes={entry.changes} />
            </div>
          )}
          {/* Merge detail */}
          {entry.action === "merge_decision" && (
            <div className="space-y-2">
              {entry.relatedCustomerId && (
                <p className="text-xs text-muted-foreground">
                  Linked to Customer #{entry.relatedCustomerId}
                  {entry.relatedPetId ? ` · Pet #${entry.relatedPetId}` : ""}
                </p>
              )}
              <OverridesTable overrides={entry.overrides ?? []} mergeRule={entry.mergeRule} />
            </div>
          )}
          {/* Submission detail */}
          {entry.action === "submission_received" && entry.metadata && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Submission ID: <span className="font-mono font-medium text-foreground">{entry.submissionId}</span></p>
              {Boolean((entry.metadata as Record<string, unknown>).customerId) && (
                <p>Customer #{String((entry.metadata as Record<string, unknown>).customerId)}</p>
              )}
              <p>Received: {formatDate(entry.timestamp)} at {formatTime(entry.timestamp)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getDescription(entry: FormAuditEntry): string {
  switch (entry.action) {
    case "form_version_published":
      return `Version ${entry.versionNumber} published by ${entry.actorName ?? "staff"}`;
    case "submission_received":
      return `Submitted by ${entry.actorName ?? "customer"}`;
    case "staff_profile_edit":
      return `${entry.actorName ?? "Staff"} edited ${entry.changes?.length ?? 0} field${(entry.changes?.length ?? 0) > 1 ? "s" : ""} on ${entry.targetType} profile`;
    case "merge_decision":
      return `${entry.actorName ?? "Staff"} linked to Customer #${entry.relatedCustomerId}${entry.overrides?.length ? ` — ${entry.overrides.length} override${entry.overrides.length > 1 ? "s" : ""}` : ""}`;
    default:
      return "";
  }
}

// ─── main component ───────────────────────────────────

interface FormAuditTrailProps {
  facilityId?: number;
}

export function FormAuditTrail({ facilityId = 11 }: FormAuditTrailProps) {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [formFilter, setFormFilter] = useState<string>("all");

  const allEntries = useMemo(
    () => getFormAuditLog({ facilityId }),
    [facilityId]
  );

  const uniqueForms = useMemo(() => {
    const map = new Map<string, string>();
    allEntries.forEach((e) => {
      if (e.formId && e.formName) map.set(e.formId, e.formName);
    });
    return Array.from(map.entries());
  }, [allEntries]);

  const filtered = useMemo(() => {
    let list = allEntries;
    if (actionFilter !== "all") list = list.filter((e) => e.action === actionFilter);
    if (formFilter !== "all") list = list.filter((e) => e.formId === formFilter);
    return list;
  }, [allEntries, actionFilter, formFilter]);

  // Stats
  const publishCount = allEntries.filter((e) => e.action === "form_version_published").length;
  const submissionCount = allEntries.filter((e) => e.action === "submission_received").length;
  const editCount = allEntries.filter((e) => e.action === "staff_profile_edit").length;
  const mergeCount = allEntries.filter((e) => e.action === "merge_decision").length;

  const stats = [
    { label: "Published", count: publishCount, icon: <BookOpen className="h-4 w-4 text-indigo-500" />, bg: "bg-indigo-50" },
    { label: "Submissions", count: submissionCount, icon: <FileText className="h-4 w-4 text-emerald-500" />, bg: "bg-emerald-50" },
    { label: "Profile Edits", count: editCount, icon: <UserPen className="h-4 w-4 text-amber-500" />, bg: "bg-amber-50" },
    { label: "Merges", count: mergeCount, icon: <GitMerge className="h-4 w-4 text-violet-500" />, bg: "bg-violet-50" },
  ];

  // Group by date for timeline effect
  const groupedByDate = useMemo(() => {
    const groups: { date: string; entries: FormAuditEntry[] }[] = [];
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold">Form Audit Trail</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Complete compliance log — every form publish, submission, profile edit, and merge decision.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`rounded-lg p-2 ${s.bg}`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filters</span>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="form_version_published">Version Published</SelectItem>
                <SelectItem value="submission_received">Submission Received</SelectItem>
                <SelectItem value="staff_profile_edit">Profile Edit</SelectItem>
                <SelectItem value="merge_decision">Merge Decision</SelectItem>
              </SelectContent>
            </Select>
            <Select value={formFilter} onValueChange={setFormFilter}>
              <SelectTrigger className="w-[220px] h-8 text-xs">
                <SelectValue placeholder="All forms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All forms</SelectItem>
                {uniqueForms.map(([id, name]) => (
                  <SelectItem key={id} value={id}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(actionFilter !== "all" || formFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => { setActionFilter("all"); setFormFilter("all"); }}
              >
                Clear filters
              </Button>
            )}
            <div className="ml-auto text-xs text-muted-foreground">
              {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">No audit events</p>
            <p className="text-xs text-muted-foreground mt-1">
              {actionFilter !== "all" || formFilter !== "all"
                ? "Try adjusting your filters"
                : "Events will appear here as forms are published and submitted"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedByDate.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground shrink-0">{group.date}</span>
                <div className="h-px flex-1 bg-border" />
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
