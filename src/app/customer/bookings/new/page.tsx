"use client";

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { bookingMutations } from "@/lib/api/booking";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookingModal } from "@/components/bookings/modals/BookingModal";
import { ChevronLeft } from "lucide-react";
import { unfinishedBookings } from "@/data/unfinished-bookings";
import { buildResumePreselection } from "@/lib/resume-booking";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";
import { toast } from "sonner";
import type { NewBooking } from "@/types/booking";

export default function NewBookingPage() {
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedFacility } = useCustomerFacility();

  const { bookingFlow } = useSettings();
  const queryClient = useQueryClient();

  const preSelectedService = searchParams?.get("service") ?? undefined;
  const preSelectedProgramId = searchParams?.get("program") ?? undefined;
  const preSelectedCourseTypeId = searchParams?.get("course") ?? undefined;
  const resumeBookingId = searchParams?.get("resumeBooking") ?? null;

  // If the customer clicked a recovery link in an email we'll restore every
  // field they had previously entered.
  const resumePreselection = useMemo(() => {
    if (!resumeBookingId) return null;
    const ub = unfinishedBookings.find((r) => r.id === resumeBookingId);
    if (!ub) return null;
    // Only allow resume when the saved session belongs to this customer so
    // shared/forwarded links can't pull someone else's draft.
    if (ub.clientId && ub.clientId !== customerId) return null;
    return buildResumePreselection(ub);
  }, [customerId, resumeBookingId]);

  if (!selectedFacility || !customer) {
    return (
      <div className="bg-background min-h-screen">
        <div className="bg-card border-b">
          <div className="mx-auto max-w-5xl p-4">
            <Link
              href="/customer/bookings"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
            >
              <ChevronLeft className="size-4" />
              Back to bookings
            </Link>
            <h1 className="mt-1 text-xl font-semibold">New booking</h1>
          </div>
        </div>
        <div className="mx-auto max-w-5xl p-4">
          <p className="text-muted-foreground text-sm">
            Unable to load booking wizard. Please try again.
          </p>
        </div>
      </div>
    );
  }

  const heading = resumePreselection ? "Resume booking" : "New booking";
  const subheading = resumePreselection
    ? "We've restored the details you entered earlier — pick up where you left off."
    : "Select a service and book for your pets";

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-card border-b">
        <div className="mx-auto max-w-5xl p-4">
          <Link
            href="/customer/bookings"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="size-4" />
            Back to bookings
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{heading}</h1>
          <p className="text-muted-foreground text-sm">{subheading}</p>
        </div>
      </div>
      <div className="mx-auto max-w-5xl">
        <BookingModal
          open={true}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) router.push("/customer/bookings");
          }}
          clients={[customer]}
          facilityId={selectedFacility.id}
          facilityName={selectedFacility.name}
          preSelectedClientId={customer.id}
          preSelectedService={
            resumePreselection?.preSelectedService ?? preSelectedService
          }
          preSelectedProgramId={
            resumePreselection ? undefined : preSelectedProgramId
          }
          preSelectedCourseTypeId={
            resumePreselection ? undefined : preSelectedCourseTypeId
          }
          // When a service-specific program is deep-linked (e.g. customer
          // tapped Enroll on a training catalog card), lock the wizard to
          // that service so Step 2 is hidden + skipped.
          lockService={!resumePreselection && !!preSelectedService}
          preSelectedPetId={resumePreselection?.preSelectedPetId}
          preSelectedStartDate={resumePreselection?.preSelectedStartDate}
          preSelectedEndDate={resumePreselection?.preSelectedEndDate}
          preSelectedCheckInTime={resumePreselection?.preSelectedCheckInTime}
          preSelectedCheckOutTime={resumePreselection?.preSelectedCheckOutTime}
          preSelectedDaycareDates={resumePreselection?.preSelectedDaycareDates}
          preSelectedRoomId={resumePreselection?.preSelectedRoomId}
          preSelectedDaycareSectionId={
            resumePreselection?.preSelectedDaycareSectionId
          }
          preSelectedExtraServices={
            resumePreselection?.preSelectedExtraServices
          }
          preSelectedFeedingSchedule={
            resumePreselection?.preSelectedFeedingSchedule
          }
          preSelectedMedications={resumePreselection?.preSelectedMedications}
          preSelectedSpecialRequests={
            resumePreselection?.preSelectedSpecialRequests
          }
          preSelectedNotificationEmail={
            resumePreselection?.preSelectedNotificationEmail
          }
          preSelectedNotificationSMS={
            resumePreselection?.preSelectedNotificationSMS
          }
          isCustomerMode={true}
          bookingRequestMessage={bookingFlow.bookingRequestConfirmationMessage}
          onCreateBooking={async (booking: NewBooking) => {
            if (!customer || !selectedFacility) return;

            const petId = Array.isArray(booking.petId)
              ? booking.petId[0]
              : booking.petId;
            const pet = customer.pets?.find((p) => p.id === petId);

            try {
              const created = await bookingMutations.create({
                ...booking,
                clientId: customer.id,
                // ── THE DATABASE DECIDES THE STATUS, NOT THIS SCREEN ──────
                //
                // Every INSERT into `bookings` is forced to
                // `request_submitted` with the prices zeroed and preserved as
                // `details.requestedQuote` (20260806840000). So a booking is a
                // REQUEST by construction, whoever makes it — which is exactly
                // the model a customer needs, and it is why no separate
                // `booking_requests` table is required.
                //
                // A status is still sent because `NewBooking` requires one and
                // an absent field would read as an oversight. It is discarded;
                // do not build anything on it being honoured.
                status: "request_submitted",
                // Deliberately dropped. A room creates a `boarding_stays` row,
                // and its exclusion constraint keys on `released_at is null`
                // rather than on the booking's status — so an unconfirmed
                // request naming a kennel would hold that kennel against every
                // other booking until somebody noticed. Rooms are assigned on
                // the ops board after a stay exists, which is how the facility
                // side already works.
                unitAssignment: undefined,
                kennel: undefined,
              });

              await queryClient.invalidateQueries({ queryKey: ["bookings"] });

              // ── ONE MESSAGE, BECAUSE THERE IS ONE OUTCOME ─────────────
              //
              // This used to say "<pet> is confirmed! Skipped staff approval"
              // when `resolveInstabookEligibility` said so. The database
              // contradicts that: the insert trigger forces
              // `request_submitted`, so an instabook-eligible customer was
              // told their dog had a place while the row said otherwise.
              //
              // Instabook is not implemented against the database — honouring
              // it means a second, permitted act that confirms the booking,
              // and a customer cannot update their own booking's status. It is
              // in the debt map. Until then this says what happened.
              toast.success(`Request sent to ${selectedFacility.name}`, {
                description: `Booking #${created.id} for ${pet?.name ?? "your pet"} is awaiting confirmation.`,
              });

              router.push("/customer/bookings");
            } catch (error) {
              // The modal stays where it is, holding what was entered. There
              // is no row, so saying anything else would be the claim this
              // whole change removed.
              toast.error("Could not send that booking", {
                description:
                  error instanceof Error ? error.message : "Please try again.",
              });
            }
          }}
        />
      </div>
    </div>
  );
}
