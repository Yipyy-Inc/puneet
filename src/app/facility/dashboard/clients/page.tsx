"use client";

import { useState } from "react";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
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
import { ClientModal } from "@/components/modals/ClientModal";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { Download, User, Mail as MailIcon, Eye, Plus } from "lucide-react";

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
  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [clientsData, setClientsData] = useState(clients);
  const [selectedClient, setSelectedClient] = useState<
    (typeof clients)[number] | null
  >(null);
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
      phone: newClient.phone,
      status: newClient.status,
      facility: newClient.facility,
      pets: petsWithIds,
    };
    setClientsData([...clientsData, clientWithId]);
  };

  const columns: ColumnDef<(typeof clients)[number]>[] = [
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
      key: "phone",
      label: "Phone",
      icon: MailIcon,
      defaultVisible: true,
      render: (client) => client.phone || "N/A",
    },
    {
      key: "status",
      label: "Status",
      icon: MailIcon,
      defaultVisible: true,
      render: (client) => <StatusBadge type="status" value={client.status} />,
    },
    {
      key: "pets",
      label: "Pets",
      icon: MailIcon,
      defaultVisible: true,
      render: (client) => client.pets.length,
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
      ],
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Clients - {facility.name}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => exportClientsToCSV(facilityClients)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setCreatingClient(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilityClients.length}</div>
            <p className="text-xs text-muted-foreground">
              {facilityClients.filter((c) => c.status === "active").length}{" "}
              active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilityClients.filter((c) => c.status === "active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilityClients.reduce((sum, c) => sum + c.pets.length, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Across all clients</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Pets/Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilityClients.length > 0
                ? Math.round(
                    (facilityClients.reduce(
                      (sum, c) => sum + c.pets.length,
                      0,
                    ) /
                      facilityClients.length) *
                      10,
                  ) / 10
                : 0}
            </div>
            <p className="text-xs text-muted-foreground">Per client</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={facilityClients}
        columns={columns}
        filters={filters}
        searchKey="name"
        searchPlaceholder="Search clients..."
        itemsPerPage={10}
        actions={(client) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedClient(client)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />

      {/* Create Client Modal */}
      <CreateClientModal
        open={creatingClient}
        onOpenChange={setCreatingClient}
        onSave={handleCreateClient}
        facilityName={facility.name}
      />

      {/* View Client Details Modal */}
      <Dialog
        open={!!selectedClient}
        onOpenChange={() => setSelectedClient(null)}
      >
        <DialogContent className="min-w-5xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-y-auto">
            <DialogHeader className="mb-0">
              <DialogTitle className="sr-only">
                {selectedClient?.name} - Client Details
              </DialogTitle>
            </DialogHeader>
            {selectedClient && <ClientModal client={selectedClient} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
