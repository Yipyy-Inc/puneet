"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Wallet,
  Gift,
  DollarSign,
  Smartphone,
  Monitor,
  Wifi,
  ChevronLeft,
  CheckCircle,
} from "lucide-react";
import { clients } from "@/data/clients";
import { paymentMethods, giftCards, customerCredits } from "@/data/payments";

type PaymentMethodKey =
  | "clover_terminal"
  | "pay_on_phone"
  | "online_card"
  | "cash"
  | "gift_card";

interface PaymentMethodOption {
  key: PaymentMethodKey;
  label: string;
  sub: string;
  icon: React.ElementType;
  badge?: string;
}

const METHOD_OPTIONS: PaymentMethodOption[] = [
  {
    key: "clover_terminal",
    label: "Clover Terminal",
    sub: "Swipe, tap, or insert at the counter",
    icon: Monitor,
    badge: "In-person",
  },
  {
    key: "pay_on_phone",
    label: "Pay on Phone",
    sub: "Send a payment link to the client's phone",
    icon: Smartphone,
    badge: "Remote",
  },
  {
    key: "online_card",
    label: "Online Card",
    sub: "Enter card details manually",
    icon: CreditCard,
  },
  {
    key: "cash",
    label: "Cash",
    sub: "Record a cash payment",
    icon: Wallet,
  },
  {
    key: "gift_card",
    label: "Gift Card",
    sub: "Redeem a gift card balance",
    icon: Gift,
  },
];

interface PaymentResult {
  id: string;
  facilityId: number;
  clientId: number;
  bookingId?: number;
  invoiceId?: string;
  amount: number;
  tipAmount?: number;
  totalAmount: number;
  currency: "USD";
  paymentMethod: "card" | "cash" | "gift_card";
  status: "completed";
  description: string;
  notes?: string;
  createdAt: string;
  processedBy: string;
  processedById: number;
  cardBrand?: string;
  cardLast4?: string;
  stripeChargeId?: string;
  stripePaymentIntentId?: string;
  giftCardId?: string;
  creditUsed?: number;
  receiptUrl: string;
}

interface TakePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  prefilledClient?: number;
  prefilledAmount?: number;
  prefilledDescription?: string;
  bookingId?: number;
  invoiceId?: string;
  onSuccess?: (payment: PaymentResult) => void;
}

export function TakePaymentModal({
  open,
  onOpenChange,
  facilityId,
  prefilledClient,
  prefilledAmount,
  prefilledDescription,
  bookingId,
  invoiceId,
  onSuccess,
}: TakePaymentModalProps) {
  const [step, setStep] = useState<"method" | "details">("method");
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethodKey | null>(null);

  // Details form
  const [selectedClient, setSelectedClient] = useState(prefilledClient || 0);
  const [amount, setAmount] = useState(prefilledAmount || 0);
  const [tipAmount, setTipAmount] = useState(0);
  const [description, setDescription] = useState(prefilledDescription || "");
  const [notes, setNotes] = useState("");

  // Online card
  const [useNewCard, setUseNewCard] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [saveCard, setSaveCard] = useState(false);

  // Gift card
  const [giftCardCode, setGiftCardCode] = useState("");
  const [selectedGiftCard, setSelectedGiftCard] = useState<
    (typeof giftCards)[0] | null
  >(null);

  // Credits
  const [applyCredit, setApplyCredit] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);

  const facilityClients = clients
    .filter((c) => c.id >= 15)
    .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i);
  const clientPaymentMethods = paymentMethods.filter(
    (pm) => pm.clientId === selectedClient,
  );
  const clientCredits = customerCredits.filter(
    (c) =>
      c.clientId === selectedClient &&
      c.facilityId === facilityId &&
      c.status === "active",
  );
  const totalAvailableCredit = clientCredits.reduce(
    (sum, c) => sum + c.remainingAmount,
    0,
  );

  const subtotal = amount;
  const creditApplied = applyCredit
    ? Math.min(creditAmount, totalAvailableCredit, subtotal + tipAmount)
    : 0;
  const total = subtotal + tipAmount - creditApplied;

  const handleSelectMethod = (key: PaymentMethodKey) => {
    setSelectedMethod(key);
    setStep("details");
  };

  const handleBack = () => {
    setStep("method");
  };

  const handleGiftCardLookup = () => {
    const gc = giftCards.find(
      (g) =>
        g.code === giftCardCode &&
        g.facilityId === facilityId &&
        g.status === "active",
    );
    if (gc) {
      setSelectedGiftCard(gc);
      if (gc.currentBalance < total) {
        alert(`Gift card balance ($${gc.currentBalance.toFixed(2)}) is less than total`);
      }
    } else {
      alert("Gift card not found or inactive");
      setSelectedGiftCard(null);
    }
  };

  const handleSubmit = () => {
    if (!selectedClient) return alert("Please select a client");
    if (amount <= 0) return alert("Please enter a valid amount");
    if (!description.trim()) return alert("Please enter a description");

    if (selectedMethod === "online_card" && useNewCard) {
      if (!cardNumber || !cardExpiry || !cardCvc || !cardholderName)
        return alert("Please fill in all card details");
    }
    if (selectedMethod === "online_card" && !useNewCard) {
      if (!selectedPaymentMethod) return alert("Please select a saved card");
    }
    if (selectedMethod === "gift_card") {
      if (!selectedGiftCard) return alert("Please look up a valid gift card");
      if (selectedGiftCard.currentBalance < total)
        return alert("Insufficient gift card balance");
    }

    const apiMethod: "card" | "cash" | "gift_card" =
      selectedMethod === "gift_card"
        ? "gift_card"
        : selectedMethod === "cash"
          ? "cash"
          : "card";

    const paymentId = crypto.randomUUID();
    const payment: PaymentResult = {
      id: `pay-${paymentId}`,
      facilityId,
      clientId: selectedClient,
      bookingId,
      invoiceId,
      amount: subtotal,
      tipAmount: tipAmount > 0 ? tipAmount : undefined,
      totalAmount: total,
      currency: "USD",
      paymentMethod: apiMethod,
      status: "completed",
      description,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
      processedBy: "Current User",
      processedById: 1,
      ...(apiMethod === "card" &&
        useNewCard && {
          cardBrand: detectCardBrand(cardNumber),
          cardLast4: cardNumber.slice(-4),
          stripeChargeId: `ch_${paymentId.substring(0, 7)}`,
          stripePaymentIntentId: `pi_${paymentId.substring(0, 7)}`,
        }),
      ...(apiMethod === "card" &&
        !useNewCard && {
          cardBrand: clientPaymentMethods.find(
            (pm) => pm.id === selectedPaymentMethod,
          )?.cardBrand,
          cardLast4: clientPaymentMethods.find(
            (pm) => pm.id === selectedPaymentMethod,
          )?.cardLast4,
          stripeChargeId: `ch_${paymentId.substring(0, 7)}`,
        }),
      ...(apiMethod === "gift_card" && { giftCardId: selectedGiftCard?.id }),
      ...(creditApplied > 0 && { creditUsed: creditApplied }),
      receiptUrl: `/receipts/pay-${paymentId}.pdf`,
    };

    onSuccess?.(payment);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setStep("method");
    setSelectedMethod(null);
    if (!prefilledClient) setSelectedClient(0);
    if (!prefilledAmount) setAmount(0);
    if (!prefilledDescription) setDescription("");
    setTipAmount(0);
    setNotes("");
    setUseNewCard(true);
    setSelectedPaymentMethod("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setCardholderName("");
    setSaveCard(false);
    setGiftCardCode("");
    setSelectedGiftCard(null);
    setApplyCredit(false);
    setCreditAmount(0);
  };

  const detectCardBrand = (number: string) => {
    if (number.startsWith("4")) return "visa";
    if (number.startsWith("5")) return "mastercard";
    if (number.startsWith("3")) return "amex";
    return "visa";
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    return (cleaned.match(/.{1,4}/g) || []).join(" ");
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    return cleaned.length >= 2
      ? cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4)
      : cleaned;
  };

  const activeMethodOption = METHOD_OPTIONS.find((m) => m.key === selectedMethod);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {step === "details" && (
              <button
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground mr-1 rounded p-0.5 transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
            <DollarSign className="size-4" />
            {step === "method" ? "Take Payment" : `Pay via ${activeMethodOption?.label}`}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: method picker ── */}
        {step === "method" && (
          <div className="space-y-2 py-2">
            <p className="text-muted-foreground text-xs">
              Choose how the customer will pay
            </p>
            <div className="grid gap-2">
              {METHOD_OPTIONS.map(({ key, label, sub, icon: Icon, badge }) => (
                <button
                  key={key}
                  onClick={() => handleSelectMethod(key)}
                  className="hover:bg-accent flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors"
                >
                  <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{label}</span>
                      {badge && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">{sub}</p>
                  </div>
                  <ChevronLeft className="text-muted-foreground size-4 rotate-180" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: details ── */}
        {step === "details" && (
          <div className="space-y-5 py-2">
            {/* Client & amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Client <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedClient.toString()}
                  onValueChange={(v) => setSelectedClient(parseInt(v))}
                  disabled={!!prefilledClient}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilityClients.map((c) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount || ""}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="h-8 pl-7 text-sm"
                    placeholder="0.00"
                    disabled={!!prefilledAmount}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Walk-in grooming, custom service…"
                className="h-8 text-sm"
                disabled={!!prefilledDescription}
              />
            </div>

            <Separator />

            {/* Method-specific fields */}
            {selectedMethod === "clover_terminal" && (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <div className="bg-muted flex size-14 items-center justify-center rounded-full">
                  <Wifi className="text-muted-foreground size-6" />
                </div>
                <div>
                  <p className="text-sm font-medium">Waiting for terminal…</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Present or tap the card on the Clover device. The payment
                    will confirm automatically.
                  </p>
                </div>
              </div>
            )}

            {selectedMethod === "pay_on_phone" && (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-3 py-2 text-center">
                  <div className="bg-muted flex size-14 items-center justify-center rounded-full">
                    <Smartphone className="text-muted-foreground size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Send payment link</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      The client will receive an SMS or email with a secure
                      checkout link.
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Send to</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Phone number or email"
                      className="h-8 text-sm"
                      defaultValue={
                        selectedClient
                          ? clients.find((c) => c.id === selectedClient)?.email
                          : ""
                      }
                    />
                    <Button size="sm" className="h-8 shrink-0">
                      Send Link
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedMethod === "online_card" && (
              <div className="space-y-3">
                {clientPaymentMethods.length > 0 && (
                  <div className="flex gap-4 text-sm">
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        name="card-option"
                        checked={!useNewCard}
                        onChange={() => setUseNewCard(false)}
                        className="accent-primary"
                      />
                      Saved card
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        name="card-option"
                        checked={useNewCard}
                        onChange={() => setUseNewCard(true)}
                        className="accent-primary"
                      />
                      New card
                    </label>
                  </div>
                )}

                {!useNewCard && (
                  <Select
                    value={selectedPaymentMethod}
                    onValueChange={setSelectedPaymentMethod}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select saved card" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientPaymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={pm.id}>
                          <span className="uppercase">{pm.cardBrand}</span>
                          {" ···· "}
                          {pm.cardLast4}
                          {pm.isDefault && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Default
                            </Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {useNewCard && (
                  <div className="space-y-2.5 rounded-lg border p-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Card number</Label>
                      <Input
                        placeholder="1234 5678 9012 3456"
                        value={formatCardNumber(cardNumber)}
                        onChange={(e) =>
                          setCardNumber(e.target.value.replace(/\s/g, ""))
                        }
                        maxLength={19}
                        className="h-8 text-sm font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Expiry</Label>
                        <Input
                          placeholder="MM/YY"
                          value={formatExpiry(cardExpiry)}
                          onChange={(e) =>
                            setCardExpiry(e.target.value.replace(/\D/g, ""))
                          }
                          maxLength={5}
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">CVC</Label>
                        <Input
                          placeholder="···"
                          value={cardCvc}
                          onChange={(e) =>
                            setCardCvc(e.target.value.replace(/\D/g, ""))
                          }
                          maxLength={4}
                          type="password"
                          className="h-8 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cardholder name</Label>
                      <Input
                        placeholder="Full name on card"
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-xs">
                      <Checkbox
                        checked={saveCard}
                        onCheckedChange={(v) => setSaveCard(!!v)}
                        className="size-3.5"
                      />
                      Save card for future payments
                    </label>
                  </div>
                )}
              </div>
            )}

            {selectedMethod === "cash" && (
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium">Cash payment</p>
                  <p className="text-muted-foreground text-xs">
                    Confirm once you have received the cash from the client.
                  </p>
                </div>
              </div>
            )}

            {selectedMethod === "gift_card" && (
              <div className="space-y-2.5">
                <Label className="text-xs">Gift card code</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="GIFT-XXXX-XXXX"
                    value={giftCardCode}
                    onChange={(e) =>
                      setGiftCardCode(e.target.value.toUpperCase())
                    }
                    className="h-8 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={handleGiftCardLookup}
                  >
                    Verify
                  </Button>
                </div>
                {selectedGiftCard && (
                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950/30">
                    <CheckCircle className="size-4 shrink-0 text-green-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{selectedGiftCard.code}</p>
                      {selectedGiftCard.recipientName && (
                        <p className="text-muted-foreground text-xs">
                          {selectedGiftCard.recipientName}
                        </p>
                      )}
                    </div>
                    <p className="price-value text-sm font-semibold text-green-600 shrink-0">
                      ${selectedGiftCard.currentBalance.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Tip */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tip (optional)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tipAmount || ""}
                    onChange={(e) =>
                      setTipAmount(parseFloat(e.target.value) || 0)
                    }
                    className="h-8 pl-7 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setTipAmount(parseFloat((amount * 0.15).toFixed(2)))}
                >
                  15%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setTipAmount(parseFloat((amount * 0.18).toFixed(2)))}
                >
                  18%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setTipAmount(parseFloat((amount * 0.2).toFixed(2)))}
                >
                  20%
                </Button>
              </div>
            </div>

            {/* Credit */}
            {totalAvailableCredit > 0 && (
              <label className="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    checked={applyCredit}
                    onCheckedChange={(v) => {
                      setApplyCredit(!!v);
                      setCreditAmount(
                        v
                          ? Math.min(totalAvailableCredit, subtotal + tipAmount)
                          : 0,
                      );
                    }}
                    className="size-3.5"
                  />
                  <span className="text-sm">Apply account credit</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  ${totalAvailableCredit.toFixed(2)} available
                </Badge>
              </label>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes…"
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            {/* Total summary */}
            <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-1.5">
              {subtotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              )}
              {tipAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tip</span>
                  <span>+${tipAmount.toFixed(2)}</span>
                </div>
              )}
              {creditApplied > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Credit applied</span>
                  <span>−${creditApplied.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5">
                <span className="font-semibold">Total</span>
                <span className="price-value text-lg font-bold text-green-600">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSubmit}>
                Charge ${total.toFixed(2)}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
