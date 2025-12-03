"use client";

import { useState } from "react";
import {
  rolePermissions,
  roleDisplayNames,
  roleDescriptions,
  adminUsers,
  AdminRole,
} from "@/data/admin-users";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Shield,
  Users,
  Settings,
  Edit,
  Eye,
  DollarSign,
  Headphones,
  BarChart3,
  UserCog,
} from "lucide-react";

const roleIcons: Record<AdminRole, React.ElementType> = {
  sales_team: BarChart3,
  technical_support: Headphones,
  account_manager: Users,
  financial_auditor: DollarSign,
  system_administrator: UserCog,
};

const allPermissions = [
  { id: "view_leads", label: "View Leads", category: "Sales" },
  { id: "manage_leads", label: "Manage Leads", category: "Sales" },
  { id: "create_quotes", label: "Create Quotes", category: "Sales" },
  { id: "view_clients", label: "View Clients", category: "Clients" },
  { id: "manage_clients", label: "Manage Clients", category: "Clients" },
  { id: "view_billing", label: "View Billing", category: "Finance" },
  { id: "manage_billing", label: "Manage Billing", category: "Finance" },
  { id: "view_transactions", label: "View Transactions", category: "Finance" },
  {
    id: "export_financial_data",
    label: "Export Financial Data",
    category: "Finance",
  },
  {
    id: "compliance_reports",
    label: "Compliance Reports",
    category: "Finance",
  },
  {
    id: "manage_subscriptions",
    label: "Manage Subscriptions",
    category: "Clients",
  },
  { id: "view_reports", label: "View Reports", category: "Reports" },
  {
    id: "send_communications",
    label: "Send Communications",
    category: "Communication",
  },
  { id: "view_tickets", label: "View Tickets", category: "Support" },
  { id: "manage_tickets", label: "Manage Tickets", category: "Support" },
  { id: "view_system_logs", label: "View System Logs", category: "System" },
  {
    id: "access_knowledge_base",
    label: "Access Knowledge Base",
    category: "Support",
  },
  { id: "remote_assistance", label: "Remote Assistance", category: "Support" },
  { id: "escalate_issues", label: "Escalate Issues", category: "Support" },
  {
    id: "audit_trail_access",
    label: "Audit Trail Access",
    category: "Security",
  },
  { id: "full_system_access", label: "Full System Access", category: "System" },
  { id: "manage_users", label: "Manage Users", category: "Administration" },
  { id: "manage_roles", label: "Manage Roles", category: "Administration" },
  {
    id: "system_configuration",
    label: "System Configuration",
    category: "System",
  },
  { id: "security_settings", label: "Security Settings", category: "Security" },
  { id: "backup_restore", label: "Backup & Restore", category: "System" },
  { id: "audit_all_actions", label: "Audit All Actions", category: "Security" },
];

export default function RolesPermissionsPage() {
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [viewMode, setViewMode] = useState<"view" | "edit">("view");

  const roles = Object.keys(rolePermissions) as AdminRole[];

  const getUserCountByRole = (role: AdminRole) => {
    return adminUsers.filter((u) => u.role === role).length;
  };

  const getPermissionsByCategory = () => {
    const categories: Record<string, typeof allPermissions> = {};
    allPermissions.forEach((perm) => {
      if (!categories[perm.category]) {
        categories[perm.category] = [];
      }
      categories[perm.category].push(perm);
    });
    return categories;
  };

  return (
    <div className="flex-1 space-y-6 p-4 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {"Roles & Permissions"}
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure user roles and their associated permissions
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {roles.map((role) => {
          const Icon = roleIcons[role];
          const userCount = getUserCountByRole(role);
          return (
            <Card
              key={role}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setSelectedRole(role);
                setViewMode("view");
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {roleDisplayNames[role]}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userCount}</div>
                <p className="text-xs text-muted-foreground">
                  {rolePermissions[role].length} permissions
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Roles Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const Icon = roleIcons[role];
          const permissions = rolePermissions[role];
          const userCount = getUserCountByRole(role);

          return (
            <Card key={role} className="overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {roleDisplayNames[role]}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {roleDescriptions[role]}
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
                    <Badge variant="secondary">{userCount}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Permissions ({permissions.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {permissions.slice(0, 4).map((perm) => (
                        <Badge
                          key={perm}
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {perm.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      {permissions.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{permissions.length - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedRole(role);
                        setViewMode("view");
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setSelectedRole(role);
                        setViewMode("edit");
                      }}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Role Details Modal */}
      <Dialog open={!!selectedRole} onOpenChange={() => setSelectedRole(null)}>
        <DialogContent className="min-w-5xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {selectedRole && roleDisplayNames[selectedRole]} -{" "}
              {viewMode === "edit" ? "Edit Permissions" : "View Permissions"}
            </DialogTitle>
            <DialogDescription>
              {selectedRole && roleDescriptions[selectedRole]}
            </DialogDescription>
          </DialogHeader>

          {selectedRole && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <StatusBadge type="adminRole" value={selectedRole} showIcon />
                <div className="text-sm text-muted-foreground">
                  {getUserCountByRole(selectedRole)} users •{" "}
                  {rolePermissions[selectedRole].length} permissions
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(getPermissionsByCategory()).map(
                  ([category, perms]) => (
                    <div key={category}>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {category}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {perms.map((perm) => {
                          const isEnabled = rolePermissions[
                            selectedRole
                          ].includes(perm.id);
                          return (
                            <div
                              key={perm.id}
                              className={`flex items-center gap-2 p-2 rounded-lg ${
                                isEnabled
                                  ? "bg-green-50 dark:bg-green-950/20"
                                  : "bg-muted/30"
                              }`}
                            >
                              <Checkbox
                                id={perm.id}
                                checked={isEnabled}
                                disabled={viewMode === "view"}
                              />
                              <label
                                htmlFor={perm.id}
                                className={`text-sm ${
                                  isEnabled
                                    ? "font-medium"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {perm.label}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>

              {viewMode === "edit" && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRole(null)}
                  >
                    {"Cancel"}
                  </Button>
                  <Button onClick={() => setSelectedRole(null)}>
                    {"Save"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
