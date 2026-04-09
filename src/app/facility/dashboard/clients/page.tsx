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
import { BulkActionsToolbar } from "@/components/clients/BulkActionsToolbar";
import { cn } from "@/lib/utils";
import { useClientFilters } from "@/hooks/use-client-filters";
import { getCustomerLanguageLabel } from "@/lib/language-settings";
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
  Languages,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

const exportClientsToCSV = (clientsData: typeof clients) => {
  const headers = [
    "ID",
    "Name",
    "Email",
    "Phone",
    "Preferred Language",
    "Status",
    "Pets Count",
  ];

  const csvContent = [
    headers.join(","),
    ...clientsData.map((client) =>
      [
        client.id,
        `"${client.name.replace(/"/g, '""')}"`,
        client.email,
        client.phone || "",
        client.preferredLanguage
          ? getCustomerLanguageLabel(client.preferredLanguage)
          : "",
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
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );

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
    preferredLanguage?: string;
    status: string;
    facility: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      zip: string;
    };
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
      email: string;
    };
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
      preferredLanguage: newClient.preferredLanguage,
      status: newClient.status,
      facility: newClient.facility,
      address: newClient.address,
      emergencyContact: newClient.emergencyContact,
      pets: petsWithIds,
    };
    setClientsData([...clientsData, clientWithId]);
  };

  const totalPets = facilityClients.reduce((sum, c) => sum + c.pets.length, 0);
  const avgPetsPerClient =
    facilityClients.length > 0
      ? Math.round((totalPets / facilityClients.length) * 10) / 10
      : 0;

  const columns: ColumnDef<(typeof clients)[number]>[] = [
    {
      key: "name",
      label: "Name",
      icon: User,
      defaultVisible: true,
      render: (client) => (
        <div className="flex items-center gap-3">
          {client.imageUrl ? (
            <img
              src={client.imageUrl}
              alt={client.name}
              className="size-9 rounded-full object-cover ring-2 ring-slate-100"
            />
          ) : (
            <div className="bg-muted flex size-9 items-center justify-center rounded-full ring-2 ring-slate-100">
              <User className="text-muted-foreground size-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">
              {client.name}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  client.status === "active" ? "bg-emerald-500" : "bg-slate-400",
                )}
              />
              <span className="text-muted-foreground">
                {client.pets.length} pet{client.pets.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      icon: MailIcon,
      defaultVisible: true,
      render: (client) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
          <MailIcon className="size-3.5 text-sky-500" />
          {client.email}
        </span>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      icon: Phone,
      defaultVisible: true,
      render: (client) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
          <Phone className="size-3.5 text-emerald-500" />
          {client.phone || "—"}
        </span>
      ),
    },
    {
      key: "preferredLanguage",
      label: "Language",
      icon: Languages,
      defaultVisible: true,
      render: (client) => {
        if (!client.preferredLanguage) {
          return <span className="text-muted-foreground text-xs">-</span>;
        }

        return (
          <Badge
            variant="outline"
            className="border-indigo-200 bg-indigo-50/80 text-[11px] font-medium text-indigo-700"
          >
            {getCustomerLanguageLabel(client.preferredLanguage)}
          </Badge>
        );
      },
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
                  className="cursor-pointer border-sky-200 bg-sky-50/70 text-xs font-medium text-sky-700 hover:bg-sky-100"
                >
                  {pet.name}
                </Badge>
              </Link>
            ))}
            {remaining > 0 && (
              <span className="text-muted-foreground px-1 text-xs">
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
  const inactiveClientCount = Math.max(0, facilityClients.length - activeClientCount);
  const shouldShowFiltersPanel = filtersExpanded || activeCount > 0;

  return (
    <div className="flex-1 space-y-6 bg-linear-to-b from-slate-50/70 to-transparent p-4 pt-6 md:p-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 p-5 shadow-sm">
        <div className="pointer-events-none absolute -top-20 -right-16 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-emerald-200/20 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Badge variant="secondary" className="w-fit rounded-full px-3 py-1 text-[11px] uppercase">
              Customer Management
            </Badge>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Clients
              </h2>
              <p className="text-muted-foreground text-sm">
                {facility.name} client directory and pet relationships
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="text-xs">
                {facilityClients.length} total
              </Badge>
              <Badge className="bg-emerald-100 text-xs text-emerald-700 hover:bg-emerald-100">
                {activeClientCount} active
              </Badge>
              <Badge className="bg-slate-100 text-xs text-slate-700 hover:bg-slate-100">
                {inactiveClientCount} inactive
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90"
              onClick={() => exportClientsToCSV(facilityClients)}
            >
              <Download className="mr-2 size-4" />
              Export
            </Button>
            <Button size="sm" className="shadow-sm" onClick={() => setCreatingClient(true)}>
              <Plus className="mr-2 size-4" />
              New Client
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-sky-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <User className="size-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilityClients.length}</div>
            <p className="text-muted-foreground text-xs">
              All registered clients
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-emerald-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Clients
            </CardTitle>
            <UserCheck className="size-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClientCount}</div>
            <p className="text-muted-foreground text-xs">Currently active</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-violet-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pets</CardTitle>
            <PawPrint className="size-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPets}</div>
            <p className="text-muted-foreground text-xs">Across all clients</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/80 bg-linear-to-br from-white to-indigo-50/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Pets/Client
            </CardTitle>
            <BarChart3 className="size-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPetsPerClient}</div>
            <p className="text-muted-foreground text-xs">Per client average</p>
          </CardContent>
        </Card>
      </div>

      {shouldShowFiltersPanel && (
        <Card className="border border-slate-200/80 bg-white/95 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <ActiveFilterChips
              filters={filters}
              setFilter={setFilter}
              clearAll={clearAll}
              activeCount={activeCount}
            />

            <div
              className={cn(
                "grid transition-all duration-300 ease-in-out",
                filtersExpanded
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <ClientFiltersInline
                  filters={filters}
                  setFilter={setFilter}
                  toggleArrayItem={toggleArrayItem}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-slate-200/80 bg-white/95 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
            <CardTitle className="text-base">Client Directory</CardTitle>
            <p className="text-muted-foreground text-xs">
              Showing {filteredClients.length} of {facilityClients.length} clients
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="relative rounded-xl border border-slate-200/80 bg-linear-to-br from-sky-50/60 via-white to-indigo-50/50 p-2.5">
            <div className="overflow-hidden rounded-lg border border-white/90 bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="[&_thead_th]:bg-slate-50/90 [&_thead_th]:text-[11px] [&_thead_th]:font-semibold [&_thead_th]:tracking-wide [&_thead_th]:text-slate-500 [&_thead_th]:uppercase [&_tbody_td]:align-middle [&_tbody_td]:py-3 [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-200">
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
                  rowClassName={(client) =>
                    cn(
                      "border-b border-slate-100/80 [&>td]:py-3",
                      selectedIds.has(client.id)
                        ? "!bg-sky-50/80"
                        : client.status === "active"
                          ? "bg-white/95 !hover:bg-emerald-50/40"
                          : "bg-slate-50/60 !hover:bg-slate-100/80",
                    )
                  }
                  selectable
                  getItemId={(client) => client.id}
                  selectedIds={selectedIds}
                  onSelectionChange={setSelectedIds}
                  toolbarExtra={
                    <BulkActionsToolbar
                      selectedCount={selectedIds.size}
                      onDeselect={() => setSelectedIds(new Set())}
                      onExport={() =>
                        exportClientsToCSV(
                          facilityClients.filter((c) => selectedIds.has(c.id)),
                        )
                      }
                    />
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
