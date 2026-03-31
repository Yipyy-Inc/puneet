"use client";

import { use } from "react";
import Link from "next/link";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  PawPrint,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getPetAgeDisplay, isPetBirthdayThisWeek, daysUntilBirthday } from "@/lib/pet-utils";

export default function ClientOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = parseInt(id, 10);
  const client = clients.find((c) => c.id === clientId);

  if (!client) return null;

  const clientBookings = bookings.filter((b) => b.clientId === clientId);
  const activeBookings = clientBookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending",
  );
  const totalSpent = clientBookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((s, b) => s + b.totalCost, 0);

  return (
    <div className="space-y-6 p-4 pt-5 md:p-6">
      {/* Client Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-full text-lg font-bold shadow-sm">
            {client.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{client.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <div
                className={cn(
                  "size-2 rounded-full",
                  client.status === "active"
                    ? "bg-emerald-500"
                    : "bg-muted-foreground",
                )}
              />
              <span className="text-muted-foreground text-sm capitalize">
                {client.status}
              </span>
              {client.membership?.status === "active" && (
                <Badge
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-[10px] text-amber-700"
                >
                  {client.membership.plan} Member
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
          <Link href={`/facility/dashboard/clients/${id}`}>
            <ExternalLink className="size-3" />
            Full Profile
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-[11px] font-medium">
              Total Bookings
            </p>
            <p className="mt-1 text-2xl font-bold">{clientBookings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] font-medium text-blue-600">Active</p>
            <p className="mt-1 text-2xl font-bold">{activeBookings.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-[11px] font-medium text-emerald-600">
              Total Spent
            </p>
            <p className="mt-1 text-2xl font-bold font-[tabular-nums]">
              ${totalSpent.toFixed(0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-muted-foreground text-[11px] font-medium">
              Pets
            </p>
            <p className="mt-1 text-2xl font-bold">{client.pets.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <User className="size-4" />
              Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="text-muted-foreground size-3.5" />
                {client.email}
              </div>
            )}
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="text-muted-foreground size-3.5" />
                {client.phone}
              </div>
            )}
            {client.address?.street && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="text-muted-foreground size-3.5" />
                {client.address.street}, {client.address.city},{" "}
                {client.address.state} {client.address.zip}
              </div>
            )}
            {client.emergencyContact?.name && (
              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                <span className="font-medium">Emergency:</span>{" "}
                {client.emergencyContact.name} (
                {client.emergencyContact.relationship}) ·{" "}
                {client.emergencyContact.phone}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pets */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <PawPrint className="size-4" />
                Pets ({client.pets.length})
              </CardTitle>
              <Link href={`/facility/dashboard/clients/${id}/pets`}>
                <Button variant="ghost" size="sm" className="h-6 text-[11px]">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {client.pets.map((pet) => {
              const birthday = isPetBirthdayThisWeek(pet.dateOfBirth);
              const daysTo = daysUntilBirthday(pet.dateOfBirth);
              return (
                <Link
                  key={pet.id}
                  href={`/facility/dashboard/clients/${id}/pets/${pet.id}`}
                  className="hover:bg-muted/50 flex items-center gap-3 rounded-md border px-3 py-2 transition-colors"
                >
                  <div className="bg-primary/10 flex size-8 shrink-0 items-center justify-center rounded-full">
                    <PawPrint className="text-primary size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{pet.name}</span>
                      {birthday && (
                        <span className="text-[10px]" title={`Birthday in ${daysTo} days`}>
                          🎂
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {pet.breed} · {getPetAgeDisplay(pet)} · {pet.weight} lbs
                    </p>
                  </div>
                  {pet.allergies && pet.allergies !== "None" && (
                    <Badge
                      variant="outline"
                      className="border-red-200 bg-red-50 text-[9px] text-red-600"
                    >
                      <ShieldCheck className="mr-0.5 size-2.5" />
                      Allergy
                    </Badge>
                  )}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Active Bookings */}
      {activeBookings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="size-4" />
                Active Bookings ({activeBookings.length})
              </CardTitle>
              <Link href={`/facility/dashboard/clients/${id}/bookings`}>
                <Button variant="ghost" size="sm" className="h-6 text-[11px]">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeBookings.slice(0, 5).map((b) => {
              const pet = client.pets.find(
                (p) =>
                  p.id ===
                  (Array.isArray(b.petId) ? b.petId[0] : b.petId),
              );
              return (
                <Link
                  key={b.id}
                  href={`/facility/dashboard/clients/${id}/bookings/${b.id}`}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-md border px-3 py-2 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {b.service}
                      {pet && (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {pet.name}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(b.startDate + "T00:00:00").toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}
                      {b.startDate !== b.endDate &&
                        ` → ${new Date(b.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize"
                    >
                      {b.status}
                    </Badge>
                    <span className="text-sm font-medium font-[tabular-nums]">
                      ${b.totalCost}
                    </span>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
