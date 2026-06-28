"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  KeyRound,
  Mail,
  MoreVertical,
  Plus,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { users } from "@/data/users";
import {
  addStaffAccount,
  deactivateStaffAccount,
  ensureFacilityStaffSeeded,
  setStaffRole,
  useFacilityStaff,
  type StaffAccount,
  type StaffStatus,
} from "@/lib/facility-staff-store";
import { cn } from "@/lib/utils";

import {
  AddStaffAccountModal,
  type NewStaffInput,
} from "./AddStaffAccountModal";

const ROLES = ["Admin", "Manager", "Staff"];

interface ThinUser {
  person: { name: string; email: string };
  role: string;
}

interface StaffTabProps {
  facilityId: number;
  facilityName: string;
  facilityUsersList: ThinUser[];
}

const STATUS_STYLE: Record<
  StaffStatus,
  { label: string; dot: string; cls: string }
> = {
  active: {
    label: "Active",
    dot: "bg-emerald-500",
    cls: "border-emerald-200 text-emerald-700 dark:text-emerald-300",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-zinc-400",
    cls: "border-zinc-200 text-zinc-600 dark:text-zinc-300",
  },
  invited: {
    label: "Invited",
    dot: "bg-amber-500",
    cls: "border-amber-200 text-amber-700 dark:text-amber-300",
  },
};

function roleGradient(role: string): string {
  return role === "Admin"
    ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
    : role === "Manager"
      ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
      : "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)";
}

function roleBadgeClass(role: string): string {
  return role === "Admin"
    ? "bg-primary text-primary-foreground"
    : role === "Manager"
      ? "bg-info text-info-foreground"
      : "";
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fmtDate(iso: string | null): string {
  return iso
    ? new Date(iso).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

// Primary: the facility's full staff roster from users.ts (real role / status /
// last login, linked by facility name). Fallback: the facility-embedded list
// for facilities with no users.ts staff (e.g. facility 11).
function buildSeed(
  facilityName: string,
  facilityUsersList: ThinUser[],
): StaffAccount[] {
  const fromUsers = users.filter((u) => u.facility === facilityName);
  if (fromUsers.length > 0) {
    return fromUsers.map((u) => ({
      id: `u-${u.id}`,
      name: u.name,
      email: u.email,
      role: u.role,
      status: (u.status === "inactive" ? "inactive" : "active") as StaffStatus,
      lastLogin: u.lastLogin ?? null,
    }));
  }
  return facilityUsersList.map((u, i) => ({
    id: `ul-${i}`,
    name: u.person.name,
    email: u.person.email,
    role: u.role,
    status: "active" as StaffStatus,
    lastLogin: null,
  }));
}

export function StaffTab({
  facilityId,
  facilityName,
  facilityUsersList,
}: StaffTabProps) {
  // Seed once per facility into the shared store, then read from it so edits
  // persist across tab switches / facility navigation.
  ensureFacilityStaffSeeded(facilityId, () =>
    buildSeed(facilityName, facilityUsersList),
  );
  const staff = useFacilityStaff(facilityId);
  const [addOpen, setAddOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffAccount | null>(
    null,
  );

  function handleResetPassword(s: StaffAccount) {
    toast.success(`Password reset email sent to ${s.email}.`);
  }

  function handleChangeRole(s: StaffAccount, role: string) {
    if (role === s.role) return;
    setStaffRole(facilityId, s.id, role);
    toast.success(`${s.name}'s role changed to ${role}.`);
  }

  function handleDeactivate(s: StaffAccount) {
    deactivateStaffAccount(facilityId, s.id);
    setDeactivateTarget(null);
    toast.success(`${s.name}'s account was deactivated.`);
  }

  function handleAddStaff(input: NewStaffInput) {
    addStaffAccount(facilityId, {
      id: `new-${Date.now()}`,
      name: `${input.firstName} ${input.lastName}`.trim(),
      email: input.email,
      role: input.role,
      status: "invited",
      lastLogin: null,
    });
    setAddOpen(false);
    toast.success(`Invitation email sent to ${input.email}.`);
  }

  const columns: ColumnDef<StaffAccount>[] = [
    {
      key: "name",
      label: "Name",
      icon: Users,
      render: (s) => (
        <div className="flex items-center gap-3">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ background: roleGradient(s.role) }}
          >
            {initials(s.name)}
          </div>
          <span className="font-medium">{s.name}</span>
        </div>
      ),
      sortValue: (s) => s.name,
    },
    {
      key: "email",
      label: "Email",
      icon: Mail,
      render: (s) => (
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <Mail className="size-3.5 shrink-0" />
          {s.email}
        </span>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (s) => (
        <Badge
          variant={s.role === "Admin" ? "default" : "secondary"}
          className={roleBadgeClass(s.role)}
        >
          {s.role}
        </Badge>
      ),
      sortValue: (s) => s.role,
    },
    {
      key: "status",
      label: "Status",
      render: (s) => {
        const st = STATUS_STYLE[s.status];
        return (
          <Badge
            variant="outline"
            className={cn("gap-1.5 font-normal", st.cls)}
          >
            <span className={cn("size-1.5 rounded-full", st.dot)} />
            {st.label}
          </Badge>
        );
      },
      sortValue: (s) => s.status,
    },
    {
      key: "lastLogin",
      label: "Last Login",
      render: (s) => fmtDate(s.lastLogin),
      sortValue: (s) => (s.lastLogin ? new Date(s.lastLogin).getTime() : 0),
    },
  ];

  const rowActions = (s: StaffAccount) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Actions for ${s.name}`}
        >
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleResetPassword(s)}>
          <KeyRound className="mr-2 size-4" />
          Reset Password
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <UserCog className="mr-2 size-4" />
            Change Role
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuLabel>Assign role</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={s.role}
              onValueChange={(r) => handleChangeRole(s, r)}
            >
              {ROLES.map((r) => (
                <DropdownMenuRadioItem key={r} value={r}>
                  {r}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-rose-600 focus:text-rose-600"
          disabled={s.status === "inactive"}
          onClick={() => setDeactivateTarget(s)}
        >
          <Trash2 className="mr-2 size-4" />
          Deactivate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Users className="size-5" />
          Staff Members
          <Badge variant="secondary" className="ml-2">
            {staff.length}
          </Badge>
        </CardTitle>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add Staff Account
        </Button>
      </CardHeader>
      <CardContent>
        <DataTable
          data={staff}
          columns={columns}
          getSearchValue={(s) => `${s.name} ${s.email} ${s.role}`}
          searchPlaceholder="Search staff by name, email, or role..."
          itemsPerPage={10}
          actions={rowActions}
          emptyState={{
            icon: Users,
            title: "No staff accounts yet",
            description:
              "Add staff members to give them access to this facility.",
            action: {
              label: "Add Staff",
              onClick: () => setAddOpen(true),
              icon: Plus,
            },
          }}
        />
      </CardContent>

      <AddStaffAccountModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={handleAddStaff}
      />

      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(o) => {
          if (!o) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate {deactivateTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This staff account will be set to Inactive and can no longer sign
              in. You can reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() =>
                deactivateTarget && handleDeactivate(deactivateTarget)
              }
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
