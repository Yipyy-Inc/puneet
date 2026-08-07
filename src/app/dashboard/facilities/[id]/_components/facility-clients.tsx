"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, UserCheck } from "lucide-react";

import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AdminClientRow } from "@/types/admin-facility";

// ============================================================================
// A facility's clients — the end customers, not the platform's.
//
// This tab matched mock clients by facility NAME: a string compare against
// eleven fictional businesses. A real facility never matched, so the list was
// always empty however many clients it had.
//
// ── "HAS ACCOUNT" IS THE CUSTOMER-SIDE TWIN OF THE STAFF COLUMN ───────────
//
// A client row is a record the FACILITY holds about somebody. `profile_id` is
// that person having signed up for themselves and being able to log in, book
// and see their pet's history. A facility can have hundreds of the first and
// none of the second — that is a perfectly normal front-desk-only business,
// and it is also what a broken customer signup looks like. Showing the number
// is how anyone can tell.
// ============================================================================

const columns: ColumnDef<AdminClientRow>[] = [
  {
    key: "name",
    label: "Client",
    sortable: true,
    render: (client) => (
      <div className="min-w-0">
        <p className="truncate font-medium">{client.name}</p>
        <p className="text-muted-foreground truncate text-xs">{client.email}</p>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (client) => <StatusBadge type="status" value={client.status} />,
  },
  {
    key: "hasAccount",
    label: "Account",
    sortable: true,
    sortValue: (client) => (client.hasAccount ? 1 : 0),
    render: (client) => (
      <span className={client.hasAccount ? "" : "text-muted-foreground"}>
        {client.hasAccount ? "Signed up" : "Record only"}
      </span>
    ),
  },
  { key: "pets", label: "Pets", sortable: true, align: "right" },
  {
    key: "lastVisit",
    label: "Last visit",
    sortable: true,
    render: (client) => client.lastVisit ?? "—",
  },
  {
    key: "outstandingBalance",
    label: "Balance",
    sortable: true,
    align: "right",
    render: (client) =>
      client.outstandingBalance > 0 ? (
        <span className="font-medium text-red-600">
          ${client.outstandingBalance.toFixed(2)}
        </span>
      ) : (
        "—"
      ),
  },
  {
    key: "phone",
    label: "Phone",
    defaultVisible: false,
    render: (client) => client.phone ?? "—",
  },
  { key: "joinedAt", label: "Added", sortable: true, align: "right" },
];

export function FacilityClients({ facilityId }: { facilityId: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "facility", facilityId, "clients"],
    queryFn: async (): Promise<AdminClientRow[]> => {
      const response = await fetch(`/api/facilities/${facilityId}/clients`);
      if (!response.ok) {
        throw new Error("Could not load this facility's clients.");
      }
      return (await response.json()) as AdminClientRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 p-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading clients…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-destructive p-6 text-sm">
        Could not load this facility&apos;s clients. Try again.
      </p>
    );
  }

  const signedUp = data.filter((client) => client.hasAccount).length;

  return (
    <div className="space-y-4">
      {data.length > 0 && (
        <p className="text-muted-foreground text-sm">
          {data.length} client{data.length === 1 ? "" : "s"} · {signedUp} with
          their own login ·{" "}
          {data.reduce((total, client) => total + client.pets, 0)} pets
        </p>
      )}

      <DataTable
        data={data}
        columns={columns}
        searchKeys={["name", "email"]}
        searchPlaceholder="Search clients by name or email…"
        filters={[
          {
            key: "status",
            label: "Status",
            // The three `clients.status` values that exist in the database.
            options: [
              { value: "active", label: "Active" },
              { value: "prospect", label: "Prospect" },
              { value: "inactive", label: "Inactive" },
            ],
          },
        ]}
        emptyState={{
          icon: UserCheck,
          title: "No clients yet",
          description:
            "This facility has not added any clients, and nobody has signed up through its booking page.",
        }}
      />
    </div>
  );
}
