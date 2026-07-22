"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  Lock,
  AlertTriangle,
  ChevronRight,
  Eye,
} from "lucide-react";
import { StaffPreviewDialog } from "@/components/facility/StaffPreviewDialog";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import {
  ACCESS_SCOPE_META,
  ALWAYS_ON_PERMISSIONS,
  PERMISSION_GROUPS,
  resolvePermission,
  type PermissionKey,
} from "@/types/facility-staff";
import { facilityStaff } from "@/data/facility-staff";
import {
  RolePill,
  fullNameOf,
} from "@/app/facility/dashboard/staff/_components/staff-shared";

// Per-staff permission override editor (spec 6.3). Renders inside the staff
// profile's Permissions tab (C2). MUST be mounted within a FacilityRbacProvider
// so its writes flow through the one RBAC store.
// TODO: also strip/enforce server-side when a backend exists.

type TriState = "default" | "on" | "off";

export function StaffPermissionEditor({
  staffId,
  onChangeRole,
}: {
  staffId: string;
  /** Optional handler for the "Change role" link (e.g. open the role picker). */
  onChangeRole?: () => void;
}) {
  const {
    customRoles,
    presetOverrides,
    staffOverridesFor,
    setStaffPermission,
    resetStaffOverrides,
  } = useFacilityRbac();

  const staff = facilityStaff.find((s) => s.id === staffId);
  const [activeGroupId, setActiveGroupId] = useState(PERMISSION_GROUPS[0].id);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (!staff) {
    return (
      <div className="text-muted-foreground flex h-40 items-center justify-center rounded-xl border border-dashed text-sm">
        Staff member not found
      </div>
    );
  }

  const overrides = staffOverridesFor(staffId);
  const overrideCount = Object.keys(overrides).length;

  // The role default for a key — resolved WITHOUT the staff's own overrides so we
  // can show the inherited state greyed behind the override.
  const roleDefault = (key: PermissionKey) =>
    resolvePermission({ ...staff, permissionOverrides: {} }, key, {
      customRoles,
      presetOverrides,
    });

  const stateFor = (key: PermissionKey): TriState => {
    const ov = overrides[key];
    if (!ov) return "default";
    return ov.granted ? "on" : "off";
  };

  const applyState = (key: PermissionKey, next: TriState) => {
    if (ALWAYS_ON_PERMISSIONS.includes(key)) return;
    if (next === "default") {
      setStaffPermission(staffId, key, null);
    } else if (next === "on") {
      setStaffPermission(staffId, key, { granted: true, scope: "anytime" });
    } else {
      setStaffPermission(staffId, key, { granted: false, scope: "none" });
    }
  };

  const overridesInGroup = (groupKeys: PermissionKey[]) =>
    groupKeys.filter((k) => overrides[k]).length;

  /**
   * The state actually IN FORCE for a key — the individual override when one
   * exists, otherwise the role default — collapsed to the three labels a
   * manager reads at a glance. Every row shows this, always (never hover-only,
   * never a bare toggle), alongside whether it came from the role or an
   * individual override.
   */
  const effectiveFor = (
    key: PermissionKey,
  ): { label: string; tone: string; overridden: boolean } => {
    if (ALWAYS_ON_PERMISSIONS.includes(key)) {
      return { label: "Granted", tone: "emerald", overridden: false };
    }
    const ov = overrides[key];
    const setting = ov ?? roleDefault(key);
    const label = !setting.granted
      ? "Not granted"
      : setting.scope === "assigned_shifts"
        ? "Assigned only"
        : "Granted";
    const tone = !setting.granted
      ? "rose"
      : setting.scope === "assigned_shifts"
        ? "amber"
        : "emerald";
    return { label, tone, overridden: Boolean(ov) };
  };

  const TONE_CLASS: Record<string, string> = {
    emerald:
      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
    amber:
      "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
    rose: "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300",
  };

  const activeGroup =
    PERMISSION_GROUPS.find((g) => g.id === activeGroupId) ??
    PERMISSION_GROUPS[0];

  return (
    <div className="space-y-4">
      {/* Header — role badge, change-role link + warning, reset */}
      <div className="border-border/60 bg-card/60 rounded-2xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Permissions for
            </div>
            <div className="text-lg font-bold">{fullNameOf(staff)}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <RolePill role={staff.primaryRole} />
              {staff.additionalRoles.map((r) => (
                <RolePill key={r} role={r} />
              ))}
              {onChangeRole ? (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-1 py-0 text-xs"
                  onClick={onChangeRole}
                >
                  Change role
                </Button>
              ) : (
                <Button
                  asChild
                  variant="link"
                  size="sm"
                  className="h-auto px-1 py-0 text-xs"
                >
                  <Link href="/facility/dashboard/staff">Change role</Link>
                </Button>
              )}
            </div>
            <p className="text-muted-foreground mt-1 flex items-center gap-1 text-[11px]">
              <AlertTriangle className="size-3 shrink-0 text-amber-500" />
              Changing the role will reset all overrides to the new role&apos;s
              defaults.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Badge
              variant="outline"
              className={cn(
                "h-6",
                overrideCount > 0 &&
                  "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-amber-400",
              )}
            >
              {overrideCount} override{overrideCount === 1 ? "" : "s"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="size-3.5" /> Preview as this staff member
            </Button>
            {overrideCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetStaffOverrides(staffId);
                  toast.success("Overrides reset to role defaults");
                }}
              >
                <RotateCcw className="size-3.5" /> Reset to role defaults
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Master-detail: categories on the left, permissions on the right */}
      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Category accordion */}
        <div className="space-y-1">
          {PERMISSION_GROUPS.map((group) => {
            const keys = group.permissions.map((p) => p.key);
            const n = overridesInGroup(keys);
            const active = group.id === activeGroupId;
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroupId(group.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                  active
                    ? "border-primary/60 bg-primary/5 ring-primary/20 ring-1"
                    : "border-border/60 hover:bg-muted/40",
                )}
              >
                <span className="truncate font-medium">{group.label}</span>
                <span className="flex shrink-0 items-center gap-1">
                  {n > 0 && (
                    <Badge className="h-4 border-amber-300 bg-amber-50 px-1 text-[9px] text-amber-700 dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-amber-400">
                      {n}
                    </Badge>
                  )}
                  <ChevronRight
                    className={cn(
                      "size-3.5 opacity-40",
                      active && "text-primary opacity-100",
                    )}
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Permissions in the selected category */}
        <div className="border-border/60 overflow-hidden rounded-xl border">
          <div className="bg-muted/40 border-b px-3 py-2">
            <div className="text-xs font-semibold">{activeGroup.label}</div>
            <div className="text-muted-foreground text-[10px]">
              {activeGroup.description}
            </div>
          </div>
          <div className="divide-y">
            {activeGroup.permissions.map((p) => {
              const alwaysOn = ALWAYS_ON_PERMISSIONS.includes(p.key);
              const def = roleDefault(p.key);
              const value = stateFor(p.key);
              const eff = effectiveFor(p.key);
              return (
                <div
                  key={p.key}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-xs font-medium">
                      {p.label}
                    </div>
                    {p.hint && (
                      <div className="text-muted-foreground truncate text-[10px]">
                        {p.hint}
                      </div>
                    )}
                    {/* Current state + provenance, always visible: which rows
                        are the role default and which are individual overrides. */}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-4 px-1 text-[9px] font-semibold",
                          TONE_CLASS[eff.tone],
                        )}
                      >
                        {eff.label}
                      </Badge>
                      {eff.overridden ? (
                        <Badge
                          variant="outline"
                          className="h-4 border-violet-300 bg-violet-50 px-1 text-[9px] font-semibold text-violet-700 dark:border-violet-700 dark:bg-violet-950/30 dark:text-violet-300"
                        >
                          Individual override
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[9px]">
                          Role default
                        </span>
                      )}
                    </div>
                    {/* The inherited value, so an override shows what it replaced */}
                    <div className="text-muted-foreground mt-0.5 text-[10px]">
                      Role default:{" "}
                      {def.granted
                        ? ACCESS_SCOPE_META[def.scope].label
                        : "Not granted"}
                    </div>
                  </div>
                  {alwaysOn ? (
                    <Badge
                      variant="outline"
                      className="h-6 shrink-0 border-slate-300 bg-slate-100 px-1.5 text-[9px] text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <Lock className="mr-0.5 size-2.5" /> Always on
                    </Badge>
                  ) : (
                    <ThreeStateControl
                      value={value}
                      onChange={(v) => applyState(p.key, v)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <StaffPreviewDialog
        staffId={previewOpen ? staffId : null}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}

const TRI_OPTIONS: { value: TriState; label: string; activeClass: string }[] = [
  {
    value: "default",
    label: "Default",
    activeClass: "bg-muted-foreground/15 text-foreground",
  },
  { value: "on", label: "On", activeClass: "bg-emerald-500 text-white" },
  { value: "off", label: "Off", activeClass: "bg-rose-500 text-white" },
];

/** Three-state segmented control: Default (inherit) / On (grant) / Off (revoke). */
function ThreeStateControl({
  value,
  onChange,
}: {
  value: TriState;
  onChange: (v: TriState) => void;
}) {
  return (
    <div className="border-border/60 inline-flex shrink-0 overflow-hidden rounded-lg border">
      {TRI_OPTIONS.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            "px-2.5 py-1 text-[11px] font-medium transition-colors",
            i > 0 && "border-border/60 border-l",
            value === opt.value
              ? opt.activeClass
              : "bg-background text-muted-foreground hover:bg-muted/60",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
