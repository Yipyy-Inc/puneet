"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookingModal } from "@/components/bookings/modals/BookingModal";
import { ChevronLeft } from "lucide-react";
import { clients } from "@/data/clients";
import { unfinishedBookings } from "@/data/unfinished-bookings";
import { buildResumePreselection } from "@/lib/resume-booking";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";

const MOCK_CUSTOMER_ID = 15;

export default function NewBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedFacility } = useCustomerFacility();

  const { bookingFlow } = useSettings();

  const customer = useMemo(
    () => clients.find((client) => client.id === MOCK_CUSTOMER_ID),
    [],
  );

  const preSelectedService = searchParams?.get("service") ?? undefined;
  const resumeBookingId = searchParams?.get("resumeBooking") ?? null;

  // If the customer clicked a recovery link in an email we'll restore every
  // field they had previously entered.
  const resumePreselection = useMemo(() => {
    if (!resumeBookingId) return null;
    const ub = unfinishedBookings.find((r) => r.id === resumeBookingId);
    if (!ub) return null;
    // Only allow resume when the saved session belongs to this customer so
    // shared/forwarded links can't pull someone else's draft.
    if (ub.clientId && ub.clientId !== MOCK_CUSTOMER_ID) return null;
    return buildResumePreselection(ub);
  }, [resumeBookingId]);

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
          preSelectedService={resumePreselection?.preSelectedService ?? preSelectedService}
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
          preSelectedExtraServices={resumePreselection?.preSelectedExtraServices}
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
          onCreateBooking={() => {
            // Booking data is recorded; the modal shows the confirmation screen.
            // Navigation happens when the customer clicks Done (via onOpenChange).
          }}
        />
      </div>
    </div>
  );
}
