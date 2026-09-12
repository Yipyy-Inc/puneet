"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bookingMutations } from "@/lib/api/booking";
import { useLocationContext } from "@/hooks/use-location-context";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { formatMoney } from "@/lib/i18n/format";
import type { NewBooking } from "@/types/booking";

/** What POST /api/bookings adds to the booking it answers with. */
interface CreatedExtras {
  /** Every booking the request made, when it made more than one. */
  groupRefs?: number[];
  depositRecorded?: number;
  depositProblem?: string;
}

/**
 * The booking modal's `onCreateBooking` for staff: write the booking, refresh
 * every booking list, and say what happened.
 *
 * It lived inside FacilityHeader, the one caller that persisted. The daycare
 * section's "Book" button and the pet profile opened the same modal with a
 * handler that did `console.log("Booking created:")` — so a booking made from
 * either looked finished and never existed. One handler now, for every staff
 * screen that opens the form.
 *
 * The form WAITS for the answer: `false` keeps it open with everything staff
 * entered, which is why this returns rather than closes anything itself.
 */
export function useCreateBookingFromModal() {
  const t = useShellText("header");
  const locale = useShellLocale();
  const queryClient = useQueryClient();
  const { currentLocationId } = useLocationContext();

  /** Resolves true when the booking was written, false when it was not. */
  return async (bookingData: NewBooking): Promise<boolean> => {
    let created: Awaited<ReturnType<typeof bookingMutations.create>> &
      CreatedExtras;
    try {
      // The id comes back from the database, never computed from a list.
      created = await bookingMutations.create(bookingData, currentLocationId);
    } catch (error) {
      toast.error(t("createBookingFailed"), {
        description: error instanceof Error ? error.message : t("tryAgain"),
      });
      return false;
    }

    await queryClient.invalidateQueries({ queryKey: ["bookings"] });
    // A stay holds a kennel, and the occupancy board is its own read.
    await queryClient.invalidateQueries({ queryKey: ["boarding-rooms"] });

    // No Undo: bookings have no DELETE policy — a booking is cancelled, not
    // erased — so there is nothing honest to offer.
    const refs = created.groupRefs ?? [];
    if (refs.length > 1) {
      toast.success(
        t("bookingsCreated").replace("{count}", String(refs.length)),
        {
          description: t("bookingsCreatedBody")
            .replace("{service}", bookingData.service)
            .replace("{refs}", refs.map((ref) => `#${ref}`).join(", ")),
        },
      );
    } else {
      toast.success(t("bookingCreated").replace("{id}", String(created.id)), {
        description: t("bookingCreatedBody").replace(
          "{service}",
          bookingData.service,
        ),
      });
    }

    if (created.depositRecorded) {
      toast.success(
        t("depositRecorded").replace(
          "{amount}",
          formatMoney(created.depositRecorded, locale),
        ),
      );
    }
    if (created.depositProblem) {
      // The booking exists either way; the money is what is unresolved.
      toast.warning(t("depositNotRecorded"), {
        description: t("depositNotRecordedHelp").replace(
          "{reason}",
          created.depositProblem,
        ),
      });
    }
    return true;
  };
}
