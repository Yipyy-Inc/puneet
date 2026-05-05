"use client";

import { useState } from "react";
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
import { CreditCard, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PaymentMethod } from "@/types/payments";

interface PayNowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  amountDue: number;
  savedCards: PaymentMethod[];
}

type PayMode = "saved" | "new";

export function PayNowModal({
  open,
  onOpenChange,
  invoiceNumber,
  amountDue,
  savedCards,
}: PayNowModalProps) {
  const defaultCardId =
    savedCards.find((c) => c.isDefault)?.id ?? savedCards[0]?.id ?? "";
  const [selectedCardId, setSelectedCardId] = useState(defaultCardId);
  const [mode, setMode] = useState<PayMode>(
    savedCards.length > 0 ? "saved" : "new",
  );
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvc, setNewCardCvc] = useState("");
  const [newCardName, setNewCardName] = useState("");
  const [saveCard, setSaveCard] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handlePay = () => {
    setSubmitting(true);
    setTimeout(() => {
      const card =
        mode === "saved"
          ? savedCards.find((c) => c.id === selectedCardId)
          : null;
      const last4 =
        mode === "saved"
          ? card?.cardLast4
          : newCardNumber.slice(-4) || "0000";
      const brand =
        mode === "saved"
          ? card?.cardBrand?.toUpperCase()
          : "CARD";
      toast.success(
        `Payment of $${amountDue.toFixed(2)} processed for ${invoiceNumber}`,
        {
          description: `Charged to ${brand} •••• ${last4} · A receipt has been emailed`,
        },
      );
      setSubmitting(false);
      onOpenChange(false);
    }, 600);
  };

  const newCardValid =
    newCardNumber.replace(/\s/g, "").length >= 13 &&
    /^\d{2}\/\d{2}$/.test(newCardExpiry) &&
    newCardCvc.length >= 3 &&
    newCardName.trim().length > 0;

  const canPay =
    (mode === "saved" && selectedCardId.length > 0) ||
    (mode === "new" && newCardValid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="size-4 text-emerald-600" />
            Secure payment
          </DialogTitle>
          <DialogDescription>
            Paying invoice <span className="font-medium">{invoiceNumber}</span>{" "}
            — your card is processed over an encrypted connection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount due</span>
            <span className="text-lg font-semibold font-[tabular-nums]">
              ${amountDue.toFixed(2)}
            </span>
          </div>

          {savedCards.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("saved")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                  mode === "saved"
                    ? "border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <CreditCard className="size-3.5" />
                Saved card
              </button>
              <button
                type="button"
                onClick={() => setMode("new")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs font-medium transition-colors",
                  mode === "new"
                    ? "border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                <Plus className="size-3.5" />
                New card
              </button>
            </div>
          )}

          {mode === "saved" && savedCards.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Choose a card on file</Label>
              {savedCards.map((card) => (
                <label
                  key={card.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
                    selectedCardId === card.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/40",
                  )}
                >
                  <input
                    type="radio"
                    checked={selectedCardId === card.id}
                    onChange={() => setSelectedCardId(card.id)}
                    className="accent-primary"
                  />
                  <CreditCard className="text-muted-foreground size-4" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {card.cardBrand?.toUpperCase()} •••• {card.cardLast4}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Expires {card.cardExpMonth}/{card.cardExpYear}
                      {card.isDefault && " · Default"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {mode === "new" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Cardholder name</Label>
                <Input
                  className="mt-1"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  placeholder="Name on card"
                />
              </div>
              <div>
                <Label className="text-xs">Card number</Label>
                <Input
                  className="mt-1 font-mono"
                  value={newCardNumber}
                  onChange={(e) =>
                    setNewCardNumber(
                      e.target.value
                        .replace(/[^\d]/g, "")
                        .replace(/(\d{4})(?=\d)/g, "$1 ")
                        .slice(0, 19),
                    )
                  }
                  placeholder="1234 5678 9012 3456"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Expiry</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={newCardExpiry}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                      const formatted =
                        cleaned.length > 2
                          ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
                          : cleaned;
                      setNewCardExpiry(formatted);
                    }}
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label className="text-xs">CVC</Label>
                  <Input
                    className="mt-1 font-mono"
                    value={newCardCvc}
                    onChange={(e) =>
                      setNewCardCvc(
                        e.target.value.replace(/[^\d]/g, "").slice(0, 4),
                      )
                    }
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="accent-primary"
                />
                Save this card for future invoices
              </label>
            </div>
          )}

          <p className="text-muted-foreground flex items-center gap-1.5 text-[10.5px]">
            <Lock className="size-3" />
            Payment processed securely. Card details never touch this server.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePay}
            disabled={!canPay || submitting}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? "Processing…" : `Pay $${amountDue.toFixed(2)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
