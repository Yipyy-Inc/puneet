"use client";

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
  Pencil,
  Trash2,
  RefreshCw,
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
import { useFacilityRbac } from "@/hooks/use-facility-rbac";

interface StaffCardProps {
  profile: StaffProfile;
  onView: (p: StaffProfile) => void;
  onEdit: (p: StaffProfile) => void;
  onInvite: (p: StaffProfile) => void;
  onTransfer: (p: StaffProfile) => void;
  onDelete: (p: StaffProfile) => void;
  onStatusChange: (p: StaffProfile) => void;
}

export function StaffCard({
  profile,
  onView,
  onEdit,
  onInvite,
  onTransfer,
  onDelete,
  onStatusChange,
}: StaffCardProps) {
  const { viewer } = useFacilityRbac();
  const canSeeAudit =
    viewer.primaryRole === "owner" || viewer.primaryRole === "manager";
  const latestEntry = canSeeAudit
    ? getLatestStaffAuditEntry(profile.id)
    : null;

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
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <DropdownMenuItem onClick={() => onView(profile)}>
                    <Eye className="size-4" /> View details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(profile)}>
                    <Pencil className="size-4" /> Edit profile
                  </DropdownMenuItem>
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
            </div>
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
              <span className="font-medium">{latestEntry.actorName.split(" ")[0]}</span>
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
