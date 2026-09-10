"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bookingMutations } from "@/lib/api/booking";
import { useLocationContext } from "@/hooks/use-location-context";
import { useShellText } from "@/lib/shell/use-shell-text";
import type { NewBooking } from "@/types/booking";

/**
 * The booking modal's `onCreateBooking` for staff: write the booking, refresh
 * every booking list, and say what happened.
 *
 * It lived inside FacilityHeader, the one caller that persisted. The daycare
 * section's "Book" button and the pet profile opened the same modal with a
 * handler that did `console.log("Booking created:")` — so a booking made from
 * either looked finished and never existed. One handler now, for all three.
 */
export function useCreateBookingFromModal() {
  const t = useShellText("header");
  const queryClient = useQueryClient();
  const { currentLocationId } = useLocationContext();

  /** Resolves true when the booking was written, false when it was not. */
  return async (bookingData: NewBooking): Promise<boolean> => {
    try {
      // The id comes back from the database, never computed from a list.
      const created = await bookingMutations.create(
        bookingData,
        currentLocationId,
      );
      await queryClient.invalidateQueries({ queryKey: ["bookings"] });
      // No Undo: bookings have no DELETE policy — a booking is cancelled, not
      // erased — so there is nothing honest to offer.
      toast.success(t("bookingCreated").replace("{id}", String(created.id)), {
        description: t("bookingCreatedBody").replace(
          "{service}",
          bookingData.service,
        ),
      });
      return true;
    } catch (error) {
      toast.error(t("createBookingFailed"), {
        description: error instanceof Error ? error.message : t("tryAgain"),
      });
      return false;
    }
  };
}
