"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, Banknote, CreditCard, Wallet } from "lucide-react";
import type { Booking } from "@/types/booking";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useDepositRules } from "@/lib/api/facility-settings";
import { useStaffText } from "@/lib/staff/use-staff-text";
import { formatDateShort, formatMoney, formatTime } from "@/lib/i18n/format";

/**
 * How money goes back. `original` is the card it was paid with, through the
 * processor — the same path as Issue Refund. It used to write a negative
 * ledger row and toast "$X refunded" without asking the card network for a
 * cent. Store credit and cash are ledger entries for something done in the
 * room.
 */
export type CancelRefundMethod = "original" | "store_credit" | "cash";

interface CancelBookingModalProps {
  booking: Booking;
  /** From the booking page's own reads — this read the fixture client list. */
  clientName?: string;
  petName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * AWAITED. A throw keeps the dialog open with the reason on screen; it
   * closes only once the cancellation (and any refund) is recorded.
   */
  onConfirm: (
    bookingId: number,
    cancellationReason: string,
    refundMethod: CancelRefundMethod,
    refundAmount: number,
  ) => Promise<void>;
}

export function CancelBookingModal({
  booking,
  clientName,
  petName,
  open,
  onOpenChange,
  onConfirm,
}: CancelBookingModalProps) {
  // Deposit refund policy (Settings → Deposit Rules) governs the deposit's
  // disposition on cancellation; default the method to Store Credit when the
  // policy issues the deposit as credit.
  // The facility's policy, not this browser's. It used to be seeded from
  // localStorage, so a deposit issued as store credit on one machine came back
  // to the card on another.
  const { refundPolicy } = useDepositRules();
  const { t, fill, locale } = useStaffText("cancelBooking");
  const money = (n: number) => formatMoney(n, locale);
  const [cancellationReason, setCancellationReason] = useState("");
  // Held as null until somebody chooses, and DERIVED below rather than seeded:
  // the policy arrives over the network, so a useState default would capture
  // whatever was assumed before it landed and never correct itself. That is the
  // shape check:settings-seeding exists for.
  const [chosenRefundMethod, setChosenRefundMethod] =
    useState<CancelRefundMethod | null>(null);
  const refundMethod: CancelRefundMethod =
    chosenRefundMethod ??
    (refundPolicy.type === "credit" ? "store_credit" : "original");
  const setRefundMethod = setChosenRefundMethod;
  // What was PAID, from the ledger — not the price. Defaulting to the price
  // offered to refund money that was never taken.
  const paid = booking.amountPaid ?? 0;
  const [refundAmount, setRefundAmount] = useState(paid);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // In the viewer's locale — it was "en-US" whatever they had chosen.
  const start = new Date(
    `${booking.startDate}T${booking.checkInTime || "00:00"}`,
  );
  const bookingStartLabel = booking.checkInTime
    ? `${formatDateShort(start, locale)} ${formatTime(start, locale)}`
    : formatDateShort(start, locale);

  const depositPolicyText =
    refundPolicy.type === "non_refundable"
      ? t("policyNonRefundable")
      : refundPolicy.type === "credit"
        ? t("policyCredit")
        : fill("policyWindow", {
            hours: String(refundPolicy.refundBeforeHours),
            start: bookingStartLabel,
          });

  const handleConfirm = async () => {
    if (!cancellationReason.trim()) {
      setProblem(t("needReason"));
      return;
    }
    if (refundAmount > paid + 0.005) {
      setProblem(fill("overPaid", { amount: money(paid) }));
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      await onConfirm(
        booking.id,
        cancellationReason,
        refundMethod,
        canRefund ? refundAmount : 0,
      );
    } catch (error) {
      setProblem(error instanceof Error ? error.message : t("notCancelled"));
      return;
    } finally {
      setBusy(false);
    }
    onOpenChange(false);
    setCancellationReason("");
    setRefundAmount(paid);
  };

  // Anything paid can be given back — a part-paid booking too, which used to
  // be offered no refund at all.
  const canRefund = paid > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-5" />
            {fill("title", { ref: String(booking.id) })}
          </DialogTitle>
          <DialogDescription>
            {[clientName, petName].filter(Boolean).join(" · ")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>{t("warningTitle")}</AlertTitle>
            <AlertDescription>{t("warningBody")}</AlertDescription>
          </Alert>

          {/* Deposit refund policy from Deposit Rules settings */}
          <Alert>
            <Wallet className="size-4" />
            <AlertTitle>{t("policyTitle")}</AlertTitle>
            <AlertDescription>{depositPolicyText}</AlertDescription>
          </Alert>

          {/* Cancellation Reason */}
          <div className="grid gap-2">
            <Label htmlFor="reason">{t("reasonLabel")} *</Label>
            <Textarea
              id="reason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder={t("reasonPlaceholder")}
              rows={3}
              required
            />
          </div>

          {/* Refund Section */}
          {canRefund && (
            <>
              <div className="border-t pt-4">
                <h4 className="mb-3 font-semibold">{t("refundTitle")}</h4>

                {/* Refund Amount */}
                <div className="mb-4 grid gap-2">
                  <Label htmlFor="refundAmount">{t("refundAmount")}</Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    min="0"
                    max={paid}
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) =>
                      setRefundAmount(parseFloat(e.target.value) || 0)
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    {fill("paidSoFarLine", { amount: money(paid) })}
                  </p>
                </div>

                {/* Refund Method */}
                <div className="grid gap-3">
                  <Label>{t("refundTo")}</Label>
                  <RadioGroup
                    value={refundMethod}
                    onValueChange={(value: string) =>
                      setRefundMethod(value as CancelRefundMethod)
                    }
                  >
                    <div className="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded-lg border p-3">
                      <RadioGroupItem value="original" id="refund-original" />
                      <Label
                        htmlFor="refund-original"
                        className="flex flex-1 cursor-pointer items-center gap-2"
                      >
                        <CreditCard className="size-4" />
                        <div>
                          <div className="font-medium">{t("toCard")}</div>
                          <div className="text-muted-foreground text-xs">
                            {t("toCardHelp")}
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded-lg border p-3">
                      <RadioGroupItem value="cash" id="refund-cash" />
                      <Label
                        htmlFor="refund-cash"
                        className="flex flex-1 cursor-pointer items-center gap-2"
                      >
                        <Banknote className="size-4" />
                        <div>
                          <div className="font-medium">{t("cash")}</div>
                          <div className="text-muted-foreground text-xs">
                            {t("cashHelp")}
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded-lg border p-3">
                      <RadioGroupItem value="store_credit" id="store_credit" />
                      <Label
                        htmlFor="store_credit"
                        className="flex flex-1 cursor-pointer items-center gap-2"
                      >
                        <Wallet className="size-4" />
                        <div>
                          <div className="font-medium">{t("credit")}</div>
                          <div className="text-muted-foreground text-xs">
                            {t("creditHelp")}
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Refund Summary */}
              <div className="bg-muted rounded-lg p-3">
                <div className="mb-1 flex justify-between text-sm">
                  <span>{t("paidSoFar")}</span>
                  <span className="tabular-nums">{money(paid)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>{t("refundTitle")}</span>
                  <span className="tabular-nums">{money(refundAmount)}</span>
                </div>
              </div>
            </>
          )}

          {!canRefund && (
            <Alert>
              <AlertDescription>{t("nothingPaid")}</AlertDescription>
            </Alert>
          )}
        </div>

        {problem && (
          <p role="alert" className="text-destructive text-sm">
            {problem}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("keep")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            loading={busy}
          >
            {canRefund && refundAmount > 0
              ? fill("cancelAndRefund", { amount: money(refundAmount) })
              : t("cancelOnly")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
