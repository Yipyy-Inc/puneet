"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  roleDisplayNames,
  rolePermissions,
  AdminUser,
} from "@/data/admin-users";
import { getAdminTeam, useAdminTeam } from "@/lib/admin-team-store";
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
  Users,
  Mail as MailIcon,
  Shield,
  Building,
  Clock,
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
  // Deep-link: global search navigates here with ?user=<id> to open the modal.
  const searchParams = useSearchParams();
  const team = useAdminTeam();
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(() => {
    const id = searchParams.get("user");
    const found = id
      ? getAdminTeam().find((u) => String(u.id) === id)
      : undefined;
    return found ? (found as unknown as AdminUser) : null;
  });
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
      render: (user) =>
        user.lastLogin
          ? new Date(user.lastLogin).toLocaleDateString()
          : "Never",
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "active", label: "Active" },
        { value: "invited", label: "Invited" },
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

  const activeUsers = team.filter((u) => u.status === "active").length;
  const suspendedUsers = team.filter((u) => u.status === "suspended").length;
  const inactiveUsers = team.filter((u) => u.status === "inactive").length;
  const invitedUsers = team.filter((u) => u.status === "invited").length;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{"Admin Users"}</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => exportUsersToCSV(team)}>
            <Download className="mr-2 size-4" />
            {"Export"}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 size-4" />
            {"Invite Admin"}
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
            <UserCog className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{team.length}</div>
            <p className="text-muted-foreground text-xs">
              {invitedUsers > 0
                ? `${invitedUsers} pending invite${invitedUsers === 1 ? "" : "s"}`
                : "Across all roles"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Active Admin Users"}
            </CardTitle>
            <UserCheck className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeUsers}
            </div>
            <p className="text-muted-foreground text-xs">
              {Math.round((activeUsers / team.length) * 100)}% of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Suspended Users"}
            </CardTitle>
            <UserX className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {suspendedUsers}
            </div>
            <p className="text-muted-foreground text-xs">
              {inactiveUsers} inactive · {invitedUsers} invited
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Roles Configured"}
            </CardTitle>
            <Key className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(rolePermissions).length}
            </div>
            <p className="text-muted-foreground text-xs">
              With custom permissions
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={team as unknown as Record<string, unknown>[]}
        columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
        filters={filters}
        searchKey="name"
        searchPlaceholder={"Search admin users..."}
        itemsPerPage={10}
        onRowClick={(user) => setSelectedUser(user as unknown as AdminUser)}
        emptyState={{
          icon: Users,
          title: "No admin users yet",
          description:
            "Invite teammates to manage the platform across roles and access levels.",
          action: {
            label: "Invite Admin",
            onClick: () => setIsCreateModalOpen(true),
            icon: Plus,
          },
        }}
      />
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="flex max-h-[90vh] min-w-5xl flex-col p-0">
          <div className="flex-1 overflow-y-auto p-6">
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
        onInvited={(member, result) => {
          if (result.sent) {
            toast.success(`Invitation email sent to ${member.email}`);
          } else {
            toast.message(`${member.name} invited`, {
              description:
                "Email service isn't configured — share the setup link from the dialog.",
            });
          }
        }}
      />
    </div>
  );
}
