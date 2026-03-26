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
import { AlertTriangle, CreditCard, Wallet, DollarSign } from "lucide-react";
import type { Booking } from "@/lib/types";
import { clients } from "@/data/clients";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RefundBookingModalProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    bookingId: number,
    refundReason: string,
    refundMethod: "card" | "store_credit",
    refundAmount: number,
  ) => void;
}

export function RefundBookingModal({
  booking,
  open,
  onOpenChange,
  onConfirm,
}: RefundBookingModalProps) {
  const [refundReason, setRefundReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<"card" | "store_credit">(
    booking.paymentMethod === "card" ? "card" : "store_credit",
  );
  const [refundAmount, setRefundAmount] = useState(booking.totalCost);

  const client = clients.find((c) => c.id === booking.clientId);
  const pet = client?.pets.find((p) => p.id === booking.petId);

  const handleConfirm = () => {
    if (!refundReason.trim()) {
      alert("Please provide a refund reason");
      return;
    }
    if (refundAmount <= 0) {
      alert("Refund amount must be greater than 0");
      return;
    }
    if (refundAmount > booking.totalCost) {
      alert("Refund amount cannot exceed the original payment");
      return;
    }

    onConfirm(booking.id, refundReason, refundMethod, refundAmount);
    onOpenChange(false);
    // Reset form
    setRefundReason("");
    setRefundAmount(booking.totalCost);
  };

  const canRefund =
    booking.paymentStatus === "paid" && booking.status !== "cancelled";

  if (!canRefund) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Cannot Process Refund
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertDescription>
                {booking.status === "cancelled"
                  ? "This booking has already been cancelled."
                  : "This booking has not been paid yet and cannot be refunded."}
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="size-5" />
            Process Refund - Booking #{booking.id}
          </DialogTitle>
          <DialogDescription>
            Client: {client?.name} | Pet: {pet?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertTitle>Refund Processing</AlertTitle>
            <AlertDescription>
              This will process a refund for the booking. The booking status
              will be updated to &quot;refunded&quot;.
            </AlertDescription>
          </Alert>

          {/* Refund Reason */}
          <div className="grid gap-2">
            <Label htmlFor="refundReason">Refund Reason *</Label>
            <Textarea
              id="refundReason"
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Please provide a reason for the refund..."
              rows={3}
              required
            />
          </div>

          {/* Payment Summary */}
          <div className="bg-muted space-y-2 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Original Payment:</span>
              <span>${booking.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="capitalize">{booking.paymentMethod}</span>
            </div>
            {booking.refundAmount && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>Previous Refund:</span>
                <span>-${booking.refundAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Refund Amount */}
          <div className="grid gap-2">
            <Label htmlFor="refundAmount">Refund Amount ($)</Label>
            <Input
              id="refundAmount"
              type="number"
              min="0.01"
              max={booking.totalCost - (booking.refundAmount || 0)}
              step="0.01"
              value={refundAmount}
              onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)}
            />
            <p className="text-muted-foreground text-xs">
              Maximum refundable: $
              {(booking.totalCost - (booking.refundAmount || 0)).toFixed(2)}
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
                <RadioGroupItem value="card" id="card-refund" />
                <Label
                  htmlFor="card-refund"
                  className="flex flex-1 cursor-pointer items-center gap-2"
                >
                  <CreditCard className="size-4" />
                  <div>
                    <div className="font-medium">Original Payment Method</div>
                    <div className="text-muted-foreground text-xs">
                      Refund to{" "}
                      {booking.paymentMethod === "card" ? "card" : "cash"}
                    </div>
                  </div>
                </Label>
              </div>

              <div className="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded-lg border p-3">
                <RadioGroupItem value="store_credit" id="store-credit" />
                <Label
                  htmlFor="store-credit"
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

          {/* Refund Summary */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="mb-1 flex justify-between text-sm">
              <span>Refund Amount:</span>
              <span className="font-semibold text-green-700">
                ${refundAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Method:</span>
              <span className="capitalize">
                {refundMethod === "card"
                  ? "Original Payment Method"
                  : "Store Credit"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700"
          >
            <DollarSign className="mr-2 size-4" />
            Process Refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
