"use client";

import { cn } from "@/lib/utils";
import { ROLE_META, type FacilityStaffRole } from "@/types/facility-staff";
import { RoleIcon } from "./staff-shared";

/** The 8 preset roles, in the same order as the primary-role grid. */
export const PRESET_ROLE_ORDER: FacilityStaffRole[] = [
  "owner",
  "manager",
  "reception",
  "groomer",
  "trainer",
  "daycare_attendant",
  "boarding_attendant",
  "sanitation",
];

/**
 * "Additional roles (optional)" — a compact grid of the same preset role cards
 * (minus the selected primary), multi-select. Writes to `additionalRoles`.
 * Permissions are the UNION of primary + additional (resolved by the RBAC layer);
 * the primary role still drives the dashboard default view — additional roles
 * only add nav/access. No limit on count. Shared by the hire dialog's Role &
 * services tab and the employee profile's Roles tab.
 */
export function AdditionalRolesGrid({
  primaryRole,
  additionalRoles,
  onToggle,
}: {
  primaryRole: FacilityStaffRole;
  additionalRoles: FacilityStaffRole[];
  onToggle: (role: FacilityStaffRole, on: boolean) => void;
}) {
  const options = PRESET_ROLE_ORDER.filter((r) => r !== primaryRole);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((role) => {
        const meta = ROLE_META[role];
        const active = additionalRoles.includes(role);
        return (
          <button
            type="button"
            key={role}
            onClick={() => onToggle(role, !active)}
            aria-pressed={active}
            className={cn(
              "relative overflow-hidden rounded-lg border p-2.5 text-left transition-all",
              active
                ? "border-primary ring-primary/20 shadow-sm ring-2"
                : "border-border/60 hover:shadow-sm",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0",
                meta.accent,
              )}
            />
            <div className="relative flex items-center gap-2">
              <div className="bg-background/70 rounded-md p-1">
                <RoleIcon role={role} className="size-3.5" />
              </div>
              <span className="text-xs font-semibold">{meta.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
