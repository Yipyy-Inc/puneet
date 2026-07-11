"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, CreditCard, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { clients } from "@/data/clients";
import { getEstimateSettings } from "@/data/estimate-settings";
import { acceptEstimate } from "@/lib/estimates/accept-estimate";
import type { Estimate } from "@/types/booking";

function fmtDate(d: string) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface Props {
  estimate: Estimate;
  facilityName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccepted?: (result: { estimateId: string; converted: boolean }) => void;
}

export function AcceptEstimateDialog({
  estimate,
  facilityName,
  open,
  onOpenChange,
  onAccepted,
}: Props) {
  const [step, setStep] = useState<"confirm" | "payment" | "success">(
    "confirm",
  );
  const [converted, setConverted] = useState(false);

  const deposit = estimate.depositRequired ?? 0;
  const depositRequired =
    deposit > 0 && getEstimateSettings().acceptanceRequiresDeposit;

  const savedCards =
    clients.find((c) => c.id === estimate.clientId)?.savedCards ?? [];
  const defaultCard =
    savedCards.find((card) => card.isDefault) ?? savedCards[0];
  const [selectedCardId, setSelectedCardId] = useState(defaultCard?.id ?? "");

  const dateRange = `${fmtDate(estimate.startDate)}${
    estimate.endDate && estimate.endDate !== estimate.startDate
      ? ` – ${fmtDate(estimate.endDate)}`
      : ""
  }`;
  const petLabel =
    estimate.petNames.length > 0
      ? estimate.petNames.join(", ")
      : (estimate.guestPetInfo?.name ?? "your pet");

  const reset = () => {
    setStep("confirm");
    setConverted(false);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const finalizeAccept = (depositPaid: boolean) => {
    const result = acceptEstimate(estimate, {
      now: new Date(),
      depositPaid,
      acceptedBy: estimate.clientName,
    });
    setConverted(result.autoConverted);

    // Facility notification (mock) — appears in the facility's Estimates queue.
    const roomPart = estimate.roomType ? ` · ${estimate.roomType}` : "";
    toast(
      `${estimate.clientName} accepted Estimate ${estimate.estimateId} for ${petLabel} (${estimate.service}${roomPart} · ${dateRange}). Convert to booking in Estimates.`,
    );

    onAccepted?.({ estimateId: estimate.id, converted: result.autoConverted });
    setStep("success");
  };

  const handleConfirm = () => {
    if (depositRequired) setStep("payment");
    else finalizeAccept(true);
  };

  const summaryRows = (
    <div className="space-y-1.5 rounded-xl border bg-slate-50 p-3.5 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Service</span>
        <span className="font-medium capitalize">
          {estimate.service}
          {estimate.serviceType ? ` · ${estimate.serviceType}` : ""}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Dates</span>
        <span className="font-medium">{dateRange}</span>
      </div>
      <div className="flex justify-between border-t pt-1.5 font-semibold">
        <span>Total</span>
        <span className="tabular-nums">${estimate.total.toFixed(2)}</span>
      </div>
      {deposit > 0 && (
        <div className="flex justify-between text-xs text-blue-600">
          <span>Deposit required</span>
          <span className="tabular-nums">${deposit.toFixed(2)}</span>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>You are about to accept this estimate.</DialogTitle>
              <DialogDescription>
                Review the details below, then confirm your acceptance.
              </DialogDescription>
            </DialogHeader>
            {summaryRows}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Go Back
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                onClick={handleConfirm}
              >
                Confirm Acceptance
              </Button>
            </div>
          </>
        )}

        {step === "payment" && (
          <>
            <DialogHeader>
              <DialogTitle>Deposit required</DialogTitle>
              <DialogDescription>
                A deposit of ${deposit.toFixed(2)} is required to secure your
                booking.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                Payment Method
              </p>
              {savedCards.length > 0 ? (
                <div className="space-y-2">
                  {savedCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedCardId(card.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-left transition-all",
                        selectedCardId === card.id
                          ? "border-emerald-400 bg-emerald-50/50"
                          : "border-slate-200 hover:border-slate-300",
                      )}
                    >
                      <CreditCard className="text-muted-foreground size-4 shrink-0" />
                      <span className="flex-1 text-sm font-medium capitalize">
                        {card.brand} •••• {card.last4}
                      </span>
                      {card.isDefault && (
                        <span className="text-muted-foreground text-[10px]">
                          Default
                        </span>
                      )}
                      {selectedCardId === card.id && (
                        <Check className="size-4 shrink-0 text-emerald-600" />
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-3 text-sm">
                  No saved payment method — you&apos;ll be prompted to add one.
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("confirm")}
              >
                Go Back
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                onClick={() => finalizeAccept(true)}
              >
                Pay ${deposit.toFixed(2)} &amp; Accept
              </Button>
            </div>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100">
                <Check className="size-7 text-emerald-600" />
              </div>
              <DialogTitle className="text-center">
                Your estimate has been accepted!
              </DialogTitle>
              <DialogDescription className="text-center">
                {facilityName} will confirm your booking shortly.
              </DialogDescription>
            </DialogHeader>
            {summaryRows}
            {converted && (
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                <CalendarCheck className="size-3.5" />A booking has been created
                from this estimate.
              </div>
            )}
            <Button asChild className="w-full">
              <Link href="/customer/estimates">View in My Account</Link>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
