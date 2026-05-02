"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Scissors,
  Dumbbell,
  Sun,
  Moon,
  Sparkles,
  MonitorSpeaker,
  UserCog,
  Users,
  ChevronRight,
} from "lucide-react";
import { setEmployeeStaffId } from "@/lib/role-utils";
import { facilityStaff } from "@/data/facility-staff";
import type { FacilityStaffRole } from "@/types/facility-staff";

// Map facility staff roles → FacilityRole used for the employee portal
const ROLE_GROUP_CONFIG: {
  role: FacilityStaffRole;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
}[] = [
  {
    role: "owner",
    label: "Owner / Admin",
    description: "Full access to all settings and financials",
    icon: UserCog,
    color: "text-amber-600",
  },
  {
    role: "manager",
    label: "Manager",
    description: "Operational oversight, limited financial view",
    icon: Users,
    color: "text-violet-600",
  },
  {
    role: "reception",
    label: "Reception / Front Desk",
    description: "Check-in/out, bookings, payments",
    icon: MonitorSpeaker,
    color: "text-sky-600",
  },
  {
    role: "groomer",
    label: "Groomer",
    description: "Grooming queue and notes for assigned pets",
    icon: Scissors,
    color: "text-rose-600",
  },
  {
    role: "trainer",
    label: "Trainer",
    description: "Training sessions and progress notes",
    icon: Dumbbell,
    color: "text-emerald-600",
  },
  {
    role: "daycare_attendant",
    label: "Daycare Attendant",
    description: "Daycare check-in, feeding, play logs",
    icon: Sun,
    color: "text-orange-500",
  },
  {
    role: "boarding_attendant",
    label: "Boarding / Back of House",
    description: "Kennel view, overnight care, medications",
    icon: Moon,
    color: "text-indigo-600",
  },
  {
    role: "sanitation",
    label: "Sanitation",
    description: "Cleaning tasks and kennel upkeep logs",
    icon: Sparkles,
    color: "text-teal-600",
  },
];

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

interface Props {
  /** Rendered as children of a DropdownMenuContent — pass true to wrap in its own trigger */
  standalone?: boolean;
}

export function EmployeePortalSwitcher({ standalone = true }: Props) {
  const [open, setOpen] = useState(false);

  const switchToEmployee = (staffId: string) => {
    setEmployeeStaffId(staffId);
    window.location.href = "/employee";
  };

  const groups = ROLE_GROUP_CONFIG.map((cfg) => ({
    ...cfg,
    members: facilityStaff.filter(
      (s) => s.primaryRole === cfg.role && s.status === "active",
    ),
  })).filter((g) => g.members.length > 0);

  const content = (
    <>
      <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
        Switch to Employee View
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <DropdownMenuGroup key={group.role}>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <Icon className={`size-4 ${group.color}`} />
                <span>{group.label}</span>
                {group.members.length > 1 && (
                  <Badge
                    variant="secondary"
                    className="ml-auto mr-2 px-1.5 py-0 text-xs"
                  >
                    {group.members.length}
                  </Badge>
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-64">
                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                  {group.description}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {group.members.map((staff) => (
                  <DropdownMenuItem
                    key={staff.id}
                    onClick={() => switchToEmployee(staff.id)}
                    className="cursor-pointer gap-2"
                  >
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={staff.avatarUrl} />
                      <AvatarFallback
                        className="text-xs"
                        style={{ backgroundColor: staff.colorHex + "33", color: staff.colorHex }}
                      >
                        {getInitials(staff.firstName, staff.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {staff.firstName} {staff.lastName}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {staff.email}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        );
      })}
    </>
  );

  if (!standalone) return <>{content}</>;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="size-4" />
          <span>Employee Portal</span>
          <ChevronRight className="text-muted-foreground size-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
