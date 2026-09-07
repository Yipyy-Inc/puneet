"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatCard } from "@/components/ui/StatCard";
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
  Eye,
  Ban,
} from "lucide-react";
import {
  startRolePreview,
  resolvePresetRolePermissions,
  resolveCustomRolePermissions,
} from "@/lib/role-preview";
import {
  FacilityRbacProvider,
  useFacilityRbac,
} from "@/hooks/use-facility-rbac";
import {
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
import { POSITION_EDITOR_GROUPS } from "@/lib/nav/facility-nav";
import { RoleIcon } from "@/app/facility/dashboard/staff/_components/staff-shared";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import {
  useStaffRoleLabel,
  useStaffRoleTagline,
} from "@/lib/settings/use-staff-role-label";
import { usePermissionText } from "@/lib/settings/use-permission-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";
import { formatDateShort, formatPercent } from "@/lib/i18n/format";

// ============================================================================
// Types & constants
// ============================================================================

type RoleKind =
  | { type: "preset"; id: FacilityStaffRole }
  | { type: "custom"; id: string };

export const ACCENT_CHOICES: {
  labelKey: string;
  accent: string;
  ring: string;
}[] = [
  {
    labelKey: "accentAmber",
    accent: "bg-amber-500/10",
    ring: "ring-amber-500/40",
  },
  {
    labelKey: "accentViolet",
    accent: "bg-violet-500/10",
    ring: "ring-violet-500/40",
  },
  { labelKey: "accentSky", accent: "bg-sky-500/10", ring: "ring-sky-500/40" },
  {
    labelKey: "accentRose",
    accent: "bg-rose-500/10",
    ring: "ring-rose-500/40",
  },
  {
    labelKey: "accentEmerald",
    accent: "bg-emerald-500/10",
    ring: "ring-emerald-500/40",
  },
  {
    labelKey: "accentOrange",
    accent: "bg-orange-500/10",
    ring: "ring-orange-500/40",
  },
  {
    labelKey: "accentIndigo",
    accent: "bg-indigo-500/10",
    ring: "ring-indigo-500/40",
  },
  {
    labelKey: "accentTeal",
    accent: "bg-teal-500/10",
    ring: "ring-teal-500/40",
  },
];

/**
 * Intl picks the plural form, not `n === 1`: French counts 0 as singular
 * ("0 employé") and English does not ("0 staff members").
 */
function usePlural(): (n: number, one: string, other: string) => string {
  const { locale, section } = useSettingsText();
  const t = section("roles-permissions");
  const rules = new Intl.PluralRules(locale === "fr" ? "fr-CA" : "en-CA");
  return (n, one, other) =>
    t(rules.select(n) === "one" ? one : other).replace("{n}", String(n));
}

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
  const t = useSettingsText().section("roles-permissions");
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
    toast.success(t("roleCreated").replace("{role}", next.label));
  }

  function handleDelete(role: CustomFacilityRole) {
    deleteCustomRole(role.id);
    setPendingDelete(null);
    if (selected.type === "custom" && selected.id === role.id) {
      setSelected({ type: "preset", id: "manager" });
    }
    toast.success(t("roleDeleted").replace("{role}", role.label));
  }

  // Duplicate any role (preset or custom) into a new custom role — persisted via
  // createCustomRole → lib/api/roles → facility-roles-store. Select it so the
  // user can immediately rename it.
  function handleDuplicate(
    profile: Omit<CustomFacilityRole, "id" | "createdAt">,
  ): void {
    const created = createCustomRole(profile);
    setSelected({ type: "custom", id: created.id });
    toast.success(t("roleDuplicated").replace("{role}", profile.label));
  }

  return (
    <Card className="border-border/60 overflow-hidden shadow-sm">
      <CardHeader className="bg-card relative space-y-4 border-b pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            {/* The h1 names this section (§5b2), so the title that used to sit
                here has gone with its icon. */}
            <p className="text-muted-foreground text-sm">{t("intro")}</p>
          </div>

          {/* Every action in one group. "Go to staff management" used to sit
              under the description as a second PRIMARY button; at this column
              width the right-hand group wrapped beneath it, so the header was
              two blue CTAs stacked down the left. §5b2: one prominent action,
              and it is "New role". */}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href="/facility/dashboard/staff">
                <Users className="size-3.5" />
                {t("goToStaff")}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            {totalPresetOverrides > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetAllPresets();
                  toast.success(t("presetsReset"));
                }}
              >
                <RotateCcw className="size-3.5" /> {t("resetPresets")}
              </Button>
            )}
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" /> {t("newRole")}
            </Button>
          </div>
        </div>

        {/* ── THE TILES ARE THE SYSTEM'S TILES NOW (§tiles, §6 rule 2) ──────
            `StudioStat` was a bespoke reimplementation sitting beside
            `ui/StatCard`, which already implements §tiles exactly: the
            measured wash, a 40px SOLID carrier with a white glyph, the
            12/700/.07em label with two lines reserved so a wrapping French
            string cannot push its own figure down, and a 30px tabular value.
            None of that was in the local copy. */}
        <div className="grid gap-2 sm:grid-cols-4">
          <StatCard
            title={t("statPresetRoles")}
            value={presetRoles.length}
            icon={Shield}
            variant="primary"
          />
          <StatCard
            title={t("statCustomRoles")}
            value={customList.length}
            icon={Sparkles}
            variant="secondary"
          />
          <StatCard
            title={t("statPresetOverrides")}
            value={totalPresetOverrides}
            icon={RotateCcw}
            variant={totalPresetOverrides > 0 ? "warning" : "default"}
          />
          <StatCard
            title={t("statStaffAssigned")}
            value={facilityStaff.length}
            icon={Users}
            variant="info"
          />
        </div>

        <div className="relative w-full max-w-md">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 pl-8"
            placeholder={t("searchRoles")}
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
                  {t("presets")}
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
                  {t("custom")}
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
                {t("noRolesMatch").replace("{query}", query)}
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
            <DialogTitle>{t("deleteTitle")}</DialogTitle>
            <DialogDescription>
              {pendingDelete && (
                <InterpolatedText
                  template={t("deleteBody")}
                  placeholder="{role}"
                >
                  <b>{pendingDelete.label}</b>
                </InterpolatedText>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && handleDelete(pendingDelete)}
            >
              {t("deleteRole")}
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
  const t = useSettingsText().section("roles-permissions");
  const roleLabel = useStaffRoleLabel();
  const plural = usePlural();
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
        <div className="truncate text-sm font-semibold">{roleLabel(role)}</div>
        <div className="text-muted-foreground truncate text-[11px]">
          {plural(staffCount, "staffCountOne", "staffCountOther")}
          {overrideCount > 0 && (
            <span className="ml-1 text-amber-600">
              ·{" "}
              {plural(overrideCount, "overrideCountOne", "overrideCountOther")}
            </span>
          )}
        </div>
      </div>
      <Badge
        variant="outline"
        className="h-5 border-slate-300 bg-slate-50 px-1 text-[9px] dark:border-slate-600 dark:bg-slate-900"
      >
        {t("presetBadge")}
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
  const plural = usePlural();

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
          {plural(staffCount, "staffCountOne", "staffCountOther")} ·{" "}
          {plural(
            Object.keys(role.permissions).length,
            "permissionCountOne",
            "permissionCountOther",
          )}
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
  const { locale, section } = useSettingsText();
  const t = section("roles-permissions");
  const roleLabel = useStaffRoleLabel();
  const roleTagline = useStaffRoleTagline();
  const plural = usePlural();
  const { presetOverrides, setPresetPermission, resetPresetRole, customRoles } =
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
        // ── §6 RULE 2: THE ROLE PANEL IS WHITE, RINGED, NOT TINTED ──────
        //
        // This was `bg-violet-500/10` — the role accent used as a fill across
        // the whole surface. Rule 2: "No tint fills. White, or a solid," and
        // it names what to signal with instead — "a full 2px ring". The accent
        // already ships one beside every fill in ACCENT_CHOICES; it had simply
        // never been used. The role keeps its colour, the surface does not.
        className={cn(
          "relative overflow-hidden rounded-2xl p-4 ring-2",
          meta.ring,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-background/80 rounded-xl p-2 backdrop-blur-sm">
              <RoleIcon role={role} className="size-5" />
            </div>
            <div>
              <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {t("presetRole")}
              </div>
              <div className="text-lg font-bold">{roleLabel(role)}</div>
              <p className="text-muted-foreground mt-0.5 max-w-md text-xs">
                {roleTagline(role)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Section 7 — QA tool: open the employee portal exactly as this
                role sees it, reflecting the CURRENT grid state. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                startRolePreview({
                  label: roleLabel(role),
                  permissions: resolvePresetRolePermissions(role, {
                    customRoles,
                    presetOverrides,
                  }),
                });
                window.open("/employee", "_blank", "noopener");
              }}
            >
              <Eye className="size-3.5" /> {t("previewAsEmployee")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onDuplicate({
                  label: t("copySuffix").replace("{role}", roleLabel(role)),
                  description: roleTagline(role),
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
              <Copy className="size-3.5" /> {t("duplicate")}
            </Button>
            {Object.keys(overrides).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetPresetRole(role);
                  toast.success(
                    t("roleReset").replace("{role}", roleLabel(role)),
                  );
                }}
              >
                <RotateCcw className="size-3.5" /> {t("resetDefaults")}
              </Button>
            )}
          </div>
        </div>

        <div className="bg-background/80 mt-3 grid gap-2 rounded-xl p-2 backdrop-blur-sm sm:grid-cols-3">
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">
              {t("granted")}
            </div>
            <div className="text-base font-semibold">
              {totalGranted}
              <span className="text-muted-foreground text-[11px] font-normal">
                {" "}
                / {totalPermissions}
              </span>
            </div>
          </div>
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">
              {t("coverage")}
            </div>
            <div className="text-base font-semibold">
              {formatPercent(coverage, locale)}
            </div>
            <Progress value={coverage} className="mt-0.5 h-1" />
          </div>
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">
              {t("overrides")}
            </div>
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
        onRevokeAll={(keys) => {
          guarded(() => {
            for (const key of keys) setPresetPermission(role, key, "revoked");
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
            <DialogTitle>{t("changeDefaultsTitle")}</DialogTitle>
            <DialogDescription>
              {plural(
                affectedStaff,
                "changeDefaultsBodyOne",
                "changeDefaultsBodyOther",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingAction(null)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                pendingAction?.run();
                setAcknowledged((prev) => new Set(prev).add(role));
                setPendingAction(null);
              }}
            >
              {t("changeDefaults")}
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
  const { locale, section } = useSettingsText();
  const t = section("roles-permissions");
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
        {t("roleNotFound")}
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
      toast.error(t("nameRequired"));
      return;
    }
    updateCustomRole(role.id, {
      label: localLabel.trim(),
      description: localDescription.trim(),
      accent: localAccent,
      ring: localRing,
    });
    setEditingMeta(false);
    toast.success(t("roleUpdated"));
  }

  return (
    <div className="space-y-4">
      <div
        // Same as the preset panel above: ringed, not tinted (§6 rule 2).
        className={cn(
          "relative overflow-hidden rounded-2xl p-4 ring-2",
          role.ring,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="bg-background/80 rounded-xl p-2 backdrop-blur-sm">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                {t("customRole")}
              </div>
              <div className="text-lg font-bold">{role.label}</div>
              <p className="text-muted-foreground mt-0.5 max-w-md text-xs">
                {role.description || t("noDescription")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {/* Section 7 — preview the portal as this custom role sees it. */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                startRolePreview({
                  label: role.label,
                  permissions: resolveCustomRolePermissions(
                    role.id,
                    customRoles,
                  ),
                });
                window.open("/employee", "_blank", "noopener");
              }}
            >
              <Eye className="size-3.5" /> {t("previewAsEmployee")}
            </Button>
            <Button variant="outline" size="sm" onClick={openEdit}>
              <Pencil className="size-3.5" /> {t("edit")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onDuplicate({
                  label: t("copySuffix").replace("{role}", role.label),
                  description: role.description,
                  accent: role.accent,
                  ring: role.ring,
                  icon: role.icon,
                  permissions: { ...role.permissions },
                })
              }
            >
              <Copy className="size-3.5" /> {t("duplicate")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              aria-label={t("deleteRoleLabel")}
            >
              <Trash2 className="size-3.5 text-rose-600" />
            </Button>
          </div>
        </div>

        <div className="bg-background/80 mt-3 grid gap-2 rounded-xl p-2 backdrop-blur-sm sm:grid-cols-3">
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">
              {t("granted")}
            </div>
            <div className="text-base font-semibold">{totalGranted}</div>
          </div>
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">
              {t("coverage")}
            </div>
            <div className="text-base font-semibold">
              {formatPercent(coverage, locale)}
            </div>
            <Progress value={coverage} className="mt-0.5 h-1" />
          </div>
          <div className="px-2">
            <div className="text-muted-foreground text-[10px]">
              {t("created")}
            </div>
            {/* §5q: `toLocaleDateString()` with no locale takes the BROWSER's,
                which is neither the user's chosen language nor a stable one.
                §6 rule 8 also bans a numeric date outright. */}
            <div className="text-sm font-semibold">
              {formatDateShort(role.createdAt, locale)}
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
        onRevokeAll={(keys) => {
          // null clears the grant on a custom role → not granted.
          for (const key of keys) setCustomRolePermission(role.id, key, null);
        }}
      />

      <Dialog open={editingMeta} onOpenChange={setEditingMeta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editRoleTitle")}</DialogTitle>
            <DialogDescription>{t("editRoleHelp")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t("roleName")}</Label>
              <Input
                value={localLabel}
                onChange={(e) => setLocalLabel(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">{t("description")}</Label>
              <Textarea
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs">{t("accentColour")}</Label>
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
              {t("cancel")}
            </Button>
            <Button onClick={saveEdit}>{t("save")}</Button>
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
  onRevokeAll,
  showPresetOption,
}: {
  getValue: (key: PermissionKey) => GridValue;
  getPresetDefault?: (key: PermissionKey) => AccessScope | null;
  onChange: (key: PermissionKey, value: GridValue) => void;
  /** Bulk grant — receives the group's grantable (non always-on) keys. */
  onGrantAll?: (keys: PermissionKey[]) => void;
  /** Bulk revoke — receives the group's grantable (non always-on) keys. */
  onRevokeAll?: (keys: PermissionKey[]) => void;
  showPresetOption?: boolean;
}) {
  const t = useSettingsText().section("roles-permissions");
  const permissionText = usePermissionText();

  // ── CATEGORIES ARE ACCORDIONS, AND THEY START CLOSED ──────────────────
  //
  // They always were accordions. The set started EMPTY, so nothing was
  // collapsed and every group rendered open, one under another: measured at
  // 1440px the editor column alone was 11,784px and the page 12,669px — 12.7
  // screens, worse than the 8,992px "Business" panel whose size is the reason
  // this whole area was restructured.
  //
  // Closed is not less information. The header already carries the group's
  // name, its description and a `7/12` granted badge, which is the overview
  // twelve screens of open rows do not give: you cannot see "what can a
  // Manager do" by scrolling past it. Open the one you are changing.
  const [collapsed, setCollapsed] = useState<Set<string>>(
    () => new Set(POSITION_EDITOR_GROUPS.map((group) => group.id)),
  );
  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="space-y-3">
      {/* Nav features first (grouped by nav section — "build a position"), then
          the advanced granular permissions. Same set of keys as PERMISSION_GROUPS,
          just regrouped so each appears exactly once. */}
      {POSITION_EDITOR_GROUPS.map((group) => {
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
            {/* ── THE TOGGLE MUST NOT BE CRUSHED BY ITS OWN ACTIONS ────────

                Measured: the button below was 181px wide at 1440, 21px at
                1280 and ZERO at 1100 and under. It is `flex-1 min-w-0` beside
                a `shrink-0` group holding "Grant all in section", "Revoke all
                in section" and a badge — so the only thing that could give was
                the control that OPENS the group, and below 1100px a person
                could not click it at all.

                Found by CI, which resolved this exact button and then retried
                223 times on "element is not visible". Wrapping the row, and
                giving the toggle a basis, drops the actions onto their own
                line instead of taking the toggle's width to nothing. */}
            <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <button
                type="button"
                // Named so a spec can open a group the way a person does.
                // These start closed now, and role-editor-writes reaches for a
                // row INSIDE one — without a handle it had to guess at
                // aria-expanded, which every Select on the page also carries.
                data-slot="permission-group-toggle"
                onClick={() => toggleCollapse(group.id)}
                className="flex min-w-0 flex-1 basis-48 items-center gap-2 text-left"
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
                    {permissionText.group(group)}
                  </span>
                  <span className="text-muted-foreground block truncate text-[10px]">
                    {permissionText.groupHelp(group)}
                  </span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                {isCore ? (
                  <Badge
                    variant="outline"
                    className="h-5 border-slate-300 bg-slate-100 px-1 text-[9px] text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <Lock className="mr-0.5 size-2.5" /> {t("alwaysOn")}
                  </Badge>
                ) : (
                  grantableKeys.length > 0 && (
                    // Explicit, scoped labels so a bulk change can't be mistaken
                    // for a single-row toggle.
                    <>
                      {onGrantAll && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-2 text-[10px]"
                          onClick={() => onGrantAll(grantableKeys)}
                        >
                          <CheckCheck className="size-3" />{" "}
                          {t("grantAllInSection")}
                        </Button>
                      )}
                      {onRevokeAll && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-2 text-[10px] text-rose-600 hover:text-rose-700 dark:text-rose-400"
                          onClick={() => onRevokeAll(grantableKeys)}
                        >
                          <Ban className="size-3" /> {t("revokeAllInSection")}
                        </Button>
                      )}
                    </>
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
                          {permissionText.permission(p.key)}
                        </div>
                        {permissionText.hint(p.key) && (
                          <div className="text-muted-foreground truncate text-[10px]">
                            {permissionText.hint(p.key)}
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
  const t = useSettingsText().section("roles-permissions");
  const permissionText = usePermissionText();
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
    ? t("alwaysOn")
    : value === "preset"
      ? presetDefault
        ? permissionText.scope(presetDefault)
        : t("notGranted")
      : value === "revoked"
        ? t("revoked")
        : value === "none"
          ? t("notGranted")
          : permissionText.scope(value);
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
                {t("defaultHint")}
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
              {presetDefault
                ? t("defaultOptionWith").replace(
                    "{scope}",
                    permissionText.scope(presetDefault),
                  )
                : t("defaultOption")}
            </span>
          </SelectItem>
        )}
        <SelectItem value="anytime">
          <ScopeOption
            color="bg-emerald-500"
            label={permissionText.scope("anytime")}
          />
        </SelectItem>
        <SelectItem value="operating_hours">
          <ScopeOption
            color="bg-sky-500"
            label={permissionText.scope("operating_hours")}
          />
        </SelectItem>
        <SelectItem value="assigned_shifts">
          <ScopeOption
            color="bg-amber-500"
            label={permissionText.scope("assigned_shifts")}
          />
        </SelectItem>
        <SelectItem value={showPresetOption ? "revoked" : "none"}>
          <ScopeOption color="bg-rose-500" label={t("notGranted")} />
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
  const t = useSettingsText().section("roles-permissions");
  const roleLabel = useStaffRoleLabel();

  function reset() {
    setLabel("");
    setDescription("");
    setAccent(ACCENT_CHOICES[0].accent);
    setRing(ACCENT_CHOICES[0].ring);
    setCopyFrom("blank");
  }

  function submit() {
    if (!label.trim()) {
      toast.error(t("nameRequired"));
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
          <DialogTitle>{t("createTitle")}</DialogTitle>
          <DialogDescription>{t("createHelp")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">{t("roleName")}</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("roleNamePlaceholder")}
            />
          </div>
          <div>
            <Label className="text-xs">{t("description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
          <div>
            <Label className="text-xs">{t("accentColour")}</Label>
            <AccentPicker
              accent={accent}
              onChange={(a, r) => {
                setAccent(a);
                setRing(r);
              }}
            />
          </div>
          <div>
            <Label className="text-xs">{t("startFrom")}</Label>
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
                    <CheckCheck className="size-3" /> {t("startBlank")}
                  </span>
                </SelectItem>
                {(Object.keys(ROLE_META) as FacilityStaffRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="size-3" />{" "}
                      {t("copyFrom").replace("{role}", roleLabel(r))}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={submit}>
            <Plus className="size-3.5" /> {t("createRole")}
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
  const t = useSettingsText().section("roles-permissions");

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
          {t(choice.labelKey)}
        </button>
      ))}
    </div>
  );
}
