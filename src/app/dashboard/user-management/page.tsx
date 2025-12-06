"use client";

import { useState } from "react";
import { adminUsers, roleDisplayNames, AdminUser } from "@/data/admin-users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Download,
  User,
  Mail as MailIcon,
  Shield,
  Building,
  Clock,
  Eye,
  UserCog,
  UserCheck,
  UserX,
  Key,
  Plus,
} from "lucide-react";
import { AdminUserModal } from "@/components/user-management/AdminUserModal";
import { CreateAdminUserModal } from "@/components/user-management/CreateAdminUserModal";

const exportUsersToCSV = (usersData: AdminUser[]) => {
  const headers = [
    "ID",
    "Name",
    "Email",
    "Role",
    "Department",
    "Status",
    "Access Level",
    "Last Login",
    "Phone",
    "Created At",
    "Responsibility Areas",
  ];

  const csvContent = [
    headers.join(","),
    ...usersData.map((user) =>
      [
        user.id,
        `"${user.name.replace(/"/g, '""')}"`,
        user.email,
        roleDisplayNames[user.role],
        `"${user.department.replace(/"/g, '""')}"`,
        user.status,
        user.accessLevel,
        user.lastLogin,
        user.phone || "",
        user.createdAt,
        `"${user.responsibilityAreas.join("; ")}"`,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `admin_users_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function UserManagementPage() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const columns: ColumnDef<AdminUser>[] = [
    {
      key: "name",
      label: "Name",
      icon: User,
      defaultVisible: true,
    },
    {
      key: "email",
      label: "Email",
      icon: MailIcon,
      defaultVisible: true,
    },
    {
      key: "role",
      label: "Assign Role",
      icon: Shield,
      defaultVisible: true,
      render: (user) => <StatusBadge type="adminRole" value={user.role} />,
    },
    {
      key: "department",
      label: "Department",
      icon: Building,
      defaultVisible: true,
    },
    {
      key: "status",
      label: "Status",
      icon: Shield,
      defaultVisible: true,
      render: (user) => <StatusBadge type="status" value={user.status} />,
    },
    {
      key: "accessLevel",
      label: "Access Level",
      icon: Key,
      defaultVisible: true,
      render: (user) => (
        <StatusBadge type="accessLevel" value={user.accessLevel} />
      ),
    },
    {
      key: "lastLogin",
      label: "Last Login",
      icon: Clock,
      defaultVisible: true,
      render: (user) => new Date(user.lastLogin).toLocaleDateString(),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "suspended", label: "Suspended" },
      ],
    },
    {
      key: "role",
      label: "Assign Role",
      options: [
        { value: "all", label: "All Roles" },
        { value: "sales_team", label: "Sales Team" },
        { value: "technical_support", label: "Technical Support" },
        { value: "account_manager", label: "Account Manager" },
        { value: "financial_auditor", label: "Financial Auditor" },
        { value: "system_administrator", label: "System Administrator" },
      ],
    },
    {
      key: "accessLevel",
      label: "Access Level",
      options: [
        { value: "all", label: "All Access Levels" },
        { value: "full", label: "Full Access" },
        { value: "read_write", label: "Read/Write Access" },
        { value: "read_only", label: "Read Only Access" },
        { value: "restricted", label: "Restricted Access" },
      ],
    },
  ];

  const activeUsers = adminUsers.filter((u) => u.status === "active").length;
  const suspendedUsers = adminUsers.filter(
    (u) => u.status === "suspended",
  ).length;
  const inactiveUsers = adminUsers.filter(
    (u) => u.status === "inactive",
  ).length;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{"Admin Users"}</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => exportUsersToCSV(adminUsers)}
          >
            <Download className="mr-2 h-4 w-4" />
            {"Export"}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {"Add User"}
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Total Admin Users"}
            </CardTitle>
            <UserCog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers.length}</div>
            <p className="text-xs text-muted-foreground">Across all roles</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Active Admin Users"}
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((activeUsers / adminUsers.length) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Suspended Users"}
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {suspendedUsers}
            </div>
            <p className="text-xs text-muted-foreground">
              {inactiveUsers} inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Roles Configured"}
            </CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              With custom permissions
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={adminUsers as unknown as Record<string, unknown>[]}
        columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
        filters={filters}
        searchKey="name"
        searchPlaceholder={"Search admin users..."}
        itemsPerPage={10}
        actions={(user) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedUser(user as unknown as AdminUser)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="min-w-5xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-y-auto">
            <DialogHeader className="mb-0">
              <DialogTitle className="sr-only">
                {selectedUser?.name} - {"User Details"}
              </DialogTitle>
            </DialogHeader>
            {selectedUser && <AdminUserModal user={selectedUser} />}
          </div>
        </DialogContent>
      </Dialog>

      <CreateAdminUserModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSave={(userData) => {
          console.log("New user created:", userData);
          // In a real application, this would make an API call to create the user
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}
