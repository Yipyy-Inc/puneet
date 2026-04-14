"use client";

import { type ElementType, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  CheckCheck,
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
  const [activeRole, setActiveRole] = useState<FacilityRole>("manager");
  const [openStudioCategories, setOpenStudioCategories] = useState<string[]>(
    [],
  );
  const [permissionsByRole, setPermissionsByRole] = useState<RolePermissionMap>(
    () => buildStoredRolePermissionMap(),
  );

  const allPermissionKeys = useMemo(() => {
    const seen = new Set<Permission>();
    const ordered: Permission[] = [];

    for (const permissions of Object.values(
      PERMISSION_CATEGORIES,
    ) as Permission[][]) {
      for (const permission of permissions) {
        if (seen.has(permission)) continue;
        seen.add(permission);
        ordered.push(permission);
      }
    }

    return ordered;
  }, []);

  const totalPermissionKeys = allPermissionKeys.length;

  const totalEnabled = useMemo(() => {
    return ALL_FACILITY_ROLES.reduce((total, role) => {
      return total + permissionsByRole[role].size;
    }, 0);
  }, [permissionsByRole]);

  const roleGrantCounts = useMemo(() => {
    const counts = {} as Record<FacilityRole, number>;
    for (const role of ALL_FACILITY_ROLES) {
      counts[role] = permissionsByRole[role].size;
    }
    return counts;
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

  const activeRoleCoverage =
    totalPermissionKeys === 0
      ? 0
      : Math.round((roleGrantCounts[activeRole] / totalPermissionKeys) * 100);

  useEffect(() => {
    const hasQuery = searchQuery.trim().length > 0;
    const studioValues = filteredCategories.map(
      ({ category }) => `studio:${category}`,
    );

    if (hasQuery) {
      setOpenStudioCategories(studioValues);
      return;
    }

    setOpenStudioCategories((current) => {
      const kept = current.filter((value) => studioValues.includes(value));
      return kept;
    });
  }, [searchQuery, filteredCategories]);

  const applyRolePermissionBatch = (
    role: FacilityRole,
    permissions: Permission[],
    granted: boolean,
  ) => {
    for (const permission of permissions) {
      updateRolePermission(role, permission, granted);
    }

    setPermissionsByRole((current) => {
      const next = cloneRolePermissionMap(current);
      for (const permission of permissions) {
        if (granted) {
          next[role].add(permission);
        } else {
          next[role].delete(permission);
        }
      }
      return next;
    });
  };

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
    <Card className="relative overflow-hidden border-slate-200/80 bg-white shadow-[0_20px_54px_-28px_rgba(15,23,42,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.1),transparent_38%)]" />

      <CardHeader className="relative space-y-5 border-b border-slate-200/70 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <CardTitle className="flex items-center gap-2 text-base text-slate-900">
              <span className="flex size-7 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
                <Shield className="size-4 text-slate-700" />
              </span>
              Roles & Permissions
            </CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              Configure access by role with a clear studio workflow and
              category-level controls.
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={handleResetAll}>
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset all
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">Roles</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {ALL_FACILITY_ROLES.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">
              Categories
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {Object.keys(PERMISSION_CATEGORIES).length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">
              Permissions
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {totalPermissionKeys}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
            <p className="text-muted-foreground text-xs font-medium">
              Active Grants
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {totalEnabled}
            </p>
          </div>
        </div>

        <div className="relative w-full max-w-md">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="h-9 border-slate-200 bg-white/90 pl-8"
            placeholder="Search categories or permissions"
          />
        </div>
      </CardHeader>

      <CardContent className="relative pt-5">
        {filteredCategories.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm">
            No matching permission categories found.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-2.5">
              {ALL_FACILITY_ROLES.map((role) => {
                const Icon = ROLE_VISUALS[role].icon;
                const granted = roleGrantCounts[role];
                const coverage =
                  totalPermissionKeys === 0
                    ? 0
                    : Math.round((granted / totalPermissionKeys) * 100);
                const active = role === activeRole;

                return (
                  <div
                    key={role}
                    className={cn(
                      "rounded-2xl border bg-white/90 p-3 shadow-sm transition-all",
                      active
                        ? "border-slate-900/20 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.75)]"
                        : "border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveRole(role)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "flex size-8 items-center justify-center rounded-lg border",
                              ROLE_VISUALS[role].iconWrapClassName,
                            )}
                          >
                            <Icon
                              className={cn(
                                "size-4",
                                ROLE_VISUALS[role].iconClassName,
                              )}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {FACILITY_ROLE_LABELS[role]}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                              {FACILITY_ROLE_DESCRIPTIONS[role]}
                            </p>
                          </div>
                        </div>
                        {active && (
                          <Badge variant="secondary" className="text-[10px]">
                            Active
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                          <span>{granted} granted</span>
                          <span>{coverage}% coverage</span>
                        </div>
                        <Progress value={coverage} className="h-1.5" />
                      </div>
                    </button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 w-full justify-center text-xs"
                      onClick={() => handleResetRole(role)}
                    >
                      Reset role defaults
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-white via-slate-50 to-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex size-10 items-center justify-center rounded-xl border",
                        ROLE_VISUALS[activeRole].iconWrapClassName,
                      )}
                    >
                      {(() => {
                        const Icon = ROLE_VISUALS[activeRole].icon;
                        return (
                          <Icon
                            className={cn(
                              "size-5",
                              ROLE_VISUALS[activeRole].iconClassName,
                            )}
                          />
                        );
                      })()}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-500">Role</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {FACILITY_ROLE_LABELS[activeRole]}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {FACILITY_ROLE_DESCRIPTIONS[activeRole]}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        applyRolePermissionBatch(
                          activeRole,
                          allPermissionKeys,
                          true,
                        );
                        toast.success(
                          `${FACILITY_ROLE_LABELS[activeRole]} granted all permissions`,
                        );
                      }}
                    >
                      <CheckCheck className="mr-1.5 size-3.5" />
                      Grant all
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        applyRolePermissionBatch(
                          activeRole,
                          allPermissionKeys,
                          false,
                        );
                        toast.success(
                          `${FACILITY_ROLE_LABELS[activeRole]} permissions cleared`,
                        );
                      }}
                    >
                      Clear all
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetRole(activeRole)}
                    >
                      <RotateCcw className="mr-1.5 size-3.5" />
                      Reset role
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-muted-foreground text-[11px]">Granted</p>
                    <p className="text-base font-semibold text-slate-900">
                      {roleGrantCounts[activeRole]}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-muted-foreground text-[11px]">
                      Coverage
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {activeRoleCoverage}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <p className="text-muted-foreground text-[11px]">
                      Search matches
                    </p>
                    <p className="text-base font-semibold text-slate-900">
                      {filteredCategories.length} categories
                    </p>
                  </div>
                </div>
              </div>

              <Accordion
                type="multiple"
                value={openStudioCategories}
                onValueChange={setOpenStudioCategories}
                className="space-y-3"
              >
                {filteredCategories.map(({ category, permissions }) => {
                  const enabledInCategory = permissions.filter((permission) =>
                    permissionsByRole[activeRole].has(permission),
                  ).length;
                  const coverage =
                    permissions.length === 0
                      ? 0
                      : Math.round(
                          (enabledInCategory / permissions.length) * 100,
                        );
                  const itemValue = `studio:${category}`;

                  return (
                    <AccordionItem
                      key={category}
                      value={itemValue}
                      className="overflow-hidden rounded-2xl border border-slate-200/85 bg-white shadow-[0_14px_28px_-24px_rgba(15,23,42,0.7)]"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex w-full items-center justify-between gap-2 pr-2">
                          <div className="min-w-0 text-left">
                            <p className="text-sm font-semibold text-slate-900">
                              {category}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {enabledInCategory} of {permissions.length}{" "}
                              enabled
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {coverage}%
                          </Badge>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="pb-0">
                        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => {
                              applyRolePermissionBatch(
                                activeRole,
                                permissions,
                                true,
                              );
                              toast.success(
                                `${FACILITY_ROLE_LABELS[activeRole]} granted all in ${category}`,
                              );
                            }}
                          >
                            Grant all
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => {
                              applyRolePermissionBatch(
                                activeRole,
                                permissions,
                                false,
                              );
                              toast.success(
                                `${FACILITY_ROLE_LABELS[activeRole]} cleared in ${category}`,
                              );
                            }}
                          >
                            Clear
                          </Button>
                        </div>

                        <div className="grid gap-2 p-3">
                          {permissions.map((permission) => {
                            const checked =
                              permissionsByRole[activeRole].has(permission);

                            return (
                              <div
                                key={permission}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 transition-colors hover:border-slate-300"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-slate-900">
                                    {PERMISSION_LABELS[permission]}
                                  </p>
                                  <p className="text-muted-foreground truncate text-[11px]">
                                    {permission}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  {checked && (
                                    <Badge
                                      variant="outline"
                                      className="hidden border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 sm:inline-flex"
                                    >
                                      Allowed
                                    </Badge>
                                  )}
                                  <Switch
                                    checked={checked}
                                    onCheckedChange={(next) =>
                                      handlePermissionChange(
                                        activeRole,
                                        permission,
                                        next,
                                      )
                                    }
                                    aria-label={`${FACILITY_ROLE_LABELS[activeRole]} can ${PERMISSION_LABELS[permission]}`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
