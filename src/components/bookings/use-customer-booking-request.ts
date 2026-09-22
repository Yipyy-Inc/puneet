"use client";

import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { bookingMutations } from "@/lib/api/booking";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useShellText } from "@/lib/shell/use-shell-text";
import { FORM_REQUIRED, formRefusalOf } from "@/lib/forms/requirements";
import type { NewBooking } from "@/types/booking";

/**
 * The booking modal's `onCreateBooking` for a customer: send the request,
 * refresh their bookings, and say what happened.
 *
 * It lived inside `/customer/bookings/new`, the one customer caller that
 * saved. The header's quick-book button, a report card's "Book again", a
 * package card and a membership card opened the same modal with an empty
 * handler — and the modal reads anything but `false` as saved, so each showed
 * the request confirmation for a booking that was never written (and a
 * package card then spent a pass on it). One handler now.
 *
 * The form WAITS for the answer: `false` keeps it open with everything the
 * customer entered.
 */
export function useCustomerBookingRequest(options?: {
  /** Runs once the request exists, e.g. to leave the page. */
  onSent?: () => void;
}) {
  const t = useShellText("booking");
  const { client: customer } = useCurrentCustomer();
  const { selectedFacility } = useCustomerFacility();
  const queryClient = useQueryClient();

  /**
   * Resolves FALSE when the request was not written, and the created booking's
   * ref when it was.
   *
   * It returned a bare `true`, and the ref went in the toast and nowhere else.
   * Every caller tests `!== false`, so an object is as true as `true` was —
   * but a pass redeemed against this booking can now say WHICH booking spent
   * it. Without that, `package_pass_entries.booking_id` stays null (25 of 25
   * rows, measured 2026-09-22) and nothing can ever give a pass back.
   */
  return async (booking: NewBooking): Promise<false | { ref: number }> => {
    if (!customer || !selectedFacility) return false;

    const petId = Array.isArray(booking.petId)
      ? booking.petId[0]
      : booking.petId;
    const pet = customer.pets?.find((p) => p.id === petId);

    try {
      const created = await bookingMutations.create({
        ...booking,
        clientId: customer.id,
        // ── THE DATABASE DECIDES THE STATUS, NOT THIS SCREEN ──────────────
        //
        // Every INSERT into `bookings` is forced to `request_submitted` with
        // the prices zeroed and preserved as `details.requestedQuote`
        // (20260806840000). So a booking is a REQUEST by construction,
        // whoever makes it — which is exactly the model a customer needs, and
        // it is why no separate `booking_requests` table is required.
        //
        // A status is still sent because `NewBooking` requires one and an
        // absent field would read as an oversight. It is discarded; do not
        // build anything on it being honoured.
        status: "request_submitted",
        // Deliberately dropped. A room creates a `boarding_stays` row, and its
        // exclusion constraint keys on `released_at is null` rather than on
        // the booking's status — so an unconfirmed request naming a kennel
        // would hold that kennel against every other booking until somebody
        // noticed. Rooms are assigned on the ops board after a stay exists,
        // which is how the facility side already works.
        unitAssignment: undefined,
        kennel: undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ["bookings"] });

      // ── ONE MESSAGE, BECAUSE THERE IS ONE OUTCOME ─────────────────────────
      //
      // This used to say "<pet> is confirmed! Skipped staff approval" when
      // `resolveInstabookEligibility` said so. The database contradicts that:
      // the insert trigger forces `request_submitted`, so an
      // instabook-eligible customer was told their dog had a place while the
      // row said otherwise. Instabook is in the debt map. Until then this says
      // what happened.
      toast.success(
        t("requestSentTo").replace("{facility}", selectedFacility.name),
        {
          description: t("bookingAwaitingConfirmation")
            .replace("{id}", String(created.id))
            .replace("{pet}", pet?.name ?? t("yourPetLower")),
        },
      );

      options?.onSent?.();
      return { ref: created.id };
    } catch (error) {
      // The facility requires forms before booking. Name them, and open the
      // first in a new tab so this booking stays as it is.
      const refusal = formRefusalOf(error);
      if (refusal?.code === FORM_REQUIRED && refusal.missing.length > 0) {
        const first = refusal.missing[0];
        const names = refusal.missing
          .map((form) =>
            form.pet_name
              ? t("formForPet")
                  .replace("{form}", form.form_name)
                  .replace("{pet}", form.pet_name)
              : form.form_name,
          )
          .join(", ");
        toast.error(t("formsNeededTitle"), {
          description: `${t("formsNeededBody")} ${names}`,
          duration: Infinity,
          action: {
            label: t("openForm").replace("{form}", first.form_name),
            onClick: () => {
              window.open(
                `/forms/${encodeURIComponent(first.form_slug)}`,
                "_blank",
                "noopener",
              );
            },
          },
        });
        return false;
      }
      // The modal stays where it is, holding what was entered. There is no
      // row, so saying anything else would be a claim nothing made true.
      toast.error(t("couldNotSendBooking"), {
        description:
          error instanceof Error ? error.message : t("tryAgainPlain"),
      });
      return false;
    }
  };
}
