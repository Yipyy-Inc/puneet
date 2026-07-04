"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CreditCard, Loader2, Lock, ShieldCheck, Trash2 } from "lucide-react";

import { facilityBillingQueries } from "@/lib/api/facility-billing";
import {
  removeSubscriptionCard,
  saveTokenizedCard,
  useSubscriptionCard,
} from "@/lib/payment-method-store";
import { tokenizeCard, validateCardNumber } from "@/lib/fiserv-payment-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FACILITY_ID = 11;

function formatCardInput(v: string): string {
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

export function PaymentMethodView() {
  const card = useSubscriptionCard(FACILITY_ID);
  const subQ = useQuery(facilityBillingQueries.subscription(FACILITY_ID));
  const sub = subQ.data ?? null;
  const hasActiveSubscription =
    !!sub && sub.status !== "cancelled" && sub.status !== "expired";

  const [showForm, setShowForm] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  const digits = number.replace(/\D/g, "");
  const [mm, yy] = expiry.split("/");
  const valid =
    validateCardNumber(digits) &&
    /^\d{2}$/.test(mm ?? "") &&
    Number(mm) >= 1 &&
    Number(mm) <= 12 &&
    /^\d{2}$/.test(yy ?? "") &&
    cvc.replace(/\D/g, "").length >= 3 &&
    name.trim().length > 1;

  const resetForm = () => {
    setNumber("");
    setExpiry("");
    setCvc("");
    setName("");
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      // Clover Fiserv tokenizes the card; the raw PAN/CVC never leave the form.
      const tokenized = await tokenizeCard({
        facilityId: FACILITY_ID,
        number: digits,
        expMonth: Number(mm),
        expYear: 2000 + Number(yy),
        cardholderName: name.trim(),
      });
      saveTokenizedCard(FACILITY_ID, tokenized);
      toast.success("Card saved — tokenized by Clover Fiserv.");
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    removeSubscriptionCard(FACILITY_ID);
    toast.success("Payment method removed.");
    setRemoveOpen(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payment Method
        </h1>
        <p className="text-muted-foreground text-sm">
          The card Yipyy charges for your subscription. Processed by Clover
          Fiserv — Yipyy never stores your full card number.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" />
            Card on file
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {card ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <span className="bg-muted flex size-10 items-center justify-center rounded-md">
                  <CreditCard className="size-5" />
                </span>
                <div>
                  <p className="font-medium">
                    {card.brand} •••• {card.last4}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Expires {String(card.expMonth).padStart(2, "0")}/
                    {String(card.expYear).slice(-2)} · {card.cardholderName}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowForm((s) => !s)}
                >
                  Update Card
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700"
                  onClick={() => setRemoveOpen(true)}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <CreditCard className="text-muted-foreground mx-auto mb-2 size-8" />
              <p className="text-sm font-medium">
                No payment method on file. Add a card to enable subscription
                billing.
              </p>
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                Add Card
              </Button>
            </div>
          )}

          {/* Inline Clover Fiserv secure form (not a third-party redirect). */}
          {showForm && (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <ShieldCheck className="size-4 text-emerald-600" />
                Clover Fiserv secure form
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cc-number">Card number</Label>
                <div className="relative">
                  <CreditCard className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                  <Input
                    id="cc-number"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    placeholder="1234 1234 1234 1234"
                    className="pl-9"
                    value={number}
                    onChange={(e) => setNumber(formatCardInput(e.target.value))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cc-exp">Expiry</Label>
                  <Input
                    id="cc-exp"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cc-cvc">CVC</Label>
                  <Input
                    id="cc-cvc"
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
                <Label htmlFor="cc-name">Name on card</Label>
                <Input
                  id="cc-name"
                  autoComplete="cc-name"
                  placeholder="Jane Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Lock className="size-3" />
                Tokenized by Clover Fiserv. Yipyy stores only the token, last 4
                and expiry.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeForm} disabled={saving}>
                  Cancel
                </Button>
                <Button disabled={!valid || saving} onClick={handleSave}>
                  {saving ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  ) : null}
                  Save card
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasActiveSubscription
                ? "Removing your payment method may cause your subscription to lapse if a payment is due. Are you sure?"
                : "This removes the card Yipyy has on file for your subscription."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={handleRemove}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
