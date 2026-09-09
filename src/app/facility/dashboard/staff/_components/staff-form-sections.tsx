"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  User as UserIcon,
  ShieldCheck,
  MapPin,
  Bell,
  Wallet,
  Sparkles,
  KeyRound,
  Eye,
  Lock,
  Clock,
  Plus,
  X,
  ExternalLink,
} from "lucide-react";
import { usePermissionText } from "@/lib/settings/use-permission-text";
import { useNotificationEventLabel } from "@/lib/staff/use-notification-event-label";
import { useEmploymentTypeLabel } from "@/lib/staff/use-employment-type-label";
import {
  ROLE_META,
  SERVICE_MODULE_META,
  PERMISSION_GROUPS,
  ALWAYS_ON_PERMISSIONS,
  NOTIFICATION_EVENT_META,
  ROLE_PRESETS,
  resolvePermission,
  type FacilityStaffRole,
  type ServiceModule,
  type AccessScope,
  type PermissionKey,
  type StaffProfile,
  type NotificationEvent,
  type NotificationScope,
} from "@/types/facility-staff";
import { FACILITY_LOCATIONS } from "@/data/facility-staff";
import { useStaffHrConfig } from "@/lib/api/staff-onboarding";
import { RoleIcon, ServiceIcon } from "./staff-shared";
import { AdditionalRolesGrid } from "./additional-roles-grid";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { CustomRoleQuickCreateDialog } from "./custom-role-quick-create-dialog";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useStaffText } from "@/lib/staff/use-staff-text";

/** The generic field-updater shared by every section. */
export type SectionUpdate = <K extends keyof StaffProfile>(
  key: K,
  value: StaffProfile[K],
) => void;

export const PRESET_COLORS = [
  "#B45309",
  "#7C3AED",
  "#0284C7",
  "#E11D48",
  "#059669",
  "#EA580C",
  "#4338CA",
  "#0D9488",
  "#9333EA",
  "#DC2626",
  "#0891B2",
  "#65A30D",
];

const ROLE_ORDER: FacilityStaffRole[] = [
  "owner",
  "manager",
  "reception",
  "groomer",
  "trainer",
  "daycare_attendant",
  "boarding_attendant",
  "sanitation",
];

const SERVICE_ORDER: ServiceModule[] = [
  "grooming",
  "training",
  "daycare",
  "boarding",
  "reception",
  "retail",
  "sanitation",
  "transport",
];

/** Section catalog — shared between the hire modal and the profile edit tabs. */
export const STAFF_SECTIONS = [
  { id: "profile", key: "secProfile", icon: UserIcon },
  { id: "role", key: "secRole", icon: Sparkles },
  { id: "locations", key: "secLocations", icon: MapPin },
  { id: "access", key: "secAccess", icon: ShieldCheck },
  { id: "notifications", key: "secNotifications", icon: Bell },
  { id: "payroll", key: "secPayroll", icon: Wallet },
] as const;

export type StaffSectionId = (typeof STAFF_SECTIONS)[number]["id"];

// ============================================================================
// Profile
// ============================================================================

export function ProfileSection({
  draft,
  update,
}: {
  draft: StaffProfile;
  update: SectionUpdate;
}) {
  const { t } = useStaffText("formSections");
  const permissionText = usePermissionText();
  const employmentTypeLabel = useEmploymentTypeLabel();
  const { employmentTypes } = useStaffHrConfig();
  // Keep the current value selectable even if it's a legacy / removed type.
  const empTypeOptions = employmentTypes.includes(
    draft.employment.employmentType,
  )
    ? employmentTypes
    : [draft.employment.employmentType, ...employmentTypes];

  return (
    <div className="space-y-5">
      <SectionHeader title={t("basicInfo")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label={t("firstName")} required>
          <Input
            value={draft.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            // french-ok: a sample NAME, and a Quebec one — §5q says a name
            // never passes through the locale layer, and it reads the same in
            // both languages anyway.
            placeholder="Émilie"
          />
        </FieldRow>
        <FieldRow label={t("lastName")} required>
          <Input
            value={draft.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            // french-ok: a sample name, as above
            placeholder="Laurent"
          />
        </FieldRow>
        <FieldRow label={t("email")} required hint={t("hintEmail")}>
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </FieldRow>
        <FieldRow label={t("phone")}>
          <Input
            value={draft.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </FieldRow>
      </div>

      <FieldRow label={t("jobTitle")} hint={t("hintJobTitle")}>
        <Input
          value={draft.jobTitle ?? ""}
          onChange={(e) => update("jobTitle", e.target.value)}
          placeholder={t("jobTitlePlaceholder")}
        />
      </FieldRow>

      <FieldRow label={t("colorCode")} hint={t("hintColor")}>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => update("colorHex", c)}
              className={cn(
                "size-7 rounded-full border-2 transition-transform hover:scale-110",
                draft.colorHex === c
                  ? "border-foreground scale-110"
                  : "border-transparent",
              )}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
          <Input
            type="text"
            value={draft.colorHex}
            onChange={(e) => update("colorHex", e.target.value)}
            className="w-24 font-mono text-xs"
          />
        </div>
      </FieldRow>

      <Separator />
      <SectionHeader title={t("employment")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label={t("hireDate")}>
          <Input
            type="date"
            value={draft.employment.hireDate}
            onChange={(e) =>
              update("employment", {
                ...draft.employment,
                hireDate: e.target.value,
              })
            }
          />
        </FieldRow>
        <FieldRow label={t("employmentType")}>
          <Select
            value={draft.employment.employmentType}
            onValueChange={(v) =>
              update("employment", {
                ...draft.employment,
                employmentType: v,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectType")} />
            </SelectTrigger>
            <SelectContent>
              {empTypeOptions.map((type) => (
                <SelectItem key={type} value={type}>
                  {employmentTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>
      </div>
      <FieldRow label={t("internalNotes")} hint={t("hintNotes")}>
        {draft.employment.notes === undefined ? (
          <WithheldNotice
            permission={permissionText.permission("manage_staff")}
          />
        ) : (
          <Textarea
            rows={3}
            value={draft.employment.notes}
            onChange={(e) =>
              update("employment", {
                ...draft.employment,
                notes: e.target.value,
              })
            }
            placeholder={t("notesPlaceholder")}
          />
        )}
      </FieldRow>
    </div>
  );
}

// ============================================================================
// Role & services
// ============================================================================

export function RoleSection({
  draft,
  update,
  onRoleChange,
}: {
  draft: StaffProfile;
  update: SectionUpdate;
  onRoleChange: (r: FacilityStaffRole) => void;
}) {
  const { t } = useStaffText("formSections");
  const settingsPath = useSettingsHref();
  const { customRoles } = useFacilityRbac();
  const customList = Object.values(customRoles);
  const assignedCustomIds = draft.customRoleIds ?? [];
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  // Additional preset roles layer on top of the primary — services are the
  // union (permissions union too, resolved by the RBAC layer).
  function toggleAdditionalRole(role: FacilityStaffRole, on: boolean) {
    const next = on
      ? [...draft.additionalRoles, role]
      : draft.additionalRoles.filter((r) => r !== role);
    update("additionalRoles", next);
    update(
      "serviceAssignments",
      Array.from(
        new Set([
          ...ROLE_PRESETS[draft.primaryRole].services,
          ...next.flatMap((r) => ROLE_PRESETS[r].services),
        ]),
      ),
    );
  }

  function toggleCustomRole(id: string) {
    const has = assignedCustomIds.includes(id);
    update(
      "customRoleIds",
      has
        ? assignedCustomIds.filter((x) => x !== id)
        : [...assignedCustomIds, id],
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader title={t("primaryRole")} hint={t("hintPrimaryRole")} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {ROLE_ORDER.map((role) => {
            const meta = ROLE_META[role];
            const active = draft.primaryRole === role;
            return (
              <button
                type="button"
                key={role}
                onClick={() => onRoleChange(role)}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-3 text-left transition-all",
                  active
                    ? "border-primary ring-primary/20 shadow-sm ring-2"
                    : "border-border/60 hover:shadow-sm",
                )}
              >
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0",
                    meta.accent,
                  )}
                />
                <div className="relative flex items-start gap-2">
                  <div className="bg-background/70 rounded-md p-1.5">
                    <RoleIcon role={role} className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{meta.label}</div>
                    <div className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                      {meta.tagline}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <SectionHeader
          title={t("additionalRoles")}
          hint={t("hintAdditionalRoles")}
        />
        <div className="mt-3">
          <AdditionalRolesGrid
            primaryRole={draft.primaryRole}
            additionalRoles={draft.additionalRoles}
            onToggle={toggleAdditionalRole}
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <SectionHeader title={t("customRoles")} hint={t("hintCustomRoles")} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreateRoleOpen(true)}
            className="h-8"
          >
            <Plus className="size-3.5" /> {t("createCustomRole")}
          </Button>
        </div>

        {customList.length === 0 ? (
          <button
            type="button"
            onClick={() => setCreateRoleOpen(true)}
            className="border-border/60 hover:border-primary/60 hover:bg-muted/40 mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-xs font-medium transition-all"
          >
            <Sparkles className="text-primary size-4" />
            <span>
              {t("noCustomRolesBefore")}{" "}
              <span className="text-primary underline underline-offset-2">
                {t("createOne")}
              </span>{" "}
              {t("noCustomRolesAfter")}
            </span>
          </button>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {customList.map((role) => {
              const active = assignedCustomIds.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleCustomRole(role.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                    active
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : cn("hover:bg-muted border-border/60", role.accent),
                  )}
                  title={role.description || undefined}
                >
                  <Sparkles className="size-3" />
                  {role.label}
                  <span
                    className={cn(
                      "text-[10px] font-normal",
                      active
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground",
                    )}
                  >
                    · {Object.keys(role.permissions).length}
                  </span>
                  {active && <X className="size-3 opacity-70" />}
                </button>
              );
            })}
          </div>
        )}

        <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-[11px]">
          <span>{t("editExisting")}</span>
          <Link
            href={settingsPath("roles-permissions")}
            className="text-primary inline-flex items-center gap-0.5 hover:underline"
          >
            {t("openRolesStudio")} <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>

      <Separator />

      <CustomRoleQuickCreateDialog
        open={createRoleOpen}
        onOpenChange={setCreateRoleOpen}
        onCreated={(role) => {
          update("customRoleIds", [...assignedCustomIds, role.id]);
        }}
      />

      <div>
        <SectionHeader
          title={t("serviceAssignments")}
          hint={t("hintServices")}
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICE_ORDER.map((svc) => {
            const meta = SERVICE_MODULE_META[svc];
            const active = draft.serviceAssignments.includes(svc);
            const toggle = () =>
              update(
                "serviceAssignments",
                active
                  ? draft.serviceAssignments.filter((s) => s !== svc)
                  : [...draft.serviceAssignments, svc],
              );
            return (
              <div
                key={svc}
                role="checkbox"
                aria-checked={active}
                tabIndex={0}
                onClick={toggle}
                onKeyDown={(e) =>
                  (e.key === " " || e.key === "Enter") && toggle()
                }
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-left transition-all select-none",
                  active
                    ? "border-primary ring-primary/20 bg-card shadow-sm ring-1"
                    : "border-border/60 bg-card/50",
                )}
              >
                <div className={cn("rounded-md p-1.5", meta.tone)}>
                  <ServiceIcon module={svc} className="size-4" />
                </div>
                <div className="text-sm font-medium">{meta.label}</div>
                <Checkbox
                  checked={active}
                  tabIndex={-1}
                  className="pointer-events-none ml-auto"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Locations
// ============================================================================

export function LocationsSection({
  draft,
  update,
}: {
  draft: StaffProfile;
  update: SectionUpdate;
}) {
  const { t } = useStaffText("formSections");
  return (
    <div className="space-y-4">
      <SectionHeader title={t("workingLocations")} hint={t("hintLocations")} />
      <div className="grid gap-2">
        {FACILITY_LOCATIONS.map((loc) => {
          const active = draft.assignedLocations.includes(loc.id);
          return (
            <label
              key={loc.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                active
                  ? "border-primary ring-primary/20 bg-card shadow-sm ring-1"
                  : "border-border/60 bg-card/50 hover:bg-card",
              )}
            >
              <Checkbox
                checked={active}
                onCheckedChange={() =>
                  update(
                    "assignedLocations",
                    active
                      ? draft.assignedLocations.filter((id) => id !== loc.id)
                      : [...draft.assignedLocations, loc.id],
                  )
                }
              />
              <MapPin className="text-muted-foreground size-4" />
              <span className="text-sm font-medium">{loc.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Access & overrides
// ============================================================================

export function AccessSection({
  draft,
  update,
}: {
  draft: StaffProfile;
  update: SectionUpdate;
}) {
  const { t, fill } = useStaffText("formSections");
  const permissionText = usePermissionText();
  const groupedPerms = useMemo(
    () => PERMISSION_GROUPS.filter((g) => g.id !== "core"),
    [],
  );

  function setOverride(
    key: PermissionKey,
    next: { granted: boolean; scope: AccessScope },
  ) {
    // Withheld — the controls are hidden, but refuse here too. Writing back a
    // map built from nothing would delete every override this caller was not
    // allowed to see.
    if (!draft.permissionOverrides) return;
    const overrides = { ...draft.permissionOverrides };
    const resolved = resolvePermission(
      { ...draft, permissionOverrides: {} },
      key,
    );
    if (resolved.granted === next.granted && resolved.scope === next.scope) {
      delete overrides[key];
    } else {
      overrides[key] = next;
    }
    update("permissionOverrides", overrides);
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionHeader title={t("calendar")} />
        <div className="mt-3 space-y-3">
          <ToggleRow
            icon={Eye}
            title={t("showOnCalendar")}
            description={t("showOnCalendarHelp")}
            checked={draft.showOnCalendar}
            onToggle={(v) => update("showOnCalendar", v)}
          />
          <div className="border-border/60 bg-card rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">
                  {t("otherCalendars")}
                </div>
                <div className="text-muted-foreground text-xs">
                  {t("otherCalendarsHelp")}
                </div>
              </div>
              <Select
                value={draft.calendarAccess.mode}
                onValueChange={(v) =>
                  update(
                    "calendarAccess",
                    v === "all"
                      ? { mode: "all" }
                      : v === "none"
                        ? { mode: "none" }
                        : { mode: "selected", staffIds: [] },
                  )
                }
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allWorkingStaff")}</SelectItem>
                  <SelectItem value="selected">
                    {t("selectedStaffOnly")}
                  </SelectItem>
                  <SelectItem value="none">{t("none")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title={t("clockInOut")} />
        <div className="mt-3">
          <ToggleRow
            icon={KeyRound}
            title={t("requireCode")}
            description={t("requireCodeHelp")}
            checked={draft.clockIn.requireAccessCode}
            onToggle={(v) =>
              update(
                "clockIn",
                v
                  ? {
                      requireAccessCode: true,
                      accessCode: draft.clockIn.accessCode ?? "",
                    }
                  : { requireAccessCode: false },
              )
            }
          />
          {draft.clockIn.requireAccessCode && (
            <div className="mt-2">
              <FieldRow label="4-digit code">
                {draft.clockIn.accessCode === undefined ? (
                  // A code is required but was not sent — withheld, not blank.
                  // An empty box would look like "no code set" and saving it
                  // would replace this person's real code with nothing.
                  <WithheldNotice
                    permission={permissionText.permission("manage_staff")}
                  />
                ) : (
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    value={draft.clockIn.accessCode}
                    onChange={(e) =>
                      update("clockIn", {
                        requireAccessCode: true,
                        accessCode: e.target.value,
                      })
                    }
                    placeholder="4421"
                    className="max-w-[120px] font-mono"
                  />
                )}
              </FieldRow>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <SectionHeader
          title={t("permissionOverrides")}
          hint={t("hintOverrides")}
        />
        {!draft.permissionOverrides && (
          <div className="mt-2">
            <WithheldNotice
              permission={permissionText.permission("view_staff_permissions")}
            />
          </div>
        )}
        <div className="mt-2 space-y-4" hidden={!draft.permissionOverrides}>
          {groupedPerms.map((g) => (
            <div
              key={g.id}
              className="border-border/60 bg-card/60 rounded-xl border p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {permissionText.group(g)}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {permissionText.groupHelp(g)}
                  </div>
                </div>
              </div>
              <div className="divide-border/50 divide-y">
                {g.permissions.map((p) => {
                  const resolved = resolvePermission(draft, p.key);
                  return (
                    <div
                      key={p.key}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">
                          {permissionText.permission(p.key)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={resolved.granted ? resolved.scope : "none"}
                          onValueChange={(v) =>
                            setOverride(
                              p.key,
                              v === "none"
                                ? { granted: false, scope: "none" }
                                : { granted: true, scope: v as AccessScope },
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-40 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="anytime">
                              {permissionText.scope("anytime")}
                            </SelectItem>
                            <SelectItem value="operating_hours">
                              {permissionText.scope("operating_hours")}
                            </SelectItem>
                            <SelectItem value="assigned_shifts">
                              {permissionText.scope("assigned_shifts")}
                            </SelectItem>
                            <SelectItem value="none">
                              {permissionText.scope("none")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {draft.permissionOverrides?.[p.key] && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            <Sparkles className="size-3" />
                            {t("override")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-border/60 bg-muted/30 rounded-xl border p-4">
        <div className="text-muted-foreground flex items-start gap-2 text-xs">
          <Lock className="text-primary size-3.5 shrink-0" />
          <div>
            <span className="text-foreground font-medium">
              {t("alwaysOnLabel")}
            </span>{" "}
            {/* The permission NAMES go through the shared catalogue rather
                than a regex over their slugs — `p.replace(/_/g, " ")`
                capitalises an identifier and calls it a label, which is the
                defect this area has now hit a dozen times. */}
            {fill("alwaysOnBody", {
              list: ALWAYS_ON_PERMISSIONS.map((p) =>
                permissionText.permission(p),
              ).join(", "),
            })}
            {t("cannotDisable")}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Notifications
// ============================================================================

export function NotificationsSection({
  draft,
  update,
}: {
  draft: StaffProfile;
  update: SectionUpdate;
}) {
  const { t } = useStaffText("formSections");
  const notif = useNotificationEventLabel();

  const grouped = useMemo(() => {
    const byGroup = new Map<string, NotificationEvent[]>();
    for (const [key, meta] of Object.entries(NOTIFICATION_EVENT_META)) {
      if (!byGroup.has(meta.group)) byGroup.set(meta.group, []);
      byGroup.get(meta.group)!.push(key as NotificationEvent);
    }
    return Array.from(byGroup.entries());
  }, []);

  function setScope(event: NotificationEvent, scope: NotificationScope) {
    update("notifications", { ...draft.notifications, [event]: scope });
  }

  return (
    <div className="space-y-5">
      <SectionHeader title={t("notifyWhen")} hint={t("hintNotifications")} />
      {grouped.map(([group, events]) => (
        <div key={group}>
          <div className="text-muted-foreground mb-2 text-xs font-medium">
            {notif.group(group)}
          </div>
          <div className="space-y-1.5">
            {events.map((event) => (
              <div
                key={event}
                className="border-border/60 bg-card flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm">{notif.event(event)}</span>
                <Select
                  value={draft.notifications[event]}
                  onValueChange={(v) => setScope(event, v as NotificationScope)}
                >
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="related_to_them">
                      {t("scopeRelated")}
                    </SelectItem>
                    <SelectItem value="at_working_business">
                      {t("scopeAtBusiness")}
                    </SelectItem>
                    <SelectItem value="do_not_notify">
                      {t("scopeDoNot")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Payroll
// ============================================================================

export function PayrollSection({
  draft,
  update,
}: {
  draft: StaffProfile;
  update: SectionUpdate;
}) {
  // No inputs at all when the figures were withheld.
  //
  // Rendering them with zeroes would be worse than useless: the draft is what
  const { t } = useStaffText("formSections");
  const permissionText = usePermissionText();

  // Save writes back, so an editor without `view_payroll` would silently reset
  // this person's real hourly rate and commission to nothing. Absent has to
  // stay absent all the way through the form.
  const payroll = draft.payroll;
  if (!payroll) {
    return (
      <div className="space-y-5">
        <SectionHeader title={t("compensation")} hint={t("hintPayroll")} />
        <WithheldNotice
          permission={permissionText.permission("view_payroll")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader title={t("compensation")} hint={t("hintPayroll")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <FieldRow label={t("serviceCommission")}>
          <Input
            type="number"
            min={0}
            max={100}
            value={payroll.generalServiceCommission}
            onChange={(e) =>
              update("payroll", {
                ...payroll,
                generalServiceCommission: Number(e.target.value),
              })
            }
          />
        </FieldRow>
        <FieldRow label={t("hourlyRate")}>
          <Input
            type="number"
            min={0}
            value={payroll.hourlyRate}
            onChange={(e) =>
              update("payroll", {
                ...payroll,
                hourlyRate: Number(e.target.value),
              })
            }
          />
        </FieldRow>
        <FieldRow label={t("tipsRetained")}>
          <Input
            type="number"
            min={0}
            max={100}
            value={payroll.tipsRate}
            onChange={(e) =>
              update("payroll", {
                ...payroll,
                tipsRate: Number(e.target.value),
              })
            }
          />
        </FieldRow>
      </div>
      <div className="text-muted-foreground border-border/60 flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs">
        <Clock className="text-primary mt-0.5 size-3.5 shrink-0" />
        <div>{t("compensationHelp")}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Shared field helpers
// ============================================================================

/**
 * Stands in for a field the server did not send.
 *
 * Says WITHHELD rather than showing an empty control, because an empty control
 * is both a lie ("there is nothing here") and a hazard — the draft is what
 * Save writes back, so an editable blank would overwrite the real value with
 * nothing.
 */
export function WithheldNotice({ permission }: { permission: string }) {
  const { fill } = useStaffText("formSections");
  return (
    <div className="text-muted-foreground border-border/60 rounded-lg border border-dashed px-3 py-2.5 text-xs">
      {fill("withheld", { permission })}
    </div>
  );
}

export function SectionHeader({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
    </div>
  );
}

export function FieldRow({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onToggle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div className="border-border/60 bg-card flex items-center justify-between rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 text-primary rounded-lg p-2">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {description}
          </div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );
}
