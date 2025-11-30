"use client";

import { useState } from "react";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreatePetModal } from "@/components/pets/CreatePetModal";
import { PetModal } from "@/components/modals/PetModal";
import { Download, Heart, User, Eye, Dog, Cat, Plus } from "lucide-react";

interface Pet extends Record<string, unknown> {
  id: number;
  name: string;
  type: string;
  breed: string;
  age: number;
  weight: number;
  color: string;
  microchip: string;
  allergies: string;
  specialNeeds: string;
  owner: string;
  ownerId: number;
  ownerEmail: string;
  ownerPhone?: string;
}

const exportPetsToCSV = (petsData: Pet[]) => {
  const headers = [
    "ID",
    "Name",
    "Type",
    "Breed",
    "Age",
    "Weight",
    "Color",
    "Microchip",
    "Owner",
    "Owner Email",
  ];

  const csvContent = [
    headers.join(","),
    ...petsData.map((pet) =>
      [
        pet.id,
        `"${pet.name.replace(/"/g, '""')}"`,
        pet.type,
        `"${pet.breed.replace(/"/g, '""')}"`,
        pet.age,
        pet.weight,
        `"${pet.color.replace(/"/g, '""')}"`,
        pet.microchip,
        `"${pet.owner.replace(/"/g, '""')}"`,
        pet.ownerEmail,
      ].join(","),
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `pets_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function FacilityPetsPage() {
  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [clientsData, setClientsData] = useState(clients);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [creatingPet, setCreatingPet] = useState(false);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  const facilityClients = clientsData.filter(
    (client) => client.facility === facility.name,
  );

  // Flatten pets with owner information
  const facilityPets: Pet[] = facilityClients.flatMap((client) =>
    client.pets.map((pet) => ({
      ...pet,
      owner: client.name,
      ownerId: client.id,
      ownerEmail: client.email,
      ownerPhone: client.phone,
    })),
  );

  const handleCreatePet = (newPet: {
    name: string;
    type: string;
    breed: string;
    age: number;
    weight: number;
    color: string;
    microchip: string;
    allergies: string;
    specialNeeds: string;
    ownerId: number;
  }) => {
    const petMaxId = Math.max(
      ...clientsData.flatMap((c) => c.pets.map((p) => p.id)),
      0,
    );

    const petWithId = {
      id: petMaxId + 1,
      name: newPet.name,
      type: newPet.type,
      breed: newPet.breed,
      age: newPet.age,
      weight: newPet.weight,
      color: newPet.color,
      microchip: newPet.microchip,
      allergies: newPet.allergies,
      specialNeeds: newPet.specialNeeds,
    };

    // Add pet to the client
    const updatedClients = clientsData.map((client) => {
      if (client.id === newPet.ownerId) {
        return {
          ...client,
          pets: [...client.pets, petWithId],
        };
      }
      return client;
    });

    setClientsData(updatedClients);
  };

  const columns: ColumnDef<Pet>[] = [
    {
      key: "name",
      label: "Name",
      icon: Heart,
      defaultVisible: true,
      render: (pet) => (
        <div className="flex items-center gap-2">
          {pet.type === "Dog" ? (
            <Dog className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Cat className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{pet.name}</span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      icon: Heart,
      defaultVisible: true,
    },
    {
      key: "breed",
      label: "Breed",
      icon: Heart,
      defaultVisible: true,
    },
    {
      key: "age",
      label: "Age",
      icon: Heart,
      defaultVisible: true,
      render: (pet) => `${pet.age} ${pet.age === 1 ? "year" : "years"}`,
    },
    {
      key: "weight",
      label: "Weight",
      icon: Heart,
      defaultVisible: false,
      render: (pet) => `${pet.weight} kg`,
    },
    {
      key: "color",
      label: "Color",
      icon: Heart,
      defaultVisible: false,
    },
    {
      key: "owner",
      label: "Owner",
      icon: User,
      defaultVisible: true,
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "type",
      label: "Pet Type",
      options: [
        { value: "all", label: "All Types" },
        { value: "Dog", label: "Dogs" },
        { value: "Cat", label: "Cats" },
      ],
    },
  ];

  const dogCount = facilityPets.filter((p) => p.type === "Dog").length;
  const catCount = facilityPets.filter((p) => p.type === "Cat").length;
  const avgAge =
    facilityPets.length > 0
      ? Math.round(
          (facilityPets.reduce((sum, p) => sum + p.age, 0) /
            facilityPets.length) *
            10,
        ) / 10
      : 0;
  const avgWeight =
    facilityPets.length > 0
      ? Math.round(
          (facilityPets.reduce((sum, p) => sum + p.weight, 0) /
            facilityPets.length) *
            10,
        ) / 10
      : 0;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Pets - {facility.name}
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => exportPetsToCSV(facilityPets)}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setCreatingPet(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Pet
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pets</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilityPets.length}</div>
            <p className="text-xs text-muted-foreground">
              {dogCount} dogs, {catCount} cats
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dogs</CardTitle>
            <Dog className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dogCount}</div>
            <p className="text-xs text-muted-foreground">
              {facilityPets.length > 0
                ? Math.round((dogCount / facilityPets.length) * 100)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cats</CardTitle>
            <Cat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{catCount}</div>
            <p className="text-xs text-muted-foreground">
              {facilityPets.length > 0
                ? Math.round((catCount / facilityPets.length) * 100)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Age</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgAge}</div>
            <p className="text-xs text-muted-foreground">
              Avg weight: {avgWeight} kg
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        data={facilityPets}
        columns={columns}
        filters={filters}
        searchKey="name"
        searchPlaceholder="Search pets..."
        itemsPerPage={10}
        actions={(pet) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedPet(pet)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />

      {/* Create Pet Modal */}
      <CreatePetModal
        open={creatingPet}
        onOpenChange={setCreatingPet}
        onSave={handleCreatePet}
        clients={facilityClients.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
        }))}
      />

      {/* View Pet Details Modal */}
      <Dialog open={!!selectedPet} onOpenChange={() => setSelectedPet(null)}>
        <DialogContent className="min-w-5xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-y-auto">
            <DialogHeader className="mb-0">
              <DialogTitle className="sr-only">
                {selectedPet?.name} - Pet Details
              </DialogTitle>
            </DialogHeader>
            {selectedPet && <PetModal pet={selectedPet} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
