"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BookingModal } from "@/components/bookings/modals/BookingModal";
import { useShellText } from "@/lib/shell/use-shell-text";
import { ChevronLeft } from "lucide-react";
import {
  unfinishedBookingQueries,
  useMarkUnfinishedBookingRecovered,
} from "@/lib/api/unfinished-bookings";
import { buildResumePreselection } from "@/lib/resume-booking";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";
import { useCustomerBookingRequest } from "@/components/bookings/use-customer-booking-request";

export default function NewBookingPage() {
  const t = useShellText("booking");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedFacility } = useCustomerFacility();

  const { bookingFlow } = useSettings();

  const preSelectedService = searchParams?.get("service") ?? undefined;
  const preSelectedProgramId = searchParams?.get("program") ?? undefined;
  const preSelectedCourseTypeId = searchParams?.get("course") ?? undefined;
  const resumeBookingId = searchParams?.get("resumeBooking") ?? null;

  // If the customer clicked a recovery link in an email we'll restore every
  // field they had previously entered.
  // The saved draft, read through RLS: a link to somebody else's is a 404.
  const { data: resumed } = useQuery(
    unfinishedBookingQueries.one(resumeBookingId),
  );
  const markRecovered = useMarkUnfinishedBookingRecovered();
  const requestBooking = useCustomerBookingRequest({
    onSent: () => {
      // They came back and booked: the draft is recovered. Never blocking —
      // the booking is already made.
      if (resumeBookingId) markRecovered.mutate(resumeBookingId);
      router.push("/customer/bookings");
    },
  });
  const resumePreselection = useMemo(() => {
    if (!resumeBookingId || !resumed) return null;
    const ub = resumed;
    // Only allow resume when the saved session belongs to this customer so
    // shared/forwarded links can't pull someone else's draft.
    if (ub.clientId && ub.clientId !== customerId) return null;
    return buildResumePreselection(ub);
  }, [customerId, resumeBookingId, resumed]);

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
              {t("backToBookings")}
            </Link>
            <h1 className="mt-1 text-xl font-semibold">{t("newBooking")}</h1>
          </div>
        </div>
        <div className="mx-auto max-w-5xl p-4">
          <p className="text-muted-foreground text-sm">
            {t("wizardUnavailable")}
          </p>
        </div>
      </div>
    );
  }

  const heading = resumePreselection ? t("resumeBooking") : t("newBooking");
  const subheading = resumePreselection
    ? t("resumeBookingHelp")
    : t("newBookingHelp");

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-card border-b">
        <div className="mx-auto max-w-5xl p-4">
          <Link
            href="/customer/bookings"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="size-4" />
            {t("backToBookings")}
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
          preSelectedPetIds={resumePreselection?.preSelectedPetIds}
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
          onCreateBooking={requestBooking}
        />
      </div>
    </div>
  );
}
