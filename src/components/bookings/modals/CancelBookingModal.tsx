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
import { AlertTriangle, CreditCard, Wallet } from "lucide-react";
import type { Booking } from "@/data/bookings";
import { clients } from "@/data/clients";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [cancellationReason, setCancellationReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"card" | "store_credit">(
    "card",
  );
  const [refundAmount, setRefundAmount] = useState(booking.totalCost);

  const client = clients.find((c) => c.id === booking.clientId);
  const pet = client?.pets.find((p) => p.id === booking.petId);

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
      <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancel Booking #{booking.id}
          </DialogTitle>
          <DialogDescription>
            Client: {client?.name} | Pet: {pet?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              This action will cancel the booking. This cannot be undone.
            </AlertDescription>
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
                <h4 className="font-semibold mb-3">Refund Details</h4>

                {/* Refund Amount */}
                <div className="grid gap-2 mb-4">
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
                  <p className="text-xs text-muted-foreground">
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
                    <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="card" id="card" />
                      <Label
                        htmlFor="card"
                        className="flex-1 cursor-pointer flex items-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        <div>
                          <div className="font-medium">
                            Original Payment Method
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Refund to{" "}
                            {booking.paymentMethod === "card" ? "card" : "cash"}
                          </div>
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="store_credit" id="store_credit" />
                      <Label
                        htmlFor="store_credit"
                        className="flex-1 cursor-pointer flex items-center gap-2"
                      >
                        <Wallet className="h-4 w-4" />
                        <div>
                          <div className="font-medium">Store Credit</div>
                          <div className="text-xs text-muted-foreground">
                            Issue store credit for future bookings
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Refund Summary */}
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between text-sm mb-1">
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
