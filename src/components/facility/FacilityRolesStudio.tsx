"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Plus,
  Search,
  Trash2,
  RotateCcw,
  Sparkles,
  CheckCheck,
  Pencil,
  Users,
  Lock,
  ArrowRight,
  ChevronDown,
  Copy,
} from "lucide-react";
import {
  FacilityRbacProvider,
  useFacilityRbac,
} from "@/hooks/use-facility-rbac";
import {
  ACCESS_SCOPE_META,
  ALWAYS_ON_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLE_META,
  ROLE_PRESETS,
  type AccessScope,
  type CustomFacilityRole,
  type FacilityStaffRole,
  type PermissionKey,
} from "@/types/facility-staff";
import { facilityStaff } from "@/data/facility-staff";
import { RoleIcon } from "@/app/facility/dashboard/staff/_components/staff-shared";

// ============================================================================
// Types & constants
// ============================================================================

type RoleKind =
  | { type: "preset"; id: FacilityStaffRole }
  | { type: "custom"; id: string };

export const ACCENT_CHOICES: { label: string; accent: string; ring: string }[] =
  [
    { label: "Amber", accent: "bg-amber-500/10", ring: "ring-amber-500/40" },
    { label: "Violet", accent: "bg-violet-500/10", ring: "ring-violet-500/40" },
    { label: "Sky", accent: "bg-sky-500/10", ring: "ring-sky-500/40" },
    { label: "Rose", accent: "bg-rose-500/10", ring: "ring-rose-500/40" },
    {
      label: "Emerald",
      accent: "bg-emerald-500/10",
      ring: "ring-emerald-500/40",
    },
    { label: "Orange", accent: "bg-orange-500/10", ring: "ring-orange-500/40" },
    { label: "Indigo", accent: "bg-indigo-500/10", ring: "ring-indigo-500/40" },
    { label: "Teal", accent: "bg-teal-500/10", ring: "ring-teal-500/40" },
  ];

// ============================================================================
// Wrapper — ensures the provider is available in the settings tree
// ============================================================================

export function FacilityRolesStudio() {
  return (
    <FacilityRbacProvider>
      <StudioInner />
    </FacilityRbacProvider>
  );
}

function StudioInner() {
  const {
    customRoles,
    presetOverrides,
    createCustomRole,
    deleteCustomRole,
    resetAllPresets,
  } = useFacilityRbac();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RoleKind>({
    type: "preset",
    id: "manager",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CustomFacilityRole | null>(
    null,
  );

  const presetRoles = Object.keys(ROLE_META) as FacilityStaffRole[];
  const customList = Object.values(customRoles);

  const filteredPresets = presetRoles.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      ROLE_META[r].label.toLowerCase().includes(q) ||
      ROLE_META[r].tagline.toLowerCase().includes(q) ||
      r.toLowerCase().includes(q)
    );
  });

  const filteredCustom = customList.filter((r) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      r.label.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  });

  // Count staff per preset role
  const staffCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const staff of facilityStaff) {
      counts[staff.primaryRole] = (counts[staff.primaryRole] ?? 0) + 1;
      for (const add of staff.additionalRoles) {
        counts[add] = (counts[add] ?? 0) + 1;
      }
      for (const id of staff.customRoleIds ?? []) {
        counts[id] = (counts[id] ?? 0) + 1;
      }
    }
    return counts;
  }, []);

  const totalPresetOverrides = Object.values(presetOverrides).reduce(
    (n, v) => n + Object.keys(v ?? {}).length,
    0,
  );

  function handleCreate(
    next: Omit<CustomFacilityRole, "id" | "createdAt">,
  ): void {
    const created = createCustomRole(next);
    setSelected({ type: "custom", id: created.id });
    setCreateOpen(false);
    toast.success(`${next.label} role created`);
  }

  function handleDelete(role: CustomFacilityRole) {
    deleteCustomRole(role.id);
    setPendingDelete(null);
    if (selected.type === "custom" && selected.id === role.id) {
      setSelected({ type: "preset", id: "manager" });
    }
    toast.success(`${role.label} role deleted`);
  }

  // Duplicate any role (preset or custom) into a new custom role — persisted via
  // createCustomRole → lib/api/roles → facility-roles-store. Select it so the
  // user can immediately rename it.
  function handleDuplicate(
    profile: Omit<CustomFacilityRole, "id" | "createdAt">,
  ): void {
    const created = createCustomRole(profile);
    setSelected({ type: "custom", id: created.id });
    toast.success(`${profile.label} created — rename it via Edit`);
  }

  return (
    <Card className="border-border/60 overflow-hidden shadow-sm">
      <CardHeader className="bg-card relative space-y-4 border-b pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="bg-background flex size-7 items-center justify-center rounded-lg border shadow-sm">
                <Shield className="size-4" />
              </span>
              Roles & Permissions
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Define what each role can do. Create custom roles for your
              facility, or override the built-in presets. Assign these roles to
              individual staff from Staff Management.
            </p>
            <Button asChild size="sm" className="mt-3 gap-1.5">
              <Link href="/facility/dashboard/staff">
                <Users className="size-3.5" />
                Go to Staff Management
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="flex gap-2">
            {totalPresetOverrides > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetAllPresets();
                  toast.success("All preset overrides cleared");
                }}
              >
                <RotateCcw className="size-3.5" /> Reset presets
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" /> New role
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          <StudioStat label="Preset roles" value={presetRoles.length} />
          <StudioStat label="Custom roles" value={customList.length} />
          <StudioStat
            label="Preset overrides"
            value={totalPresetOverrides}
            tone={totalPresetOverrides > 0 ? "warning" : "default"}
          />
          <StudioStat label="Staff assigned" value={facilityStaff.length} />
        </div>

        <div className="relative w-full max-w-md">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-8"
            placeholder="Search roles"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="grid min-h-[560px] divide-x lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Role list */}
          <div className="space-y-3 p-4">
            {filteredPresets.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-1.5 px-1 text-[10px] font-semibold tracking-wider uppercase">
                  Presets
                </div>
                <div className="space-y-1.5">
                  {filteredPresets.map((r) => (
                    <PresetRoleButton
                      key={r}
                      role={r}
                      active={selected.type === "preset" && selected.id === r}
                      staffCount={staffCounts[r] ?? 0}
                      overrideCount={
                        Object.keys(presetOverrides[r] ?? {}).length
                      }
                      onClick={() => setSelected({ type: "preset", id: r })}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredCustom.length > 0 && (
              <div>
                <div className="text-muted-foreground mb-1.5 px-1 text-[10px] font-semibold tracking-wider uppercase">
                  Custom
                </div>
                <div className="space-y-1.5">
                  {filteredCustom.map((r) => (
                    <CustomRoleButton
                      key={r.id}
                      role={r}
                      active={
                        selected.type === "custom" && selected.id === r.id
                      }
                      staffCount={staffCounts[r.id] ?? 0}
                      onClick={() => setSelected({ type: "custom", id: r.id })}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredPresets.length === 0 && filteredCustom.length === 0 && (
              <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-xs">
                No roles match “{query}”.
              </div>
            )}
          </div>

          {/* Editor */}
          <div className="min-w-0 p-4">
            {selected.type === "preset" ? (
              <PresetRoleEditor
                role={selected.id}
                onDuplicate={handleDuplicate}
              />
            ) : (
              <CustomRoleEditor
                roleId={selected.id}
                onDelete={() => {
                  const role = customRoles[selected.id];
                  if (role) setPendingDelete(role);
                }}
                onDuplicate={handleDuplicate}
              />
            )}
          </div>
        </div>
      </CardContent>

      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={handleCreate}
      />

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete custom role</DialogTitle>
            <DialogDescription>
              {pendingDelete && (
                <>
                  Remove <b>{pendingDelete.label}</b>? Staff members with this
                  role will lose any permissions it granted. This cannot be
                  undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
            >
              Delete role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================================
// Stats pill
// ============================================================================

function StudioStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning";
}) {
  return (
    <div
      className={cn(
        "border-border/60 bg-card/80 rounded-xl border p-3",
        tone === "warning" &&
          "border-amber-300 bg-amber-50 dark:border-amber-600/40 dark:bg-amber-950/20",
      )}
    >
      <p className="text-muted-foreground text-[11px] font-medium">{label}</p>
      <p className="mt-0.5 text-xl font-semibold">{value}</p>
    </div>
  );
}

// ============================================================================
// Role list buttons
// ============================================================================

function PresetRoleButton({
  role,
  active,
  staffCount,
  overrideCount,
  onClick,
}: {
  role: FacilityStaffRole;
  active: boolean;
  staffCount: number;
  overrideCount: number;
  onClick: () => void;
}) {
  const meta = ROLE_META[role];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
        active
          ? "border-primary/60 bg-primary/5 ring-primary/30 ring-1"
          : "border-border/60 bg-card hover:border-border hover:bg-muted/40",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          meta.accent,
        )}
      >
        <RoleIcon role={role} className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{meta.label}</div>
        <div className="text-muted-foreground truncate text-[11px]">
          {staffCount} staff
          {overrideCount > 0 && (
            <span className="ml-1 text-amber-600 dark:text-amber-400">
              · {overrideCount} override
              {overrideCount === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>
      <Badge
        variant="outline"
        className="h-5 border-slate-300 bg-slate-50 px-1 text-[9px] dark:border-slate-600 dark:bg-slate-900"
      >
        Preset
      </Badge>
    </button>
  );
}

function CustomRoleButton({
  role,
  active,
  staffCount,
  onClick,
}: {
  role: CustomFacilityRole;
  active: boolean;
  staffCount: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
        active
          ? "border-primary/60 bg-primary/5 ring-primary/30 ring-1"
          : "border-border/60 bg-card hover:border-border hover:bg-muted/40",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          role.accent,
        )}
      >
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{role.label}</div>
        <div className="text-muted-foreground truncate text-[11px]">
          {staffCount} staff · {Object.keys(role.permissions).length} permission
          {Object.keys(role.permissions).length === 1 ? "" : "s"}
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Preset editor — shows effective scope, allows override
// ============================================================================

function PresetRoleEditor({
  role,
  onDuplicate,
}: {
  role: FacilityStaffRole;
  onDuplicate: (profile: Omit<CustomFacilityRole, "id" | "createdAt">) => void;
}) {
  const { presetOverrides, setPresetPermission, resetPresetRole } =
    useFacilityRbac();
  const meta = ROLE_META[role];
  const overrides = presetOverrides[role] ?? {};

  // Confirmation before saving a default change (spec 6.4b). We ask once per
  // role per editing session, then apply this and subsequent edits directly.
  const [acknowledged, setAcknowledged] = useState<Set<FacilityStaffRole>>(
    new Set(),
  );
  const [pendingAction, setPendingAction] = useState<{
    run: () => void;
  } | null>(null);

  const affectedStaff = useMemo(
    () =>
      facilityStaff.filter(
        (s) => s.primaryRole === role || s.additionalRoles.includes(role),
      ).length,
    [role],
  );

  // Route a mutating action through the confirmation gate the first time a
  // preset role is edited this session; afterwards apply directly.
  function guarded(run: () => void) {
    if (acknowledged.has(role)) {
      run();
    } else {
      setPendingAction({ run });
    }
  }

  function effectiveScope(key: PermissionKey): AccessScope | null {
    const override = overrides[key];
    if (override === "revoked") return null;
    if (override) return override;
    const preset = ROLE_PRESETS[role].permissions.find(([k]) => k === key);
    return preset ? preset[1] : null;
  }

  const totalGranted = PERMISSION_GROUPS.reduce(
    (n, g) => n + g.permissions.filter((p) => effectiveScope(p.key)).length,
    0,
  );
  const totalPermissions = PERMISSION_GROUPS.reduce(
    (n, g) => n + g.permissions.length,
    0,
  );
  const coverage = Math.round((totalGranted / totalPermissions) * 100);

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-border/60 relative overflow-hidden rounded-2xl border p-4",
          meta.accent,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-background/80 rounded-xl p-2 backdrop-blur-sm">
              <RoleIcon role={role} className="size-5" />
            </div>
            <div>
              <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Preset role
              </div>
              <div className="text-lg font-bold">{meta.label}</div>
              <p className="text-muted-foreground mt-0.5 max-w-md text-xs">
                {meta.tagline}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onDuplicate({
                  label: `${meta.label} (Copy)`,
                  description: meta.tagline,
                  accent: meta.accent,
                  ring: meta.ring,
                  icon: meta.icon,
                  permissions: PERMISSION_GROUPS.reduce(
                    (acc, g) => {
                      for (const p of g.permissions) {
                        const scope = effectiveScope(p.key);
                        if (scope) acc[p.key] = scope;
                      }
                      return acc;
                    },
                    {} as Partial<Record<PermissionKey, AccessScope>>,
                  ),
                })
              }
            >
              <Copy className="size-3.5" /> Duplicate
            </Button>
            {Object.keys(overrides).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetPresetRole(role);
                  toast.success(`${meta.label} reset to defaults`);
                }}
              >
                <RotateCcw className="size-3.5" /> Reset defaults
              </Button>
            )}
          </div>
        </div>

        <div className="bg-background/80 mt-3 grid gap-2 rounded-xl p-2 backdrop-blur-sm sm:grid-cols-3">
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">Granted</div>
            <div className="text-base font-semibold">
              {totalGranted}
              <span className="text-muted-foreground text-[11px] font-normal">
                {" "}
                / {totalPermissions}
              </span>
            </div>
          </div>
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">Coverage</div>
            <div className="text-base font-semibold">{coverage}%</div>
            <Progress value={coverage} className="mt-0.5 h-1" />
          </div>
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">Overrides</div>
            <div className="text-base font-semibold">
              {Object.keys(overrides).length}
            </div>
          </div>
        </div>
      </div>

      <PermissionsGrid
        getValue={(key) => {
          const override = overrides[key];
          if (override === "revoked") return "revoked";
          if (override) return override;
          return "preset";
        }}
        getPresetDefault={(key) => {
          const preset = ROLE_PRESETS[role].permissions.find(
            ([k]) => k === key,
          );
          return preset ? preset[1] : null;
        }}
        onChange={(key, value) => {
          guarded(() => {
            if (value === "preset") {
              setPresetPermission(role, key, null);
            } else if (value === "revoked") {
              setPresetPermission(role, key, "revoked");
            } else {
              setPresetPermission(role, key, value);
            }
          });
        }}
        onGrantAll={(keys) => {
          guarded(() => {
            for (const key of keys) setPresetPermission(role, key, "anytime");
          });
        }}
        showPresetOption
      />

      {/* Confirm before changing a preset role's defaults (spec 6.4b). */}
      <Dialog
        open={!!pendingAction}
        onOpenChange={(v) => !v && setPendingAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change default permissions?</DialogTitle>
            <DialogDescription>
              This will change default permissions for {affectedStaff} staff
              member{affectedStaff === 1 ? "" : "s"} who have this role.
              Individual overrides will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                pendingAction?.run();
                setAcknowledged((prev) => new Set(prev).add(role));
                setPendingAction(null);
              }}
            >
              Change defaults
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Custom role editor — name, description, color, permissions
// ============================================================================

function CustomRoleEditor({
  roleId,
  onDelete,
  onDuplicate,
}: {
  roleId: string;
  onDelete: () => void;
  onDuplicate: (profile: Omit<CustomFacilityRole, "id" | "createdAt">) => void;
}) {
  const { customRoles, updateCustomRole, setCustomRolePermission } =
    useFacilityRbac();
  const role = customRoles[roleId];
  const [editingMeta, setEditingMeta] = useState(false);
  const [localLabel, setLocalLabel] = useState(role?.label ?? "");
  const [localDescription, setLocalDescription] = useState(
    role?.description ?? "",
  );
  const [localAccent, setLocalAccent] = useState(
    role?.accent ?? ACCENT_CHOICES[0].accent,
  );
  const [localRing, setLocalRing] = useState(
    role?.ring ?? ACCENT_CHOICES[0].ring,
  );

  if (!role) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center rounded-xl border border-dashed text-sm">
        Role not found
      </div>
    );
  }

  const totalGranted = Object.keys(role.permissions).length;
  const totalPermissions = PERMISSION_GROUPS.reduce(
    (n, g) => n + g.permissions.length,
    0,
  );
  const coverage = Math.round((totalGranted / totalPermissions) * 100);

  function openEdit() {
    setLocalLabel(role.label);
    setLocalDescription(role.description);
    setLocalAccent(role.accent);
    setLocalRing(role.ring);
    setEditingMeta(true);
  }

  function saveEdit() {
    if (!localLabel.trim()) {
      toast.error("Role name is required");
      return;
    }
    updateCustomRole(role.id, {
      label: localLabel.trim(),
      description: localDescription.trim(),
      accent: localAccent,
      ring: localRing,
    });
    setEditingMeta(false);
    toast.success("Role updated");
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "border-border/60 relative overflow-hidden rounded-2xl border p-4",
          role.accent,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-background/80 rounded-xl p-2 backdrop-blur-sm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                Custom role
              </div>
              <div className="text-lg font-bold">{role.label}</div>
              <p className="text-muted-foreground mt-0.5 max-w-md text-xs">
                {role.description || "No description"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onDuplicate({
                  label: `${role.label} (Copy)`,
                  description: role.description,
                  accent: role.accent,
                  ring: role.ring,
                  icon: role.icon,
                  permissions: { ...role.permissions },
                })
              }
            >
              <Copy className="size-3.5" /> Duplicate
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="size-3.5 text-rose-600" />
            </Button>
          </div>
        </div>

        <div className="bg-background/80 mt-3 grid gap-2 rounded-xl p-2 backdrop-blur-sm sm:grid-cols-3">
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">Granted</div>
            <div className="text-base font-semibold">{totalGranted}</div>
          </div>
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">Coverage</div>
            <div className="text-base font-semibold">{coverage}%</div>
            <Progress value={coverage} className="mt-0.5 h-1" />
          </div>
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">Created</div>
            <div className="text-sm font-semibold">
              {new Date(role.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      <PermissionsGrid
        getValue={(key) => role.permissions[key] ?? "none"}
        onChange={(key, value) => {
          if (value === "none" || value === "preset") {
            setCustomRolePermission(role.id, key, null);
          } else if (value === "revoked") {
            setCustomRolePermission(role.id, key, null);
          } else {
            setCustomRolePermission(role.id, key, value);
          }
        }}
        onGrantAll={(keys) => {
          for (const key of keys)
            setCustomRolePermission(role.id, key, "anytime");
        }}
      />

      <Dialog open={editingMeta} onOpenChange={setEditingMeta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>
              Update the display details. Permissions are edited in the main
              grid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Role name</Label>
              <Input
                value={localLabel}
                onChange={(e) => setLocalLabel(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">Accent color</Label>
              <AccentPicker
                accent={localAccent}
                onChange={(accent, ring) => {
                  setLocalAccent(accent);
                  setLocalRing(ring);
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMeta(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Permission grid — shared by both editors
// ============================================================================

export type GridValue = AccessScope | "preset" | "revoked" | "none";

export function PermissionsGrid({
  getValue,
  getPresetDefault,
  onChange,
  onGrantAll,
  showPresetOption,
}: {
  getValue: (key: PermissionKey) => GridValue;
  getPresetDefault?: (key: PermissionKey) => AccessScope | null;
  onChange: (key: PermissionKey, value: GridValue) => void;
  /** "Grant all in category" — receives the group's grantable (non always-on) keys. */
  onGrantAll?: (keys: PermissionKey[]) => void;
  showPresetOption?: boolean;
}) {
  // Categories are accordions — collapse state per group id.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      {PERMISSION_GROUPS.map((group) => {
        const isCore = group.id === "core";
        const isCollapsed = collapsed.has(group.id);
        const grantableKeys = group.permissions
          .filter((p) => !ALWAYS_ON_PERMISSIONS.includes(p.key))
          .map((p) => p.key);
        const groupGranted = group.permissions.filter((p) => {
          const v = getValue(p.key);
          if (v === "preset" && getPresetDefault) {
            return getPresetDefault(p.key) !== null;
          }
          return v !== "none" && v !== "revoked";
        }).length;

        return (
          <div
            key={group.id}
            className="border-border/60 overflow-hidden rounded-xl border"
          >
            <div className="bg-muted/40 flex items-center justify-between gap-2 border-b px-3 py-2">
              <button
                type="button"
                onClick={() => toggleCollapse(group.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                aria-expanded={!isCollapsed}
              >
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 transition-transform",
                    isCollapsed && "-rotate-90",
                  )}
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">
                    {group.label}
                  </span>
                  <span className="text-muted-foreground block truncate text-[10px]">
                    {group.description}
                  </span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                {isCore ? (
                  <Badge
                    variant="outline"
                    className="h-5 border-slate-300 bg-slate-100 px-1 text-[9px] text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <Lock className="mr-0.5 size-2.5" /> Always on
                  </Badge>
                ) : (
                  onGrantAll &&
                  grantableKeys.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-[10px]"
                      onClick={() => onGrantAll(grantableKeys)}
                    >
                      <CheckCheck className="size-3" /> Grant all
                    </Button>
                  )
                )}
                <Badge variant="secondary" className="h-5 px-1 text-[10px]">
                  {groupGranted}/{group.permissions.length}
                </Badge>
              </div>
            </div>

            {!isCollapsed && (
              <div className="divide-y">
                {group.permissions.map((p) => {
                  const value = getValue(p.key);
                  const presetDefault = getPresetDefault?.(p.key) ?? null;
                  const alwaysOn = ALWAYS_ON_PERMISSIONS.includes(p.key);
                  return (
                    <div
                      key={p.key}
                      className="flex items-center justify-between gap-3 px-3 py-2"
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
                      </div>
                      <PermissionValueSelect
                        value={value}
                        presetDefault={presetDefault}
                        alwaysOn={alwaysOn}
                        showPresetOption={showPresetOption}
                        onChange={(v) => onChange(p.key, v)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PermissionValueSelect({
  value,
  presetDefault,
  alwaysOn,
  showPresetOption,
  onChange,
}: {
  value: GridValue;
  presetDefault: AccessScope | null;
  alwaysOn: boolean;
  showPresetOption?: boolean;
  onChange: (v: GridValue) => void;
}) {
  const dotColor =
    value === "anytime"
      ? "bg-emerald-500"
      : value === "operating_hours"
        ? "bg-sky-500"
        : value === "assigned_shifts"
          ? "bg-amber-500"
          : value === "preset"
            ? presetDefault === "anytime"
              ? "bg-emerald-500"
              : presetDefault === "operating_hours"
                ? "bg-sky-500"
                : presetDefault === "assigned_shifts"
                  ? "bg-amber-500"
                  : "bg-muted-foreground/30"
            : "bg-rose-500";

  // The scope actually in force — shown as the primary label so each row reflects
  // the role's real state, not the system default (which becomes a small hint).
  const effectiveLabel = alwaysOn
    ? "Always on"
    : value === "preset"
      ? presetDefault
        ? ACCESS_SCOPE_META[presetDefault].label
        : "Not granted"
      : value === "revoked"
        ? "Revoked"
        : value === "none"
          ? "Not granted"
          : ACCESS_SCOPE_META[value].label;
  const inheritedFromDefault = value === "preset" && !alwaysOn;

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as GridValue)}
      disabled={alwaysOn}
    >
      <SelectTrigger className="h-7 w-40 px-2 text-[11px]">
        <SelectValue>
          <span className="inline-flex items-center gap-1.5">
            <span
              className={cn("inline-block size-2 rounded-full", dotColor)}
            />
            <span className="font-medium">{effectiveLabel}</span>
            {inheritedFromDefault && (
              <span className="text-muted-foreground text-[9px] font-normal">
                default
              </span>
            )}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {showPresetOption && (
          <SelectItem value="preset">
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <RotateCcw className="size-3" />
              Default
              {presetDefault && ` (${ACCESS_SCOPE_META[presetDefault].label})`}
            </span>
          </SelectItem>
        )}
        <SelectItem value="anytime">
          <ScopeOption color="bg-emerald-500" label="Anytime" />
        </SelectItem>
        <SelectItem value="operating_hours">
          <ScopeOption color="bg-sky-500" label="Operating hours" />
        </SelectItem>
        <SelectItem value="assigned_shifts">
          <ScopeOption color="bg-amber-500" label="Assigned shifts" />
        </SelectItem>
        <SelectItem value={showPresetOption ? "revoked" : "none"}>
          <ScopeOption color="bg-rose-500" label="Not granted" />
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function ScopeOption({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]">
      <span className={cn("inline-block size-2 rounded-full", color)} />
      {label}
    </span>
  );
}

// ============================================================================
// Create-role dialog
// ============================================================================

function CreateRoleDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (role: Omit<CustomFacilityRole, "id" | "createdAt">) => void;
}) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState(ACCENT_CHOICES[0].accent);
  const [ring, setRing] = useState(ACCENT_CHOICES[0].ring);
  const [copyFrom, setCopyFrom] = useState<"blank" | FacilityStaffRole>(
    "blank",
  );

  function reset() {
    setLabel("");
    setDescription("");
    setAccent(ACCENT_CHOICES[0].accent);
    setRing(ACCENT_CHOICES[0].ring);
    setCopyFrom("blank");
  }

  function submit() {
    if (!label.trim()) {
      toast.error("Role name is required");
      return;
    }
    const permissions: Partial<Record<PermissionKey, AccessScope>> = {};
    if (copyFrom !== "blank") {
      for (const [k, scope] of ROLE_PRESETS[copyFrom].permissions) {
        permissions[k] = scope;
      }
    } else {
      for (const k of ALWAYS_ON_PERMISSIONS) {
        permissions[k] = "anytime";
      }
    }
    onCreate({
      label: label.trim(),
      description: description.trim(),
      accent,
      ring,
      icon: "Sparkles",
      permissions,
    });
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a custom role</DialogTitle>
          <DialogDescription>
            Give your new role a name and starting permissions. You can
            fine-tune them after creation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Role name</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Senior Groomer, Shift Lead"
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What does this role do?"
            />
          </div>
          <div>
            <Label className="text-xs">Accent color</Label>
            <AccentPicker
              accent={accent}
              onChange={(a, r) => {
                setAccent(a);
                setRing(r);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">Start from</Label>
            <Select
              value={copyFrom}
              onValueChange={(v) =>
                setCopyFrom(v as "blank" | FacilityStaffRole)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCheck className="size-3" /> Blank (core permissions
                    only)
                  </span>
                </SelectItem>
                {(Object.keys(ROLE_META) as FacilityStaffRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3" /> Copy from{" "}
                      {ROLE_META[r].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>
            <Plus className="size-3.5" /> Create role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AccentPicker({
  accent,
  onChange,
}: {
  accent: string;
  onChange: (accent: string, ring: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ACCENT_CHOICES.map((choice) => (
        <button
          key={choice.accent}
          onClick={() => onChange(choice.accent, choice.ring)}
          className={cn(
            "border-border/60 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
            choice.accent,
            accent === choice.accent && "ring-primary/50 ring-2 ring-offset-1",
          )}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}
