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
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEstimateMutations } from "@/lib/api/estimates";
import type { Estimate } from "@/types/booking";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import { serviceTypeLabel } from "@/lib/i18n/labels";
import { formatDateShort, formatMoney } from "@/lib/i18n/format";

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
  // ── WHAT ACCEPTING DOES NOW ──────────────────────────────────────────────
  //
  // It is recorded, through `respond_to_estimate`, under the customer's own
  // name — and nothing else happens. The dialog used to "take" the deposit
  // here from a saved-card list read out of `@/data/clients` and charge
  // nothing, and to "auto-convert" into a booking that was only a number.
  // A deposit is taken when the business makes the booking.
  const { t, fill, locale } = useCustomerText("estimates");
  const { respond } = useEstimateMutations();
  const [step, setStep] = useState<"confirm" | "success">("confirm");

  const deposit = estimate.depositRequired ?? 0;

  const dateRange = `${formatDateShort(estimate.startDate, locale)}${
    estimate.endDate && estimate.endDate !== estimate.startDate
      ? ` – ${formatDateShort(estimate.endDate, locale)}`
      : ""
  }`;

  const reset = () => setStep("confirm");

  const handleOpenChange = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleConfirm = async () => {
    try {
      await respond.mutateAsync({ id: estimate.id, action: "accept" });
      onAccepted?.({ estimateId: estimate.id, converted: false });
      setStep("success");
    } catch (error) {
      toast.error(t("acceptFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
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
                className="flex-1"
                onClick={handleConfirm}
                disabled={respond.isPending}
              >
                {respond.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {t("confirmAcceptance")}
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
            {deposit > 0 && (
              <p className="text-ink-secondary text-center text-sm">
                {fill("depositDueAtBooking", {
                  amount: formatMoney(deposit, locale),
                })}
              </p>
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
