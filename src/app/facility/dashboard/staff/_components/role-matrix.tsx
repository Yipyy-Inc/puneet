"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Check, Minus, ShieldCheck, Info } from "lucide-react";
import {
  PERMISSION_GROUPS,
  ROLE_META,
  ROLE_PRESETS,
  type FacilityStaffRole,
  type PermissionKey,
  type AccessScope,
} from "@/types/facility-staff";
import { RoleIcon, ScopeBadge } from "./staff-shared";

const ROLE_ORDER: FacilityStaffRole[] = [
  "owner",
  "manager",
  "reception",
  "groomer",
  "trainer",
  "daycare_attendant",
  "boarding_attendant",
  "sanitation",
];

function scopeForRole(
  role: FacilityStaffRole,
  perm: PermissionKey,
): AccessScope | null {
  const entry = ROLE_PRESETS[role].permissions.find(([p]) => p === perm);
  return entry ? entry[1] : null;
}

export function RoleAccessMatrix() {
  const [expanded, setExpanded] = useState(false);
  const [focusRole, setFocusRole] = useState<FacilityStaffRole | null>(null);

  const visibleRoles = focusRole ? [focusRole] : ROLE_ORDER;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="bg-primary/10 text-primary rounded-lg p-1.5">
              <ShieldCheck className="size-4" />
            </div>
            Role access matrix
          </CardTitle>
          <CardDescription className="mt-1">
            What each role sees by default — and when. Individual profiles can
            override any of these.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Collapse" : "Check permissions"}
          <ChevronDown
            className={cn(
              "ml-1 size-4 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </Button>
      </CardHeader>

      {/* Role filter chips */}
      <div className="flex flex-wrap gap-1.5 px-6 pb-3">
        <button
          onClick={() => setFocusRole(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-all",
            !focusRole
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border/60 hover:bg-muted",
          )}
        >
          All roles
        </button>
        {ROLE_ORDER.map((role) => {
          const meta = ROLE_META[role];
          const isActive = focusRole === role;
          return (
            <button
              key={role}
              onClick={() => setFocusRole(isActive ? null : role)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/60 hover:shadow-sm",
                !isActive && meta.accent,
              )}
            >
              <RoleIcon role={role} className="size-3" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {expanded && (
        <CardContent className="pt-0 pb-6">
          <div className="border-border/60 text-muted-foreground mb-3 flex items-start gap-2 rounded-lg border border-dashed p-3 text-xs">
            <Info className="text-primary mt-0.5 size-3.5 shrink-0" />
            <div>
              <span className="text-foreground font-medium">Scope tags</span> —{" "}
              <span className="font-medium">Anytime</span> means 24/7,{" "}
              <span className="font-medium">Operating hours</span> restricts to
              facility open times,{" "}
              <span className="font-medium">Assigned shifts</span> restricts
              further to the staff&apos;s scheduled shifts.
            </div>
          </div>

          <div className="space-y-5">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.id}>
                <div className="mb-2 flex items-baseline justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">{group.label}</h4>
                    <p className="text-muted-foreground text-xs">
                      {group.description}
                    </p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-border/60 border-b">
                        <th className="text-muted-foreground py-2 pr-2 text-left text-xs font-medium">
                          Permission
                        </th>
                        {visibleRoles.map((role) => (
                          <th
                            key={role}
                            className="text-muted-foreground px-2 py-2 text-center text-xs font-medium"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <RoleIcon role={role} className="size-3.5" />
                              <span className="whitespace-nowrap">
                                {ROLE_META[role].label}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.permissions.map((perm) => (
                        <tr
                          key={perm.key}
                          className="border-border/30 border-b last:border-0"
                        >
                          <td className="py-2 pr-2">
                            <div className="text-xs">{perm.label}</div>
                          </td>
                          {visibleRoles.map((role) => {
                            const scope = scopeForRole(role, perm.key);
                            return (
                              <td key={role} className="px-2 py-2 text-center">
                                {scope ? (
                                  <div className="flex justify-center">
                                    <div className="flex items-center gap-1">
                                      <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                      <ScopeBadge scope={scope} />
                                    </div>
                                  </div>
                                ) : (
                                  <Minus className="text-muted-foreground/40 mx-auto size-3.5" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="border-border/60 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
              <Badge variant="outline" className="gap-1">
                <Check className="size-3 text-emerald-600" /> Granted
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Minus className="text-muted-foreground size-3" /> Not granted
              </Badge>
              <span className="text-muted-foreground">
                Tags show when the permission is active.
              </span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
