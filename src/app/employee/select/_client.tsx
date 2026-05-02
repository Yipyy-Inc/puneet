"use client";

import { facilityStaff } from "@/data/facility-staff";
import { setEmployeeStaffId } from "@/lib/role-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Scissors,
  Dumbbell,
  Sun,
  Moon,
  Sparkles,
  MonitorSpeaker,
  UserCog,
  Users,
} from "lucide-react";
import type { FacilityStaffRole } from "@/types/facility-staff";

const ROLE_CONFIG: Record<
  FacilityStaffRole,
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  owner: { label: "Owner / Admin", icon: UserCog, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  manager: { label: "Manager", icon: Users, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  reception: { label: "Reception / Front Desk", icon: MonitorSpeaker, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-950/30" },
  groomer: { label: "Groomer", icon: Scissors, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
  trainer: { label: "Trainer", icon: Dumbbell, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  daycare_attendant: { label: "Daycare Attendant", icon: Sun, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-950/30" },
  boarding_attendant: { label: "Boarding / Back of House", icon: Moon, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  sanitation: { label: "Sanitation", icon: Sparkles, color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30" },
};

const ROLE_ORDER: FacilityStaffRole[] = [
  "owner", "manager", "reception", "groomer", "trainer",
  "daycare_attendant", "boarding_attendant", "sanitation",
];

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function EmployeeSelectClient() {
  const groups = ROLE_ORDER.map((role) => ({
    role,
    config: ROLE_CONFIG[role],
    members: facilityStaff.filter(
      (s) => s.primaryRole === role && s.status === "active",
    ),
  })).filter((g) => g.members.length > 0);

  const handleSelect = (staffId: string) => {
    setEmployeeStaffId(staffId);
    window.location.href = "/employee";
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-br from-background to-muted/30 p-6 pt-16">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl">
            <Users className="text-primary size-7" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Portal</h1>
          <p className="text-muted-foreground mt-2 text-base">
            Select which employee account to test from
          </p>
        </div>

        <div className="space-y-8">
          {groups.map(({ role, config, members }) => {
            const Icon = config.icon;
            return (
              <div key={role}>
                <div className="mb-3 flex items-center gap-2">
                  <div className={`flex size-7 items-center justify-center rounded-lg ${config.bg}`}>
                    <Icon className={`size-4 ${config.color}`} />
                  </div>
                  <h2 className="font-semibold">{config.label}</h2>
                  <Badge variant="secondary" className="text-xs">
                    {members.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((staff) => (
                    <Card
                      key={staff.id}
                      className="cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/30"
                      onClick={() => handleSelect(staff.id)}
                    >
                      <CardContent className="flex items-center gap-3 p-4">
                        <Avatar className="size-10 shrink-0">
                          <AvatarImage src={staff.avatarUrl} />
                          <AvatarFallback
                            className="text-sm font-medium"
                            style={{
                              backgroundColor: staff.colorHex + "33",
                              color: staff.colorHex,
                            }}
                          >
                            {getInitials(staff.firstName, staff.lastName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {staff.firstName} {staff.lastName}
                          </p>
                          <p className="text-muted-foreground truncate text-xs">
                            {staff.email}
                          </p>
                          {staff.assignedLocations.length > 0 && (
                            <p className="text-muted-foreground truncate text-xs">
                              {staff.assignedLocations.length === 1
                                ? "1 location"
                                : `${staff.assignedLocations.length} locations`}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            ← Back
          </Button>
        </div>
      </div>
    </div>
  );
}
