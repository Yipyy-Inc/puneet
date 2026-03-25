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
import {
  type FacilityRole,
} from "@/lib/role-utils";
import {
  getFormPermissionsForRole,
  getFormAccessLevel,
} from "@/lib/form-permissions";

const ROLES: { role: FacilityRole; label: string; icon: React.ReactNode }[] = [
  { role: "owner", label: "Owner", icon: <Crown className="h-3.5 w-3.5 text-amber-600" /> },
  { role: "manager", label: "Manager", icon: <Briefcase className="h-3.5 w-3.5 text-blue-600" /> },
  { role: "front_desk", label: "Front Desk", icon: <UserCheck className="h-3.5 w-3.5 text-green-600" /> },
  { role: "groomer", label: "Groomer", icon: <User className="h-3.5 w-3.5 text-slate-500" /> },
  { role: "trainer", label: "Trainer", icon: <User className="h-3.5 w-3.5 text-slate-500" /> },
  { role: "kennel_tech", label: "Kennel Tech", icon: <User className="h-3.5 w-3.5 text-slate-500" /> },
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
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Permissions & Access
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Role-based access for the forms module. Customer access is controlled by form audience setting.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs w-[180px]">Permission</th>
                {matrix.roles.map((r) => (
                  <th key={r.role} className="text-center px-2 py-2 font-medium text-xs min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      {r.icon}
                      <span>{r.label}</span>
                      <Badge variant="secondary" className={`text-[9px] h-4 px-1.5 font-normal ${ACCESS_COLORS[r.access.level]}`}>
                        {r.access.label}
                      </Badge>
                    </div>
                  </th>
                ))}
                <th className="text-center px-2 py-2 font-medium text-xs min-w-[80px]">
                  <div className="flex flex-col items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-violet-500" />
                    <span>Customer</span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-normal bg-violet-100 text-violet-700">
                      Submit
                    </Badge>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {matrix.permissions.map((permLabel, pIdx) => (
                <tr key={pIdx} className="border-b last:border-0">
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{permLabel}</td>
                  {matrix.roles.map((r) => (
                    <td key={r.role} className="text-center py-2 px-2">
                      {r.granted[pIdx] ? (
                        <Check className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                  ))}
                  <td className="text-center py-2 px-2">
                    <X className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                  </td>
                </tr>
              ))}
              {/* Customer-specific rows */}
              <tr className="border-b">
                <td className="py-2 pr-4 text-xs text-muted-foreground">View accessible forms</td>
                {matrix.roles.map((r) => (
                  <td key={r.role} className="text-center py-2 px-2">
                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                  </td>
                ))}
                <td className="text-center py-2 px-2">
                  <Check className="h-4 w-4 text-violet-600 mx-auto" />
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-xs text-muted-foreground">Submit forms</td>
                {matrix.roles.map((r) => (
                  <td key={r.role} className="text-center py-2 px-2">
                    <Check className="h-4 w-4 text-green-600 mx-auto" />
                  </td>
                ))}
                <td className="text-center py-2 px-2">
                  <Check className="h-4 w-4 text-violet-600 mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
