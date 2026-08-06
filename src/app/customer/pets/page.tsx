"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { bookingQueries } from "@/lib/api/booking";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Dog, Cat, AlertTriangle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { vaccinationRecords } from "@/data/pet-data";
import { PetComplianceChecklist } from "@/components/customer/PetComplianceChecklist";
import { TagList } from "@/components/shared/TagList";

export default function CustomerPetsPage() {
  const { selectedFacility } = useCustomerFacility();
  const [searchQuery, setSearchQuery] = useState("");

  // WHOSE PETS THESE ARE IS NOT A CLIENT-SIDE DECISION.
  //
  // This asked /api/clients for the WHOLE roster and then picked id 15 out of
  // it, falling back to the first row. For a customer that happened to work —
  // `clients_read` returns exactly their own record — but it fetched a list to
  // find the one row RLS had already narrowed to, and for a STAFF member
  // opening the portal it returned the entire facility and then chose Alice.
  //
  // useCurrentCustomer() asks the question directly: /api/clients/me resolves
  // the caller's own record, and claims it on first use if the link has not
  // been made yet (20260807180000).
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const customerPets = useMemo(() => customer?.pets || [], [customer]);

  // Filter pets by search
  const filteredPets = useMemo(() => {
    if (!searchQuery) return customerPets;
    const query = searchQuery.toLowerCase();
    return customerPets.filter(
      (pet) =>
        pet.name.toLowerCase().includes(query) ||
        pet.breed.toLowerCase().includes(query) ||
        pet.type.toLowerCase().includes(query),
    );
  }, [customerPets, searchQuery]);

  // Their real bookings, used for the per-pet visit count below.
  const { data: myBookings = [] } = useQuery({
    ...bookingQueries.byClient(customerId ?? -1),
    enabled: customerId != null,
  });

  // Get pet statistics
  const getPetStats = (petId: number) => {
    const petBookings = myBookings.filter(
      (b) => b.petId === petId && b.status === "completed",
    );
    const petVaccinations = vaccinationRecords.filter((v) => v.petId === petId);
    const expiredVaccinations = petVaccinations.filter(
      (v) => new Date(v.expiryDate) < new Date(),
    );
    const upcomingVaccinations = petVaccinations.filter((v) => {
      const expiryDate = new Date(v.expiryDate);
      const now = new Date();
      const sixtyDaysFromNow = new Date(
        now.getTime() + 60 * 24 * 60 * 60 * 1000,
      );
      return expiryDate <= sixtyDaysFromNow && expiryDate > now;
    });

    return {
      totalStays: petBookings.length,
      expiredVaccinations: expiredVaccinations.length,
      upcomingVaccinations: upcomingVaccinations.length,
    };
  };

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Pets</h1>
            <p className="text-muted-foreground mt-1">
              Manage your pets&apos; profiles and information
            </p>
          </div>
          <Button asChild>
            <Link href="/customer/pets/add">
              <Plus className="mr-2 size-4" />
              Add Pet
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search pets by name, breed, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Pets Grid */}
        {filteredPets.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                {customerPets.length === 0 ? (
                  <>
                    <Dog className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-50" />
                    <h3 className="mb-2 text-lg font-semibold">No pets yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first pet to get started with bookings
                    </p>
                    <Button asChild>
                      <Link href="/customer/pets/add">
                        <Plus className="mr-2 size-4" />
                        Add Your First Pet
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Search className="text-muted-foreground mx-auto mb-4 h-16 w-16 opacity-50" />
                    <h3 className="mb-2 text-lg font-semibold">
                      No pets found
                    </h3>
                    <p className="text-muted-foreground">
                      Try adjusting your search query
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPets.map((pet) => {
              const stats = getPetStats(pet.id);
              const PetIcon = pet.type === "Cat" ? Cat : Dog;

              return (
                <Card
                  key={pet.id}
                  className="cursor-pointer transition-shadow hover:shadow-lg"
                  onClick={() =>
                    (window.location.href = `/customer/pets/${pet.id}`)
                  }
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-lg">
                          {pet.imageUrl ? (
                            <Image
                              src={pet.imageUrl}
                              alt={pet.name}
                              width={64}
                              height={64}
                              className="size-full rounded-lg object-cover"
                            />
                          ) : (
                            <PetIcon className="text-primary size-8" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{pet.name}</CardTitle>
                          <CardDescription>
                            {pet.breed} • {pet.age}{" "}
                            {pet.age === 1 ? "year" : "years"} old
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {pet.type}
                      </Badge>
                    </div>
                    <TagList
                      entityType="pet"
                      entityId={pet.id}
                      compact
                      maxVisible={3}
                      isCustomerView
                    />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Weight</p>
                        <p className="font-medium">{pet.weight} lbs</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Color</p>
                        <p className="font-medium">{pet.color}</p>
                      </div>
                    </div>

                    {pet.allergies && pet.allergies !== "None" && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive size-4" />
                        <Badge variant="destructive" className="text-xs">
                          Allergies: {pet.allergies}
                        </Badge>
                      </div>
                    )}

                    {/* Compliance Checklist */}
                    {selectedFacility && (
                      <div className="pt-2">
                        <PetComplianceChecklist
                          pet={pet}
                          clientId={customerId ?? 0}
                          facilityId={selectedFacility.id}
                          compact={true}
                        />
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Stays</p>
                        <p className="text-lg font-semibold">
                          {stats.totalStays}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vaccinations</p>
                        <div className="flex items-center gap-1">
                          {stats.expiredVaccinations > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {stats.expiredVaccinations} expired
                            </Badge>
                          )}
                          {stats.upcomingVaccinations > 0 && (
                            <Badge variant="warning" className="text-xs">
                              {stats.upcomingVaccinations} expiring
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/customer/pets/${pet.id}`}>
                        View Profile
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
