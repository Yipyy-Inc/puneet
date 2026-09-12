"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useBookingModal } from "@/hooks/use-booking-modal";
import { clientQueries } from "@/lib/api/client";
import { useConvertEstimate } from "@/lib/api/estimates";
import { useFacilityProfile } from "@/lib/api/facility-profile";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  buildBookingDataFromEstimate,
  estimateBookingNotes,
} from "@/lib/estimates/convert-estimate";
import type { Estimate, NewBooking } from "@/types/booking";

/** A mock-era label the booking route ignores; it takes the facility from the session. */
const FACILITY_LABEL = 11;

function fmtDate(d: string) {
  return new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Section({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2">
        <p className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
          {title}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-medium text-blue-600 hover:underline"
        >
          Edit
        </button>
      </div>
      <div className="px-3 py-2.5 text-sm">{children}</div>
    </div>
  );
}

interface Props {
  estimate: Estimate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConverted?: (bookingId: number) => void;
}

export function ConvertEstimateReviewDialog({
  estimate,
  open,
  onOpenChange,
  onConverted,
}: Props) {
  const { t, fill } = useStaffText("estimateActions");
  const { openBookingModal } = useBookingModal();
  // The roster, for the booking wizard's "Edit" path. This handed it
  // `clients` from `@/data/clients` filtered by an invented facility name.
  const { data: allClients } = useQuery(clientQueries.all());
  const { profile } = useFacilityProfile();
  const convert = useConvertEstimate();
  // A guest is not a client yet, and a booking needs one.
  const isGuest = estimate.clientId <= 0;

  const deposit = estimate.depositRequired ?? 0;
  // Accepting an estimate takes no money, so a deposit is always still due
  // here. This read "Paid on acceptance" whenever the settings said one was
  // required on acceptance — whether or not anybody had taken it.
  const depositPaid = false;
  const dateRange = `${fmtDate(estimate.startDate)}${
    estimate.endDate && estimate.endDate !== estimate.startDate
      ? ` – ${fmtDate(estimate.endDate)}`
      : ""
  }`;
  const notes = estimateBookingNotes(estimate);

  // Both paths end here: the booking through /api/bookings, then the
  // estimate pointed at it. The toast names the booking only once it exists.
  /** True when the booking was made; the wizard stays open on false. */
  const run = async (booking: NewBooking): Promise<boolean> => {
    try {
      const bookingRef = await convert.mutateAsync({ estimate, booking });
      toast.success(
        fill("convertedToast", {
          number: estimate.estimateId,
          booking: bookingRef,
        }),
      );
      onConverted?.(bookingRef);
      onOpenChange(false);
      return true;
    } catch (error) {
      toast.error(t("convertFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
      return false;
    }
  };

  // "Edit" reuses the booking wizard, pre-filled from the estimate — no
  // re-entry. Completing it converts.
  const handleEdit = () => {
    openBookingModal({
      clients: allClients ?? [],
      facilityId: FACILITY_LABEL,
      facilityName: profile.businessName,
      preSelectedClientId: estimate.clientId,
      preSelectedPetId: estimate.petIds[0],
      preSelectedService: estimate.service,
      preSelectedStartDate: estimate.startDate,
      preSelectedEndDate: estimate.endDate,
      preSelectedCheckInTime: estimate.checkInTime,
      preSelectedCheckOutTime: estimate.checkOutTime,
      preSelectedSpecialRequests: notes,
      onCreateBooking: run,
    });
    onOpenChange(false);
  };

  const handleConfirm = () => void run(buildBookingDataFromEstimate(estimate));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Convert Estimate {estimate.estimateId} to Booking
          </DialogTitle>
          <DialogDescription>Review before confirming.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          <Section title="Customer" onEdit={handleEdit}>
            <p className="font-medium">{estimate.clientName}</p>
            <p className="text-muted-foreground text-xs">
              {estimate.clientEmail}
            </p>
          </Section>

          <Section title="Pet(s)" onEdit={handleEdit}>
            {estimate.petNames.length > 0
              ? estimate.petNames.join(", ")
              : (estimate.guestPetInfo?.name ?? "—")}
          </Section>

          <Section title="Service Type" onEdit={handleEdit}>
            <span className="capitalize">{estimate.service}</span>
            {estimate.serviceType ? ` · ${estimate.serviceType}` : ""}
          </Section>

          <Section title="Dates" onEdit={handleEdit}>
            {dateRange}
            {estimate.checkInTime && (
              <span className="text-muted-foreground text-xs">
                {" "}
                · Check-in {estimate.checkInTime}
                {estimate.checkOutTime
                  ? ` · Check-out ${estimate.checkOutTime}`
                  : ""}
              </span>
            )}
          </Section>

          <Section title="Room Type" onEdit={handleEdit}>
            {estimate.roomType || "—"}
          </Section>

          <Section title="Add-ons" onEdit={handleEdit}>
            {estimate.lineItems.length > 0 ? (
              <ul className="space-y-1">
                {estimate.lineItems.map((li, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{li.label}</span>
                    <span className="tabular-nums">${li.total.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              "—"
            )}
          </Section>

          <Section title="Pricing" onEdit={handleEdit}>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">
                  ${estimate.subtotal.toFixed(2)}
                </span>
              </div>
              {estimate.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    Discount
                    {estimate.discountReason
                      ? ` (${estimate.discountReason})`
                      : ""}
                  </span>
                  <span className="tabular-nums">
                    -${estimate.discount.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax ({(estimate.taxRate * 100).toFixed(0)}%)
                </span>
                <span className="tabular-nums">
                  ${estimate.taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  ${estimate.total.toFixed(2)}
                </span>
              </div>
            </div>
          </Section>

          <Section title="Deposit" onEdit={handleEdit}>
            {deposit > 0 ? (
              <div className="flex items-center justify-between">
                <span className="tabular-nums">${deposit.toFixed(2)}</span>
                <span
                  className={
                    depositPaid
                      ? "text-xs font-medium text-emerald-700"
                      : "text-muted-foreground text-xs"
                  }
                >
                  {depositPaid ? "Paid on acceptance" : "Due at booking"}
                </span>
              </div>
            ) : (
              "No deposit required"
            )}
          </Section>

          <Section title="Notes" onEdit={handleEdit}>
            {notes ? (
              <p className="text-muted-foreground text-xs whitespace-pre-line">
                {notes}
              </p>
            ) : (
              "—"
            )}
          </Section>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Back to Estimate
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={isGuest || convert.isPending}
          >
            {convert.isPending && <Loader2 className="size-4 animate-spin" />}
            {t("confirmBooking")}
          </Button>
        </div>
        {isGuest && (
          <p className="text-ink-secondary text-sm" role="note">
            {fill("guestNeedsClient", {
              name: estimate.guestName || estimate.clientName,
            })}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
