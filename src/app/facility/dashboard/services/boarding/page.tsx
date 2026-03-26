"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/StatCard";
import {
  Bed,
  Users,
  LogIn,
  LogOut,
  Clock,
  DollarSign,
  PawPrint,
  Phone,
  Calendar,
  AlertTriangle,
  Pill,
  Utensils,
} from "lucide-react";
import {
  boardingGuests,
  boardingCapacity,
  getCurrentGuests,
  getOccupancyStats,
  BoardingGuest,
} from "@/data/boarding";

export default function BoardingDashboardPage() {
  const [guests] = useState<BoardingGuest[]>(boardingGuests);

  const currentGuests = getCurrentGuests();
  const occupancyStats = getOccupancyStats();

  // Filter for today's arrivals and departures (using mock date for demo)
  const today = "2024-03-10";
  const todayArrivals = guests.filter((g) => {
    const checkInDate = g.checkInDate.split("T")[0];
    return checkInDate === today && g.status === "scheduled";
  });

  const todayDepartures = guests.filter((g) => {
    const checkOutDate = g.checkOutDate.split("T")[0];
    return checkOutDate === today && g.status === "checked-in";
  });

  // Calculate revenue
  const currentRevenue = currentGuests.reduce(
    (acc, g) => acc + g.totalPrice,
    0,
  );
  const avgStayLength =
    currentGuests.length > 0
      ? Math.round(
          currentGuests.reduce((acc, g) => acc + g.totalNights, 0) /
            currentGuests.length,
        )
      : 0;

  // Pets needing attention (medications or allergies)
  const petsWithMedications = currentGuests.filter(
    (g) => g.medications.length > 0,
  );
  const petsWithAllergies = currentGuests.filter((g) => g.allergies.length > 0);

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 75) return "bg-warning";
    return "bg-success";
  };

  const getCapacityStatus = (percentage: number) => {
    if (percentage >= 90)
      return { label: "Almost Full", variant: "destructive" as const };
    if (percentage >= 75) return { label: "Busy", variant: "warning" as const };
    if (percentage >= 50)
      return { label: "Moderate", variant: "secondary" as const };
    return { label: "Available", variant: "success" as const };
  };

  const status = getCapacityStatus(occupancyStats.percentage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      {/* Capacity Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Current Occupancy
            </CardTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {occupancyStats.current} of {boardingCapacity.total} kennels
              occupied
            </span>
            <span className="font-medium">{occupancyStats.percentage}%</span>
          </div>
          <div className="bg-muted relative h-4 w-full overflow-hidden rounded-full">
            <div
              className={`h-full transition-all ${getCapacityColor(occupancyStats.percentage)} `}
              style={{ width: `${occupancyStats.percentage}%` }}
            />
          </div>

          {/* Occupancy by Suite Type */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                {occupancyStats.byType.standard}
              </p>
              <p className="text-muted-foreground text-xs">
                Standard / {boardingCapacity.standard}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                {occupancyStats.byType.premium}
              </p>
              <p className="text-muted-foreground text-xs">
                Premium / {boardingCapacity.premium}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">
                {occupancyStats.byType.luxury}
              </p>
              <p className="text-muted-foreground text-xs">
                Luxury / {boardingCapacity.luxury}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Guests"
          value={currentGuests.length}
          subtitle="Pets currently boarding"
          icon={Bed}
          variant="primary"
        />
        <StatCard
          title="Today's Arrivals"
          value={todayArrivals.length}
          subtitle="Scheduled check-ins"
          icon={LogIn}
          variant="success"
        />
        <StatCard
          title="Today's Departures"
          value={todayDepartures.length}
          subtitle="Scheduled check-outs"
          icon={LogOut}
          variant="warning"
        />
        <StatCard
          title="Current Revenue"
          value={`$${currentRevenue.toLocaleString()}`}
          subtitle="From active stays"
          icon={DollarSign}
          variant="info"
        />
      </div>

      {/* Alerts Section */}
      {(petsWithMedications.length > 0 || petsWithAllergies.length > 0) && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-warning flex items-center gap-2 text-lg font-semibold">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {petsWithMedications.length > 0 && (
                <div className="bg-background flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Pill className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {petsWithMedications.length} pet(s) need medication
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {petsWithMedications.map((p) => p.petName).join(", ")}
                    </p>
                  </div>
                </div>
              )}
              {petsWithAllergies.length > 0 && (
                <div className="bg-background flex items-start gap-3 rounded-lg border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <Utensils className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {petsWithAllergies.length} pet(s) have allergies
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {petsWithAllergies.map((p) => p.petName).join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Arrivals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <LogIn className="text-success h-5 w-5" />
              Today&apos;s Arrivals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayArrivals.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <Calendar className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>No arrivals scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayArrivals.map((guest) => (
                  <div
                    key={guest.id}
                    className="bg-card hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                        <PawPrint className="text-primary h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{guest.petName}</p>
                        <p className="text-muted-foreground text-xs">
                          {guest.petBreed} • {guest.ownerName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{guest.kennelName}</Badge>
                      <p className="text-muted-foreground mt-1 text-xs">
                        <Clock className="mr-1 inline h-3 w-3" />
                        {formatTime(guest.checkInDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Departures */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <LogOut className="text-warning h-5 w-5" />
              Today&apos;s Departures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayDepartures.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <Calendar className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>No departures scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayDepartures.map((guest) => (
                  <div
                    key={guest.id}
                    className="bg-card hover:bg-muted/50 flex items-center justify-between rounded-lg border p-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-warning/10 flex h-10 w-10 items-center justify-center rounded-full">
                        <PawPrint className="text-warning h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{guest.petName}</p>
                        <p className="text-muted-foreground text-xs">
                          {guest.petBreed} • {guest.totalNights} nights
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${guest.totalPrice}</p>
                      <p className="text-muted-foreground text-xs">
                        <Phone className="mr-1 inline h-3 w-3" />
                        {guest.ownerPhone}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Guests */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5" />
              Current Boarding Guests
            </CardTitle>
            <span className="text-muted-foreground text-sm">
              Avg. stay: {avgStayLength} nights
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {currentGuests.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              <Bed className="mx-auto mb-3 h-12 w-12 opacity-50" />
              <p>No pets currently boarding</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {currentGuests.map((guest) => {
                const checkOut = new Date(guest.checkOutDate);
                const today = new Date();
                const daysRemaining = Math.ceil(
                  (checkOut.getTime() - today.getTime()) /
                    (1000 * 60 * 60 * 24),
                );

                return (
                  <div
                    key={guest.id}
                    className="bg-card hover:bg-muted/50 rounded-lg border p-4 transition-colors"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full">
                          <PawPrint className="text-primary h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold">{guest.petName}</p>
                          <p className="text-muted-foreground text-sm">
                            {guest.petBreed}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          guest.packageType === "Luxury Suite"
                            ? "default"
                            : guest.packageType === "Premium Suite"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {guest.packageType.split(" ")[0]}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kennel:</span>
                        <span className="font-medium">{guest.kennelName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Owner:</span>
                        <span>{guest.ownerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stay:</span>
                        <span>
                          {formatDate(guest.checkInDate)} -{" "}
                          {formatDate(guest.checkOutDate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Days remaining:
                        </span>
                        <span
                          className={
                            daysRemaining <= 1 ? "text-warning font-medium" : ""
                          }
                        >
                          {daysRemaining} day(s)
                        </span>
                      </div>
                    </div>

                    {(guest.medications.length > 0 ||
                      guest.allergies.length > 0) && (
                      <div className="mt-3 flex gap-2 border-t pt-3">
                        {guest.medications.length > 0 && (
                          <Badge
                            variant="outline"
                            className="border-purple-300 text-purple-600"
                          >
                            <Pill className="mr-1 h-3 w-3" />
                            Medication
                          </Badge>
                        )}
                        {guest.allergies.length > 0 && (
                          <Badge
                            variant="outline"
                            className="border-red-300 text-red-600"
                          >
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Allergies
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="mt-3 border-t pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          alert(
                            `Guest Details:\n\nPet: ${guest.petName}\nBreed: ${guest.petBreed}\nOwner: ${guest.ownerName}\nPhone: ${guest.ownerPhone}\n\nKennel: ${guest.kennelName}\nPackage: ${guest.packageType}\nTotal Price: $${guest.totalPrice}\n\nMedications: ${guest.medications.length > 0 ? guest.medications.join(", ") : "None"}\nAllergies: ${guest.allergies.length > 0 ? guest.allergies.join(", ") : "None"}`,
                          );
                        }}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
