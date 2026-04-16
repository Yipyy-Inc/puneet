"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { clients } from "@/data/clients";

const MOCK_CUSTOMER_ID = 15;

export function QuickBookButton() {
  const { selectedFacility } = useCustomerFacility();
  const { openBookingModal } = useBookingModal();

  const customer = useMemo(
    () => clients.find((client) => client.id === MOCK_CUSTOMER_ID),
    [],
  );

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
    >
      <Calendar className="size-4" />
      <span>Book a Service</span>
    </Button>
  );
}
