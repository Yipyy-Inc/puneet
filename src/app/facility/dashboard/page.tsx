"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { Plus } from "lucide-react";
import { facilities } from "@/data/facilities";
import { bookings as initialBookings, type Booking } from "@/data/bookings";
import { clients as initialClients } from "@/data/clients";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { type BookingData } from "@/components/bookings/modals/BookingModal";

import { Client } from "@/lib/types";

import { CheckInOutSection } from "@/components/facility/CheckInOutSection";
import { GroomingSection } from "@/components/facility/GroomingSection";
import { TrainingSection } from "@/components/facility/TrainingSection";
import { PermissionGuard } from "@/components/facility/PermissionGuard";

export default function FacilityDashboard() {
  const { openBookingModal } = useBookingModal();

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
        <div className="flex flex-wrap gap-3">
          <PermissionGuard permission="create_booking">
            <Button
              className="gap-3"
              onClick={() =>
                openBookingModal({
                  clients: clients.filter((c) => c.facility === facility.name),
                  facilityId: facilityId,
                  facilityName: facility.name,
                  onCreateBooking: handleCreateBooking,
                })
              }
            >
              <Plus className="h-5 w-4" />
              New Booking
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {/* Daycare & Boarding Check-In/Out Section */}
      <CheckInOutSection />

      {/* Grooming Section */}
      <GroomingSection />

      {/* Training Section */}
      <TrainingSection />
    </div>
  );
}
