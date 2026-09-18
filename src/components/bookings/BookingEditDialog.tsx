"use client";

import { toast } from "sonner";

import { BookingModal } from "@/components/bookings/modals/BookingModal";
import { useSaveBookingEdit } from "@/components/bookings/use-save-booking-edit";
import { useUpdateBookingStatus } from "@/lib/api/booking-status";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { formatBookingRef } from "@/lib/booking-id";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { Booking, ExtraService } from "@/types/booking";
import type { Client } from "@/types/client";

// ============================================================================
// Editing one booking — the same wizard, pre-filled, from every screen.
//
// The booking page carried fifty lines of pre-fill and a save handler; the
// calendar's Edit and Reschedule opened the bookings list in a new tab, which
// read no parameters and so did nothing. Both open this now.
//
// `approve` is the booking page's "Review and approve" for a request: the
// wizard prices it (a customer's request arrives at $0), and saving confirms
// it — two writes, in that order, each reported.
//
// The wizard is ~4,700 lines; import this with next/dynamic so a screen that
// never edits never loads it.
// ============================================================================

export function BookingEditDialog({
  booking,
  client,
  open,
  onOpenChange,
  mode = "edit",
}: {
  booking: Booking;
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "edit" | "approve";
}) {
  const saveEdit = useSaveBookingEdit(booking);
  const updateStatus = useUpdateBookingStatus();
  const { profile } = useFacilityProfile();
  const { t, fill } = useStaffText("bookingDetail");
  const { fill: actFill } = useStaffText("bookingActions");
  const ref = formatBookingRef(booking.id);

  return (
    <BookingModal
      open={open}
      onOpenChange={onOpenChange}
      clients={[client]}
      facilityId={booking.facilityId}
      facilityName={profile.businessName}
      editMode
      preSelectedClientId={booking.clientId}
      preSelectedPetId={
        Array.isArray(booking.petId) ? booking.petId[0] : booking.petId
      }
      preSelectedService={booking.service}
      preSelectedStartDate={booking.startDate}
      preSelectedEndDate={booking.endDate}
      preSelectedCheckInTime={booking.checkInTime}
      preSelectedCheckOutTime={booking.checkOutTime}
      preSelectedRoomId={booking.unitAssignment ?? undefined}
      preSelectedDaycareSectionId={booking.sectionId ?? undefined}
      preSelectedDaycareDates={booking.daycareSelectedDates}
      preSelectedExtraServices={
        booking.extraServices?.filter(
          (s): s is ExtraService => typeof s !== "string",
        ) ?? []
      }
      preSelectedFeedingSchedule={booking.feedingSchedule}
      preSelectedMedications={booking.medications}
      preSelectedSpecialRequests={booking.specialRequests}
      onCreateBooking={async (edited) => {
        // The wizard waits for this answer, and stays open on `false`.
        try {
          const changed = await saveEdit.mutateAsync(edited);
          if (mode === "approve") {
            // Priced by the wizard just now; approving is the second step.
            await updateStatus.mutateAsync({
              id: booking.id,
              status: "confirmed",
            });
            toast.success(actFill("confirmedDone", { ref }));
            return true;
          }
          toast.success(
            changed ? fill("bookingUpdated", { ref }) : t("nothingChanged"),
          );
          return true;
        } catch (error) {
          toast.error(fill("bookingNotUpdated", { ref }), {
            description: error instanceof Error ? error.message : undefined,
          });
          return false;
        }
      }}
    />
  );
}
