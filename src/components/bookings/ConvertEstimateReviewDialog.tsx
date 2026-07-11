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
import { clients } from "@/data/clients";
import { getEstimateSettings } from "@/data/estimate-settings";
import { useBookingModal } from "@/hooks/use-booking-modal";
import {
  convertEstimateToBooking,
  estimateBookingNotes,
  finalizeEstimateConversion,
} from "@/lib/estimates/convert-estimate";
import type { Estimate } from "@/types/booking";

const FACILITY_NAME = "Example Pet Care Facility";
const FACILITY_ID = 11;

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
  const { openBookingModal } = useBookingModal();

  const deposit = estimate.depositRequired ?? 0;
  const depositPaid =
    !!estimate.acceptedAt &&
    deposit > 0 &&
    getEstimateSettings().acceptanceRequiresDeposit;
  const dateRange = `${fmtDate(estimate.startDate)}${
    estimate.endDate && estimate.endDate !== estimate.startDate
      ? ` – ${fmtDate(estimate.endDate)}`
      : ""
  }`;
  const notes = estimateBookingNotes(estimate);

  // "Edit" reuses the existing booking-create path (use-booking-modal),
  // pre-filled from the estimate — no data re-entry. Completing it finalizes
  // the conversion.
  const handleEdit = () => {
    openBookingModal({
      clients: clients.filter((c) => c.facility === FACILITY_NAME),
      facilityId: FACILITY_ID,
      facilityName: FACILITY_NAME,
      preSelectedClientId: estimate.clientId,
      preSelectedPetId: estimate.petIds[0],
      preSelectedService: estimate.service,
      preSelectedStartDate: estimate.startDate,
      preSelectedEndDate: estimate.endDate,
      preSelectedCheckInTime: estimate.checkInTime,
      preSelectedCheckOutTime: estimate.checkOutTime,
      preSelectedSpecialRequests: notes,
      onCreateBooking: (booking) => {
        const id = finalizeEstimateConversion(estimate, booking);
        toast.success(
          `Booking #${id} created from Estimate ${estimate.estimateId}`,
        );
        onConverted?.(id);
      },
    });
    onOpenChange(false);
  };

  const handleConfirm = () => {
    const id = convertEstimateToBooking(estimate, { depositPaid });
    toast.success(
      `Booking #${id} created from Estimate ${estimate.estimateId}`,
    );
    onConverted?.(id);
    onOpenChange(false);
  };

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
          <Button className="flex-1" onClick={handleConfirm}>
            Confirm Booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
