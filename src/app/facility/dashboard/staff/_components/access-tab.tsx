"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  BadgeCheck,
  KeyRound,
  Unlock,
  Lock,
  Pencil,
  X,
  Plus,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import {
  ACCESS_SCOPE_META,
  ALWAYS_ON_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLE_META,
  type AccessScope,
  type FacilityStaffRole,
  type PermissionKey,
  type PermissionSetting,
  type StaffProfile,
} from "@/types/facility-staff";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { RoleIcon, RolePill, ScopeBadge } from "./staff-shared";

interface AccessTabProps {
  profile: StaffProfile;
  onUpdate?: (next: StaffProfile) => void;
}

const SCOPE_ORDER: AccessScope[] = [
  "anytime",
  "operating_hours",
  "assigned_shifts",
  "none",
];

const ALL_PRESET_ROLES = Object.keys(ROLE_META) as FacilityStaffRole[];

export function AccessTab({ profile, onUpdate }: AccessTabProps) {
  const { can, resolveFor, customRoles } = useFacilityRbac();
  const canView = can("view_staff_permissions");
  const canManage = can("manage_staff") && !!onUpdate;
  const [editing, setEditing] = useState(false);

  if (!canView) {
    return <PermissionsHiddenState />;
  }

  return (
    <div className="space-y-4">
      <AccessRow
        icon={ShieldCheck}
        title="Calendar visibility"
        value={
          profile.showOnCalendar
            ? "Shows on the facility calendar"
            : "Hidden from calendar (admin / back-office)"
        }
      />
      <AccessRow
        icon={BadgeCheck}
        title="Can view other calendars"
        value={
          profile.calendarAccess.mode === "all"
            ? "All working-business staff"
            : profile.calendarAccess.mode === "none"
              ? "None"
              : `${profile.calendarAccess.staffIds.length} selected teammates`
        }
      />
      <AccessRow
        icon={profile.clockIn.requireAccessCode ? KeyRound : Unlock}
        title="Clock in / out"
        value={
          profile.clockIn.requireAccessCode
            ? `Requires access code (${profile.clockIn.accessCode})`
            : "No access code required"
        }
      />

      <Separator />

      <RolesSection
        profile={profile}
        editing={editing}
        canManage={canManage}
        onUpdate={onUpdate}
      />

      <Separator />

      <PermissionsSection
        profile={profile}
        editing={editing}
        canManage={canManage}
        onToggleEditing={() => setEditing((v) => !v)}
        onUpdate={onUpdate}
        resolveFor={resolveFor}
        customRoleLabels={Object.fromEntries(
          Object.values(customRoles).map((r) => [r.id, r.label]),
        )}
      />
    </div>
  );
}

function PermissionsHiddenState() {
  return (
    <div className="border-border/60 bg-muted/30 flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
      <div className="bg-background rounded-full border p-3">
        <Lock className="text-muted-foreground size-5" />
      </div>
      <div className="text-sm font-semibold">Permissions are hidden</div>
      <p className="text-muted-foreground max-w-sm text-xs">
        Only owners and managers with the{" "}
        <span className="text-foreground font-medium">
          View staff permissions
        </span>{" "}
        grant can inspect another staff member&apos;s access. Ask your facility
        admin if you need to see this.
      </p>
    </div>
  );
}

// ============================================================================
// Roles section
// ============================================================================

function RolesSection({
  profile,
  editing,
  canManage,
  onUpdate,
}: {
  profile: StaffProfile;
  editing: boolean;
  canManage: boolean;
  onUpdate?: (p: StaffProfile) => void;
}) {
  const { customRoles } = useFacilityRbac();
  const customList = Object.values(customRoles);
  const customAssigned = (profile.customRoleIds ?? [])
    .map((id) => customRoles[id])
    .filter(Boolean);

  const availablePresets = ALL_PRESET_ROLES.filter(
    (r) => r !== profile.primaryRole && !profile.additionalRoles.includes(r),
  );
  const availableCustom = customList.filter(
    (r) => !(profile.customRoleIds ?? []).includes(r.id),
  );

  function addPresetRole(role: FacilityStaffRole) {
    if (!onUpdate) return;
    onUpdate({
      ...profile,
      additionalRoles: [...profile.additionalRoles, role],
    });
  }

  function removePresetRole(role: FacilityStaffRole) {
    if (!onUpdate) return;
    onUpdate({
      ...profile,
      additionalRoles: profile.additionalRoles.filter((r) => r !== role),
    });
  }

  function addCustomRole(id: string) {
    if (!onUpdate) return;
    onUpdate({
      ...profile,
      customRoleIds: [...(profile.customRoleIds ?? []), id],
    });
  }

  function removeCustomRole(id: string) {
    if (!onUpdate) return;
    onUpdate({
      ...profile,
      customRoleIds: (profile.customRoleIds ?? []).filter((x) => x !== id),
    });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-semibold">Roles</div>
        <Badge variant="outline" className="text-[10px]">
          Primary + {profile.additionalRoles.length + customAssigned.length}{" "}
          additional
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <RolePill role={profile.primaryRole} size="md" />
          <Badge variant="secondary" className="h-5 text-[10px]">
            Primary
          </Badge>
        </div>
        {profile.additionalRoles.map((r) => (
          <div key={r} className="flex items-center gap-0.5">
            <RolePill role={r} size="md" />
            {editing && canManage && (
              <button
                onClick={() => removePresetRole(r)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-sm p-0.5"
                aria-label={`Remove ${r}`}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}
        {customAssigned.map((r) => (
          <div key={r.id} className="flex items-center gap-0.5">
            <span
              className={cn(
                "border-border/60 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                r.accent,
              )}
            >
              {r.label}
            </span>
            {editing && canManage && (
              <button
                onClick={() => removeCustomRole(r.id)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-sm p-0.5"
                aria-label={`Remove ${r.label}`}
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        ))}

        {editing &&
          canManage &&
          (availablePresets.length > 0 || availableCustom.length > 0) && (
            <Select
              value=""
              onValueChange={(v) => {
                if (v.startsWith("custom:")) {
                  addCustomRole(v.replace("custom:", ""));
                } else {
                  addPresetRole(v as FacilityStaffRole);
                }
              }}
            >
              <SelectTrigger className="h-7 w-auto gap-1 px-2 text-xs">
                <Plus className="size-3" />
                <SelectValue placeholder="Add role" />
              </SelectTrigger>
              <SelectContent>
                {availablePresets.length > 0 && (
                  <>
                    {availablePresets.map((r) => (
                      <SelectItem key={r} value={r}>
                        <span className="inline-flex items-center gap-1.5">
                          <RoleIcon role={r} className="size-3" />
                          {ROLE_META[r].label}
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
                {availableCustom.map((r) => (
                  <SelectItem key={r.id} value={`custom:${r.id}`}>
                    {r.label}
                    <span className="text-muted-foreground ml-1 text-[10px]">
                      (custom)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
      </div>
      {editing && canManage && (
        <p className="text-muted-foreground mt-2 text-[11px]">
          Additional roles broaden what this person can do. Scopes union: the
          widest scope wins across all assigned roles.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Permissions section
// ============================================================================

function PermissionsSection({
  profile,
  editing,
  canManage,
  onToggleEditing,
  onUpdate,
  resolveFor,
  customRoleLabels,
}: {
  profile: StaffProfile;
  editing: boolean;
  canManage: boolean;
  onToggleEditing: () => void;
  onUpdate?: (p: StaffProfile) => void;
  resolveFor: (p: StaffProfile, k: PermissionKey) => PermissionSetting;
  customRoleLabels: Record<string, string>;
}) {
  const rows = useMemo(() => {
    return PERMISSION_GROUPS.map((g) => ({
      ...g,
      permissions: g.permissions.map((p) => {
        const resolved = resolveFor(profile, p.key);
        const override = profile.permissionOverrides[p.key];
        return { ...p, resolved, override };
      }),
    }));
  }, [profile, resolveFor]);

  const totalGranted = rows.reduce(
    (n, g) => n + g.permissions.filter((p) => p.resolved.granted).length,
    0,
  );
  const overrideCount = Object.keys(profile.permissionOverrides).length;

  function applyScope(key: PermissionKey, next: AccessScope | "reset") {
    if (!onUpdate) return;
    const nextOverrides = { ...profile.permissionOverrides };
    if (next === "reset") {
      delete nextOverrides[key];
    } else if (next === "none") {
      nextOverrides[key] = { granted: false, scope: "none" };
    } else {
      nextOverrides[key] = { granted: true, scope: next };
    }
    onUpdate({ ...profile, permissionOverrides: nextOverrides });
  }

  function resetAllOverrides() {
    if (!onUpdate) return;
    onUpdate({ ...profile, permissionOverrides: {} });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold">Permissions</div>
          <div className="text-muted-foreground text-[11px]">
            {totalGranted} granted
            {overrideCount > 0 && ` · ${overrideCount} overrides`} · Always-on:{" "}
            {ALWAYS_ON_PERMISSIONS.length}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-1.5">
            {editing && overrideCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={resetAllOverrides}
              >
                <RotateCcw className="size-3" /> Reset all
              </Button>
            )}
            <Button
              variant={editing ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onToggleEditing}
            >
              <Pencil className="size-3" /> {editing ? "Done" : "Edit"}
            </Button>
          </div>
        )}
      </div>

      {!editing ? (
        <ReadOnlyPermissions rows={rows} />
      ) : (
        <EditablePermissions rows={rows} applyScope={applyScope} />
      )}

      {/* Role-source footnote */}
      <div className="text-muted-foreground mt-3 flex items-start gap-1.5 text-[11px]">
        <ShieldAlert className="mt-px size-3 shrink-0" />
        <span>
          Permissions come from the primary role
          {profile.additionalRoles.length > 0 &&
            `, additional preset roles (${profile.additionalRoles
              .map((r) => ROLE_META[r].label)
              .join(", ")})`}
          {(profile.customRoleIds ?? []).length > 0 &&
            `, custom roles (${(profile.customRoleIds ?? [])
              .map((id) => customRoleLabels[id])
              .filter(Boolean)
              .join(", ")})`}
          , and per-staff overrides on top.
        </span>
      </div>
    </div>
  );
}

type Row = {
  id: string;
  label: string;
  description: string;
  permissions: {
    key: PermissionKey;
    label: string;
    hint?: string;
    resolved: PermissionSetting;
    override?: PermissionSetting;
  }[];
};

function ReadOnlyPermissions({ rows }: { rows: Row[] }) {
  const groupsWithGrants = rows
    .map((g) => ({
      ...g,
      permissions: g.permissions.filter((p) => p.resolved.granted),
    }))
    .filter((g) => g.permissions.length > 0);

  return (
    <div className="space-y-3">
      {groupsWithGrants.map((g) => (
        <div key={g.id}>
          <div className="text-muted-foreground mb-1.5 text-xs font-medium">
            {g.label}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {g.permissions.map((p) => (
              <div
                key={p.key}
                className={cn(
                  "border-border/60 bg-card flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
                  p.override && "ring-primary/40 ring-1",
                )}
              >
                <span>{p.label}</span>
                <ScopeBadge scope={p.resolved.scope} />
                {p.override && (
                  <Badge
                    variant="outline"
                    className="h-4 border-amber-300 bg-amber-50 px-1 text-[9px] text-amber-700 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-400"
                  >
                    override
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function EditablePermissions({
  rows,
  applyScope,
}: {
  rows: Row[];
  applyScope: (key: PermissionKey, next: AccessScope | "reset") => void;
}) {
  return (
    <div className="space-y-3">
      {rows.map((g) => (
        <div
          key={g.id}
          className="border-border/60 overflow-hidden rounded-xl border"
        >
          <div className="bg-muted/40 border-b px-3 py-2">
            <div className="text-xs font-semibold">{g.label}</div>
            <div className="text-muted-foreground text-[10px]">
              {g.description}
            </div>
          </div>
          <div className="divide-y">
            {g.permissions.map((p) => (
              <div
                key={p.key}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{p.label}</div>
                  {p.hint && (
                    <div className="text-muted-foreground truncate text-[10px]">
                      {p.hint}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {p.override && (
                    <Badge
                      variant="outline"
                      className="h-5 border-amber-300 bg-amber-50 px-1 text-[9px] text-amber-700 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-400"
                    >
                      override
                    </Badge>
                  )}
                  <Select
                    value={p.override ? p.resolved.scope : `auto:${p.resolved.scope}:${p.resolved.granted ? "y" : "n"}`}
                    onValueChange={(v) => {
                      if (v.startsWith("auto:")) {
                        applyScope(p.key, "reset");
                      } else {
                        applyScope(p.key, v as AccessScope);
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 w-36 px-2 text-[11px]">
                      <SelectValue>
                        <InlineScope
                          scope={p.resolved.scope}
                          granted={p.resolved.granted}
                          override={!!p.override}
                        />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value={`auto:${p.resolved.scope}:${p.resolved.granted ? "y" : "n"}`}
                      >
                        <span className="text-[11px]">
                          Default (
                          {p.resolved.granted
                            ? ACCESS_SCOPE_META[p.resolved.scope].label
                            : "Blocked"}
                          )
                        </span>
                      </SelectItem>
                      {SCOPE_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          <span className="inline-flex items-center gap-1.5 text-[11px]">
                            <span
                              className={cn(
                                "inline-block size-2 rounded-full",
                                s === "anytime" && "bg-emerald-500",
                                s === "operating_hours" && "bg-sky-500",
                                s === "assigned_shifts" && "bg-amber-500",
                                s === "none" && "bg-rose-500",
                              )}
                            />
                            {ACCESS_SCOPE_META[s].label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function InlineScope({
  scope,
  granted,
  override,
}: {
  scope: AccessScope;
  granted: boolean;
  override: boolean;
}) {
  if (!granted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px]">
        <span className="bg-muted-foreground/40 inline-block size-2 rounded-full" />
        {override ? "Blocked" : "Not granted"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]">
      <span
        className={cn(
          "inline-block size-2 rounded-full",
          scope === "anytime" && "bg-emerald-500",
          scope === "operating_hours" && "bg-sky-500",
          scope === "assigned_shifts" && "bg-amber-500",
          scope === "none" && "bg-rose-500",
        )}
      />
      {ACCESS_SCOPE_META[scope].label}
    </span>
  );
}

// ============================================================================
// Shared
// ============================================================================

function AccessRow({
  icon: Icon,
  title,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <div className="border-border/60 bg-card flex items-start gap-3 rounded-xl border p-3">
      <div className="bg-primary/10 text-primary rounded-lg p-2">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-muted-foreground mt-0.5 text-xs">{value}</div>
      </div>
    </div>
  );
}
