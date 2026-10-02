"use client";

import { useQuery } from "@tanstack/react-query";

import { useCreateBookingFromModal } from "@/components/bookings/use-create-booking";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { clientQueries } from "@/lib/api/client";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { NO_ITEMS } from "@/lib/no-items";
import { useShellText } from "@/lib/shell/use-shell-text";

// ============================================================================
// Opens the staff booking wizard on an evaluation — what Settings ›
// Evaluations' "Try the booking wizard" and the Evaluations page's "Book an
// evaluation" both do. The same three things the header's "+ New › New
// booking" hands it: the facility's clients (RLS-scoped), its name, and the
// handler that writes the booking.
// ============================================================================

export function useOpenEvaluationWizard() {
  const t = useShellText("header");
  const { openBookingModal } = useBookingModal();
  const { profile } = useFacilityProfile();
  const { data: clients = NO_ITEMS } = useQuery(clientQueries.all());
  const onCreateBooking = useCreateBookingFromModal();

  return (options: { clientRef?: number; petRefs?: number[] } = {}) =>
    openBookingModal({
      clients,
      facilityName: profile.businessName || t("yourFacilityLower"),
      onCreateBooking,
      preSelectedService: "evaluation",
      preSelectedClientId: options.clientRef,
      preSelectedPetIds: options.petRefs,
    });
}
