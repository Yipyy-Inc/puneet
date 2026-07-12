"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { FacilityRbacProvider, usePermission } from "@/hooks/use-facility-rbac";
import {
  ROLE_META,
  type PermissionKey,
  type StaffProfile,
} from "@/types/facility-staff";
import { facilityStaff, FACILITY_LOCATIONS } from "@/data/facility-staff";
import {
  RolePill,
  StaffAvatar,
  fullNameOf,
  formatRelative,
} from "../_components/staff-shared";
import { StaffPermissionEditor } from "@/components/facility/StaffPermissionEditor";
import { EmployeeFilesTab } from "../_components/employee-files-tab";
import { WriteUpsTab } from "../_components/write-ups-tab";
import {
  ScheduleTab,
  OnboardingTab,
  NotesTab,
  PerformanceTab,
  type ShiftItem,
  type NoteEntry,
} from "./staff-profile-tabs";
import {
  useOnboarding,
  getOnboarding,
  initOnboarding,
} from "@/data/staff-onboarding";

// Table 19 tab definitions. `require` is the minimum permission to see the tab —
// Permissions is Admin+ (manage_roles), the rest Manager+.
const TAB_DEFS: { id: string; label: string; require: PermissionKey }[] = [
  { id: "overview", label: "Overview", require: "view_staff" },
  { id: "schedule", label: "Schedule", require: "scheduling_view_all" },
  { id: "permissions", label: "Permissions", require: "manage_roles" },
  { id: "documents", label: "Documents", require: "manage_staff" },
  { id: "onboarding", label: "Onboarding", require: "manage_onboarding" },
  { id: "writeups", label: "Write-Ups", require: "manage_writeups" },
  { id: "notes", label: "Notes", require: "view_staff" },
  {
    id: "performance",
    label: "Performance",
    require: "view_staff_performance",
  },
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
    label: "Inactive",
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
  const canSchedule = usePermission("scheduling_view_all");
  const canManageRoles = usePermission("manage_roles");
  const canManageStaff = usePermission("manage_staff");
  const canOnboarding = usePermission("manage_onboarding");
  const canWriteups = usePermission("manage_writeups");
  const canPerformance = usePermission("view_staff_performance");

  const allowed: Record<PermissionKey, boolean> = useMemo(
    () =>
      ({
        view_staff: canViewStaff,
        scheduling_view_all: canSchedule,
        manage_roles: canManageRoles,
        manage_staff: canManageStaff,
        manage_onboarding: canOnboarding,
        manage_writeups: canWriteups,
        view_staff_performance: canPerformance,
      }) as Record<PermissionKey, boolean>,
    [
      canViewStaff,
      canSchedule,
      canManageRoles,
      canManageStaff,
      canOnboarding,
      canWriteups,
      canPerformance,
    ],
  );

  // Lifted local state (survives tab switches; mock only).
  const [shifts, setShifts] = useState<ShiftItem[]>([]);
  const [internalNote, setInternalNote] = useState(
    () => staff?.employment.notes ?? "",
  );
  const [noteLog, setNoteLog] = useState<NoteEntry[]>([]);

  // Onboarding checklist (store-backed, Area F). Seed an invited hire's default.
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

  const [active, setActive] = useState("overview");

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

  const visibleTabs = TAB_DEFS.filter((t) => allowed[t.require]);
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

      {/* Tabs */}
      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="flex-wrap">
          {visibleTabs.map((t) => (
            <TabsTrigger key={t.id} value={t.id}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab
            staff={staff}
            locationLabels={locationLabels}
            onboardingPct={onboardingPct}
          />
        </TabsContent>

        {allowed.scheduling_view_all && (
          <TabsContent value="schedule" className="mt-4">
            <ScheduleTab
              shifts={shifts}
              onAdd={(shift) =>
                setShifts((prev) => [
                  ...prev,
                  { ...shift, id: `sh-${prev.length}-${shift.date}` },
                ])
              }
              onRemove={(id) =>
                setShifts((prev) => prev.filter((s) => s.id !== id))
              }
            />
          </TabsContent>
        )}

        {allowed.manage_roles && (
          <TabsContent value="permissions" className="mt-4">
            <StaffPermissionEditor staffId={staff.id} />
          </TabsContent>
        )}

        {allowed.manage_staff && (
          <TabsContent value="documents" className="mt-4">
            <EmployeeFilesTab profile={staff} />
          </TabsContent>
        )}

        {allowed.manage_onboarding && (
          <TabsContent value="onboarding" className="mt-4">
            <OnboardingTab staff={staff} />
          </TabsContent>
        )}

        {allowed.manage_writeups && (
          <TabsContent value="writeups" className="mt-4">
            <WriteUpsTab profile={staff} />
          </TabsContent>
        )}

        <TabsContent value="notes" className="mt-4">
          <NotesTab
            internalNote={internalNote}
            onSaveInternal={setInternalNote}
            log={noteLog}
            onAddLog={(body) =>
              setNoteLog((prev) => [
                {
                  id: `n-${prev.length}`,
                  body,
                  at: new Date().toISOString(),
                },
                ...prev,
              ])
            }
          />
        </TabsContent>

        {allowed.view_staff_performance && (
          <TabsContent value="performance" className="mt-4">
            <PerformanceTab profile={staff} onboardingPct={onboardingPct} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function OverviewTab({
  staff,
  locationLabels,
  onboardingPct,
}: {
  staff: StaffProfile;
  locationLabels: string[];
  onboardingPct: number;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="border-border/60 bg-card rounded-xl border p-4">
        <div className="mb-3 text-sm font-semibold">Contact</div>
        <dl className="space-y-2 text-sm">
          <Row label="Email" value={staff.email} />
          <Row label="Phone" value={staff.phone || "—"} />
          <Row
            label="Employment"
            value={staff.employment.employmentType.replace("_", "-")}
          />
          <Row
            label="Locations"
            value={
              locationLabels.length === FACILITY_LOCATIONS.length
                ? "All locations"
                : locationLabels.join(" · ") || "—"
            }
          />
        </dl>
      </div>

      <div className="border-border/60 bg-card rounded-xl border p-4">
        <div className="mb-3 text-sm font-semibold">At a glance</div>
        <dl className="space-y-2 text-sm">
          <Row
            label="Primary role"
            value={ROLE_META[staff.primaryRole].label}
          />
          <Row
            label="Upcoming shifts"
            value={String(staff.upcomingAppointments)}
          />
          <Row label="Open tasks" value={String(staff.openTasks)} />
          <Row label="Onboarding" value={`${onboardingPct}%`} />
        </dl>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
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
