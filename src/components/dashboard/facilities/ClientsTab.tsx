"use client";

import { useMemo, useState } from "react";
import { Mail, PawPrint, Phone, UserCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  DataTable,
  type ColumnDef,
  type FilterDef,
} from "@/components/ui/DataTable";
import { clients as allClients } from "@/data/clients";
import { bookings as allBookings } from "@/data/bookings";
import type { Client } from "@/types/client";

import { ClientDetailSheet } from "./ClientDetailSheet";

interface ThinClient {
  person: { name: string; email: string; phone?: string };
  status: string;
}

interface ClientsTabProps {
  facilityName: string;
  facilityId: number;
  /** Facility-embedded clients — fallback when no rich client records exist. */
  facilityClients: ThinClient[];
}

interface ClientRow extends Record<string, unknown> {
  name: string;
  email: string;
  phone: string | null;
  status: string;
  petNames: string[];
  joinedDate: string | null;
  lastVisit: string | null;
  totalSpent: number | null;
  rich: Client | null;
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

export function ClientsTab({
  facilityName,
  facilityId,
  facilityClients,
}: ClientsTabProps) {
  const [selected, setSelected] = useState<Client | null>(null);

  const rows = useMemo<ClientRow[]>(() => {
    // Primary source: rich client records linked to this facility by name.
    const rich = allClients.filter((c) => c.facility === facilityName);
    if (rich.length > 0) {
      return rich.map((c) => {
        const clientBookings = allBookings.filter(
          (b) => b.clientId === c.id && b.facilityId === facilityId,
        );
        const totalSpent = clientBookings
          .filter((b) => b.paymentStatus === "paid")
          .reduce((s, b) => s + (b.totalCost ?? 0), 0);
        const completed = clientBookings.filter(
          (b) => b.status === "completed",
        );
        // Last Visit: real field, else most recent completed booking.
        const lastVisit =
          c.lastVisitDate ??
          (completed.length
            ? completed.reduce((a, b) => (a.endDate > b.endDate ? a : b))
                .endDate
            : null);
        // Joined Date: derived from the client's earliest booking (no join
        // field exists in the data); "—" when the client has no bookings.
        const joinedDate = clientBookings.length
          ? clientBookings.reduce((a, b) => (a.startDate < b.startDate ? a : b))
              .startDate
          : null;

        return {
          name: c.name,
          email: c.email,
          phone: c.phone ?? null,
          status: c.status,
          petNames: c.pets.map((p) => p.name),
          joinedDate,
          lastVisit,
          totalSpent,
          rich: c,
        };
      });
    }

    // Fallback: facility-embedded clients (no pets / spend / visit data).
    return facilityClients.map((c) => ({
      name: c.person.name,
      email: c.person.email,
      phone: c.person.phone ?? null,
      status: c.status,
      petNames: [],
      joinedDate: null,
      lastVisit: null,
      totalSpent: null,
      rich: null,
    }));
  }, [facilityName, facilityId, facilityClients]);

  const hasRich = rows.some((r) => r.rich !== null);

  const columns: ColumnDef<ClientRow>[] = [
    {
      key: "name",
      label: "Client Name",
      icon: UserCheck,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
            {c.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <span className="font-medium">{c.name}</span>
        </div>
      ),
      sortValue: (c) => c.name,
    },
    {
      key: "pets",
      label: "Pets",
      icon: PawPrint,
      sortable: false,
      render: (c) =>
        c.petNames.length === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {c.petNames.slice(0, 2).map((p) => (
              <Badge key={p} variant="secondary" className="text-xs">
                {p}
              </Badge>
            ))}
            {c.petNames.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{c.petNames.length - 2} more
              </Badge>
            )}
          </div>
        ),
    },
    {
      key: "contact",
      label: "Contact",
      icon: Mail,
      sortable: false,
      render: (c) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="flex items-center gap-1.5">
            <Mail className="size-3 shrink-0" />
            {c.email}
          </span>
          {c.phone && (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Phone className="size-3 shrink-0" />
              {c.phone}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (c) => <StatusBadge type="status" value={c.status} />,
      sortValue: (c) => c.status,
    },
    {
      key: "joinedDate",
      label: "Joined Date",
      render: (c) => fmtDate(c.joinedDate),
      sortValue: (c) => (c.joinedDate ? new Date(c.joinedDate).getTime() : 0),
    },
    {
      key: "lastVisit",
      label: "Last Visit",
      render: (c) => fmtDate(c.lastVisit),
      sortValue: (c) => (c.lastVisit ? new Date(c.lastVisit).getTime() : 0),
    },
    {
      key: "totalSpent",
      label: "Total Spent",
      render: (c) =>
        c.totalSpent === null ? "—" : `$${c.totalSpent.toLocaleString()}`,
      sortValue: (c) => c.totalSpent ?? -1,
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
        { value: "prospect", label: "Prospect" },
      ],
    },
  ];

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <UserCheck className="size-5" />
          Clients
          <Badge variant="secondary" className="ml-2">
            {rows.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          data={rows}
          columns={columns}
          filters={filters}
          getSearchValue={(c) =>
            `${c.name} ${c.email} ${c.phone ?? ""} ${c.petNames.join(" ")}`
          }
          searchPlaceholder="Search by client, email, phone, or pet..."
          itemsPerPage={10}
          onRowClick={
            hasRich ? (c) => c.rich && setSelected(c.rich) : undefined
          }
        />
      </CardContent>

      {selected && (
        <ClientDetailSheet
          client={selected}
          facilityId={facilityId}
          onClose={() => setSelected(null)}
        />
      )}
    </Card>
  );
}
