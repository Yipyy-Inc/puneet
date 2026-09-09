"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  UserPlus,
  Pencil,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Wallet,
  Mail,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  getStaffAuditLog,
  type StaffAuditAction,
  type StaffAuditEntry,
} from "@/lib/staff-audit";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { useStatusReasonLabel } from "@/lib/staff/use-status-reason-label";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useStaffRoleLabel } from "@/lib/settings/use-staff-role-label";
import {
  formatDateLong,
  formatTime as formatTimeI18n,
} from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_META: Record<
  StaffAuditAction,
  {
    labelKey: string;
    Icon: React.ElementType;
    iconTone: string;
    bgTone: string;
  }
> = {
  staff_created: {
    labelKey: "actionStaffCreated",
    Icon: UserPlus,
    iconTone: "text-emerald-600 dark:text-emerald-400",
    bgTone: "bg-emerald-500/10",
  },
  staff_updated: {
    labelKey: "actionStaffUpdated",
    Icon: Pencil,
    iconTone: "text-blue-600 dark:text-blue-400",
    bgTone: "bg-blue-500/10",
  },
  staff_deleted: {
    labelKey: "actionStaffDeleted",
    Icon: Trash2,
    iconTone: "text-rose-600 dark:text-rose-400",
    bgTone: "bg-rose-500/10",
  },
  status_changed: {
    labelKey: "actionStatusChanged",
    Icon: RefreshCw,
    iconTone: "text-amber-600 dark:text-amber-400",
    bgTone: "bg-amber-500/10",
  },
  permissions_changed: {
    labelKey: "actionPermissionsChanged",
    Icon: ShieldCheck,
    iconTone: "text-violet-600 dark:text-violet-400",
    bgTone: "bg-violet-500/10",
  },
  payroll_changed: {
    labelKey: "actionPayrollChanged",
    Icon: Wallet,
    iconTone: "text-emerald-600 dark:text-emerald-400",
    bgTone: "bg-emerald-500/10",
  },
  invitation_sent: {
    labelKey: "actionInvitationSent",
    Icon: Mail,
    iconTone: "text-sky-600 dark:text-sky-400",
    bgTone: "bg-sky-500/10",
  },
};

const FILTER_OPTIONS: { value: StaffAuditAction | "all"; key: string }[] = [
  { value: "all", key: "filterAll" },
  { value: "staff_created", key: "filterCreated" },
  { value: "staff_updated", key: "filterProfileEdits" },
  { value: "status_changed", key: "filterStatusChanges" },
  { value: "permissions_changed", key: "filterPermissions" },
  { value: "payroll_changed", key: "filterPayroll" },
  { value: "invitation_sent", key: "filterInvitations" },
];

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  inactive: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  terminated: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  invited: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * "Today" / "Yesterday" / the date — the two words keyed, the date through
 * `Intl`.
 *
 * Was `toLocaleDateString("en-US", …)` beside `toLocaleTimeString("en-US", {
 * hour12: true })` — a literal tag on both, and `hour12` is the American clock
 * written out as an option rather than left to the locale. §5q's French is
 * "14 h 30".
 */
function formatDate(
  iso: string,
  locale: AppLocale,
  t: (key: string) => string,
): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const entryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (entryDay.getTime() === today.getTime()) return t("today");
  if (entryDay.getTime() === yesterday.getTime()) return t("yesterday");
  return formatDateLong(d, locale);
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function groupByDay(entries: StaffAuditEntry[]): [string, StaffAuditEntry[]][] {
  const map = new Map<string, StaffAuditEntry[]>();
  for (const e of entries) {
    const key = dayKey(e.timestamp);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return Array.from(map.entries());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ActorBadge({ name, role }: { name: string; role: string }) {
  const roleName = useStaffRoleLabel();
  const roleTone =
    role === "owner"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : role === "manager"
        ? "bg-violet-500/10 text-violet-700 dark:text-violet-400"
        : "bg-muted text-muted-foreground";
  const roleLabel = roleName(role);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-foreground font-medium">{name}</span>
      <span
        className={cn(
          "rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
          roleTone,
        )}
      >
        {roleLabel}
      </span>
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useStaffText("status");
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        STATUS_TONE[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-60" />
      {t(status) === status ? status : t(status)}
    </span>
  );
}

function StatusChangeDescription({ entry }: { entry: StaffAuditEntry }) {
  const prev = String(entry.metadata?.previousStatus ?? "");
  const next = String(entry.metadata?.newStatus ?? "");
  const reason = String(entry.metadata?.reason ?? "");
  const reasonLabel = useStatusReasonLabel();

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
      {prev && <StatusPill status={prev} />}
      <span className="text-muted-foreground">→</span>
      {next && <StatusPill status={next} />}
      {reason && (
        <span className="text-muted-foreground">· {reasonLabel(reason)}</span>
      )}
    </div>
  );
}

function PermissionsDescription({ entry }: { entry: StaffAuditEntry }) {
  const { fill } = useStaffText("auditTrail");
  const count = entry.metadata?.permissionsChanged;
  if (!count) return null;
  return (
    <p className="text-muted-foreground mt-1 text-xs">
      {fill("permissionsUpdated", { count: Number(count) })}
    </p>
  );
}

function FieldChanges({ entry }: { entry: StaffAuditEntry }) {
  const { fill } = useStaffText("auditTrail");
  const [expanded, setExpanded] = useState(true);
  if (!entry.changes?.length) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 text-[11px] font-medium transition-colors"
      >
        {expanded ? (
          <ChevronDown className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
        {fill("fieldsChanged", { count: entry.changes.length })}
      </button>

      {expanded && (
        <div className="border-border/50 mt-1.5 overflow-hidden rounded-lg border">
          {entry.changes.map((c, i) => (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 py-2 text-xs",
                i > 0 && "border-border/40 border-t",
              )}
            >
              <div className="min-w-0">
                <div className="text-muted-foreground mb-0.5 text-[10px] font-medium tracking-wide uppercase">
                  {c.field}
                </div>
                <div className="truncate font-medium line-through opacity-50">
                  {c.oldValue}
                </div>
              </div>
              <div className="text-muted-foreground mt-4 text-[10px]">→</div>
              <div className="min-w-0">
                <div className="text-muted-foreground mb-0.5 text-[10px] font-medium tracking-wide uppercase opacity-0">
                  {c.field}
                </div>
                <div className="truncate font-semibold">{c.newValue}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditEntryCard({ entry }: { entry: StaffAuditEntry }) {
  const { t, locale } = useStaffText("auditTrail");
  const roleName = useStaffRoleLabel();
  const meta = ACTION_META[entry.action];
  const { Icon } = meta;

  return (
    <div className="group relative pl-8">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute top-3 left-0 flex size-6 items-center justify-center rounded-full",
          meta.bgTone,
        )}
      >
        <Icon className={cn("size-3", meta.iconTone)} />
      </div>

      <div className="border-border/50 bg-card/60 hover:bg-card rounded-xl border px-4 py-3 transition-colors">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <span className="text-sm font-semibold">{t(meta.labelKey)}</span>
            {entry.action === "staff_created" && entry.metadata?.role && (
              <span className="text-muted-foreground ml-1.5 text-xs">
                — {roleName(String(entry.metadata.role))}
              </span>
            )}
          </div>
          <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
            {formatTimeI18n(new Date(entry.timestamp), locale)}
          </span>
        </div>

        {/* Actor */}
        <div className="text-muted-foreground mt-1 text-xs">
          {t("by")} <ActorBadge name={entry.actorName} role={entry.actorRole} />
        </div>

        {/* Action-specific body */}
        {entry.action === "status_changed" && (
          <StatusChangeDescription entry={entry} />
        )}
        {entry.action === "permissions_changed" && (
          <PermissionsDescription entry={entry} />
        )}
        <FieldChanges entry={entry} />

        {/* Note */}
        {entry.note && (
          <p className="border-border/40 bg-muted/40 text-muted-foreground mt-2.5 rounded-md border px-3 py-2 text-xs/relaxed italic">
            &ldquo;{entry.note}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}

function DayGroup({
  dayIso,
  entries,
}: {
  dayIso: string;
  entries: StaffAuditEntry[];
}) {
  const { t, locale } = useStaffText("auditTrail");
  return (
    <div>
      {/* Date separator */}
      <div className="mb-3 flex items-center gap-2">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
          {formatDate(dayIso + "T00:00:00", locale, t)}
        </span>
        <div className="bg-border h-px flex-1" />
      </div>

      {/* Entries connected by a vertical line */}
      <div className="relative space-y-3">
        <div className="border-border/40 absolute top-3 bottom-3 left-2.5 border-l border-dashed" />
        {entries.map((e) => (
          <AuditEntryCard key={e.id} entry={e} />
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface StaffAuditTrailProps {
  /** If provided, filters to entries for this staff member only */
  staffId?: string;
}

export function StaffAuditTrail({ staffId }: StaffAuditTrailProps) {
  const { t, fill } = useStaffText("auditTrail");
  const { can, viewer } = useFacilityRbac();
  const [filter, setFilter] = useState<StaffAuditAction | "all">("all");

  const entries = useMemo(
    () =>
      getStaffAuditLog({
        subjectId: staffId,
        action: filter === "all" ? undefined : filter,
      }),

    [staffId, filter],
  );

  const grouped = useMemo(() => groupByDay(entries), [entries]);

  // Gate: only owner and manager may view audit logs
  const canView =
    viewer.primaryRole === "owner" || viewer.primaryRole === "manager";
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-center">
        <div className="bg-muted rounded-full p-3">
          <ShieldAlert className="text-muted-foreground size-5" />
        </div>
        <div className="text-sm font-semibold">{t("accessRestricted")}</div>
        <p className="text-muted-foreground max-w-xs text-xs">
          {t("accessRestrictedHelp")}
        </p>
      </div>
    );
  }

  // Suppress unused warning for `can` — kept for potential future use
  void can;

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="scrollbar-hidden -mx-1 flex gap-1 overflow-x-auto px-1 pb-px">
        {FILTER_OPTIONS.map((opt) => {
          const active = filter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {t(opt.key)}
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-10 text-center">
          <div className="bg-muted rounded-full p-3">
            <ShieldCheck className="text-muted-foreground size-5" />
          </div>
          <div className="text-sm font-semibold">{t("noActivity")}</div>
          <p className="text-muted-foreground max-w-xs text-xs">
            {t("noActivityHelp")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayEntries]) => (
            <DayGroup key={day} dayIso={day} entries={dayEntries} />
          ))}
        </div>
      )}

      {/* Footer count */}
      {entries.length > 0 && (
        <p className="text-muted-foreground text-center text-[11px]">
          {fill("eventsInLog", { count: entries.length })}
        </p>
      )}
    </div>
  );
}
