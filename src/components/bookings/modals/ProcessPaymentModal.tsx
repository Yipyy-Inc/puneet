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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Banknote, DollarSign, CheckCircle } from "lucide-react";
import type { Booking } from "@/data/bookings";
import { clients } from "@/data/clients";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProcessPaymentModalProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (bookingId: number, paymentMethod: "cash" | "card") => void;
}

export function ProcessPaymentModal({
  booking,
  open,
  onOpenChange,
  onConfirm,
}: ProcessPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("card");

  const client = clients.find((c) => c.id === booking.clientId);
  const pet = client?.pets.find((p) => p.id === booking.petId);

  const handleConfirm = () => {
    onConfirm(booking.id, paymentMethod);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Process Payment - Booking #{booking.id}
          </DialogTitle>
          <DialogDescription>
            Client: {client?.name} | Pet: {pet?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Payment Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base Price:</span>
              <span>${booking.basePrice.toFixed(2)}</span>
            </div>
            {booking.discount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount:</span>
                <span>-${booking.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold text-lg">
              <span>Total Amount:</span>
              <span>${booking.totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="grid gap-3">
            <Label>Select Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value: string) =>
                setPaymentMethod(value as "cash" | "card")
              }
            >
              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="card" id="card-payment" />
                <Label
                  htmlFor="card-payment"
                  className="flex-1 cursor-pointer flex items-center gap-3"
                >
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Credit/Debit Card</div>
                    <div className="text-xs text-muted-foreground">
                      Process card payment
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="cash" id="cash-payment" />
                <Label
                  htmlFor="cash-payment"
                  className="flex-1 cursor-pointer flex items-center gap-3"
                >
                  <Banknote className="h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Cash</div>
                    <div className="text-xs text-muted-foreground">
                      Cash payment received
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Once confirmed, this booking will be marked as paid and the
              payment method will be recorded.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <DollarSign className="mr-2 h-4 w-4" />
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
