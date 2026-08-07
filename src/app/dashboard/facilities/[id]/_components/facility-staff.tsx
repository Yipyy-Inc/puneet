"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, MailWarning, Users } from "lucide-react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AdminStaffRow } from "@/types/admin-facility";

// ============================================================================
// Who works here — and, separately, who can actually sign in.
//
// This tab used to filter mock `users` by NUMERIC facility id, so a real
// facility showed nobody. The 23 staff records on the demo facility were in
// Postgres the whole time.
//
// ── THE COLUMN THAT JUSTIFIES THE TAB ─────────────────────────────────────
//
// "Account". A staff record is something the facility holds ABOUT a person; a
// membership is that person's route INTO the software. Provisioning creates
// the first and only promises the second — the owner is invited and claims
// their grant when they sign up, and until then they cannot get in.
//
// Every screen so far has treated "we created their account" and "they can
// sign in" as the same sentence. They are not, and when an owner emails to say
// the invitation never arrived, this column is the answer.
//
// ── ACCOUNT AND EMPLOYMENT ARE DIFFERENT COLUMNS ON PURPOSE ───────────────
//
// `staff.status` also has an "invited" value, and the two can disagree — a
// record marked invited whose Account says no invitation exists means somebody
// typed a status and nothing was ever sent. That disagreement is information,
// so both are shown rather than one being folded into the other.
// ============================================================================

const ACCOUNT_LABEL: Record<AdminStaffRow["account"], string> = {
  active: "active",
  invited: "invited",
  none: "inactive",
};

const columns: ColumnDef<AdminStaffRow>[] = [
  {
    key: "name",
    label: "Name",
    sortable: true,
    render: (person) => (
      <div className="min-w-0">
        <p className="flex items-center gap-2 truncate font-medium">
          {person.name}
          {person.source === "membership" && (
            <Badge variant="outline" className="text-[10px] font-normal">
              no staff record
            </Badge>
          )}
        </p>
        <p className="text-muted-foreground truncate text-xs">{person.email}</p>
      </div>
    ),
  },
  {
    key: "role",
    label: "Role",
    sortable: true,
    render: (person) => (
      <span className="capitalize">{person.role.replace(/_/g, " ")}</span>
    ),
  },
  {
    key: "jobTitle",
    label: "Job title",
    render: (person) => person.jobTitle ?? "—",
  },
  {
    key: "account",
    label: "Account",
    sortable: true,
    sortValue: (person) => person.account,
    render: (person) => (
      <StatusBadge type="status" value={ACCOUNT_LABEL[person.account]} />
    ),
  },
  {
    key: "status",
    label: "Employment",
    sortable: true,
    render: (person) => (
      <span className="capitalize">{person.status.replace(/_/g, " ")}</span>
    ),
  },
  {
    key: "phone",
    label: "Phone",
    defaultVisible: false,
    render: (person) => person.phone ?? "—",
  },
  {
    key: "joinedAt",
    label: "Added",
    sortable: true,
    align: "right",
  },
];

export function FacilityStaff({ facilityId }: { facilityId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "facility", facilityId, "staff"],
    queryFn: async (): Promise<AdminStaffRow[]> => {
      const response = await fetch(`/api/facilities/${facilityId}/staff`);
      if (!response.ok)
        throw new Error("Could not load this facility's staff.");
      return (await response.json()) as AdminStaffRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading staff…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-destructive p-6 text-sm">
        Could not load this facility&apos;s staff. Try again.
      </p>
    );
  }

  const withoutAccess = data.filter((person) => person.account !== "active");

  return (
    <div className="space-y-4">
      {withoutAccess.length > 0 && (
        <Card className="border-0 bg-amber-50 shadow-none dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 py-4 text-sm">
            <MailWarning className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p className="text-amber-900 dark:text-amber-200">
              <strong>
                {withoutAccess.length} of {data.length}
              </strong>{" "}
              cannot sign in yet —{" "}
              {withoutAccess.filter((p) => p.account === "invited").length} have
              an unclaimed invitation, and{" "}
              {withoutAccess.filter((p) => p.account === "none").length} have a
              staff record with no invitation at all.
            </p>
          </CardContent>
        </Card>
      )}

      <DataTable
        data={data}
        columns={columns}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search staff by name or email…"
        filters={[
          {
            key: "account",
            label: "Account",
            options: [
              { value: "active", label: "Can sign in" },
              { value: "invited", label: "Invited" },
              { value: "none", label: "No invitation" },
            ],
          },
        ]}
        emptyState={{
          icon: Users,
          title: "No staff recorded",
          description:
            "Nobody has been added to this facility yet — not even an owner, which a provisioned facility should have.",
        }}
      />
    </div>
  );
}
