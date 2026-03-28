"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import {
  Download,
  User,
  Mail as MailIcon,
  Eye,
  Plus,
  PawPrint,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

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
  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

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
      icon: PawPrint,
      defaultVisible: true,
      render: (client) => {
        if (client.pets.length === 0) {
          return <span className="text-muted-foreground text-xs">No pets</span>;
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
                  className="hover:bg-muted cursor-pointer text-xs"
                >
                  {pet.name}{" "}
                  {pet.type === "Dog" ? "🐕" : pet.type === "Cat" ? "🐱" : "🐾"}
                </Badge>
              </Link>
            ))}
            {remaining > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{remaining} more
              </Badge>
            )}
          </div>
        );
      },
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
    {
      key: "petType",
      label: "Pet Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "Dog", label: "Dog" },
        { value: "Cat", label: "Cat" },
        { value: "Other", label: "Other" },
      ],
      filterFn: (client, value) => {
        if (value === "all") return true;
        return client.pets.some((p: { type: string }) =>
          value === "Other"
            ? p.type !== "Dog" && p.type !== "Cat"
            : p.type === value,
        );
      },
    },
    {
      key: "petCount",
      label: "Pet Count",
      options: [
        { value: "all", label: "All" },
        { value: "0", label: "No Pets" },
        { value: "1", label: "1 Pet" },
        { value: "2+", label: "2+ Pets" },
      ],
      filterFn: (client, value) => {
        if (value === "all") return true;
        if (value === "0") return client.pets.length === 0;
        if (value === "1") return client.pets.length === 1;
        return client.pets.length >= 2;
      },
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
            <Download className="mr-2 size-4" />
            Export
          </Button>
          <Button onClick={() => setCreatingClient(true)}>
            <Plus className="mr-2 size-4" />
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
            <p className="text-muted-foreground text-xs">
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
            <p className="text-muted-foreground text-xs">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pets</CardTitle>
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
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilityClients.length > 0
                ? Math.round((totalPets / facilityClients.length) * 10) / 10
                : 0}
            </div>
            <p className="text-muted-foreground text-xs">Per client</p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={facilityClients}
        columns={columns}
        filters={filters}
        getSearchValue={(client) =>
          [client.name, ...client.pets.map((p) => p.name)].join(" ")
        }
        searchPlaceholder="Search by client or pet name..."
        itemsPerPage={10}
        actions={(client) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/facility/dashboard/clients/${client.id}`)
            }
          >
            <Eye className="size-4" />
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
    </div>
  );
}
