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
import { usePermissionText } from "@/lib/settings/use-permission-text";
import { useStaffRoleLabel } from "@/lib/settings/use-staff-role-label";
import {
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
import { useStaffText } from "@/lib/staff/use-staff-text";

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
  const { t, fill } = useStaffText("access");
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
        title={t("calendarVisibility")}
        value={
          profile.showOnCalendar
            ? t("showsOnCalendar")
            : t("hiddenFromCalendar")
        }
      />
      <AccessRow
        icon={BadgeCheck}
        title={t("canViewOtherCalendars")}
        value={
          profile.calendarAccess.mode === "all"
            ? t("allWorkingStaff")
            : profile.calendarAccess.mode === "none"
              ? t("none")
              : fill("selectedTeammates", {
                  count: profile.calendarAccess.staffIds.length,
                })
        }
      />
      <AccessRow
        icon={profile.clockIn.requireAccessCode ? KeyRound : Unlock}
        title={t("clockInOut")}
        value={
          profile.clockIn.requireAccessCode
            ? fill("requiresCode", { code: profile.clockIn.accessCode ?? "" })
            : t("noCodeRequired")
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
  const { t } = useStaffText("access");
  return (
    <div className="border-border/60 bg-muted/30 flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center">
      <div className="bg-background rounded-full border p-3">
        <Lock className="text-muted-foreground size-5" />
      </div>
      <div className="text-sm font-semibold">{t("hiddenTitle")}</div>
      <p className="text-muted-foreground max-w-sm text-xs">
        {t("hiddenBodyBefore")}{" "}
        <span className="text-foreground font-medium">{t("hiddenGrant")}</span>{" "}
        {t("hiddenBodyAfter")}
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
  const { t, fill } = useStaffText("access");
  const roleLabel = useStaffRoleLabel();
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
        <div className="text-sm font-semibold">{t("roles")}</div>
        <Badge variant="outline" className="text-[10px]">
          {fill("primaryPlus", {
            count: profile.additionalRoles.length + customAssigned.length,
          })}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1.5">
          <RolePill role={profile.primaryRole} size="md" />
          <Badge variant="secondary" className="h-5 text-[10px]">
            {t("primary")}
          </Badge>
        </div>
        {profile.additionalRoles.map((r) => (
          <div key={r} className="flex items-center gap-0.5">
            <RolePill role={r} size="md" />
            {editing && canManage && (
              <button
                onClick={() => removePresetRole(r)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-sm p-0.5"
                aria-label={fill("remove", { name: roleLabel(r) })}
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
                aria-label={fill("remove", { name: r.label })}
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
                <SelectValue placeholder={t("addRole")} />
              </SelectTrigger>
              <SelectContent>
                {availablePresets.length > 0 && (
                  <>
                    {availablePresets.map((r) => (
                      <SelectItem key={r} value={r}>
                        <span className="inline-flex items-center gap-1.5">
                          <RoleIcon role={r} className="size-3" />
                          {roleLabel(r)}
                        </span>
                      </SelectItem>
                    ))}
                  </>
                )}
                {availableCustom.map((r) => (
                  <SelectItem key={r.id} value={`custom:${r.id}`}>
                    {r.label}
                    <span className="text-muted-foreground ml-1 text-[10px]">
                      {t("custom")}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
      </div>
      {editing && canManage && (
        <p className="text-muted-foreground mt-2 text-[11px]">
          {t("additionalRolesHelp")}
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
  const { t, fill } = useStaffText("access");
  const roleLabel = useStaffRoleLabel();
  // The per-person overrides are withheld without `view_staff_permissions`.
  // Nothing below can be shown honestly without them — the resolved column
  // would silently omit whatever an override changes — and editing would be
  // destructive, since a save writes back only the overrides in hand and drops
  // the rest.
  const overrides = profile.permissionOverrides;

  const rows = useMemo(() => {
    return PERMISSION_GROUPS.map((g) => ({
      ...g,
      permissions: g.permissions.map((p) => {
        const resolved = resolveFor(profile, p.key);
        const override = overrides?.[p.key];
        return { ...p, resolved, override };
      }),
    }));
  }, [profile, overrides, resolveFor]);

  const totalGranted = rows.reduce(
    (n, g) => n + g.permissions.filter((p) => p.resolved.granted).length,
    0,
  );

  if (!overrides) {
    return (
      <div className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
        {t("hiddenShort")}
        <div className="mt-1 text-xs">{t("hiddenShortHelp")}</div>
      </div>
    );
  }

  const overrideCount = Object.keys(overrides).length;

  function applyScope(key: PermissionKey, next: AccessScope | "reset") {
    if (!onUpdate) return;
    const nextOverrides = { ...overrides };
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
          <div className="text-sm font-semibold">{t("permissions")}</div>
          <div className="text-muted-foreground text-[11px]">
            {fill("grantedCount", { count: totalGranted })}
            {overrideCount > 0 &&
              fill("overridesCount", { count: overrideCount })}
            {fill("alwaysOn", { count: ALWAYS_ON_PERMISSIONS.length })}
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
                <RotateCcw className="size-3" /> {t("resetAll")}
              </Button>
            )}
            <Button
              variant={editing ? "default" : "outline"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onToggleEditing}
            >
              <Pencil className="size-3" /> {editing ? t("done") : t("edit")}
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
          {t("fromPrimaryRole")}
          {profile.additionalRoles.length > 0 &&
            fill("additionalPresets", {
              roles: profile.additionalRoles
                .map((r) => roleLabel(r))
                .join(", "),
            })}
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
  const { t } = useStaffText("access");
  const permissionText = usePermissionText();
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
            {permissionText.group(g)}
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
                <span>{permissionText.permission(p.key)}</span>
                <ScopeBadge scope={p.resolved.scope} />
                {p.override && (
                  <Badge
                    variant="outline"
                    className="h-4 border-amber-300 bg-amber-50 px-1 text-[9px] text-amber-700 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-400"
                  >
                    {t("override")}
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
  const { t } = useStaffText("access");
  const permissionText = usePermissionText();
  return (
    <div className="space-y-3">
      {rows.map((g) => (
        <div
          key={g.id}
          className="border-border/60 overflow-hidden rounded-xl border"
        >
          <div className="bg-muted/40 border-b px-3 py-2">
            <div className="text-xs font-semibold">
              {permissionText.group(g)}
            </div>
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
                  <div className="truncate text-xs font-medium">
                    {permissionText.permission(p.key)}
                  </div>
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
                      {t("override")}
                    </Badge>
                  )}
                  <Select
                    value={
                      p.override
                        ? p.resolved.scope
                        : `auto:${p.resolved.scope}:${p.resolved.granted ? "y" : "n"}`
                    }
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
                            ? permissionText.scope(p.resolved.scope)
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
                            {permissionText.scope(s)}
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
  const { t } = useStaffText("access");
  const permissionText = usePermissionText();
  if (!granted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px]">
        <span className="bg-muted-foreground/40 inline-block size-2 rounded-full" />
        {override ? t("blocked") : t("notGranted")}
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
      {permissionText.scope(scope)}
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
