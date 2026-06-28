"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Copy,
  DollarSign,
  Edit,
  Eye,
  Headphones,
  Plus,
  Shield,
  UserCog,
  Users,
} from "lucide-react";

import {
  roleDisplayNames,
  roleDescriptions,
  AdminRole,
} from "@/data/admin-users";
import {
  updateRolePermissions,
  useRolePermissions,
} from "@/lib/role-permissions-store";
import { useAdminTeam } from "@/lib/admin-team-store";
import {
  createCustomRole,
  updateCustomRole,
  useCustomRoles,
} from "@/lib/custom-roles-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RoleEditorDialog,
  type EditorMode,
  type RoleView,
} from "./_components/role-editor-dialog";

const roleIcons: Record<AdminRole, React.ElementType> = {
  sales_team: BarChart3,
  technical_support: Headphones,
  account_manager: Users,
  financial_auditor: DollarSign,
  system_administrator: UserCog,
};

export default function RolesPermissionsPage() {
  const permsByRole = useRolePermissions();
  const team = useAdminTeam();
  const customRoles = useCustomRoles();
  const [editor, setEditor] = useState<{
    mode: EditorMode;
    role: RoleView | null;
  } | null>(null);

  const builtInRoles: RoleView[] = (
    Object.keys(permsByRole) as AdminRole[]
  ).map((role) => ({
    id: role,
    name: roleDisplayNames[role],
    description: roleDescriptions[role],
    permissions: permsByRole[role],
    isCustom: false,
    memberCount: team.filter((u) => u.role === role).length,
  }));

  const customRoleViews: RoleView[] = customRoles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    permissions: r.permissions,
    isCustom: true,
    memberCount: 0,
  }));

  const allRoles = [...builtInRoles, ...customRoleViews];

  const iconFor = (r: RoleView): React.ElementType =>
    r.isCustom ? Shield : roleIcons[r.id as AdminRole];

  const handleSaveExisting = (role: RoleView, permissions: string[]) => {
    if (role.isCustom) {
      updateCustomRole(role.id, { permissions });
      toast.success(`${role.name} permissions updated`);
    } else {
      updateRolePermissions(role.id as AdminRole, permissions);
      const n = role.memberCount;
      toast.success(
        `Permissions updated — ${n} ${role.name} member${n === 1 ? "" : "s"} affected`,
      );
    }
    setEditor(null);
  };

  const handleCreate = (data: {
    name: string;
    description: string;
    permissions: string[];
  }) => {
    const r = createCustomRole(data);
    toast.success(`Role “${r.name}” created`);
    setEditor(null);
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {"Roles & Permissions"}
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure user roles and their associated permissions
          </p>
        </div>
        <Button onClick={() => setEditor({ mode: "create", role: null })}>
          <Plus className="mr-2 size-4" />
          {"Create Role"}
        </Button>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {allRoles.map((r) => {
          const Icon = iconFor(r);
          return (
            <Card
              key={r.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setEditor({ mode: "view", role: r })}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{r.name}</CardTitle>
                <Icon className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{r.memberCount}</div>
                <p className="text-muted-foreground text-xs">
                  {r.permissions.length} permissions
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Roles Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {allRoles.map((r) => {
          const Icon = iconFor(r);
          return (
            <Card key={r.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <Icon className="text-primary size-5" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        {r.name}
                        {r.isCustom && (
                          <Badge variant="secondary" className="text-[10px]">
                            Custom
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {r.description || "Custom role"}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Users with this role
                    </span>
                    <Badge variant="secondary">{r.memberCount}</Badge>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      Permissions ({r.permissions.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {r.permissions.slice(0, 4).map((perm) => (
                        <Badge
                          key={perm}
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {perm.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      {r.permissions.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{r.permissions.length - 4} more
                        </Badge>
                      )}
                      {r.permissions.length === 0 && (
                        <span className="text-muted-foreground text-xs">
                          No permissions yet
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditor({ mode: "view", role: r })}
                    >
                      <Eye className="mr-1 size-4" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditor({ mode: "edit", role: r })}
                    >
                      <Edit className="mr-1 size-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setEditor({ mode: "duplicate", role: r })}
                    >
                      <Copy className="mr-1 size-4" />
                      Duplicate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RoleEditorDialog
        state={editor}
        onClose={() => setEditor(null)}
        onSaveExisting={handleSaveExisting}
        onCreate={handleCreate}
      />
    </div>
  );
}
