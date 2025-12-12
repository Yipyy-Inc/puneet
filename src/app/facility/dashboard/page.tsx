"use client";

import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { PawPrint, Search, Plus } from "lucide-react";
import { facilities } from "@/data/facilities";
import { bookings as initialBookings, type Booking } from "@/data/bookings";
import { clients as initialClients } from "@/data/clients";
import {
  BookingModal,
  type BookingData,
} from "@/components/bookings/modals/BookingModal";

import { Client } from "@/lib/types";

import { CheckInOutSection } from "@/components/facility/CheckInOutSection";
import { GroomingSection } from "@/components/facility/GroomingSection";
import { TrainingSection } from "@/components/facility/TrainingSection";
import { PermissionGuard } from "@/components/facility/PermissionGuard";

export default function FacilityDashboard() {
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showNewBooking, setShowNewBooking] = useState(false);

  // Data states for local mutations
  const [bookings, setBookings] = useState<Booking[]>(
    initialBookings as Booking[],
  );
  const clients = initialClients as Client[];

  // For undo functionality
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Static facility ID for now (would come from user token in production)
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  // Get all bookings for this facility with client/pet details
  const facilityBookings = useMemo(() => {
    return bookings
      .filter((b) => b.facilityId === facilityId)
      .map((booking) => {
        const client = clients.find((c) => c.id === booking.clientId);
        const pet = client?.pets.find((p) => p.id === booking.petId);
        return {
          ...booking,
          clientName: client?.name || "Unknown",
          petName: pet?.name || "Unknown",
        };
      });
  }, [facilityId, bookings, clients]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return facilityBookings.filter(
      (b) =>
        b.id.toString().includes(query) ||
        b.clientName?.toLowerCase().includes(query) ||
        b.petName?.toLowerCase().includes(query) ||
        b.service.toLowerCase().includes(query),
    );
  }, [facilityBookings, searchQuery]);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  // Handlers for creating new entities
  const handleCreateBooking = (bookingData: BookingData) => {
    const petId = Array.isArray(bookingData.petId)
      ? bookingData.petId[0]
      : bookingData.petId;
    const maxId = Math.max(...bookings.map((b) => b.id), 0);
    const bookingWithId: Booking = {
      id: maxId + 1,
      clientId: bookingData.clientId,
      petId: petId,
      facilityId: bookingData.facilityId,
      service: bookingData.service,
      startDate: bookingData.startDate,
      endDate: bookingData.endDate,
      status: bookingData.status,
      basePrice: bookingData.basePrice,
      discount: bookingData.discount,
      discountReason: bookingData.discountReason,
      totalCost: bookingData.totalCost,
      paymentStatus: bookingData.paymentStatus,
      specialRequests: bookingData.specialRequests,
      checkInTime: bookingData.checkInTime,
      checkOutTime: bookingData.checkOutTime,
    };
    setBookings([...bookings, bookingWithId]);
    setShowNewBooking(false);

    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Show toast with undo option
    toast.success(`Booking #${bookingWithId.id} created`, {
      description: `${bookingData.service} booking has been created successfully.`,
      action: {
        label: "Undo",
        onClick: () => {
          setBookings((prev) => prev.filter((b) => b.id !== bookingWithId.id));
          toast.info("Booking undone", {
            description: `Booking #${bookingWithId.id} has been removed.`,
          });
        },
      },
      duration: 5000,
    });
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{facility.name}</h2>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Badge
          variant={facility.status === "active" ? "default" : "secondary"}
          className="w-fit"
        >
          {facility.status === "active" ? "Active" : "Inactive"}
        </Badge>
      </div>

      {/* Universal Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by booking ID, client name, pet name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Found {searchResults.length} result(s)
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {searchResults.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <PawPrint className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {booking.petName} - {booking.clientName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          #{booking.id} • {booking.service} •{" "}
                          {booking.startDate}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        booking.status === "confirmed" ? "default" : "secondary"
                      }
                    >
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Bar */}
      <div className="flex flex-wrap gap-3">
        <PermissionGuard permission="create_booking">
          <Button className="gap-2" onClick={() => setShowNewBooking(true)}>
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </PermissionGuard>
      </div>

      {/* Daycare & Boarding Check-In/Out Section */}
      <CheckInOutSection />

      {/* Grooming Section */}
      <GroomingSection />

      {/* Training Section */}
      <TrainingSection />

      {/* Create Booking Modal */}
      <BookingModal
        open={showNewBooking}
        onOpenChange={setShowNewBooking}
        clients={clients.filter((c) => c.facility === facility.name)}
        facilityId={facilityId}
        facilityName={facility.name}
        onCreateBooking={handleCreateBooking}
      />
    </div>
  );
}
