"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Scissors,
  Sun,
  Moon,
  Sparkles,
  Users,
  Dumbbell,
  MonitorSpeaker,
  UserCog,
} from "lucide-react";
import type { StaffProfile, FacilityStaffRole } from "@/types/facility-staff";
import { timeOfDayGreeting } from "./employee-dashboard-widgets";

// The one genuinely employee-only touch above the shared facility dashboard: a
// personal "Good morning, [name]" welcome. Everything below it on the page is
// the SAME DashboardShell the facility admin sees (spec 5A parity), so this
// header deliberately carries only the greeting + who's signed in — no stats,
// no widgets, which the dashboard now owns.

const ROLE_LABEL: Record<FacilityStaffRole, string> = {
  owner: "Owner / Admin",
  admin: "Admin",
  manager: "Manager",
  supervisor: "Supervisor",
  reception: "Reception / Front Desk",
  groomer: "Groomer",
  trainer: "Trainer",
  caretaker: "Caretaker",
  daycare_attendant: "Daycare Attendant",
  boarding_attendant: "Boarding / Back of House",
  retail: "Retail Associate",
  accountant: "Accountant",
  sanitation: "Sanitation",
};

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

export function EmployeeGreetingHeader({ staff }: { staff: StaffProfile }) {
  const role = staff.primaryRole;
  const RoleIcon = ROLE_ICON[role];
  // Read the clock once at mount (purity: no argless Date in the render body).
  const [greeting] = useState(() => timeOfDayGreeting(new Date().getHours()));

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-linear-to-r ${ROLE_GRADIENT[role]} p-6 text-white shadow-md`}
    >
      <div className="flex items-center gap-4">
        <Avatar className="size-16 shadow-lg ring-2 ring-white/30">
          <AvatarImage src={staff.avatarUrl} />
          <AvatarFallback
            className="text-xl font-bold"
            style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
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
              {ROLE_LABEL[role]}
            </Badge>
            {staff.additionalRoles.map((r) => (
              <Badge
                key={r}
                variant="secondary"
                className="border-white/10 bg-white/10 text-xs text-white/80"
              >
                +{r.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
        <div className="hidden text-right text-sm text-white/70 sm:block">
          <p>{staff.email}</p>
          <p className="mt-0.5">
            {staff.assignedLocations.length === 1
              ? "1 location"
              : `${staff.assignedLocations.length} locations`}
          </p>
        </div>
      </div>
      {/* decorative */}
      <div className="pointer-events-none absolute -top-8 -right-8 size-40 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute right-20 -bottom-10 size-32 rounded-full bg-white/5" />
    </div>
  );
}
