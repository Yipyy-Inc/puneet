"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Scissors,
  Sun,
  Moon,
  Sparkles,
  Users,
  Dumbbell,
  MonitorSpeaker,
  UserCog,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import type { StaffProfile, FacilityStaffRole } from "@/types/facility-staff";
import {
  isOnboarded,
  timeOfDayGreetingKey,
  TodaySummary,
  MyScheduleWidget,
  MyTasksWidget,
  MyAlertsWidget,
  QuickActionsBar,
  OnboardingProgress,
  useQuickAccess,
} from "./employee-dashboard-widgets";
import {
  useOnboarding,
  getOnboarding,
  initOnboarding,
} from "@/data/staff-onboarding";
import { useEmploymentTypeLabel } from "@/lib/staff/use-employment-type-label";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { useServiceTypeLabel } from "@/lib/settings/use-service-types";
import {
  useStaffRoleLabel,
  useStaffRoleTagline,
} from "@/lib/settings/use-staff-role-label";

const ROLE_ICON: Record<FacilityStaffRole, React.ElementType> = {
  owner: UserCog,
  admin: UserCog,
  manager: Users,
  supervisor: Users,
  reception: MonitorSpeaker,
  groomer: Scissors,
  trainer: Dumbbell,
  caretaker: Moon,
  daycare_attendant: Sun,
  boarding_attendant: Moon,
  retail: Sparkles,
  accountant: MonitorSpeaker,
  sanitation: Sparkles,
};

const ROLE_GRADIENT: Record<FacilityStaffRole, string> = {
  owner: "from-amber-500 to-orange-500",
  admin: "from-amber-500 to-orange-500",
  manager: "from-violet-500 to-purple-600",
  supervisor: "from-purple-500 to-violet-600",
  reception: "from-sky-500 to-blue-600",
  groomer: "from-rose-500 to-pink-600",
  trainer: "from-emerald-500 to-green-600",
  caretaker: "from-cyan-500 to-teal-600",
  daycare_attendant: "from-orange-400 to-amber-500",
  boarding_attendant: "from-indigo-500 to-blue-700",
  retail: "from-fuchsia-500 to-pink-600",
  accountant: "from-lime-500 to-green-600",
  sanitation: "from-teal-500 to-cyan-600",
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function EmployeeDashboard({ staff }: { staff: StaffProfile }) {
  const { t, fill } = useStaffText("employeeDashboard");
  const employmentTypeLabel = useEmploymentTypeLabel();
  const roleLabel = useStaffRoleLabel();
  const roleTagline = useStaffRoleTagline();
  const serviceLabel = useServiceTypeLabel();
  const role = staff.primaryRole;
  // Section 4C — Quick Access is derived from the viewer's permissions, never
  // hardcoded per role. Every shortcut is filtered by the same key(s) that gate
  // its destination, so it can never link to a blocked screen.
  const actions = useQuickAccess(role);
  const RoleIcon = ROLE_ICON[role];
  // Read the clock once at mount (purity: no argless Date in render body).
  const [greetingKey] = useState(() =>
    timeOfDayGreetingKey(new Date().getHours()),
  );
  const greeting = t(greetingKey);

  // Onboarding checklist (store-backed, Area F). Seed a role-appropriate default
  // for a new hire who doesn't have one yet.
  const onboarding = useOnboarding(staff.id);
  useEffect(() => {
    if (staff.status === "invited" && getOnboarding(staff.id).length === 0) {
      initOnboarding(staff.id, staff.primaryRole, staff.employment.hireDate);
    }
  }, [staff.id, staff.status, staff.primaryRole, staff.employment.hireDate]);

  const onboardingTotal = onboarding.length;
  const onboardingDone = onboarding.filter((t) => !!t.completedAt).length;
  const onboardingComplete =
    onboardingTotal === 0
      ? isOnboarded(staff)
      : onboardingDone === onboardingTotal;

  // One-time congrats when the checklist flips to complete this session.
  const prevComplete = useRef(onboardingComplete);
  useEffect(() => {
    if (!prevComplete.current && onboardingComplete && onboardingTotal > 0) {
      toast.success(t("onboardingCongrats"));
    }
    prevComplete.current = onboardingComplete;
    // `t` is in the deps because the effect READS it. Left out, the memo it
    // comes from is the pre-hydration English one forever — the same defect
    // `check:frozen-translator` catches in useMemo/useCallback, in the hook it
    // does not walk. Re-firing on a locale change is harmless: the ref guard
    // above already means the toast fires once.
  }, [onboardingComplete, onboardingTotal, t]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Welcome banner */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-linear-to-r ${ROLE_GRADIENT[role]} p-6 text-white shadow-md`}
      >
        <div className="flex items-center gap-4">
          <Avatar className="size-16 shadow-lg ring-2 ring-white/30">
            <AvatarImage src={staff.avatarUrl} />
            <AvatarFallback
              className="text-xl font-bold"
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
              }}
            >
              {getInitials(staff.firstName, staff.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white/80">{greeting},</p>
            <h1 className="text-2xl font-bold tracking-tight">
              {staff.firstName} {staff.lastName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="border-white/20 bg-white/20 text-white hover:bg-white/30"
              >
                <RoleIcon className="mr-1 size-3" />
                {roleLabel(role)}
              </Badge>
              {staff.additionalRoles.map((r) => (
                <Badge
                  key={r}
                  variant="secondary"
                  className="border-white/10 bg-white/10 text-xs text-white/80"
                >
                  +{roleLabel(r)}
                </Badge>
              ))}
              {onboardingComplete && (
                <Badge
                  variant="secondary"
                  className="border-white/20 bg-white/20 text-xs text-white"
                >
                  {t("onboardingComplete")} ✓
                </Badge>
              )}
            </div>
          </div>
          <div className="hidden text-right text-sm text-white/70 sm:block">
            <p>{staff.email}</p>
            <p className="mt-0.5">
              {staff.assignedLocations.length === 1
                ? t("oneLocation")
                : fill("locations", {
                    count: staff.assignedLocations.length,
                  })}
            </p>
          </div>
        </div>
        <p className="mt-3 max-w-xl text-sm text-white/80">
          {roleTagline(role)}
        </p>
        {/* decorative */}
        <div className="pointer-events-none absolute -top-8 -right-8 size-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-20 -bottom-10 size-32 rounded-full bg-white/5" />
      </div>

      {/* Onboarding Progress — prominent until complete (Area F) */}
      {!onboardingComplete && <OnboardingProgress staff={staff} />}

      {/* Today's Summary — time-of-day greeting + the day's chips */}
      <TodaySummary staff={staff} greeting={greeting} />

      {/* Quick Actions — the one role-contextual primary action */}
      <QuickActionsBar role={role} />

      {/* My Schedule · My Tasks · My Alerts */}
      <div className="grid gap-3 md:grid-cols-3">
        <MyScheduleWidget staff={staff} />
        <MyTasksWidget staff={staff} />
        <MyAlertsWidget staff={staff} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">{t("upcoming")}</p>
            <p className="mt-1 text-2xl font-bold">
              {staff.upcomingAppointments}
            </p>
            <p className="text-muted-foreground text-xs">{t("appointments")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">{t("openTasks")}</p>
            <p className="mt-1 text-2xl font-bold">{staff.openTasks}</p>
            <p className="text-muted-foreground text-xs">{t("toComplete")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">{t("employment")}</p>
            <p className="mt-1 text-sm font-semibold">
              {employmentTypeLabel(staff.employment.employmentType)}
            </p>
            <p className="text-muted-foreground text-xs">
              {fill("since", {
                year: new Date(staff.employment.hireDate).getFullYear(),
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">{t("services")}</p>
            <p className="mt-1 text-sm font-semibold">
              {fill("assigned", { count: staff.serviceAssignments.length })}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {staff.serviceAssignments.join(", ")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick-access cards */}
      <div>
        <h2 className="mb-3 font-semibold">{t("quickAccess")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href + action.titleKey}
                href={action.href}
                className="group block"
              >
                <Card className="hover:ring-primary/20 h-full cursor-pointer transition-all hover:shadow-md hover:ring-2">
                  <CardHeader className="pt-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="bg-muted flex size-9 items-center justify-center rounded-lg">
                        <Icon className={`size-5 ${action.accent}`} />
                      </div>
                      <ArrowRight className="text-muted-foreground size-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <CardTitle className="text-base">
                      {action.moduleId
                        ? serviceLabel(action.moduleId, t(action.titleKey))
                        : t(action.titleKey)}
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      {t(action.descriptionKey)}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Switch account helper */}
      <div className="rounded-xl border border-dashed p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{t("testingRole")}</p>
            <p className="text-muted-foreground text-xs">
              {t("testingRoleHelp")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            asChild
          >
            <Link href="/employee/select">
              <RefreshCw className="size-3.5" />
              {t("switchEmployee")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
