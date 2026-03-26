"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Check,
  X,
  Crown,
  Briefcase,
  UserCheck,
  User,
  Users,
} from "lucide-react";
import { type FacilityRole } from "@/lib/role-utils";
import {
  getFormPermissionsForRole,
  getFormAccessLevel,
} from "@/lib/form-permissions";

const ROLES: { role: FacilityRole; label: string; icon: React.ReactNode }[] = [
  {
    role: "owner",
    label: "Owner",
    icon: <Crown className="size-3.5 text-amber-600" />,
  },
  {
    role: "manager",
    label: "Manager",
    icon: <Briefcase className="size-3.5 text-blue-600" />,
  },
  {
    role: "front_desk",
    label: "Front Desk",
    icon: <UserCheck className="size-3.5 text-green-600" />,
  },
  {
    role: "groomer",
    label: "Groomer",
    icon: <User className="size-3.5 text-slate-500" />,
  },
  {
    role: "trainer",
    label: "Trainer",
    icon: <User className="size-3.5 text-slate-500" />,
  },
  {
    role: "kennel_tech",
    label: "Kennel Tech",
    icon: <User className="size-3.5 text-slate-500" />,
  },
];

const ACCESS_COLORS: Record<string, string> = {
  full: "bg-green-100 text-green-800",
  process: "bg-blue-100 text-blue-800",
  view: "bg-slate-100 text-slate-700",
  none: "bg-red-100 text-red-700",
};

export function FormPermissionsPanel() {
  const matrix = useMemo(() => {
    const allPerms = getFormPermissionsForRole("owner");
    return {
      permissions: allPerms.map((p) => p.label),
      roles: ROLES.map(({ role, label, icon }) => {
        const access = getFormAccessLevel(role);
        const perms = getFormPermissionsForRole(role);
        return {
          role,
          label,
          icon,
          access,
          granted: perms.map((p) => p.granted),
        };
      }),
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="size-4" />
          Permissions & Access
        </CardTitle>
        <p className="text-muted-foreground mt-1 text-xs">
          Role-based access for the forms module. Customer access is controlled
          by form audience setting.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-muted-foreground w-[180px] py-2 pr-4 text-left text-xs font-medium">
                  Permission
                </th>
                {matrix.roles.map((r) => (
                  <th
                    key={r.role}
                    className="min-w-[80px] px-2 py-2 text-center text-xs font-medium"
                  >
                    <div className="flex flex-col items-center gap-1">
                      {r.icon}
                      <span>{r.label}</span>
                      <Badge
                        variant="secondary"
                        className={`h-4 px-1.5 text-[9px] font-normal ${ACCESS_COLORS[r.access.level]} `}
                      >
                        {r.access.label}
                      </Badge>
                    </div>
                  </th>
                ))}
                <th className="min-w-[80px] px-2 py-2 text-center text-xs font-medium">
                  <div className="flex flex-col items-center gap-1">
                    <Users className="size-3.5 text-violet-500" />
                    <span>Customer</span>
                    <Badge
                      variant="secondary"
                      className="h-4 bg-violet-100 px-1.5 text-[9px] font-normal text-violet-700"
                    >
                      Submit
                    </Badge>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {matrix.permissions.map((permLabel, pIdx) => (
                <tr key={pIdx} className="border-b last:border-0">
                  <td className="text-muted-foreground py-2 pr-4 text-xs">
                    {permLabel}
                  </td>
                  {matrix.roles.map((r) => (
                    <td key={r.role} className="px-2 py-2 text-center">
                      {r.granted[pIdx] ? (
                        <Check className="mx-auto size-4 text-green-600" />
                      ) : (
                        <X className="text-muted-foreground/30 mx-auto size-3.5" />
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center">
                    <X className="text-muted-foreground/30 mx-auto size-3.5" />
                  </td>
                </tr>
              ))}
              {/* Customer-specific rows */}
              <tr className="border-b">
                <td className="text-muted-foreground py-2 pr-4 text-xs">
                  View accessible forms
                </td>
                {matrix.roles.map((r) => (
                  <td key={r.role} className="px-2 py-2 text-center">
                    <Check className="mx-auto size-4 text-green-600" />
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  <Check className="mx-auto size-4 text-violet-600" />
                </td>
              </tr>
              <tr>
                <td className="text-muted-foreground py-2 pr-4 text-xs">
                  Submit forms
                </td>
                {matrix.roles.map((r) => (
                  <td key={r.role} className="px-2 py-2 text-center">
                    <Check className="mx-auto size-4 text-green-600" />
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  <Check className="mx-auto size-4 text-violet-600" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
