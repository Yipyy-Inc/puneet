"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Plus, User, Calendar, List, Zap } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { facilities } from "@/data/facilities";
import { bookings as initialBookings } from "@/data/bookings";
import { clients as initialClients } from "@/data/clients";
import { useBookingModal } from "@/hooks/use-booking-modal";

import { Client, Pet, NewBooking, Booking } from "@/lib/types";

import { CreateClientModal } from "@/components/clients/CreateClientModal";

interface FacilityHeaderProps {
  facilityId?: number;
}

export function FacilityHeader({ facilityId = 11 }: FacilityHeaderProps) {
  const { openBookingModal } = useBookingModal();

  // Modal states
  const [isCreateClientModalOpen, setIsCreateClientModalOpen] = useState(false);

  // Data states for local mutations
  const [bookings, setBookings] = useState<Booking[]>(
    initialBookings as Booking[],
  );
  const clients = initialClients as Client[];

  const facility = facilities.find((f) => f.id === facilityId);

  if (!facility) {
    return null;
  }

  // Handlers for creating new entities
  const handleCreateClient = (newClient: {
    name: string;
    email: string;
    phone?: string;
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
    pets: Omit<Pet, "id" | "imageUrl">[];
  }) => {
    // For now, just show a success message
    // In a real app, this would save to the database
    toast.success(`Client ${newClient.name} created`, {
      description: "New client has been added successfully.",
    });
    setIsCreateClientModalOpen(false);
  };

  const handleCreateBooking = (bookingData: NewBooking) => {
    const petId = Array.isArray(bookingData.petId)
      ? bookingData.petId[0]
      : bookingData.petId;
    const maxId = Math.max(...bookings.map((b) => b.id ?? 0), 0);
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

  const handleCreateWaitlist = () => {
    toast.info("Waitlist feature coming soon", {
      description: "This feature is not yet implemented.",
    });
  };

  const handleQuickDaycareCheckIn = () => {
    toast.info("Quick daycare check-in feature coming soon", {
      description: "This feature is not yet implemented.",
    });
  };

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  id="facility-create-new-trigger"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-xl"
                  aria-label="Create"
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              Create
            </TooltipContent>
          </Tooltip>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setIsCreateClientModalOpen(true)}>
            <User className="mr-2 h-4 w-4" />
            New Client
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              openBookingModal({
                clients: clients.filter((c) => c.facility === facility.name),
                facilityId: facilityId,
                facilityName: facility.name,
                onCreateBooking: handleCreateBooking,
              })
            }
          >
            <Calendar className="mr-2 h-4 w-4" />
            New Booking
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCreateWaitlist}>
            <List className="mr-2 h-4 w-4" />
            New Waitlist
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleQuickDaycareCheckIn}>
            <Zap className="mr-2 h-4 w-4" />
            Quick Daycare Check-in
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>

      {/* Create Client Modal */}
      <CreateClientModal
        open={isCreateClientModalOpen}
        onOpenChange={setIsCreateClientModalOpen}
        onSave={handleCreateClient}
        facilityName={facility.name}
      />
    </>
  );
}
