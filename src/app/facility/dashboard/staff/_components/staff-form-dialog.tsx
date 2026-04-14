"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import {
  ROLE_META,
  SERVICE_MODULE_META,
  PERMISSION_GROUPS,
  ALWAYS_ON_PERMISSIONS,
  NOTIFICATION_EVENT_META,
  ROLE_PRESETS,
  buildDefaultNotifications,
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
import { RoleIcon, ServiceIcon } from "./staff-shared";

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

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "role", label: "Role & services", icon: Sparkles },
  { id: "locations", label: "Locations", icon: MapPin },
  { id: "access", label: "Access & overrides", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "payroll", label: "Payroll", icon: Wallet },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const PRESET_COLORS = [
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

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: StaffProfile | null;
  onSave: (profile: StaffProfile) => void;
}

function emptyProfile(): StaffProfile {
  return {
    id: `fs-${Math.random().toString(36).slice(2, 9)}`,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    colorHex: PRESET_COLORS[0],
    primaryRole: "reception",
    additionalRoles: [],
    serviceAssignments: ROLE_PRESETS.reception.services,
    assignedLocations: [FACILITY_LOCATIONS[0].id],
    showOnCalendar: true,
    calendarAccess: { mode: "all" },
    clockIn: { requireAccessCode: false },
    permissionOverrides: {},
    notifications: buildDefaultNotifications("reception"),
    payroll: {
      generalServiceCommission: 0,
      hourlyRate: 0,
      tipsRate: 0,
      overrides: [],
    },
    employment: {
      hireDate: new Date().toISOString().split("T")[0],
      employmentType: "full_time",
      notes: "",
    },
    status: "invited",
    lastActive: new Date().toISOString(),
    upcomingAppointments: 0,
    openTasks: 0,
  };
}

export function StaffFormDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: StaffFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <StaffFormDialogBody
        key={editing?.id ?? "new"}
        open={open}
        onOpenChange={onOpenChange}
        editing={editing}
        onSave={onSave}
      />
    </Dialog>
  );
}

function StaffFormDialogBody({
  onOpenChange,
  editing,
  onSave,
}: StaffFormDialogProps) {
  const [section, setSection] = useState<SectionId>("profile");
  const [draft, setDraft] = useState<StaffProfile>(
    () => editing ?? emptyProfile(),
  );

  function update<K extends keyof StaffProfile>(
    key: K,
    value: StaffProfile[K],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function onRoleChange(role: FacilityStaffRole) {
    const preset = ROLE_PRESETS[role];
    setDraft((d) => ({
      ...d,
      primaryRole: role,
      serviceAssignments: Array.from(
        new Set([
          ...preset.services,
          ...d.additionalRoles.flatMap((r) => ROLE_PRESETS[r].services),
        ]),
      ),
      notifications: buildDefaultNotifications(role),
      permissionOverrides: {},
    }));
  }

  function toggleAdditionalRole(role: FacilityStaffRole) {
    setDraft((d) => {
      const has = d.additionalRoles.includes(role);
      const additionalRoles = has
        ? d.additionalRoles.filter((r) => r !== role)
        : [...d.additionalRoles, role];
      const services = Array.from(
        new Set([
          ...ROLE_PRESETS[d.primaryRole].services,
          ...additionalRoles.flatMap((r) => ROLE_PRESETS[r].services),
        ]),
      );
      return { ...d, additionalRoles, serviceAssignments: services };
    });
  }

  return (
    <DialogContent
      className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0"
      style={{ maxWidth: "min(64rem, 95vw)" }}
    >
      <DialogHeader className="bg-card/50 border-b px-6 py-4 backdrop-blur-sm">
        <DialogTitle className="text-lg">
          {editing ? "Edit staff profile" : "Add new staff"}
        </DialogTitle>
        <DialogDescription>
          {editing
            ? "Update role, services, and per-permission access."
            : "Create a luxurious, role-based profile with fine-grained access."}
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <nav className="bg-muted/40 hidden w-56 shrink-0 border-r p-3 md:block">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={cn(
                  "mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-background text-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:bg-background/60",
                )}
              >
                <Icon className="size-4" />
                {s.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile section select */}
        <div className="md:hidden">
          <div className="p-3">
            <Select
              value={section}
              onValueChange={(v) => setSection(v as SectionId)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {section === "profile" && (
            <ProfileSection draft={draft} update={update} />
          )}
          {section === "role" && (
            <RoleSection
              draft={draft}
              update={update}
              onRoleChange={onRoleChange}
              toggleAdditionalRole={toggleAdditionalRole}
            />
          )}
          {section === "locations" && (
            <LocationsSection draft={draft} update={update} />
          )}
          {section === "access" && (
            <AccessSection draft={draft} update={update} />
          )}
          {section === "notifications" && (
            <NotificationsSection draft={draft} update={update} />
          )}
          {section === "payroll" && (
            <PayrollSection draft={draft} update={update} />
          )}
        </div>
      </div>

      <DialogFooter className="border-t px-6 py-3">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onSave(draft);
            onOpenChange(false);
          }}
        >
          {editing ? "Save changes" : "Create staff"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================================
// Sections
// ============================================================================

function ProfileSection({
  draft,
  update,
}: {
  draft: StaffProfile;
  update: <K extends keyof StaffProfile>(k: K, v: StaffProfile[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader title="Basic information" />
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label="First name">
          <Input
            value={draft.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            placeholder="Émilie"
          />
        </FieldRow>
        <FieldRow label="Last name">
          <Input
            value={draft.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            placeholder="Laurent"
          />
        </FieldRow>
        <FieldRow
          label="Email"
          hint="An invitation is sent here. Shown on their app login."
        >
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </FieldRow>
        <FieldRow label="Phone">
          <Input
            value={draft.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </FieldRow>
      </div>

      <FieldRow label="Color code" hint="Used on calendar and mobile map pins.">
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
      <SectionHeader title="Employment" />
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label="Hire date">
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
        <FieldRow label="Employment type">
          <Select
            value={draft.employment.employmentType}
            onValueChange={(v) =>
              update("employment", {
                ...draft.employment,
                employmentType:
                  v as StaffProfile["employment"]["employmentType"],
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full_time">Full-time</SelectItem>
              <SelectItem value="part_time">Part-time</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
              <SelectItem value="seasonal">Seasonal</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </div>
      <FieldRow
        label="Internal notes"
        hint="Visible to managers and owners only."
      >
        <Textarea
          rows={3}
          value={draft.employment.notes}
          onChange={(e) =>
            update("employment", {
              ...draft.employment,
              notes: e.target.value,
            })
          }
          placeholder="e.g. Overnight shifts only, handles hand stripping."
        />
      </FieldRow>
    </div>
  );
}

function RoleSection({
  draft,
  update,
  onRoleChange,
  toggleAdditionalRole,
}: {
  draft: StaffProfile;
  update: <K extends keyof StaffProfile>(k: K, v: StaffProfile[K]) => void;
  onRoleChange: (r: FacilityStaffRole) => void;
  toggleAdditionalRole: (r: FacilityStaffRole) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <SectionHeader
          title="Primary role"
          hint="Drives the default permission set. Additional roles layer on top."
        />
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
          title="Additional roles"
          hint="Someone who grooms AND is a kennel attendant? Add both — permissions union."
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ROLE_ORDER.filter((r) => r !== draft.primaryRole).map((role) => {
            const active = draft.additionalRoles.includes(role);
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleAdditionalRole(role)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-all",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 hover:bg-muted",
                )}
              >
                <RoleIcon role={role} className="size-3" />
                {ROLE_META[role].label}
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      <div>
        <SectionHeader
          title="Service assignments"
          hint="Which operational areas this staff can see. Defaults come from roles."
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICE_ORDER.map((svc) => {
            const meta = SERVICE_MODULE_META[svc];
            const active = draft.serviceAssignments.includes(svc);
            return (
              <button
                type="button"
                key={svc}
                onClick={() =>
                  update(
                    "serviceAssignments",
                    active
                      ? draft.serviceAssignments.filter((s) => s !== svc)
                      : [...draft.serviceAssignments, svc],
                  )
                }
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-3 text-left transition-all",
                  active
                    ? "border-primary ring-primary/20 bg-card shadow-sm ring-1"
                    : "border-border/60 bg-card/50",
                )}
              >
                <div className={cn("rounded-md p-1.5", meta.tone)}>
                  <ServiceIcon module={svc} className="size-4" />
                </div>
                <div className="text-sm font-medium">{meta.label}</div>
                <Checkbox checked={active} className="ml-auto" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LocationsSection({
  draft,
  update,
}: {
  draft: StaffProfile;
  update: <K extends keyof StaffProfile>(k: K, v: StaffProfile[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="Working locations"
        hint="Staff only see calendars, clients, and pets at assigned locations."
      />
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

function AccessSection({
  draft,
  update,
}: {
  draft: StaffProfile;
  update: <K extends keyof StaffProfile>(k: K, v: StaffProfile[K]) => void;
}) {
  const groupedPerms = useMemo(
    () => PERMISSION_GROUPS.filter((g) => g.id !== "core"),
    [],
  );

  function setOverride(
    key: PermissionKey,
    next: { granted: boolean; scope: AccessScope },
  ) {
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
        <SectionHeader title="Calendar" />
        <div className="mt-3 space-y-3">
          <ToggleRow
            icon={Eye}
            title="Show on calendar"
            description="Appears as a bookable resource. Turn off for admin / back-office."
            checked={draft.showOnCalendar}
            onToggle={(v) => update("showOnCalendar", v)}
          />
          <div className="border-border/60 bg-card rounded-xl border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">
                  Access other staff calendars
                </div>
                <div className="text-muted-foreground text-xs">
                  Who they can view on the shared calendar.
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
                  <SelectItem value="all">
                    All working-business staff
                  </SelectItem>
                  <SelectItem value="selected">Selected staff only</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Clock in / out" />
        <div className="mt-3">
          <ToggleRow
            icon={KeyRound}
            title="Require access code"
            description="For shared devices at the front desk — prevents accidental clock-ins."
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
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={draft.clockIn.accessCode ?? ""}
                  onChange={(e) =>
                    update("clockIn", {
                      requireAccessCode: true,
                      accessCode: e.target.value,
                    })
                  }
                  placeholder="4421"
                  className="max-w-[120px] font-mono"
                />
              </FieldRow>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <SectionHeader
          title="Permission overrides"
          hint="Fine-grained per-permission. Scope controls when access is active."
        />
        <div className="mt-2 space-y-4">
          {groupedPerms.map((g) => (
            <div
              key={g.id}
              className="border-border/60 bg-card/60 rounded-xl border p-3"
            >
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{g.label}</div>
                  <div className="text-muted-foreground text-xs">
                    {g.description}
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
                        <div className="text-sm">{p.label}</div>
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
                            <SelectItem value="anytime">Anytime</SelectItem>
                            <SelectItem value="operating_hours">
                              Operating hours
                            </SelectItem>
                            <SelectItem value="assigned_shifts">
                              Assigned shifts
                            </SelectItem>
                            <SelectItem value="none">No access</SelectItem>
                          </SelectContent>
                        </Select>
                        {draft.permissionOverrides[p.key] && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                            <Sparkles className="size-3" />
                            override
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
              Always-on permissions:
            </span>{" "}
            every account has{" "}
            {ALWAYS_ON_PERMISSIONS.map((p) => p.replace(/_/g, " ")).join(", ")}.
            These can&apos;t be disabled.
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsSection({
  draft,
  update,
}: {
  draft: StaffProfile;
  update: <K extends keyof StaffProfile>(k: K, v: StaffProfile[K]) => void;
}) {
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
      <SectionHeader
        title="Notify them when…"
        hint="Control what shows up in their Notification Center."
      />
      {grouped.map(([group, events]) => (
        <div key={group}>
          <div className="text-muted-foreground mb-2 text-xs font-medium">
            {group}
          </div>
          <div className="space-y-1.5">
            {events.map((event) => (
              <div
                key={event}
                className="border-border/60 bg-card flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm">
                  {NOTIFICATION_EVENT_META[event].label}
                </span>
                <Select
                  value={draft.notifications[event]}
                  onValueChange={(v) => setScope(event, v as NotificationScope)}
                >
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="related_to_them">
                      Related to them
                    </SelectItem>
                    <SelectItem value="at_working_business">
                      At working business
                    </SelectItem>
                    <SelectItem value="do_not_notify">Do not notify</SelectItem>
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

function PayrollSection({
  draft,
  update,
}: {
  draft: StaffProfile;
  update: <K extends keyof StaffProfile>(k: K, v: StaffProfile[K]) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Compensation"
        hint="Drives payroll reports and commission tracking."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <FieldRow label="Service commission (%)">
          <Input
            type="number"
            min={0}
            max={100}
            value={draft.payroll.generalServiceCommission}
            onChange={(e) =>
              update("payroll", {
                ...draft.payroll,
                generalServiceCommission: Number(e.target.value),
              })
            }
          />
        </FieldRow>
        <FieldRow label="Hourly rate ($)">
          <Input
            type="number"
            min={0}
            value={draft.payroll.hourlyRate}
            onChange={(e) =>
              update("payroll", {
                ...draft.payroll,
                hourlyRate: Number(e.target.value),
              })
            }
          />
        </FieldRow>
        <FieldRow label="Tips retained (%)">
          <Input
            type="number"
            min={0}
            max={100}
            value={draft.payroll.tipsRate}
            onChange={(e) =>
              update("payroll", {
                ...draft.payroll,
                tipsRate: Number(e.target.value),
              })
            }
          />
        </FieldRow>
      </div>
      <div className="text-muted-foreground border-border/60 flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs">
        <Clock className="text-primary mt-0.5 size-3.5 shrink-0" />
        <div>
          Commission applies on collected service + add-on revenue. Hourly
          calculates from clock in/out. Tips are passed through from assigned
          appointments.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tiny helpers
// ============================================================================

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {hint && <p className="text-muted-foreground mt-0.5 text-xs">{hint}</p>}
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
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
