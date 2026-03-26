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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CreditCard,
  Wallet,
  Gift,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { clients } from "@/data/clients";
import { paymentMethods, giftCards, customerCredits } from "@/data/payments";

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
  const [paymentMethod, setPaymentMethod] = useState<
    "card" | "cash" | "gift_card"
  >("card");
  const [selectedClient, setSelectedClient] = useState(prefilledClient || 0);
  const [amount, setAmount] = useState(prefilledAmount || 0);
  const [tipAmount, setTipAmount] = useState(0);
  const [description, setDescription] = useState(prefilledDescription || "");
  const [notes, setNotes] = useState("");

  // Card payment
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

  const facilityClients = clients.filter((c) => c.id >= 15); // Simplified

  // Get saved payment methods for selected client
  const clientPaymentMethods = paymentMethods.filter(
    (pm) => pm.clientId === selectedClient,
  );

  // Get available credits for selected client
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

  // Calculate totals
  const subtotal = amount;
  const creditApplied = applyCredit
    ? Math.min(creditAmount, totalAvailableCredit, subtotal + tipAmount)
    : 0;
  const total = subtotal + tipAmount - creditApplied;

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
        alert(
          `Gift card balance ($${gc.currentBalance.toFixed(2)}) is less than total amount`,
        );
      }
    } else {
      alert("Gift card not found or inactive");
      setSelectedGiftCard(null);
    }
  };

  const handleSubmit = () => {
    if (!selectedClient) {
      alert("Please select a client");
      return;
    }
    if (amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a description");
      return;
    }

    // Validate payment method
    if (paymentMethod === "card") {
      if (useNewCard) {
        if (!cardNumber || !cardExpiry || !cardCvc || !cardholderName) {
          alert("Please fill in all card details");
          return;
        }
        // In real app: validate card format, expiry, etc.
      } else {
        if (!selectedPaymentMethod) {
          alert("Please select a saved card");
          return;
        }
      }
    } else if (paymentMethod === "gift_card") {
      if (!selectedGiftCard) {
        alert("Please look up and select a valid gift card");
        return;
      }
      if (selectedGiftCard.currentBalance < total) {
        alert("Insufficient gift card balance");
        return;
      }
    }

    // Create payment object
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
      currency: "USD" as const,
      paymentMethod,
      status: "completed" as const,
      description,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
      processedBy: "Current User", // Would come from auth
      processedById: 1,
      // Card details
      ...(paymentMethod === "card" &&
        useNewCard && {
          cardBrand: detectCardBrand(cardNumber),
          cardLast4: cardNumber.slice(-4),
          stripeChargeId: `ch_${crypto.randomUUID().substring(0, 7)}`,
          stripePaymentIntentId: `pi_${crypto.randomUUID().substring(0, 7)}`,
        }),
      ...(paymentMethod === "card" &&
        !useNewCard && {
          cardBrand: clientPaymentMethods.find(
            (pm) => pm.id === selectedPaymentMethod,
          )?.cardBrand,
          cardLast4: clientPaymentMethods.find(
            (pm) => pm.id === selectedPaymentMethod,
          )?.cardLast4,
          stripeChargeId: `ch_${crypto.randomUUID().substring(0, 7)}`,
          stripePaymentIntentId: `pi_${crypto.randomUUID().substring(0, 7)}`,
        }),
      // Gift card
      ...(paymentMethod === "gift_card" && {
        giftCardId: selectedGiftCard?.id,
      }),
      // Credit
      ...(creditApplied > 0 && {
        creditUsed: creditApplied,
      }),
      receiptUrl: `/receipts/pay-${paymentId}.pdf`,
    };

    console.log("Payment processed:", payment);

    if (onSuccess) {
      onSuccess(payment);
    }

    // Reset form
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setPaymentMethod("card");
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
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(" ");
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] min-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="size-5" />
            Take Payment
          </DialogTitle>
          <DialogDescription>
            Process a payment for a customer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client & Amount Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">
                    Client <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedClient.toString()}
                    onValueChange={(value) =>
                      setSelectedClient(parseInt(value))
                    }
                    disabled={!!prefilledClient}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {facilityClients.map((client) => (
                        <SelectItem
                          key={client.id}
                          value={client.id.toString()}
                        >
                          {client.name} - {client.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">
                    Amount <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount || ""}
                      onChange={(e) =>
                        setAmount(parseFloat(e.target.value) || 0)
                      }
                      className="pl-9"
                      placeholder="0.00"
                      disabled={!!prefilledAmount}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Daycare - Buddy"
                  disabled={!!prefilledDescription}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tip">Tip (Optional)</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="tip"
                      type="number"
                      min="0"
                      step="0.01"
                      value={tipAmount || ""}
                      onChange={(e) =>
                        setTipAmount(parseFloat(e.target.value) || 0)
                      }
                      className="pl-9"
                      placeholder="0.00"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTipAmount(amount * 0.15)}
                  >
                    15%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTipAmount(amount * 0.2)}
                  >
                    20%
                  </Button>
                </div>
              </div>

              {/* Apply Credit */}
              {totalAvailableCredit > 0 && (
                <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="apply-credit"
                        checked={applyCredit}
                        onCheckedChange={(checked) => {
                          setApplyCredit(!!checked);
                          if (checked) {
                            setCreditAmount(
                              Math.min(
                                totalAvailableCredit,
                                subtotal + tipAmount,
                              ),
                            );
                          } else {
                            setCreditAmount(0);
                          }
                        }}
                      />
                      <Label
                        htmlFor="apply-credit"
                        className="text-sm font-medium"
                      >
                        Apply Customer Credit
                      </Label>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      ${totalAvailableCredit.toFixed(2)} available
                    </Badge>
                  </div>
                  {applyCredit && (
                    <div className="mt-2 space-y-2">
                      <Label htmlFor="credit-amount" className="text-sm">
                        Credit Amount
                      </Label>
                      <div className="relative">
                        <DollarSign className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                          id="credit-amount"
                          type="number"
                          min="0"
                          max={Math.min(
                            totalAvailableCredit,
                            subtotal + tipAmount,
                          )}
                          step="0.01"
                          value={creditAmount || ""}
                          onChange={(e) =>
                            setCreditAmount(
                              Math.min(
                                parseFloat(e.target.value) || 0,
                                totalAvailableCredit,
                                subtotal + tipAmount,
                              ),
                            )
                          }
                          className="pl-9"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={paymentMethod}
                onValueChange={(v) =>
                  setPaymentMethod(v as "card" | "cash" | "gift_card")
                }
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="card">
                    <CreditCard className="mr-2 size-4" />
                    Card
                  </TabsTrigger>
                  <TabsTrigger value="cash">
                    <Wallet className="mr-2 size-4" />
                    Cash
                  </TabsTrigger>
                  <TabsTrigger value="gift_card">
                    <Gift className="mr-2 size-4" />
                    Gift Card
                  </TabsTrigger>
                </TabsList>

                {/* Card Payment */}
                <TabsContent value="card" className="space-y-4">
                  {clientPaymentMethods.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="use-saved"
                            name="card-option"
                            checked={!useNewCard}
                            onChange={() => setUseNewCard(false)}
                          />
                          <Label htmlFor="use-saved">Use Saved Card</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            id="use-new"
                            name="card-option"
                            checked={useNewCard}
                            onChange={() => setUseNewCard(true)}
                          />
                          <Label htmlFor="use-new">New Card</Label>
                        </div>
                      </div>

                      {!useNewCard && (
                        <Select
                          value={selectedPaymentMethod}
                          onValueChange={setSelectedPaymentMethod}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a saved card" />
                          </SelectTrigger>
                          <SelectContent>
                            {clientPaymentMethods.map((pm) => (
                              <SelectItem key={pm.id} value={pm.id}>
                                <div className="flex items-center gap-2">
                                  <CreditCard className="size-4" />
                                  <span className="uppercase">
                                    {pm.cardBrand}
                                  </span>
                                  <span>•••• {pm.cardLast4}</span>
                                  <span className="text-muted-foreground text-xs">
                                    {pm.cardExpMonth}/{pm.cardExpYear}
                                  </span>
                                  {pm.isDefault && (
                                    <Badge variant="outline">Default</Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}

                  {useNewCard && (
                    <div className="space-y-4 rounded-lg border p-4">
                      <div className="space-y-2">
                        <Label htmlFor="card-number">Card Number</Label>
                        <Input
                          id="card-number"
                          placeholder="1234 5678 9012 3456"
                          value={formatCardNumber(cardNumber)}
                          onChange={(e) =>
                            setCardNumber(e.target.value.replace(/\s/g, ""))
                          }
                          maxLength={19}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input
                            id="expiry"
                            placeholder="MM/YY"
                            value={formatExpiry(cardExpiry)}
                            onChange={(e) =>
                              setCardExpiry(e.target.value.replace(/\D/g, ""))
                            }
                            maxLength={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC</Label>
                          <Input
                            id="cvc"
                            placeholder="123"
                            value={cardCvc}
                            onChange={(e) =>
                              setCardCvc(e.target.value.replace(/\D/g, ""))
                            }
                            maxLength={4}
                            type="password"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cardholder">Cardholder Name</Label>
                        <Input
                          id="cardholder"
                          placeholder="John Doe"
                          value={cardholderName}
                          onChange={(e) => setCardholderName(e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="save-card"
                          checked={saveCard}
                          onCheckedChange={(checked) => setSaveCard(!!checked)}
                        />
                        <Label htmlFor="save-card" className="text-sm">
                          Save this card for future use
                        </Label>
                      </div>

                      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <AlertCircle className="mt-0.5 size-4 text-blue-600" />
                        <p className="text-xs text-blue-800">
                          Payments are securely processed through Stripe. Card
                          details are never stored on our servers.
                        </p>
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Cash Payment */}
                <TabsContent value="cash" className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-6 text-center">
                    <Wallet className="text-muted-foreground mx-auto mb-3 size-12" />
                    <h4 className="mb-1 font-semibold">Cash Payment</h4>
                    <p className="text-muted-foreground text-sm">
                      Record this transaction as a cash payment
                    </p>
                  </div>
                </TabsContent>

                {/* Gift Card Payment */}
                <TabsContent value="gift_card" className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="gift-card-code">Gift Card Code</Label>
                      <div className="flex gap-2">
                        <Input
                          id="gift-card-code"
                          placeholder="GIFT-PAWS-2024-001"
                          value={giftCardCode}
                          onChange={(e) =>
                            setGiftCardCode(e.target.value.toUpperCase())
                          }
                        />
                        <Button type="button" onClick={handleGiftCardLookup}>
                          Lookup
                        </Button>
                      </div>
                    </div>

                    {selectedGiftCard && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <div className="mb-2 flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">
                              {selectedGiftCard.code}
                            </h4>
                            <Badge variant="outline" className="mt-1">
                              {selectedGiftCard.type}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              ${selectedGiftCard.currentBalance.toFixed(2)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              Available Balance
                            </p>
                          </div>
                        </div>
                        {selectedGiftCard.recipientName && (
                          <p className="text-muted-foreground text-sm">
                            Recipient: {selectedGiftCard.recipientName}
                          </p>
                        )}
                        {selectedGiftCard.currentBalance < total && (
                          <div className="mt-3 rounded-sm border border-red-200 bg-red-50 p-2">
                            <p className="text-sm text-red-800">
                              ⚠️ Insufficient balance. This gift card cannot
                              cover the full amount.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={2}
            />
          </div>

          {/* Total Summary */}
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Subtotal:</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                {tipAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm">Tip:</span>
                    <span className="font-medium">
                      +${tipAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {creditApplied > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="text-sm">Credit Applied:</span>
                    <span className="font-medium">
                      -${creditApplied.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="font-bold">Total to Charge:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            <DollarSign className="mr-2 size-4" />
            Process Payment ${total.toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
