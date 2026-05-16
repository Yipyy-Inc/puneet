"use client";

import { useMemo, useState } from "react";
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
import { CreditCard, Plus, Check, ShieldCheck } from "lucide-react";
import { paymentMethods as seedPaymentMethods } from "@/data/payments";
import type { PaymentMethod } from "@/types/payments";
import type { DepositRule } from "@/types/deposit-rules";
import { cn } from "@/lib/utils";

export interface CustomerDepositPanelProps {
  rule: DepositRule;
  depositAmount: number;
  bookingTotal: number;
  clientId: number;
  selectedPaymentMethodId: string | null;
  onSelectPaymentMethod: (id: string | null) => void;
}

/**
 * Customer-side deposit + card-on-file picker shown on the Confirm step. The
 * user picks a card (or adds a new one) before they can submit; the parent
 * wizard's `canProceed` gates on whether a card is selected.
 *
 * "Add new card" is a stub here — it captures last-4 / brand client-side and
 * appends a transient PaymentMethod to the visible list. Real Stripe
 * Elements integration plugs in at submit time on the backend.
 */
export function CustomerDepositPanel({
  rule,
  depositAmount,
  bookingTotal,
  clientId,
  selectedPaymentMethodId,
  onSelectPaymentMethod,
}: CustomerDepositPanelProps) {
  // Session-only cards added via the "+ Add new card" stub. Real persistence
  // happens on the backend when the booking submits.
  const [sessionCards, setSessionCards] = useState<PaymentMethod[]>([]);
  const [addCardOpen, setAddCardOpen] = useState(false);

  const cardsOnFile = useMemo(
    () =>
      [...seedPaymentMethods, ...sessionCards].filter(
        (pm) => pm.clientId === clientId && pm.type === "card",
      ),
    [sessionCards, clientId],
  );

  const remaining = Math.max(0, bookingTotal - depositAmount);

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/60 p-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
          <ShieldCheck className="size-5 text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Deposit required
          </p>
          <p className="text-xs text-amber-800">
            {rule.label} — pay now to confirm your booking.
          </p>
        </div>
        <div className="text-right">
          <p className="text-amber-700 text-[10px] tracking-wide uppercase">
            Due now
          </p>
          <p className="text-lg font-bold text-amber-900 tabular-nums">
            ${depositAmount.toFixed(2)}
          </p>
          <p className="text-[10px] text-amber-700">
            ${remaining.toFixed(2)} after
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          Payment method
        </p>
        {cardsOnFile.length === 0 && (
          <p className="text-muted-foreground text-xs italic">
            No cards on file. Add one to confirm your booking.
          </p>
        )}
        <div className="space-y-1.5">
          {cardsOnFile.map((card) => {
            const active = selectedPaymentMethodId === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onSelectPaymentMethod(card.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-left transition",
                  active
                    ? "border-amber-400 ring-2 ring-amber-300"
                    : "hover:bg-muted",
                )}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="text-muted-foreground size-4" />
                  <span className="text-sm font-medium capitalize">
                    {card.cardBrand}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">
                    •••• {card.cardLast4}
                  </span>
                  {card.isDefault && (
                    <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-700">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-[10px]">
                    {String(card.cardExpMonth).padStart(2, "0")}/
                    {String(card.cardExpYear).slice(-2)}
                  </span>
                  {active && (
                    <Check className="size-4 text-emerald-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddCardOpen(true)}
          className="h-8 w-full gap-1 text-xs"
        >
          <Plus className="size-3.5" />
          Add new card
        </Button>
      </div>

      <AddCardDialog
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        clientId={clientId}
        onAdded={(card) => {
          setSessionCards((prev) => [...prev, card]);
          onSelectPaymentMethod(card.id);
        }}
      />
    </div>
  );
}

// ─── Stub Add Card form ──────────────────────────────────────────────────────
function AddCardDialog({
  open,
  onOpenChange,
  clientId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onAdded: (card: PaymentMethod) => void;
}) {
  const [number, setNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  // Lightweight brand sniff from the first 1–2 digits. Real card detection
  // happens on the backend / Stripe Elements; this is purely cosmetic.
  const detectedBrand = (() => {
    const d = number.replace(/\s/g, "");
    if (d.startsWith("4")) return "visa" as const;
    if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard" as const;
    if (/^3[47]/.test(d)) return "amex" as const;
    if (/^(6011|65)/.test(d)) return "discover" as const;
    return undefined;
  })();

  const canSubmit =
    number.replace(/\s/g, "").length >= 13 &&
    /^\d{2}\/\d{2}$/.test(exp) &&
    cvc.length >= 3 &&
    name.trim().length > 0;

  const handleSubmit = () => {
    const digits = number.replace(/\s/g, "");
    const [mm, yy] = exp.split("/").map((p) => parseInt(p, 10));
    onAdded({
      id: `pm-session-${Date.now()}`,
      clientId,
      type: "card",
      isDefault: false,
      cardBrand: detectedBrand,
      cardLast4: digits.slice(-4),
      cardExpMonth: mm,
      cardExpYear: 2000 + yy,
      cardholderName: name.trim(),
      createdAt: new Date().toISOString(),
    });
    setNumber("");
    setExp("");
    setCvc("");
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add a card</DialogTitle>
          <DialogDescription className="text-xs">
            We&rsquo;ll save it for this booking and future visits.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="card-number" className="text-xs">
              Card number
            </Label>
            <Input
              id="card-number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="mt-1 font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="card-exp" className="text-xs">
                Expiry
              </Label>
              <Input
                id="card-exp"
                placeholder="MM/YY"
                value={exp}
                onChange={(e) => setExp(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label htmlFor="card-cvc" className="text-xs">
                CVC
              </Label>
              <Input
                id="card-cvc"
                inputMode="numeric"
                placeholder="123"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="card-name" className="text-xs">
              Cardholder name
            </Label>
            <Input
              id="card-name"
              autoComplete="cc-name"
              placeholder="Alex Customer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            Save card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
