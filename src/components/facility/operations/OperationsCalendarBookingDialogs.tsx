"use client";

import dynamic from "next/dynamic";

import { useCancelWithRefund } from "@/components/bookings/use-cancel-with-refund";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { CalendarBookingDialogState } from "./use-calendar-booking-actions";

// ============================================================================
// The booking dialogs the calendar opens in place: the booking page's own
// edit dialog and cancel dialog, loaded when first opened, and the question a
// check-in asks when a required vaccine is missing.
// ============================================================================

const BookingEditDialog = dynamic(
  () =>
    import("@/components/bookings/BookingEditDialog").then(
      (m) => m.BookingEditDialog,
    ),
  { ssr: false },
);

const CancelBookingModal = dynamic(
  () =>
    import("@/components/bookings/modals/CancelBookingModal").then(
      (m) => m.CancelBookingModal,
    ),
  { ssr: false },
);

export function OperationsCalendarBookingDialogs({
  dialogs,
}: {
  dialogs: CalendarBookingDialogState;
}) {
  const cancelWithRefund = useCancelWithRefund();
  const { t, fill } = useStaffText("bookingActions");
  const { editing, cancelling, vaccineAsk } = dialogs;

  return (
    <>
      {editing?.client && (
        <BookingEditDialog
          booking={editing.booking}
          client={editing.client}
          open
          mode="edit"
          onOpenChange={(open) => {
            if (!open) dialogs.closeEdit();
          }}
        />
      )}

      {cancelling && (
        <CancelBookingModal
          booking={cancelling.booking}
          clientName={cancelling.clientName}
          petName={cancelling.petName}
          open
          onOpenChange={(open) => {
            if (!open) dialogs.closeCancel();
          }}
          // Refund first, then cancel — see use-cancel-with-refund.ts.
          onConfirm={cancelWithRefund}
        />
      )}

      <AlertDialog
        open={vaccineAsk !== null}
        onOpenChange={(open) => {
          if (!open) dialogs.closeVaccineAsk();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("vaccineGapTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {fill("vaccineGapBody", { gaps: dialogs.vaccineGapText })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keepAsIs")}</AlertDialogCancel>
            <AlertDialogAction onClick={dialogs.confirmVaccineAsk}>
              {fill("vaccineGapConfirm", { pet: vaccineAsk?.pet ?? "" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
