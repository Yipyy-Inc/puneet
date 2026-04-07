"use client";

import { type ElementType, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  RotateCcw,
  Search,
  Shield,
  Crown,
  Briefcase,
  UserCheck,
  Scissors,
  GraduationCap,
  PawPrint,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ALL_FACILITY_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  FACILITY_ROLE_DESCRIPTIONS,
  FACILITY_ROLE_LABELS,
  PERMISSION_CATEGORIES,
  PERMISSION_LABELS,
  getCustomRolePermissions,
  resetRolePermissions,
  updateRolePermission,
  type FacilityRole,
  type Permission,
} from "@/lib/role-utils";

type RolePermissionMap = Record<FacilityRole, Set<Permission>>;

type RoleVisual = {
  icon: ElementType;
  chipClassName: string;
  iconClassName: string;
  iconWrapClassName: string;
};

const ROLE_VISUALS: Record<FacilityRole, RoleVisual> = {
  owner: {
    icon: Crown,
    chipClassName: "border-amber-200 bg-amber-50 text-amber-700",
    iconClassName: "text-amber-600",
    iconWrapClassName: "border-amber-200 bg-amber-50",
  },
  manager: {
    icon: Briefcase,
    chipClassName: "border-blue-200 bg-blue-50 text-blue-700",
    iconClassName: "text-blue-600",
    iconWrapClassName: "border-blue-200 bg-blue-50",
  },
  front_desk: {
    icon: UserCheck,
    chipClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
    iconClassName: "text-emerald-600",
    iconWrapClassName: "border-emerald-200 bg-emerald-50",
  },
  groomer: {
    icon: Scissors,
    chipClassName: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    iconClassName: "text-fuchsia-600",
    iconWrapClassName: "border-fuchsia-200 bg-fuchsia-50",
  },
  trainer: {
    icon: GraduationCap,
    chipClassName: "border-indigo-200 bg-indigo-50 text-indigo-700",
    iconClassName: "text-indigo-600",
    iconWrapClassName: "border-indigo-200 bg-indigo-50",
  },
  kennel_tech: {
    icon: PawPrint,
    chipClassName: "border-slate-200 bg-slate-50 text-slate-700",
    iconClassName: "text-slate-600",
    iconWrapClassName: "border-slate-200 bg-slate-50",
  },
};

function buildDefaultRolePermissionMap(): RolePermissionMap {
  const map = {} as RolePermissionMap;

  for (const role of ALL_FACILITY_ROLES) {
    map[role] = new Set(DEFAULT_ROLE_PERMISSIONS[role]);
  }

  return map;
}

function buildStoredRolePermissionMap(): RolePermissionMap {
  const custom = getCustomRolePermissions();
  const map = {} as RolePermissionMap;

  for (const role of ALL_FACILITY_ROLES) {
    map[role] = new Set(custom?.[role] ?? DEFAULT_ROLE_PERMISSIONS[role]);
  }

  return map;
}

function cloneRolePermissionMap(source: RolePermissionMap): RolePermissionMap {
  const next = {} as RolePermissionMap;
  for (const role of ALL_FACILITY_ROLES) {
    next[role] = new Set(source[role]);
  }
  return next;
}

export function RolesPermissionsSettings() {
  const [searchQuery, setSearchQuery] = useState("");
  const [permissionsByRole, setPermissionsByRole] = useState<RolePermissionMap>(
    () => buildStoredRolePermissionMap(),
  );

  const totalPermissionKeys = useMemo(() => {
    return Object.values(PERMISSION_CATEGORIES).reduce(
      (total, permissions) => total + permissions.length,
      0,
    );
  }, []);

  const totalEnabled = useMemo(() => {
    return ALL_FACILITY_ROLES.reduce((total, role) => {
      return total + permissionsByRole[role].size;
    }, 0);
  }, [permissionsByRole]);

  const filteredCategories = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const categoryEntries = Object.entries(PERMISSION_CATEGORIES) as Array<
      [string, Permission[]]
    >;

    return categoryEntries
      .map(([category, permissions]) => {
        if (!query) {
          return { category, permissions };
        }

        const nextPermissions = permissions.filter((permission) => {
          const label = PERMISSION_LABELS[permission]?.toLowerCase() ?? "";
          const id = permission.toLowerCase();
          return (
            category.toLowerCase().includes(query) ||
            label.includes(query) ||
            id.includes(query)
          );
        });

        return { category, permissions: nextPermissions };
      })
      .filter((entry) => entry.permissions.length > 0);
  }, [searchQuery]);

  const handlePermissionChange = (
    role: FacilityRole,
    permission: Permission,
    granted: boolean,
  ) => {
    updateRolePermission(role, permission, granted);
    setPermissionsByRole((current) => {
      const next = cloneRolePermissionMap(current);
      if (granted) {
        next[role].add(permission);
      } else {
        next[role].delete(permission);
      }
      return next;
    });
  };

  const handleResetRole = (role: FacilityRole) => {
    resetRolePermissions(role);
    setPermissionsByRole((current) => {
      const next = cloneRolePermissionMap(current);
      next[role] = new Set(DEFAULT_ROLE_PERMISSIONS[role]);
      return next;
    });
    toast.success(`${FACILITY_ROLE_LABELS[role]} permissions reset`);
  };

  const handleResetAll = () => {
    resetRolePermissions();
    setPermissionsByRole(buildDefaultRolePermissionMap());
    toast.success("All role permissions reset to defaults");
  };

  return (
    <Card className="border-slate-200/80 bg-white shadow-[0_18px_44px_-26px_rgba(15,23,42,0.35)]">
      <CardHeader className="space-y-4 border-b border-slate-200/70 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-4 text-slate-600" />
              Roles & Permissions
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure role-based access for every Yipyy capability with an
              enterprise-grade security matrix.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetAll}>
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset all
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{ALL_FACILITY_ROLES.length} roles</Badge>
          <Badge variant="outline">
            {Object.keys(PERMISSION_CATEGORIES).length} categories
          </Badge>
          <Badge variant="outline">{totalPermissionKeys} permissions</Badge>
          <Badge variant="outline">{totalEnabled} active grants</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {ALL_FACILITY_ROLES.map((role) => {
            const Icon = ROLE_VISUALS[role].icon;
            return (
              <span
                key={role}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm",
                  ROLE_VISUALS[role].chipClassName,
                )}
              >
                <Icon
                  className={cn("size-3.5", ROLE_VISUALS[role].iconClassName)}
                />
                {FACILITY_ROLE_LABELS[role]}
              </span>
            );
          })}
        </div>

        <div className="relative max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 pl-8"
            placeholder="Search categories or permissions"
          />
        </div>
      </CardHeader>

      <CardContent className="relative space-y-5 pt-5">
        {filteredCategories.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
            No matching permission categories found.
          </div>
        ) : (
          filteredCategories.map(({ category, permissions }) => (
            <div
              key={category}
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.7)] backdrop-blur-sm transition-all hover:border-slate-300 hover:shadow-[0_18px_34px_-24px_rgba(15,23,42,0.65)]"
            >
              <div className="flex items-center justify-between border-b bg-linear-to-r from-slate-50 via-white to-slate-100/70 px-4 py-2.5">
                <p className="text-sm font-semibold">{category}</p>
                <Badge variant="secondary" className="text-xs">
                  {permissions.length} permissions
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50/70">
                      <th className="text-muted-foreground w-[320px] px-4 py-2 text-left text-xs font-semibold tracking-wide uppercase">
                        Permission
                      </th>
                      {ALL_FACILITY_ROLES.map((role) => {
                        const Icon = ROLE_VISUALS[role].icon;

                        return (
                          <th
                            key={role}
                            className="px-3 py-2 text-center text-[11px] font-semibold"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className={cn(
                                  "flex size-6 items-center justify-center rounded-md border",
                                  ROLE_VISUALS[role].iconWrapClassName,
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "size-3.5",
                                    ROLE_VISUALS[role].iconClassName,
                                  )}
                                />
                              </div>
                              <span>{FACILITY_ROLE_LABELS[role]}</span>
                              <span className="text-muted-foreground text-[10px] font-normal">
                                {permissionsByRole[role].size} granted
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[10px]"
                                onClick={() => handleResetRole(role)}
                              >
                                Reset
                              </Button>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission) => (
                      <tr
                        key={permission}
                        className="group border-b transition-colors last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-4 py-2.5 align-middle">
                          <p className="font-medium">
                            {PERMISSION_LABELS[permission]}
                          </p>
                          <p className="text-muted-foreground mt-0.5 text-xs">
                            {permission}
                          </p>
                        </td>
                        {ALL_FACILITY_ROLES.map((role) => {
                          const checked =
                            permissionsByRole[role].has(permission);
                          return (
                            <td
                              key={`${permission}-${role}`}
                              className="px-3 py-2.5 text-center align-middle"
                            >
                              <div className="flex justify-center">
                                <div className="rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm transition-all group-hover:border-slate-300 group-hover:shadow">
                                  <Switch
                                    checked={checked}
                                    onCheckedChange={(next) =>
                                      handlePermissionChange(
                                        role,
                                        permission,
                                        next,
                                      )
                                    }
                                    aria-label={`${FACILITY_ROLE_LABELS[role]} can ${PERMISSION_LABELS[permission]}`}
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        <div className="grid gap-2 rounded-xl border border-dashed border-slate-300/90 bg-slate-50/55 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_FACILITY_ROLES.map((role) => {
            const Icon = ROLE_VISUALS[role].icon;

            return (
              <div
                key={role}
                className="rounded-xl border border-slate-200/85 bg-white/85 p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md border",
                      ROLE_VISUALS[role].iconWrapClassName,
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5",
                        ROLE_VISUALS[role].iconClassName,
                      )}
                    />
                  </div>
                  <p className="text-sm font-medium">
                    {FACILITY_ROLE_LABELS[role]}
                  </p>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {FACILITY_ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
