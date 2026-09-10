"use client";

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
import type { Booking } from "@/types/booking";
import { useCustomerText } from "@/lib/customer/use-customer-text";

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onConfirm: () => void;
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  booking,
  onConfirm,
}: CancelBookingDialogProps) {
  // Above the early return: the hook runs whether or not there is a booking.
  const { t } = useCustomerText("bookings");
  if (!booking) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("cancelBody")}
            {booking.paymentStatus === "paid" && (
              <span className="mt-2 block text-sm font-medium">
                {t("cancelRefundNote")}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keepBooking")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("cancelBooking")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
