"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import {
  ClientFiltersInline,
  ActiveFilterChips,
} from "@/components/clients/ClientFiltersInline";
import { useClientFilters } from "@/hooks/use-client-filters";
import {
  Download,
  User,
  UserCheck,
  Phone,
  Plus,
  PawPrint,
  CircleDot,
  BarChart3,
  Mail as MailIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";

const exportClientsToCSV = (clientsData: typeof clients) => {
  const headers = ["ID", "Name", "Email", "Phone", "Status", "Pets Count"];

  const csvContent = [
    headers.join(","),
    ...clientsData.map((client) =>
      [
        client.id,
        `"${client.name.replace(/"/g, '""')}"`,
        client.email,
        client.phone || "",
        client.status,
        client.pets.length,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `clients_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function FacilityClientsPage() {
  const router = useRouter();
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const {
    filters,
    setFilter,
    toggleArrayItem,
    clearAll,
    activeCount,
    applyFilters,
  } = useClientFilters();

  const [clientsData, setClientsData] = useState(clients);
  const [creatingClient, setCreatingClient] = useState(false);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  const facilityClients = clientsData.filter(
    (client) => client.facility === facility.name,
  );

  const handleCreateClient = (newClient: {
    name: string;
    email: string;
    phone?: string;
    status: string;
    facility: string;
    pets: Array<{
      name: string;
      type: string;
      breed: string;
      age: number;
      weight: number;
      color: string;
      microchip: string;
      allergies: string;
      specialNeeds: string;
    }>;
  }) => {
    const maxId = Math.max(...clientsData.map((c) => c.id), 0);
    const petMaxId = Math.max(
      ...clientsData.flatMap((c) => c.pets.map((p) => p.id)),
      0,
    );

    const petsWithIds = newClient.pets.map((pet, index) => ({
      id: petMaxId + index + 1,
      ...pet,
    }));

    const clientWithId = {
      id: maxId + 1,
      name: newClient.name,
      email: newClient.email,
      phone: newClient.phone || "",
      status: newClient.status,
      facility: newClient.facility,
      address: {
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      },
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
        email: "",
      },
      pets: petsWithIds,
    };
    setClientsData([...clientsData, clientWithId]);
  };

  const totalPets = facilityClients.reduce((sum, c) => sum + c.pets.length, 0);

  const columns: ColumnDef<(typeof clients)[number]>[] = [
    {
      key: "name",
      label: "Name",
      icon: User,
      defaultVisible: true,
      render: (client) => <span className="font-medium">{client.name}</span>,
    },
    {
      key: "email",
      label: "Email",
      icon: MailIcon,
      defaultVisible: true,
      render: (client) => (
        <span className="text-muted-foreground text-sm">{client.email}</span>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      icon: Phone,
      defaultVisible: true,
      render: (client) => (
        <span className="text-muted-foreground text-sm">
          {client.phone || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      icon: CircleDot,
      defaultVisible: true,
      render: (client) => <StatusBadge type="status" value={client.status} />,
    },
    {
      key: "pets",
      label: "Pets",
      icon: PawPrint,
      defaultVisible: true,
      render: (client) => {
        if (client.pets.length === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const visible = client.pets.slice(0, 2);
        const remaining = client.pets.length - visible.length;
        return (
          <div className="flex flex-wrap gap-1">
            {visible.map((pet) => (
              <Link
                key={pet.id}
                href={`/facility/dashboard/clients/${client.id}/pets/${pet.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge
                  variant="outline"
                  className="hover:bg-muted/50 cursor-pointer text-xs font-normal"
                >
                  {pet.name}
                </Badge>
              </Link>
            ))}
            {remaining > 0 && (
              <span className="text-muted-foreground text-xs">
                +{remaining}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const filteredClients = applyFilters(facilityClients);
  const activeClientCount = facilityClients.filter(
    (c) => c.status === "active",
  ).length;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Clients</h2>
            <p className="text-muted-foreground text-sm">{facility.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportClientsToCSV(facilityClients)}
            >
              <Download className="mr-2 size-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setCreatingClient(true)}>
              <Plus className="mr-2 size-4" />
              New Client
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <User className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilityClients.length}</div>
            <p className="text-muted-foreground text-xs">
              All registered clients
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Clients
            </CardTitle>
            <UserCheck className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClientCount}</div>
            <p className="text-muted-foreground text-xs">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pets</CardTitle>
            <PawPrint className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPets}</div>
            <p className="text-muted-foreground text-xs">Across all clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Pets/Client
            </CardTitle>
            <BarChart3 className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilityClients.length > 0
                ? Math.round((totalPets / facilityClients.length) * 10) / 10
                : 0}
            </div>
            <p className="text-muted-foreground text-xs">Per client average</p>
          </CardContent>
        </Card>
      </div>

      {/* Active filter chips */}
      <ActiveFilterChips
        filters={filters}
        setFilter={setFilter}
        clearAll={clearAll}
        activeCount={activeCount}
      />

      {filtersExpanded && (
        <ClientFiltersInline
          filters={filters}
          setFilter={setFilter}
          toggleArrayItem={toggleArrayItem}
        />
      )}

      <DataTable
        data={filteredClients}
        columns={columns}
        getSearchValue={(client) =>
          [client.name, ...client.pets.map((p) => p.name)].join(" ")
        }
        searchPlaceholder="Search by client or pet name..."
        itemsPerPage={10}
        onFilterClick={() => setFiltersExpanded(!filtersExpanded)}
        filterCount={activeCount}
        onRowClick={(client) =>
          router.push(`/facility/dashboard/clients/${client.id}`)
        }
      />

      <PageAuditTrail area="clients" />

      {/* Create Client Modal */}
      <CreateClientModal
        open={creatingClient}
        onOpenChange={setCreatingClient}
        onSave={handleCreateClient}
        facilityName={facility.name}
      />
    </div>
  );
}
