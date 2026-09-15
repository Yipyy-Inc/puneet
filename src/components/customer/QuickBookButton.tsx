"use client";

import { useShellText } from "@/lib/shell/use-shell-text";

import { useCurrentCustomer } from "@/lib/api/current-customer";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { useCustomerBookingRequest } from "@/components/bookings/use-customer-booking-request";

export function QuickBookButton() {
  const t = useShellText("customer");
  const { client: customer } = useCurrentCustomer();

  const { selectedFacility } = useCustomerFacility();
  const { openBookingModal } = useBookingModal();
  const requestBooking = useCustomerBookingRequest();

  const handleOpenBookingWizard = () => {
    if (!selectedFacility || !customer) return;

    openBookingModal({
      clients: [customer],
      facilityId: selectedFacility.id,
      facilityName: selectedFacility.name,
      preSelectedClientId: customer.id,
      isCustomerMode: true,
      onCreateBooking: requestBooking,
    });
  };

  return (
    <Button
      className="gap-2"
      onClick={handleOpenBookingWizard}
      disabled={!selectedFacility || !customer}
      aria-label={t("bookAService")}
    >
      <Calendar className="size-4" />
      <span className="hidden xl:inline">{t("bookAService")}</span>
    </Button>
  );
}
