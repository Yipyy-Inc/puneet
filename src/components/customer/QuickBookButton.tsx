"use client";

import { useCurrentCustomer } from "@/lib/api/current-customer";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useBookingModal } from "@/hooks/use-booking-modal";

export function QuickBookButton() {
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { selectedFacility } = useCustomerFacility();
  const { openBookingModal } = useBookingModal();

  const handleOpenBookingWizard = () => {
    if (!selectedFacility || !customer) return;

    openBookingModal({
      clients: [customer],
      facilityId: selectedFacility.id,
      facilityName: selectedFacility.name,
      preSelectedClientId: customer.id,
      isCustomerMode: true,
      onCreateBooking: () => {
        // Modal stays open to show the booking request confirmation screen.
      },
    });
  };

  return (
    <Button
      className="gap-2"
      onClick={handleOpenBookingWizard}
      disabled={!selectedFacility || !customer}
      aria-label="Book a Service"
    >
      <Calendar className="size-4" />
      <span className="hidden xl:inline">Book a Service</span>
    </Button>
  );
}
