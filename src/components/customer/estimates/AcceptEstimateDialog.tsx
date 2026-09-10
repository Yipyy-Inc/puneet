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
import { useEstimateSettings } from "@/lib/api/facility-settings";
import { acceptEstimate } from "@/lib/estimates/accept-estimate";
import type { Estimate } from "@/types/booking";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { formatDateShort, formatList, formatMoney } from "@/lib/i18n/format";

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
  // The facility's estimate policy, not the browser's: whether accepting an
  // estimate requires the deposit up front.
  const { settings: estimateSettings } = useEstimateSettings();
  const { t, fill, locale } = useCustomerText("estimates");
  const [step, setStep] = useState<"confirm" | "payment" | "success">(
    "confirm",
  );
  const [converted, setConverted] = useState(false);

  const deposit = estimate.depositRequired ?? 0;
  const depositRequired =
    deposit > 0 && estimateSettings.acceptanceRequiresDeposit;

  const savedCards =
    clients.find((c) => c.id === estimate.clientId)?.savedCards ?? [];
  const defaultCard =
    savedCards.find((card) => card.isDefault) ?? savedCards[0];
  const [selectedCardId, setSelectedCardId] = useState(defaultCard?.id ?? "");

  const dateRange = `${formatDateShort(estimate.startDate, locale)}${
    estimate.endDate && estimate.endDate !== estimate.startDate
      ? ` – ${formatDateShort(estimate.endDate, locale)}`
      : ""
  }`;
  const petLabel =
    estimate.petNames.length > 0
      ? formatList(estimate.petNames, locale)
      : (estimate.guestPetInfo?.name ?? t("yourPetLower"));

  const reset = () => {
    setStep("confirm");
    setConverted(false);
  };

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const finalizeAccept = (depositPaid: boolean) => {
    const result = acceptEstimate(estimate, estimateSettings, {
      now: new Date(),
      depositPaid,
      acceptedBy: estimate.clientName,
    });
    setConverted(result.autoConverted);

    // Facility notification (mock) — appears in the facility's Estimates queue.
    // It is the FACILITY's message, shown to the customer as a toast; see the
    // debt map, "Estimate (public link)". Kept in the reader's words so the
    // screen is not half English while it is still here.
    const roomPart = estimate.roomType ? ` · ${estimate.roomType}` : "";
    toast(
      fill("acceptedToast", {
        client: estimate.clientName,
        id: estimate.estimateId,
        pet: petLabel,
        details: `${serviceTypeLabel(locale, estimate.service)}${roomPart} · ${dateRange}`,
      }),
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
        <span className="text-muted-foreground">{t("service")}</span>
        <span className="font-medium">
          {serviceTypeLabel(locale, estimate.service)}
          {estimate.serviceType ? ` · ${estimate.serviceType}` : ""}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("dates")}</span>
        <span className="font-medium">{dateRange}</span>
      </div>
      <div className="flex justify-between border-t pt-1.5 font-semibold">
        <span>{t("total")}</span>
        <span className="tabular-nums">
          {formatMoney(estimate.total, locale)}
        </span>
      </div>
      {deposit > 0 && (
        <div className="flex justify-between text-xs text-blue-600">
          <span>{t("depositRequiredLower")}</span>
          <span className="tabular-nums">{formatMoney(deposit, locale)}</span>
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
              <DialogTitle>{t("aboutToAccept")}</DialogTitle>
              <DialogDescription>{t("reviewThenConfirm")}</DialogDescription>
            </DialogHeader>
            {summaryRows}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                {t("goBack")}
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                onClick={handleConfirm}
              >
                {t("confirmAcceptance")}
              </Button>
            </div>
          </>
        )}

        {step === "payment" && (
          <>
            <DialogHeader>
              <DialogTitle>{t("depositRequiredLower")}</DialogTitle>
              <DialogDescription>
                {fill("depositToSecure", {
                  amount: formatMoney(deposit, locale),
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("paymentMethod")}
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
                          {t("default")}
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
                  {t("noSavedPaymentMethod")}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("confirm")}
              >
                {t("goBack")}
              </Button>
              <Button
                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                onClick={() => finalizeAccept(true)}
              >
                {fill("payAndAccept", { amount: formatMoney(deposit, locale) })}
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
                {t("estimateAccepted")}
              </DialogTitle>
              <DialogDescription className="text-center">
                {fill("willConfirmShortly", { facility: facilityName })}
              </DialogDescription>
            </DialogHeader>
            {summaryRows}
            {converted && (
              <div className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                <CalendarCheck className="size-3.5" />
                {t("bookingCreatedFromEstimate")}
              </div>
            )}
            <Button asChild className="w-full">
              <Link href="/customer/estimates">{t("viewInMyAccount")}</Link>
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
