"use client";

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
  Calendar,
  ClipboardList,
  Dog,
  Sun,
  Moon,
  Sparkles,
  Users,
  Dumbbell,
  MonitorSpeaker,
  UserCog,
  ShoppingBag,
  ArrowRight,
  CheckSquare,
  Clock,
  RefreshCw,
} from "lucide-react";
import type { StaffProfile, FacilityStaffRole } from "@/types/facility-staff";

// Quick-action cards per role
const ROLE_ACTIONS: Record<
  FacilityStaffRole,
  {
    title: string;
    description: string;
    href: string;
    icon: React.ElementType;
    accent: string;
  }[]
> = {
  owner: [
    { title: "My Schedule", description: "Personal schedule view", href: "/employee/schedule", icon: Calendar, accent: "text-amber-600" },
    { title: "Bookings", description: "All facility bookings", href: "/employee/bookings", icon: ClipboardList, accent: "text-amber-600" },
    { title: "Clients", description: "Client directory", href: "/employee/clients", icon: Users, accent: "text-amber-600" },
  ],
  manager: [
    { title: "My Schedule", description: "Personal schedule", href: "/employee/schedule", icon: Calendar, accent: "text-violet-600" },
    { title: "Bookings", description: "Today's appointments", href: "/employee/bookings", icon: ClipboardList, accent: "text-violet-600" },
    { title: "Clients", description: "Client directory", href: "/employee/clients", icon: Users, accent: "text-violet-600" },
  ],
  reception: [
    { title: "Bookings", description: "Check-in/out and appointments", href: "/employee/bookings", icon: CheckSquare, accent: "text-sky-600" },
    { title: "Clients", description: "Find a client", href: "/employee/clients", icon: Users, accent: "text-sky-600" },
    { title: "Retail POS", description: "Process a sale", href: "/employee/retail", icon: ShoppingBag, accent: "text-sky-600" },
    { title: "My Schedule", description: "Your shifts", href: "/employee/schedule", icon: Clock, accent: "text-sky-600" },
  ],
  groomer: [
    { title: "Today's Queue", description: "Your grooming appointments", href: "/employee/grooming", icon: Scissors, accent: "text-rose-600" },
    { title: "My Schedule", description: "Your grooming shifts", href: "/employee/schedule", icon: Calendar, accent: "text-rose-600" },
    { title: "My Clients", description: "Assigned pets", href: "/employee/clients", icon: Dog, accent: "text-rose-600" },
  ],
  trainer: [
    { title: "Training Sessions", description: "Today's sessions", href: "/employee/training", icon: Dumbbell, accent: "text-emerald-600" },
    { title: "My Schedule", description: "Your training shifts", href: "/employee/schedule", icon: Calendar, accent: "text-emerald-600" },
    { title: "My Clients", description: "Enrolled pets", href: "/employee/clients", icon: Dog, accent: "text-emerald-600" },
  ],
  daycare_attendant: [
    { title: "Daycare Board", description: "Check-in and care logs", href: "/employee/daycare", icon: Sun, accent: "text-orange-500" },
    { title: "Kennel View", description: "Pet statuses and rooms", href: "/employee/kennel", icon: Dog, accent: "text-orange-500" },
    { title: "My Schedule", description: "Your daycare shifts", href: "/employee/schedule", icon: Calendar, accent: "text-orange-500" },
  ],
  boarding_attendant: [
    { title: "Boarding Guests", description: "Overnight pets in care", href: "/employee/boarding", icon: Moon, accent: "text-indigo-600" },
    { title: "Kennel View", description: "Room assignments", href: "/employee/kennel", icon: Dog, accent: "text-indigo-600" },
    { title: "My Schedule", description: "Your boarding shifts", href: "/employee/schedule", icon: Calendar, accent: "text-indigo-600" },
  ],
  sanitation: [
    { title: "My Tasks", description: "Cleaning & sanitation logs", href: "/employee/tasks", icon: Sparkles, accent: "text-teal-600" },
    { title: "My Schedule", description: "Your shifts", href: "/employee/schedule", icon: Calendar, accent: "text-teal-600" },
  ],
};

const ROLE_LABEL: Record<FacilityStaffRole, string> = {
  owner: "Owner / Admin",
  manager: "Manager",
  reception: "Reception / Front Desk",
  groomer: "Groomer",
  trainer: "Trainer",
  daycare_attendant: "Daycare Attendant",
  boarding_attendant: "Boarding / Back of House",
  sanitation: "Sanitation",
};

const ROLE_DESCRIPTION: Record<FacilityStaffRole, string> = {
  owner: "Full facility access — configuration, financials, and team management.",
  manager: "Operational oversight — bookings, staff, and reports.",
  reception: "Client-facing operations — check-in/out, bookings, payments.",
  groomer: "Grooming appointments and notes for your assigned pets.",
  trainer: "Training sessions and progress tracking for enrolled pets.",
  daycare_attendant: "Daycare check-in, feeding rounds, and play logs.",
  boarding_attendant: "Overnight kennel care, medications, and health checks.",
  sanitation: "Facility cleaning tasks and sanitation log.",
};

const ROLE_ICON: Record<FacilityStaffRole, React.ElementType> = {
  owner: UserCog,
  manager: Users,
  reception: MonitorSpeaker,
  groomer: Scissors,
  trainer: Dumbbell,
  daycare_attendant: Sun,
  boarding_attendant: Moon,
  sanitation: Sparkles,
};

const ROLE_GRADIENT: Record<FacilityStaffRole, string> = {
  owner: "from-amber-500 to-orange-500",
  manager: "from-violet-500 to-purple-600",
  reception: "from-sky-500 to-blue-600",
  groomer: "from-rose-500 to-pink-600",
  trainer: "from-emerald-500 to-green-600",
  daycare_attendant: "from-orange-400 to-amber-500",
  boarding_attendant: "from-indigo-500 to-blue-700",
  sanitation: "from-teal-500 to-cyan-600",
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function EmployeeDashboard({ staff }: { staff: StaffProfile }) {
  const role = staff.primaryRole;
  const actions = ROLE_ACTIONS[role] ?? ROLE_ACTIONS.reception;
  const RoleIcon = ROLE_ICON[role];

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      {/* Welcome banner */}
      <div
        className={`relative overflow-hidden rounded-2xl bg-linear-to-r ${ROLE_GRADIENT[role]} p-6 text-white shadow-md`}
      >
        <div className="flex items-center gap-4">
          <Avatar className="size-16 ring-2 ring-white/30 shadow-lg">
            <AvatarImage src={staff.avatarUrl} />
            <AvatarFallback
              className="text-xl font-bold"
              style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white" }}
            >
              {getInitials(staff.firstName, staff.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-white/80 text-sm font-medium">
              Welcome back,
            </p>
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
                  className="border-white/10 bg-white/10 text-white/80 text-xs"
                >
                  +{r.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          </div>
          <div className="hidden sm:block text-right text-white/70 text-sm">
            <p>{staff.email}</p>
            <p className="mt-0.5">
              {staff.assignedLocations.length === 1
                ? "1 location"
                : `${staff.assignedLocations.length} locations`}
            </p>
          </div>
        </div>
        <p className="mt-3 text-white/80 text-sm max-w-xl">
          {ROLE_DESCRIPTION[role]}
        </p>
        {/* decorative */}
        <div className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-10 right-20 size-32 rounded-full bg-white/5" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Upcoming</p>
            <p className="mt-1 text-2xl font-bold">{staff.upcomingAppointments}</p>
            <p className="text-muted-foreground text-xs">appointments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Open Tasks</p>
            <p className="mt-1 text-2xl font-bold">{staff.openTasks}</p>
            <p className="text-muted-foreground text-xs">to complete</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Employment</p>
            <p className="mt-1 text-sm font-semibold capitalize">
              {staff.employment.employmentType.replace(/_/g, " ")}
            </p>
            <p className="text-muted-foreground text-xs">
              Since {new Date(staff.employment.hireDate).getFullYear()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-xs">Services</p>
            <p className="mt-1 text-sm font-semibold">
              {staff.serviceAssignments.length} assigned
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {staff.serviceAssignments.join(", ")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick-access cards */}
      <div>
        <h2 className="mb-3 font-semibold">Quick Access</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href + action.title} href={action.href} className="group block">
                <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20">
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                        <Icon className={`size-5 ${action.accent}`} />
                      </div>
                      <ArrowRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0">
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      {action.description}
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
            <p className="text-sm font-medium">Testing a different role?</p>
            <p className="text-muted-foreground text-xs">
              Switch to another employee account to explore their view.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
            <Link href="/employee/select">
              <RefreshCw className="size-3.5" />
              Switch Employee
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
