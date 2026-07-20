"use client";

import { useMemo, useState } from "react";
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
import { AlertTriangle, CreditCard, Wallet } from "lucide-react";
import type { Booking } from "@/types/booking";
import { clients } from "@/data/clients";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loadDepositRefundPolicy } from "@/data/deposit-rules";

interface CancelBookingModalProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    bookingId: number,
    cancellationReason: string,
    refundMethod: "card" | "store_credit",
    refundAmount: number,
  ) => void;
}

export function CancelBookingModal({
  booking,
  open,
  onOpenChange,
  onConfirm,
}: CancelBookingModalProps) {
  // Deposit refund policy (Settings → Deposit Rules) governs the deposit's
  // disposition on cancellation; default the method to Store Credit when the
  // policy issues the deposit as credit.
  const [refundPolicy] = useState(loadDepositRefundPolicy);
  const [cancellationReason, setCancellationReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"card" | "store_credit">(
    refundPolicy.type === "credit" ? "store_credit" : "card",
  );
  const [refundAmount, setRefundAmount] = useState(booking.totalCost);

  const client = clients.find((c) => c.id === booking.clientId);
  const pet = client?.pets.find((p) => p.id === booking.petId);

  const bookingStartLabel = useMemo(() => {
    const d = new Date(booking.startDate);
    if (booking.checkInTime) {
      const [h, m] = booking.checkInTime.split(":").map(Number);
      d.setHours(h, m, 0, 0);
    }
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [booking.startDate, booking.checkInTime]);

  const depositPolicyText =
    refundPolicy.type === "non_refundable"
      ? "The collected deposit is non-refundable — exclude it from the refund amount below."
      : refundPolicy.type === "credit"
        ? "The collected deposit is issued as store credit toward a future booking (refund method preset to Store Credit)."
        : `Full deposit refund if cancelled at least ${refundPolicy.refundBeforeHours}h before the booking (starts ${bookingStartLabel}). Otherwise the deposit is forfeited.`;

  const handleConfirm = () => {
    if (!cancellationReason.trim()) {
      alert("Please provide a cancellation reason");
      return;
    }
    onConfirm(booking.id, cancellationReason, refundMethod, refundAmount);
    onOpenChange(false);
    setCancellationReason("");
    setRefundAmount(booking.totalCost);
  };

  const canRefund = booking.paymentStatus === "paid";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="size-5" />
            Cancel Booking #{booking.id}
          </DialogTitle>
          <DialogDescription>
            Client: {client?.name} | Pet: {pet?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action will cancel the booking. This cannot be undone.
            </AlertDescription>
          </Alert>

          {/* Deposit refund policy from Deposit Rules settings */}
          <Alert>
            <Wallet className="size-4" />
            <AlertTitle>Deposit refund policy</AlertTitle>
            <AlertDescription>{depositPolicyText}</AlertDescription>
          </Alert>

          {/* Cancellation Reason */}
          <div className="grid gap-2">
            <Label htmlFor="reason">Cancellation Reason *</Label>
            <Textarea
              id="reason"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              placeholder="Please provide a reason for cancellation..."
              rows={3}
              required
            />
          </div>

          {/* Refund Section */}
          {canRefund && (
            <>
              <div className="border-t pt-4">
                <h4 className="mb-3 font-semibold">Refund Details</h4>

                {/* Refund Amount */}
                <div className="mb-4 grid gap-2">
                  <Label htmlFor="refundAmount">Refund Amount ($)</Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    min="0"
                    max={booking.totalCost}
                    step="0.01"
                    value={refundAmount}
                    onChange={(e) =>
                      setRefundAmount(parseFloat(e.target.value) || 0)
                    }
                  />
                  <p className="text-muted-foreground text-xs">
                    Original amount: ${booking.totalCost.toFixed(2)}
                  </p>
                </div>

                {/* Refund Method */}
                <div className="grid gap-3">
                  <Label>Refund Method</Label>
                  <RadioGroup
                    value={refundMethod}
                    onValueChange={(value: string) =>
                      setRefundMethod(value as "card" | "store_credit")
                    }
                  >
                    <div className="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded-lg border p-3">
                      <RadioGroupItem value="card" id="card" />
                      <Label
                        htmlFor="card"
                        className="flex flex-1 cursor-pointer items-center gap-2"
                      >
                        <CreditCard className="size-4" />
                        <div>
                          <div className="font-medium">
                            Original Payment Method
                          </div>
                          <div className="text-muted-foreground text-xs">
                            Refund to{" "}
                            {booking.paymentMethod === "card" ? "card" : "cash"}
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
                          <div className="font-medium">Store Credit</div>
                          <div className="text-muted-foreground text-xs">
                            Issue store credit for future bookings
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
                  <span>Booking Total:</span>
                  <span>${booking.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Refund Amount:</span>
                  <span>${refundAmount.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}

          {!canRefund && (
            <Alert>
              <AlertDescription>
                No refund will be processed as payment is still pending.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Go Back
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
