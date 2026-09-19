"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  customerBookingQueries,
  useCancelMyBooking,
} from "@/lib/api/customer-bookings";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { formatDateLong } from "@/lib/i18n/format";
import { serviceTypeLabel } from "@/lib/i18n/labels";

// ============================================================================
// Cancel a booking, or withdraw a request — for real.
//
// It waited a second and said "Booking cancelled"; nothing was written. Now it
// asks the database what cancelling would mean first (inside the facility's
// notice window? at what fee?) and says so before the customer confirms. The
// fee is the facility's to apply: nothing is charged or refunded here, and the
// words say that rather than promising a refund.
// ============================================================================

interface CancelBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: number;
    service: string;
    startDate: string;
    paymentStatus?: string;
  } | null;
  petName?: string;
}

export function CancelBookingDialog({
  open,
  onOpenChange,
  booking,
  petName,
}: CancelBookingDialogProps) {
  const { t, fill, locale } = useCustomerText("bookings");
  const [reason, setReason] = useState("");
  const cancel = useCancelMyBooking();
  const terms = useQuery({
    ...customerBookingQueries.cancelTerms(booking?.id ?? -1),
    enabled: open && booking != null,
  });

  if (!booking) return null;

  const withdrawal = terms.data?.withdrawal ?? false;
  const values = {
    pet: petName || t("petFallback"),
    service: serviceTypeLabel(locale, booking.service),
    date: formatDateLong(booking.startDate, locale),
  };

  const close = (next: boolean) => {
    if (cancel.isPending) return;
    if (!next) setReason("");
    onOpenChange(next);
  };

  const confirm = async () => {
    try {
      await cancel.mutateAsync({ ref: booking.id, reason });
      toast.success(
        withdrawal ? t("withdrawnToast") : fill("cancelledForToast", values),
      );
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error(t("cancelFailedToast"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const data = terms.data;

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {withdrawal
              ? fill("withdrawTitle", values)
              : fill("cancelTitleFor", values)}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {terms.isPending ? (
                <Skeleton className="h-10 w-full rounded-2xl" />
              ) : terms.isError ? (
                <p>{t("cancelTermsFailed")}</p>
              ) : !data?.cancellable ? (
                <p>{t("cancelNotPossible")}</p>
              ) : withdrawal ? (
                <p>{t("withdrawBody")}</p>
              ) : data.late ? (
                <p className="text-warning flex items-start gap-2 font-medium">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <span>
                    {data.feePercentage
                      ? fill("cancelLateWithFee", {
                          hours: data.noticeHours ?? 0,
                          fee: data.feePercentage,
                        })
                      : fill("cancelLate", { hours: data.noticeHours ?? 0 })}
                  </span>
                </p>
              ) : data.noticeHours ? (
                <p>{fill("cancelInTime", { hours: data.noticeHours })}</p>
              ) : (
                <p>{t("cancelBody")}</p>
              )}
              {data?.cancellable &&
                !withdrawal &&
                booking.paymentStatus !== undefined &&
                booking.paymentStatus !== "pending" && (
                  <p>{t("cancelRefundNote")}</p>
                )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {data?.cancellable && (
          <div className="grid gap-1.5">
            <Label htmlFor="cancel-reason">{t("cancelReasonLabel")}</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              maxLength={500}
              rows={2}
              placeholder={t("cancelReasonPlaceholder")}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>
            {withdrawal ? t("keepRequest") : t("keepBooking")}
          </AlertDialogCancel>
          {data?.cancellable && (
            <Button
              variant="destructive"
              loading={cancel.isPending}
              onClick={() => void confirm()}
            >
              {withdrawal ? t("withdrawRequest") : t("cancelBooking")}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
