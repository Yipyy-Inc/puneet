"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  Clock,
  ClipboardList,
  CalendarClock,
  UserPlus,
  ArrowLeftRight,
  Eye,
  ExternalLink,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Bell,
  AlertTriangle,
} from "lucide-react";
import type { StaffProfile } from "@/types/facility-staff";
import { FACILITY_LOCATIONS } from "@/data/facility-staff";
import {
  RolePill,
  ServiceChip,
  StaffAvatar,
  fullNameOf,
  formatRelative,
} from "./staff-shared";
import { StatusBadge } from "./status-change-dialog";
import { getLatestStaffAuditEntry } from "@/lib/staff-audit";
import { useFacilityRbac, usePermission } from "@/hooks/use-facility-rbac";
import {
  useOnboardingInstance,
  onboardingProgress,
  useStaffHrConfig,
  isOnboardingStarted,
  daysSinceInvite,
} from "@/data/staff-onboarding";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StaffCardProps {
  profile: StaffProfile;
  onView: (p: StaffProfile) => void;
  onEdit: (p: StaffProfile) => void;
  onInvite: (p: StaffProfile) => void;
  onTransfer: (p: StaffProfile) => void;
  onDelete: (p: StaffProfile) => void;
  onStatusChange: (p: StaffProfile) => void;
  onReview: (p: StaffProfile) => void;
  onRemind: (p: StaffProfile) => void;
}

export function StaffCard({
  profile,
  onView,
  onEdit,
  onInvite,
  onTransfer,
  onDelete,
  onStatusChange,
  onReview,
  onRemind,
}: StaffCardProps) {
  const { viewer } = useFacilityRbac();
  // Table 4 — editing staff requires manage_staff (admin: all-access fallback).
  const canManageStaff = usePermission("manage_staff");
  const canSeeAudit =
    viewer.primaryRole === "owner" || viewer.primaryRole === "manager";
  const latestEntry = canSeeAudit ? getLatestStaffAuditEntry(profile.id) : null;

  // Derived status: onboarding submitted, awaiting manager review/activation.
  const onboarding = useOnboardingInstance(profile.id);
  const pendingReview =
    profile.status === "invited" &&
    Boolean(onboarding?.submittedAt) &&
    !onboarding?.reviewedAt;
  const progress = onboardingProgress(onboarding);
  const progressPct =
    progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  // Table 5 — "not started after N days" staff-card alert (configurable).
  const notStartedCfg = useStaffHrConfig().notificationTriggers
    .onboarding_not_started;
  const daysInvited = onboarding ? daysSinceInvite(onboarding) : 0;
  const notStartedAlert =
    profile.status === "invited" &&
    !pendingReview &&
    notStartedCfg.enabled &&
    !!onboarding &&
    !isOnboardingStarted(onboarding) &&
    daysInvited >= (notStartedCfg.days ?? 3);

  const locationLabels = profile.assignedLocations
    .map((id) => FACILITY_LOCATIONS.find((l) => l.id === id)?.label)
    .filter(Boolean) as string[];

  return (
    <div
      onClick={() => onView(profile)}
      className={cn(
        "group bg-card relative cursor-pointer overflow-hidden rounded-2xl border",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
      )}
    >
      <div className="relative p-5">
        <div className="flex items-start gap-3">
          <StaffAvatar profile={profile} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-semibold tracking-tight">
                  {fullNameOf(profile)}
                </div>
                {profile.jobTitle && (
                  <div className="text-muted-foreground truncate text-xs font-medium">
                    {profile.jobTitle}
                  </div>
                )}
                <div className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                  <Clock className="size-3" />
                  Active {formatRelative(profile.lastActive)}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="size-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem onClick={() => onView(profile)}>
                    <Eye className="size-4" /> View details
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/facility/dashboard/staff/${profile.id}`}>
                      <ExternalLink className="size-4" /> Open full profile
                    </Link>
                  </DropdownMenuItem>
                  {canManageStaff && (
                    <DropdownMenuItem onClick={() => onEdit(profile)}>
                      <Pencil className="size-4" /> Edit profile
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onStatusChange(profile)}>
                    <RefreshCw className="size-4" /> Change status
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onInvite(profile)}>
                    <UserPlus className="size-4" />
                    {profile.status === "invited"
                      ? "Resend invitation"
                      : "Send invitation link"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTransfer(profile)}>
                    <ArrowLeftRight className="size-4" />
                    Transfer appointments
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(profile)}
                  >
                    <Trash2 className="size-4" /> Delete profile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <RolePill role={profile.primaryRole} />
              {profile.additionalRoles.map((r) => (
                <RolePill key={r} role={r} />
              ))}
              {(profile.status === "inactive" ||
                profile.status === "terminated") && (
                <StatusBadge status={profile.status} />
              )}
              {profile.status === "invited" && !pendingReview && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                    >
                      <span className="size-1.5 rounded-full bg-amber-400" />
                      Invited
                      {progress.total > 0
                        ? ` · ${progress.done}/${progress.total}`
                        : ""}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-64"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-sm font-medium">
                      Onboarding progress
                    </div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      {progress.done} of {progress.total} sections complete
                    </div>
                    <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-emerald-600 transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <Button
                      size="sm"
                      className="mt-3 w-full gap-1.5"
                      onClick={() => onRemind(profile)}
                    >
                      <Bell className="size-3.5" /> Remind employee
                    </Button>
                  </PopoverContent>
                </Popover>
              )}
              {notStartedAlert && (
                <span
                  title={`Invited ${daysInvited} days ago — onboarding not started`}
                  className="inline-flex items-center gap-1 rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                >
                  <AlertTriangle className="size-3" />
                  Not started · {daysInvited}d
                </span>
              )}
              {pendingReview && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Onboarding complete — pending review
                </span>
              )}
            </div>

            {pendingReview && (
              <Button
                size="sm"
                className="mt-3 w-full gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onReview(profile);
                }}
              >
                <CheckCircle2 className="size-4" /> Review &amp; activate
              </Button>
            )}
          </div>
        </div>

        {/* Services strip */}
        {profile.serviceAssignments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1">
            {profile.serviceAssignments.map((s) => (
              <ServiceChip key={s} module={s} />
            ))}
          </div>
        )}

        {/* Contact + location */}
        <div className="text-muted-foreground mt-4 grid grid-cols-1 gap-1.5 text-xs">
          <div className="flex items-center gap-2 truncate">
            <Mail className="size-3 shrink-0" /> {profile.email}
          </div>
          <div className="flex items-center gap-2 truncate">
            <Phone className="size-3 shrink-0" /> {profile.phone}
          </div>
          <div className="flex items-center gap-2 truncate">
            <MapPin className="size-3 shrink-0" />
            {locationLabels.length === FACILITY_LOCATIONS.length
              ? "All locations"
              : locationLabels.join(" · ") || "No locations"}
          </div>
        </div>

        {/* Footer metrics */}
        <div className="border-border/60 mt-4 grid grid-cols-2 gap-2 border-t pt-3">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 rounded-md p-1.5">
              <CalendarClock className="text-primary size-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">
                {profile.upcomingAppointments}
              </div>
              <div className="text-muted-foreground text-[10px]">Upcoming</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-amber-500/10 p-1.5">
              <ClipboardList className="size-3.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{profile.openTasks}</div>
              <div className="text-muted-foreground text-[10px]">
                Open tasks
              </div>
            </div>
          </div>
        </div>

        {/* Last-modified indicator (owner / manager only) */}
        {latestEntry && (
          <div className="border-border/40 bg-muted/30 mt-2 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5">
            <div className="size-1.5 shrink-0 rounded-full bg-violet-500/60" />
            <p className="text-muted-foreground truncate text-[10px]">
              <span className="font-medium">
                {latestEntry.actorName.split(" ")[0]}
              </span>
              {" · "}
              {latestEntry.action.replace(/_/g, " ")}
              {" · "}
              {formatRelative(latestEntry.timestamp)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
