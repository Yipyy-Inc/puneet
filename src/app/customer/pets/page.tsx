"use client";

import { useState, useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Search, Dog, Cat, Calendar, Syringe, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { vaccinationRecords } from "@/data/pet-data";
import { PetComplianceChecklist } from "@/components/customer/PetComplianceChecklist";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerPetsPage() {
  const { selectedFacility } = useCustomerFacility();
  const [searchQuery, setSearchQuery] = useState("");

  // Get customer and their pets
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );

  const customerPets = useMemo(() => customer?.pets || [], [customer]);

  // Filter pets by search
  const filteredPets = useMemo(() => {
    if (!searchQuery) return customerPets;
    const query = searchQuery.toLowerCase();
    return customerPets.filter(
      (pet) =>
        pet.name.toLowerCase().includes(query) ||
        pet.breed.toLowerCase().includes(query) ||
        pet.type.toLowerCase().includes(query)
    );
  }, [customerPets, searchQuery]);

  // Get pet statistics
  const getPetStats = (petId: number) => {
    const petBookings = bookings.filter(
      (b) => b.petId === petId && b.status === "completed"
    );
    const petVaccinations = vaccinationRecords.filter((v) => v.petId === petId);
    const expiredVaccinations = petVaccinations.filter(
      (v) => new Date(v.expiryDate) < new Date()
    );
    const upcomingVaccinations = petVaccinations.filter((v) => {
      const expiryDate = new Date(v.expiryDate);
      const now = new Date();
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      return expiryDate <= sixtyDaysFromNow && expiryDate > now;
    });

    return {
      totalStays: petBookings.length,
      expiredVaccinations: expiredVaccinations.length,
      upcomingVaccinations: upcomingVaccinations.length,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Pets</h1>
            <p className="text-muted-foreground mt-1">
              Manage your pets' profiles and information
            </p>
          </div>
          <Button asChild>
            <Link href="/customer/pets/add">
              <Plus className="h-4 w-4 mr-2" />
              Add Pet
            </Link>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                    <Dog className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No pets yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Add your first pet to get started with bookings
                    </p>
                    <Button asChild>
                      <Link href="/customer/pets/add">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Pet
                      </Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Search className="h-16 w-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No pets found</h3>
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
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => window.location.href = `/customer/pets/${pet.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                          {pet.imageUrl ? (
                            <img
                              src={pet.imageUrl}
                              alt={pet.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <PetIcon className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-xl">{pet.name}</CardTitle>
                          <CardDescription>
                            {pet.breed} • {pet.age} {pet.age === 1 ? "year" : "years"} old
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {pet.type}
                      </Badge>
                    </div>
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
                        <AlertTriangle className="h-4 w-4 text-destructive" />
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
                          clientId={MOCK_CUSTOMER_ID}
                          facilityId={selectedFacility.id}
                          compact={true}
                        />
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Stays</p>
                        <p className="font-semibold text-lg">{stats.totalStays}</p>
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
