"use client";

import { useState } from "react";
import { CreditCard, Lock } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentMethodOnFile } from "@/types/facility-billing";

function detectBrand(num: string): string {
  const n = num.replace(/\D/g, "");
  if (n.startsWith("4")) return "Visa";
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6/.test(n)) return "Discover";
  return "Card";
}

function formatCardNumber(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(v: string): string {
  const n = v.replace(/\D/g, "").slice(0, 4);
  return n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
}

export interface UpdatePaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCard: PaymentMethodOnFile | null;
  onConfirm: (card: PaymentMethodOnFile) => void;
}

export function UpdatePaymentMethodDialog({
  open,
  onOpenChange,
  currentCard,
  onConfirm,
}: UpdatePaymentMethodDialogProps) {
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  const digits = number.replace(/\D/g, "");
  const [mm, yy] = expiry.split("/");
  const valid =
    digits.length >= 15 &&
    /^\d{2}$/.test(mm ?? "") &&
    Number(mm) >= 1 &&
    Number(mm) <= 12 &&
    /^\d{2}$/.test(yy ?? "") &&
    cvc.replace(/\D/g, "").length >= 3 &&
    name.trim().length > 1;

  function reset() {
    setNumber("");
    setExpiry("");
    setCvc("");
    setName("");
  }

  function submit() {
    if (!valid) return;
    onConfirm({
      brand: detectBrand(number),
      last4: digits.slice(-4),
      expMonth: Number(mm),
      expYear: 2000 + Number(yy),
    });
    reset();
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update payment method</DialogTitle>
          <DialogDescription>
            {currentCard
              ? `Replacing ${currentCard.brand} ending ${currentCard.last4}.`
              : "Add a card to your account."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ccnum">Card number</Label>
            <div className="relative">
              <CreditCard className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                id="ccnum"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 1234 1234 1234"
                className="pl-9"
                value={number}
                onChange={(e) => setNumber(formatCardNumber(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ccexp">Expiry</Label>
              <Input
                id="ccexp"
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cccvc">CVC</Label>
              <Input
                id="cccvc"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="123"
                value={cvc}
                onChange={(e) =>
                  setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ccname">Name on card</Label>
            <Input
              id="ccname"
              autoComplete="cc-name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Lock className="size-3" />
            Encrypted by Stripe. We never store full card numbers.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid} onClick={submit}>
            Save card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
