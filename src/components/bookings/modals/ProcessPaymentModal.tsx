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
import {
  CreditCard,
  Banknote,
  DollarSign,
  CheckCircle,
  Star,
} from "lucide-react";
import type { Booking } from "@/types/booking";
import { clients } from "@/data/clients";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TipSelector } from "@/components/bookings/TipSelector";
import { useSettings } from "@/hooks/use-settings";

interface ProcessPaymentModalProps {
  booking: Booking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    bookingId: number,
    paymentMethod: "cash" | "card",
    tipAmount?: number,
  ) => void;
}

export function ProcessPaymentModal({
  booking,
  open,
  onOpenChange,
  onConfirm,
}: ProcessPaymentModalProps) {
  const { tipConfig } = useSettings();
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("card");
  const [tipAmount, setTipAmount] = useState(0);

  const client = clients.find((c) => c.id === booking.clientId);
  const pet = client?.pets.find((p) => p.id === booking.petId);

  const grandTotal = booking.totalCost + tipAmount;

  const handleConfirm = () => {
    onConfirm(booking.id, paymentMethod, tipAmount > 0 ? tipAmount : undefined);
    onOpenChange(false);
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setTipAmount(0);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="min-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="size-5" />
            Process Payment - Booking #{booking.id}
          </DialogTitle>
          <DialogDescription>
            Client: {client?.name} | Pet: {pet?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Payment Summary */}
          <div className="bg-muted space-y-2 rounded-lg p-4">
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
            {tipAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Star className="size-3" /> Tip:
                </span>
                <span>+${tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-lg font-semibold">
              <span>Total Amount:</span>
              <span className="text-primary">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Tip selector */}
          {tipConfig.enabled && (
            <div className="rounded-lg border p-4">
              <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                Add a Tip
              </p>
              <TipSelector
                tipConfig={tipConfig}
                subtotal={booking.totalCost}
                tipAmount={tipAmount}
                onTipChange={setTipAmount}
              />
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="grid gap-3">
            <Label>Select Payment Method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value: string) =>
                setPaymentMethod(value as "cash" | "card")
              }
            >
              <div className="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded-lg border p-4">
                <RadioGroupItem value="card" id="card-payment" />
                <Label
                  htmlFor="card-payment"
                  className="flex flex-1 cursor-pointer items-center gap-3"
                >
                  <CreditCard className="text-primary size-5" />
                  <div>
                    <div className="font-medium">Credit/Debit Card</div>
                    <div className="text-muted-foreground text-xs">
                      Process card payment
                    </div>
                  </div>
                </Label>
              </div>

              <div className="hover:bg-accent flex cursor-pointer items-center space-x-2 rounded-lg border p-4">
                <RadioGroupItem value="cash" id="cash-payment" />
                <Label
                  htmlFor="cash-payment"
                  className="flex flex-1 cursor-pointer items-center gap-3"
                >
                  <Banknote className="text-primary size-5" />
                  <div>
                    <div className="font-medium">Cash</div>
                    <div className="text-muted-foreground text-xs">
                      Cash payment received
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Alert>
            <CheckCircle className="size-4" />
            <AlertDescription>
              Once confirmed, this booking will be marked as paid and the
              payment method will be recorded.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            <DollarSign className="mr-2 size-4" />
            Confirm Payment · ${grandTotal.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
