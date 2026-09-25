"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bookingMutations } from "@/lib/api/booking";
import { useLocationContext } from "@/hooks/use-location-context";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import { formatMoney } from "@/lib/i18n/format";
import type { NewBooking } from "@/types/booking";
import { askFormOverrideReason } from "@/lib/forms/override-prompt";
import {
  FORM_OVERRIDE_REASON_REQUIRED,
  formRefusalOf,
} from "@/lib/forms/requirements";

/** What POST /api/bookings adds to the booking it answers with. */
interface CreatedExtras {
  /** Every booking the request made, when it made more than one. */
  groupRefs?: number[];
  depositRecorded?: number;
  depositProblem?: string;
}

/**
 * The booking modal's `onCreateBooking` for staff: write the booking, say what
 * happened, and refresh every booking list behind it.
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
      // A form the facility requires before booking is missing. Staff may go
      // ahead with a reason, which the database saves as the override; going
      // back leaves the form open with everything entered.
      const refusal = formRefusalOf(error);
      if (refusal?.code !== FORM_OVERRIDE_REASON_REQUIRED) {
        toast.error(t("createBookingFailed"), {
          description: error instanceof Error ? error.message : t("tryAgain"),
        });
        return false;
      }
      const reason = await askFormOverrideReason(refusal);
      if (!reason) return false;
      try {
        created = await bookingMutations.create(
          { ...bookingData, formOverrideReason: reason },
          currentLocationId,
        );
      } catch (retryError) {
        toast.error(t("createBookingFailed"), {
          description:
            retryError instanceof Error ? retryError.message : t("tryAgain"),
        });
        return false;
      }
    }

    // ── THE CONFIRMATION DOES NOT WAIT FOR THE LISTS ──────────────────────
    //
    // These were awaited, and `invalidateQueries` resolves only once every
    // ACTIVE query under the key has refetched — so "Saving…" and the toast
    // below waited on whichever booking lists the page had open. On a client
    // page that is the client's whole history: 1,496 bookings for the e2e
    // client, 17 seconds, a statement timeout, then retries. The booking was
    // written in 3.6 s and the form said "Saving…" for over a minute
    // (measured 2026-09-25) — long enough to click again, and a second click
    // is a second booking. The write is the answer; the lists catch up behind
    // it, and a list that cannot load says so on its own screen.
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    // A stay holds a kennel, and the occupancy board is its own read.
    void queryClient.invalidateQueries({ queryKey: ["boarding-rooms"] });

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
