"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  User,
  Shield,
  LogOut,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { facilityStaff } from "@/data/facility-staff";
import {
  setUserRole,
  clearEmployeeStaffId,
  setEmployeeStaffId,
} from "@/lib/role-utils";
import type { FacilityStaffRole } from "@/types/facility-staff";
import { EmployeePortalSwitcher } from "@/components/layout/EmployeePortalSwitcher";

const ROLE_LABEL: Record<FacilityStaffRole, string> = {
  owner: "Owner / Admin",
  manager: "Manager",
  reception: "Reception",
  groomer: "Groomer",
  trainer: "Trainer",
  daycare_attendant: "Daycare Attendant",
  boarding_attendant: "Boarding Staff",
  sanitation: "Sanitation",
};

const ROLE_COLOR: Record<FacilityStaffRole, string> = {
  owner: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  manager: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  reception: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  groomer: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  trainer: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  daycare_attendant: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  boarding_attendant: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  sanitation: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function EmployeeHeader({ staffId }: { staffId: string }) {
  const staff = facilityStaff.find((s) => s.id === staffId);
  const role = staff?.primaryRole ?? "reception";

  const switchToFacility = () => {
    setUserRole("facility_admin");
    window.location.href = "/facility/dashboard";
  };

  const switchToCustomer = () => {
    window.location.href = "/customer/dashboard";
  };

  const switchToAdmin = () => {
    setUserRole("super_admin");
    window.location.href = "/dashboard";
  };

  const logout = () => {
    clearEmployeeStaffId();
    window.location.href = "/employee/select";
  };

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-4 border-b px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="hover:bg-muted size-9 rounded-xl transition-colors md:hidden" />
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm font-semibold">Employee Portal</span>
          <span className="text-muted-foreground text-sm">·</span>
          <Badge className={`text-xs ${ROLE_COLOR[role]}`} variant="secondary">
            {ROLE_LABEL[role]}
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Switch employee — quick access */}
        <Button
          variant="ghost"
          size="sm"
          className="hidden sm:flex gap-1.5 text-xs"
          asChild
        >
          <Link href="/employee/select">
            <RefreshCw className="size-3.5" />
            Switch Employee
          </Link>
        </Button>

        {/* User avatar + context menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 rounded-full px-2 py-1 h-9">
              <Avatar className="size-7">
                <AvatarImage src={staff?.avatarUrl} />
                <AvatarFallback
                  className="text-xs font-medium"
                  style={{
                    backgroundColor: (staff?.colorHex ?? "#666") + "33",
                    color: staff?.colorHex ?? "#666",
                  }}
                >
                  {staff
                    ? getInitials(staff.firstName, staff.lastName)
                    : "?"}
                </AvatarFallback>
              </Avatar>
              {staff && (
                <span className="hidden text-sm font-medium sm:block">
                  {staff.firstName}
                </span>
              )}
              <ChevronDown className="text-muted-foreground size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Avatar className="size-8">
                <AvatarImage src={staff?.avatarUrl} />
                <AvatarFallback
                  className="text-xs"
                  style={{
                    backgroundColor: (staff?.colorHex ?? "#666") + "33",
                    color: staff?.colorHex ?? "#666",
                  }}
                >
                  {staff ? getInitials(staff.firstName, staff.lastName) : "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">
                  {staff
                    ? `${staff.firstName} ${staff.lastName}`
                    : "Employee"}
                </p>
                <p className="text-muted-foreground text-xs">{staff?.email}</p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-xs font-normal">
              Switch Portal
            </DropdownMenuLabel>

            <DropdownMenuItem onClick={switchToFacility} className="cursor-pointer gap-2">
              <Building2 className="size-4" />
              Facility Admin View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={switchToCustomer} className="cursor-pointer gap-2">
              <User className="size-4" />
              Customer Portal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={switchToAdmin} className="cursor-pointer gap-2">
              <Shield className="size-4" />
              Super Admin
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground px-2 py-1 text-xs font-normal">
              Switch Employee
            </DropdownMenuLabel>
            <EmployeePortalSwitcher standalone={false} />

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive cursor-pointer gap-2"
            >
              <LogOut className="size-4" />
              Exit Employee Portal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
