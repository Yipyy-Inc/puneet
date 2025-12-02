"use client";

import { useTransition } from "react";
import { Shield } from "lucide-react";
import {
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  ALL_FACILITY_ROLES,
  FACILITY_ROLE_LABELS,
  FACILITY_ROLE_DESCRIPTIONS,
  getFacilityRole,
  setFacilityRole,
  type FacilityRole,
} from "@/lib/role-utils";

export function FacilityRoleSwitcher() {
  const [isPending, startTransition] = useTransition();
  const currentRole = getFacilityRole();

  const handleRoleChange = (newRole: string) => {
    startTransition(() => {
      setFacilityRole(newRole as FacilityRole);
      window.location.reload();
    });
  };

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        Role Preview (Demo)
      </DropdownMenuLabel>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={isPending}>
          <span>Current: {FACILITY_ROLE_LABELS[currentRole]}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-64">
          <DropdownMenuRadioGroup
            value={currentRole}
            onValueChange={handleRoleChange}
          >
            {ALL_FACILITY_ROLES.map((role) => (
              <DropdownMenuRadioItem
                key={role}
                value={role}
                disabled={isPending}
                className="flex flex-col items-start gap-1 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {FACILITY_ROLE_LABELS[role]}
                  </span>
                  {role === currentRole && (
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {FACILITY_ROLE_DESCRIPTIONS[role]}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );
}
