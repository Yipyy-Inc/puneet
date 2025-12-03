"use client";

import { useTransition } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe, Settings } from "lucide-react";
import { getUserRole, setUserRole, type UserRole } from "@/lib/role-utils";
import { FacilityRoleSwitcher } from "./FacilityRoleSwitcher";

export function HeaderDropdown() {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const currentRole = getUserRole();

  const isFacilityPortal = pathname?.startsWith("/facility");

  const getLocale = () => {
    const cookies = document.cookie.split(";");
    const localeCookie = cookies.find((c) => c.trim().startsWith("NEXT_LOCALE="));
    return localeCookie ? localeCookie.split("=")[1] : "en";
  };

  const locale = getLocale();

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
      window.location.reload();
    });
  };

  const switchRole = (role: UserRole) => {
    startTransition(() => {
      setUserRole(role);
      window.location.reload();
    });
  };

  const isSuperAdmin = !currentRole || currentRole === "super_admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-3">
          <Globe className="h-4 w-4 text-muted-foreground mr-2" />
          <span className="text-sm font-medium">{locale.toUpperCase()}</span>
          <Settings className="h-4 w-4 text-muted-foreground ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Language</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => switchLocale("en")}
          disabled={isPending || locale === "en"}
          className="cursor-pointer"
        >
          English {locale === "en" && "✓"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLocale("fr")}
          disabled={isPending || locale === "fr"}
          className="cursor-pointer"
        >
          Français {locale === "fr" && "✓"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Context Switcher (UI Testing)</DropdownMenuLabel>
        {isSuperAdmin && (
          <DropdownMenuItem
            onClick={() => switchRole("facility_admin")}
            disabled={isPending}
            className="cursor-pointer"
          >
            Switch to Facility Admin
          </DropdownMenuItem>
        )}
        {currentRole === "facility_admin" && (
          <DropdownMenuItem
            onClick={() => switchRole("super_admin")}
            disabled={isPending}
            className="cursor-pointer"
          >
            Switch to Super Admin
          </DropdownMenuItem>
        )}
        {/* Show facility role switcher when in facility portal */}
        {isFacilityPortal && <FacilityRoleSwitcher />}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
