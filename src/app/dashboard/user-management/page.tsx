"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Download,
  Mail as MailIcon,
  Plus,
  Shield,
  User,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/skeleton";
import {
  platformTeamQueries,
  type PlatformTeamRow,
} from "@/lib/api/platform-team";
import { PLATFORM_ROLE_LABEL } from "@/lib/auth/platform-role";
import { CreateAdminUserModal } from "@/components/user-management/CreateAdminUserModal";
import { PlatformMemberSheet } from "@/components/user-management/PlatformMemberSheet";
import { PageHeader } from "@/components/ui/page-header";

// ============================================================================
// The Yipyy platform team — from Postgres.
//
// ── WHAT THIS PAGE USED TO SHOW ───────────────────────────────────────────
//
// `src/data/admin-users.ts`: five invented people, overlaid with a localStorage
// store that appended anybody invited in this browser. Harmless while the
// invitation was a mock too. It stopped being harmless the moment
// /api/admin/invite began writing a real `platform_invitations` row and
// /setup/<token> began creating a real identity — from then on a real
// invitation appeared to do nothing here, and a fixture row appeared to be a
// colleague.
//
// ── COLUMNS THAT WENT, AND WHY ────────────────────────────────────────────
//
// Department, Access Level, Last Login and Phone are gone. Not because they are
// uninteresting — because nothing records them. The fixture had values for all
// four and the database has none, so keeping the columns would mean either
// inventing figures or shipping four permanently empty ones. Same for the
// "Suspended" tile: `platform_memberships` has no such state, so the number
// could only ever have been zero dressed as a measurement.
//
// What is left is what is actually known: who, at what role, since when, and
// who let them in.
// ============================================================================

function exportTeamToCSV(rows: PlatformTeamRow[]) {
  const headers = [
    "Name",
    "Email",
    "Role",
    "Status",
    "Since",
    "Invited by",
    "Invitation expires",
  ];

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      [
        `"${(row.name ?? "").replace(/"/g, '""')}"`,
        row.email,
        PLATFORM_ROLE_LABEL[row.role] ?? row.role,
        row.status,
        row.since,
        row.invitedByEmail ?? "",
        row.expiresAt ?? "",
      ].join(","),
    ),
  ].join("\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `platform-team-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const { data: team, isPending, error } = useQuery(platformTeamQueries.all());
  const [selected, setSelected] = useState<PlatformTeamRow | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const rows = team ?? [];
  const active = rows.filter((r) => r.status === "active").length;
  const invited = rows.filter((r) => r.status === "invited").length;

  const columns: ColumnDef<PlatformTeamRow>[] = [
    { key: "name", label: "Name", icon: User, defaultVisible: true },
    { key: "email", label: "Email", icon: MailIcon, defaultVisible: true },
    {
      key: "role",
      label: "Role",
      icon: Shield,
      defaultVisible: true,
      render: (row) => (
        <Badge variant="secondary" className="font-normal">
          {PLATFORM_ROLE_LABEL[row.role] ?? row.role}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      icon: Shield,
      defaultVisible: true,
      render: (row) =>
        row.status === "active" ? (
          <Badge className="border-emerald-600/40 bg-emerald-600/10 font-normal text-emerald-700 dark:text-emerald-400">
            On the team
          </Badge>
        ) : (
          <Badge className="border-amber-600/40 bg-amber-600/10 font-normal text-amber-700 dark:text-amber-400">
            Invited
          </Badge>
        ),
    },
    {
      key: "since",
      label: "Since",
      icon: Clock,
      defaultVisible: true,
      render: (row) => new Date(row.since).toLocaleDateString(),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All" },
        { value: "active", label: "On the team" },
        { value: "invited", label: "Invited" },
      ],
    },
    {
      key: "role",
      label: "Role",
      // The four values of public.platform_role, and only those. The invite
      // form offers exactly these now, so a filter here and a choice there name
      // the same thing — they did not while the form offered five job titles
      // that collapsed onto four roles server-side.
      options: [
        { value: "all", label: "All roles" },
        { value: "superadmin", label: "Superadmin" },
        { value: "support", label: "Support" },
        { value: "billing", label: "Billing" },
        { value: "readonly", label: "Read only" },
      ],
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* §1: exactly one 48px prominent control per screen. Inviting an admin
          is what this page is FOR; exporting is a secondary 40px outline. */}
      <PageHeader
        title="Platform team"
        secondary={
          <Button
            variant="outline"
            onClick={() => exportTeamToCSV(rows)}
            disabled={rows.length === 0}
          >
            <Download />
            Export
          </Button>
        }
        action={
          <Button size="prominent" onClick={() => setIsCreateModalOpen(true)}>
            <Plus />
            Invite an admin
          </Button>
        }
      />

      {error && (
        <p
          role="alert"
          className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
        >
          {(error as Error).message}
        </p>
      )}

      {/* Three tiles, not four. Each one counts a row that exists. */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team size</CardTitle>
            <UserCog className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold">{rows.length}</div>
            )}
            <p className="text-muted-foreground text-xs">
              Members and pending invitations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On the team</CardTitle>
            <UserCheck className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600">
                {active}
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              Rows in platform_memberships
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Awaiting setup
            </CardTitle>
            <Clock className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-amber-600">{invited}</div>
            )}
            <p className="text-muted-foreground text-xs">
              Invitations not yet accepted
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={rows as unknown as Record<string, unknown>[]}
        columns={columns as unknown as ColumnDef<Record<string, unknown>>[]}
        filters={filters}
        searchKey="email"
        searchPlaceholder="Search by email…"
        itemsPerPage={10}
        onRowClick={(row) => setSelected(row as unknown as PlatformTeamRow)}
        emptyState={{
          pose: "pointing",
          icon: Users,
          title: "Nobody on the platform team yet",
          description:
            "Invite a colleague to run Yipyy. They set their own password at the link they are sent.",
          action: {
            label: "Invite admin",
            onClick: () => setIsCreateModalOpen(true),
            icon: Plus,
          },
        }}
      />

      <PlatformMemberSheet
        row={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onRevoked={() => {
          setSelected(null);
          void queryClient.invalidateQueries({ queryKey: ["platform-team"] });
        }}
      />

      <CreateAdminUserModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        // The invitation ROW exists whether or not the email went out — the
        // dialog says which, and says it where the setup link is — so the only
        // thing left to do here is show the new row.
        //
        // There used to be a toast on top of that, and it was the reason this
        // file sat in the check:success-claims baseline: "Invitation email sent
        // to …" fired from a component that cannot send an email and could not
        // see whether one had been. The dialog knows; it reports.
        onInvited={() => {
          void queryClient.invalidateQueries({ queryKey: ["platform-team"] });
        }}
      />
    </div>
  );
}
