"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ShieldCheck, ChevronDown } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  PERMISSION_GROUPS,
  ACCESS_SCOPE_META,
  resolveAllPermissions,
  type FacilityStaffRole,
  type StaffProfile,
} from "@/types/facility-staff";
import { useFacilityRbac } from "@/hooks/use-facility-rbac";
import { RoleSection, type SectionUpdate } from "./staff-form-sections";

/**
 * Roles & positions — primary + additional + custom roles (editable via the
 * shared RoleSection), followed by the READ-ONLY resulting permission union
 * (spec 5.1: permissions = union of every assigned role + per-key overrides).
 */
export function StaffRolesTab({
  draft,
  update,
  onRoleChange,
}: {
  draft: StaffProfile;
  update: SectionUpdate;
  onRoleChange: (r: FacilityStaffRole) => void;
}) {
  const { customRoles, presetOverrides } = useFacilityRbac();
  const effective = useMemo(
    () => resolveAllPermissions(draft, { customRoles, presetOverrides }),
    [draft, customRoles, presetOverrides],
  );
  const grantedCount = Object.values(effective).filter((v) => v !== false).length;
  const overrideCount = Object.keys(draft.permissionOverrides).length;

  return (
    <div className="space-y-6">
      <RoleSection draft={draft} update={update} onRoleChange={onRoleChange} />

      <Separator />

      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-primary size-4" />
          <h3 className="text-sm font-semibold tracking-tight">
            Resulting permissions
          </h3>
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs">
          <span className="text-foreground font-medium">
            {grantedCount} permissions granted
          </span>{" "}
          — the union of the primary role, additional roles, custom roles
          {overrideCount > 0
            ? `, and ${overrideCount} per-permission override${overrideCount === 1 ? "" : "s"}`
            : ""}
          . Edit individual scopes in the Access &amp; overrides tab.
        </p>

        <div className="mt-3 space-y-2">
          {PERMISSION_GROUPS.filter((g) => g.id !== "core").map((group) => {
            const granted = group.permissions.filter(
              (p) => effective[p.key] !== false,
            );
            if (granted.length === 0) return null;
            return (
              <details
                key={group.id}
                className="border-border/60 bg-card/60 group rounded-xl border"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <span className="font-medium">{group.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {granted.length}/{group.permissions.length}
                    </span>
                    <ChevronDown className="text-muted-foreground size-4 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <div className="divide-border/50 divide-y border-t">
                  {granted.map((p) => {
                    const scope = effective[p.key];
                    const meta = scope ? ACCESS_SCOPE_META[scope] : null;
                    return (
                      <div
                        key={p.key}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <span className="text-sm">{p.label}</span>
                        {meta && (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              meta.tone,
                            )}
                          >
                            {meta.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </div>
  );
}
