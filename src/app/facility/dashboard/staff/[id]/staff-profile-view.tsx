"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  CalendarClock,
  ClipboardList,
  CheckCircle2,
  ShieldAlert,
  Save,
} from "lucide-react";
import { FacilityRbacProvider, usePermission } from "@/hooks/use-facility-rbac";
import {
  ROLE_PRESETS,
  buildDefaultNotifications,
  type FacilityStaffRole,
  type PermissionKey,
  type StaffProfile,
} from "@/types/facility-staff";
import {
  facilityStaff,
  FACILITY_LOCATIONS,
  upsertFacilityStaff,
} from "@/data/facility-staff";
import {
  useOnboardingInstance,
  useOnboarding,
  getOnboarding,
  initOnboarding,
} from "@/data/staff-onboarding";
import { ReviewActivateDialog } from "../_components/review-activate-dialog";
import {
  RolePill,
  StaffAvatar,
  fullNameOf,
  formatRelative,
} from "../_components/staff-shared";
import {
  ProfileSection,
  LocationsSection,
  AccessSection,
  NotificationsSection,
  PayrollSection,
  type SectionUpdate,
} from "../_components/staff-form-sections";
import { StaffRolesTab } from "../_components/staff-roles-tab";
import { StaffAvailabilityTab } from "../_components/staff-availability-tab";
import { StaffDocumentsTab } from "../_components/staff-documents-tab";
import { StaffTasksSection } from "../_components/staff-tasks-section";
import { OffboardingTab } from "../_components/offboarding-tab";
import { OnboardingTab, PerformanceTab } from "./staff-profile-tabs";

// Table 4 tab set. `require` is the minimum permission to see the tab.
const TAB_DEFS: { id: string; label: string; require: PermissionKey }[] = [
  { id: "profile", label: "Profile", require: "view_staff" },
  { id: "roles", label: "Roles & positions", require: "manage_roles" },
  { id: "locations", label: "Locations", require: "manage_staff" },
  { id: "onboarding", label: "Onboarding", require: "manage_onboarding" },
  { id: "access", label: "Access & overrides", require: "manage_roles" },
  { id: "availability", label: "Availability", require: "scheduling_view_all" },
  { id: "notifications", label: "Notifications", require: "manage_staff" },
  { id: "payroll", label: "Payroll", require: "view_payroll" },
  { id: "documents", label: "Documents", require: "manage_staff" },
  {
    id: "performance",
    label: "Performance",
    require: "view_staff_performance",
  },
  // Offboarding — only surfaced for terminated staff (see visibleTabs filter).
  { id: "offboarding", label: "Offboarding", require: "manage_onboarding" },
];

const STATUS_META: Record<
  StaffProfile["status"],
  { label: string; cls: string; dot: string }
> = {
  active: {
    label: "Active",
    cls: "border-emerald-200 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  invited: {
    label: "Invited",
    cls: "border-amber-200 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  inactive: {
    label: "On leave",
    cls: "border-zinc-200 text-zinc-600 dark:text-zinc-300",
    dot: "bg-zinc-400",
  },
  terminated: {
    label: "Former employee",
    cls: "border-rose-200 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

export function StaffProfileView({ staffId }: { staffId: string }) {
  return (
    <FacilityRbacProvider>
      <StaffProfileInner staffId={staffId} />
    </FacilityRbacProvider>
  );
}

function StaffProfileInner({ staffId }: { staffId: string }) {
  const staff = facilityStaff.find((s) => s.id === staffId);

  // Permission gates (stable hook order — one call per distinct key).
  const canViewStaff = usePermission("view_staff");
  const canManageRoles = usePermission("manage_roles");
  const canManageStaff = usePermission("manage_staff");
  const canOnboarding = usePermission("manage_onboarding");
  const canSchedule = usePermission("scheduling_view_all");
  const canViewPayroll = usePermission("view_payroll");
  const canPerformance = usePermission("view_staff_performance");

  const allowed: Record<PermissionKey, boolean> = useMemo(
    () =>
      ({
        view_staff: canViewStaff,
        manage_roles: canManageRoles,
        manage_staff: canManageStaff,
        manage_onboarding: canOnboarding,
        scheduling_view_all: canSchedule,
        view_payroll: canViewPayroll,
        view_staff_performance: canPerformance,
      }) as Record<PermissionKey, boolean>,
    [
      canViewStaff,
      canManageRoles,
      canManageStaff,
      canOnboarding,
      canSchedule,
      canViewPayroll,
      canPerformance,
    ],
  );

  // Editable draft — a clone so edits don't mutate the store until saved.
  const [draft, setDraft] = useState<StaffProfile | null>(() =>
    staff ? { ...staff } : null,
  );

  // Onboarding review/activation (derived pending-review state).
  const onboardingInstance = useOnboardingInstance(staffId);
  const pendingReview =
    staff?.status === "invited" &&
    Boolean(onboardingInstance?.submittedAt) &&
    !onboardingInstance?.reviewedAt;
  const [reviewOpen, setReviewOpen] = useState(false);
  const [, bumpProfile] = useReducer((x: number) => x + 1, 0);

  // Onboarding checklist (store-backed). Seed an invited hire's default.
  const onboarding = useOnboarding(staff?.id);
  useEffect(() => {
    if (
      staff &&
      staff.status === "invited" &&
      getOnboarding(staff.id).length === 0
    ) {
      initOnboarding(staff.id, staff.primaryRole, staff.employment.hireDate);
    }
  }, [staff]);

  const onboardingPct = useMemo(() => {
    const done = onboarding.filter((t) => !!t.completedAt).length;
    if (onboarding.length) return Math.round((done / onboarding.length) * 100);
    return staff && staff.status !== "invited" ? 100 : 0;
  }, [onboarding, staff]);

  const [active, setActive] = useState("profile");

  if (!staff) {
    return (
      <div className="text-muted-foreground flex h-60 flex-col items-center justify-center gap-2 text-sm">
        <ShieldAlert className="size-8" />
        Staff member not found.
        <Button asChild variant="outline" size="sm" className="mt-2">
          <Link href="/facility/dashboard/staff">Back to staff</Link>
        </Button>
      </div>
    );
  }

  if (!canViewStaff) {
    return (
      <div className="text-muted-foreground flex h-60 flex-col items-center justify-center gap-2 text-sm">
        <ShieldAlert className="size-8" />
        You don&apos;t have permission to view staff profiles.
      </div>
    );
  }

  const workingDraft = draft ?? staff;
  const dirty = JSON.stringify(workingDraft) !== JSON.stringify(staff);

  const update: SectionUpdate = (key, value) =>
    setDraft((d) => ({ ...(d ?? staff), [key]: value }));

  function onRoleChange(role: FacilityStaffRole) {
    setDraft((d) => {
      const base = d ?? staff;
      if (!base) return d;
      const additionalRoles = base.additionalRoles.filter((r) => r !== role);
      return {
        ...base,
        primaryRole: role,
        additionalRoles,
        serviceAssignments: Array.from(
          new Set([
            ...ROLE_PRESETS[role].services,
            ...additionalRoles.flatMap((r) => ROLE_PRESETS[r].services),
          ]),
        ),
        notifications: buildDefaultNotifications(role),
        permissionOverrides: {},
      };
    });
  }

  const saveProfile = () => {
    if (!draft) return;
    upsertFacilityStaff(draft);
    bumpProfile();
    toast.success(`${fullNameOf(draft)}'s profile updated`);
  };
  const discard = () => setDraft({ ...staff });

  const visibleTabs = TAB_DEFS.filter(
    (t) =>
      allowed[t.require] &&
      (t.id !== "offboarding" || staff.status === "terminated"),
  );
  const status = STATUS_META[staff.status];
  const locationLabels = staff.assignedLocations
    .map((id) => FACILITY_LOCATIONS.find((l) => l.id === id)?.label)
    .filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/facility/dashboard/staff">
          <ArrowLeft className="size-4" /> Back to staff
        </Link>
      </Button>

      {/* Profile header */}
      <div className="bg-card relative overflow-hidden rounded-2xl border p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <StaffAvatar profile={staff} size="xl" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">
                {fullNameOf(staff)}
              </h1>
              {staff.jobTitle && (
                <p className="text-muted-foreground text-sm font-medium">
                  {staff.jobTitle}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <RolePill role={staff.primaryRole} />
                {staff.additionalRoles.map((r) => (
                  <RolePill key={r} role={r} />
                ))}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    status.cls,
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", status.dot)} />
                  {status.label}
                </span>
              </div>
              <div className="text-muted-foreground mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
                <span className="flex items-center gap-2 truncate">
                  <Mail className="size-3.5 shrink-0" /> {staff.email}
                </span>
                <span className="flex items-center gap-2 truncate">
                  <Phone className="size-3.5 shrink-0" />{" "}
                  {staff.phone || "No phone"}
                </span>
                <span className="flex items-center gap-2 truncate sm:col-span-2">
                  <MapPin className="size-3.5 shrink-0" />
                  {locationLabels.length === FACILITY_LOCATIONS.length
                    ? "All locations"
                    : locationLabels.join(" · ") || "No locations"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 sm:w-auto">
            <QuickStat
              icon={CalendarClock}
              label="Upcoming shifts"
              value={staff.upcomingAppointments}
            />
            <QuickStat
              icon={ClipboardList}
              label="Open tasks"
              value={staff.openTasks}
            />
            <QuickStat
              icon={CheckCircle2}
              label="Onboarding"
              value={`${onboardingPct}%`}
            />
          </div>
        </div>
        <p className="text-muted-foreground mt-4 text-[11px]">
          Last active {formatRelative(staff.lastActive)} · Started{" "}
          {new Date(staff.employment.hireDate + "T00:00:00").toLocaleDateString(
            "en-US",
            { year: "numeric", month: "short", day: "numeric" },
          )}
        </p>
      </div>

      {/* Pending onboarding review — Review & activate */}
      {pendingReview && canOnboarding && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span className="font-medium">
              Onboarding complete — pending review
            </span>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => setReviewOpen(true)}
          >
            Review &amp; activate
          </Button>
        </div>
      )}

      <ReviewActivateDialog
        profile={reviewOpen ? staff : null}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onActivated={(next) => {
          upsertFacilityStaff(next);
          setDraft({ ...next });
          bumpProfile();
        }}
      />

      {/* Tabs */}
      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="flex-wrap">
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileSection draft={workingDraft} update={update} />
        </TabsContent>

        {allowed.manage_roles && (
          <TabsContent value="roles" className="mt-4">
            <StaffRolesTab
              draft={workingDraft}
              update={update}
              onRoleChange={onRoleChange}
            />
          </TabsContent>
        )}

        {allowed.manage_staff && (
          <TabsContent value="locations" className="mt-4">
            <LocationsSection draft={workingDraft} update={update} />
          </TabsContent>
        )}

        {allowed.manage_onboarding && (
          <TabsContent value="onboarding" className="mt-4">
            <OnboardingTab staff={staff} />
          </TabsContent>
        )}

        {allowed.manage_roles && (
          <TabsContent value="access" className="mt-4">
            <AccessSection draft={workingDraft} update={update} />
          </TabsContent>
        )}

        {allowed.scheduling_view_all && (
          <TabsContent value="availability" className="mt-4">
            <StaffAvailabilityTab staff={staff} />
          </TabsContent>
        )}

        {allowed.manage_staff && (
          <TabsContent value="notifications" className="mt-4">
            <NotificationsSection draft={workingDraft} update={update} />
          </TabsContent>
        )}

        {allowed.view_payroll && (
          <TabsContent value="payroll" className="mt-4">
            <PayrollSection draft={workingDraft} update={update} />
          </TabsContent>
        )}

        {allowed.manage_staff && (
          <TabsContent value="documents" className="mt-4">
            <StaffDocumentsTab staff={staff} />
          </TabsContent>
        )}

        {allowed.view_staff_performance && (
          <TabsContent value="performance" className="mt-4">
            <PerformanceTab profile={staff} onboardingPct={onboardingPct} />
          </TabsContent>
        )}

        {allowed.manage_onboarding && staff.status === "terminated" && (
          <TabsContent value="offboarding" className="mt-4">
            <OffboardingTab staff={staff} />
          </TabsContent>
        )}
      </Tabs>

      {/* Tasks — open work assigned to this employee, for manager context.
          Active employees only (departed staff have no live assignments). */}
      {staff.status === "active" && <StaffTasksSection staff={staff} />}

      {/* Sticky save bar — appears whenever the profile draft has edits */}
      {dirty && (
        <div className="bg-card sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg">
          <span className="text-muted-foreground text-sm">
            You have unsaved changes to {staff.firstName}&apos;s profile.
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={discard}>
              Discard
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={saveProfile}
            >
              <Save className="size-4" /> Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="border-border/60 bg-card/80 rounded-xl border p-3 text-center">
      <Icon className="text-muted-foreground mx-auto size-4" />
      <div className="mt-1 text-lg leading-none font-bold">{value}</div>
      <div className="text-muted-foreground mt-0.5 text-[10px]">{label}</div>
    </div>
  );
}
