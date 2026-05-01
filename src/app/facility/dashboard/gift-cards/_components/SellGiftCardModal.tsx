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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Gift,
  Send,
  QrCode,
  Sparkles,
  CalendarDays,
  DollarSign,
  User,
  Mail,
  MessageSquare,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GiftCard } from "@/types/payments";
import { clients } from "@/data/clients";

const PRESET_AMOUNTS = [25, 50, 75, 100, 150, 200];

const CARD_DESIGNS = [
  { id: "birthday", label: "Birthday", emoji: "🎂", color: "from-pink-500 to-rose-500" },
  { id: "holiday", label: "Holiday", emoji: "🎄", color: "from-green-500 to-emerald-600" },
  { id: "anniversary", label: "Anniversary", emoji: "💝", color: "from-purple-500 to-violet-600" },
  { id: "just_because", label: "Just Because", emoji: "🐾", color: "from-amber-500 to-orange-500" },
  { id: "thank_you", label: "Thank You", emoji: "🌸", color: "from-sky-500 to-blue-600" },
  { id: "welcome", label: "Welcome", emoji: "🏠", color: "from-teal-500 to-cyan-600" },
];

interface SellGiftCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  mode: "digital" | "physical";
  onSuccess?: (card: Partial<GiftCard>) => void;
}

export function SellGiftCardModal({
  open,
  onOpenChange,
  facilityId,
  mode,
  onSuccess,
}: SellGiftCardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number | "">("");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedDesign, setSelectedDesign] = useState(CARD_DESIGNS[0]);
  const [purchaserClientId, setPurchaserClientId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleDelivery, setScheduleDelivery] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [neverExpires, setNeverExpires] = useState(false);
  const [physicalCardNumber, setPhysicalCardNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const facilityClients = clients.filter((c) => c.id >= 15);
  const resolvedAmount = amount !== "" ? amount : parseFloat(customAmount) || 0;

  const generateCode = () => {
    const ts = Date.now().toString(36).toUpperCase().slice(-4);
    const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
    return mode === "digital"
      ? `GIFT-${new Date().getFullYear()}-${ts}${rnd}`
      : `PHYS-${ts}-${rnd}-X`;
  };

  const handleClose = () => {
    if (loading) return;
    setStep(1);
    setAmount("");
    setCustomAmount("");
    setSelectedDesign(CARD_DESIGNS[0]);
    setPurchaserClientId("");
    setRecipientName("");
    setRecipientEmail("");
    setMessage("");
    setScheduleDelivery(false);
    setDeliveryDate("");
    setNeverExpires(false);
    setPhysicalCardNumber("");
    setDone(false);
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    const card: Partial<GiftCard> = {
      id: `gc-${Date.now()}`,
      facilityId,
      code: mode === "physical" && physicalCardNumber ? physicalCardNumber : generateCode(),
      type: mode === "digital" ? "online" : "physical",
      initialAmount: resolvedAmount,
      currentBalance: resolvedAmount,
      currency: "USD",
      status: "active",
      purchasedBy: purchaserClientId
        ? facilityClients.find((c) => c.id === parseInt(purchaserClientId))?.name
        : undefined,
      purchasedByClientId: purchaserClientId ? parseInt(purchaserClientId) : undefined,
      purchaseDate: new Date().toISOString().split("T")[0],
      recipientName: recipientName || undefined,
      recipientEmail: recipientEmail || undefined,
      message: message || undefined,
      neverExpires,
      createdAt: new Date().toISOString(),
      transactionHistory: [],
    };
    setLoading(false);
    setDone(true);
    setTimeout(() => {
      onSuccess?.(card);
      handleClose();
    }, 1800);
  };

  const canProceed1 = resolvedAmount >= 10 && resolvedAmount <= 500;
  const canProceed2 =
    mode === "physical"
      ? physicalCardNumber.trim().length >= 8
      : recipientEmail.trim().length > 3;

  const title =
    mode === "digital" ? "Sell Digital Gift Card" : "Activate Physical Gift Card";

  if (done) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="bg-green-100 dark:bg-green-900/30 flex size-16 items-center justify-center rounded-full">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Gift card issued!</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {mode === "digital"
                  ? `A confirmation email has been sent to ${recipientEmail || "the recipient"}.`
                  : "The physical card is now active and ready to use."}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="size-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {mode === "digital"
              ? "Create and send a branded digital gift card"
              : "Scan or enter a physical card number and load a balance"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          {(["Amount", "Details", "Review"] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  step === i + 1
                    ? "bg-primary text-primary-foreground"
                    : step > i + 1
                      ? "bg-green-500 text-white"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {step > i + 1 ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  step === i + 1 ? "font-medium" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              {i < 2 && <span className="text-muted-foreground">—</span>}
            </div>
          ))}
        </div>

        <div className="min-h-[320px]">
          {/* Step 1 — Amount & Design */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium">Select Amount</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {PRESET_AMOUNTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setAmount(p);
                        setCustomAmount("");
                      }}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-center transition-all",
                        amount === p
                          ? "border-primary bg-primary/10 font-semibold text-primary"
                          : "hover:border-primary/50",
                      )}
                    >
                      <DollarSign className="mx-auto mb-0.5 size-4 opacity-60" />
                      <span className="text-sm font-semibold">${p}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Label className="text-muted-foreground text-xs">Custom Amount ($10–$500)</Label>
                  <div className="relative mt-1">
                    <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 text-sm">$</span>
                    <Input
                      className="pl-7"
                      type="number"
                      min={10}
                      max={500}
                      step={5}
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setAmount("");
                      }}
                      placeholder="Enter custom amount"
                    />
                  </div>
                </div>
              </div>

              {mode === "digital" && (
                <div>
                  <Label className="text-sm font-medium">Card Design</Label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {CARD_DESIGNS.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDesign(d)}
                        className={cn(
                          "rounded-xl border p-3 text-center transition-all",
                          selectedDesign.id === d.id
                            ? "border-primary ring-primary ring-2 ring-offset-1"
                            : "hover:border-primary/50",
                        )}
                      >
                        <div
                          className={cn(
                            "mx-auto mb-1.5 flex size-10 items-center justify-center rounded-lg bg-gradient-to-br text-xl",
                            d.color,
                          )}
                        >
                          {d.emoji}
                        </div>
                        <span className="text-xs font-medium">{d.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Recipient & Message */}
          {step === 2 && (
            <div className="space-y-4">
              {mode === "physical" ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <QrCode className="size-4" />
                      Card Number / Barcode
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      value={physicalCardNumber}
                      onChange={(e) => setPhysicalCardNumber(e.target.value.toUpperCase())}
                      placeholder="Scan barcode or type card number"
                      className="font-mono"
                    />
                    <p className="text-muted-foreground text-xs">
                      Scan the barcode on the blank physical card or type the printed number
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <User className="size-4" />
                      Purchased By (Optional)
                    </Label>
                    <Select
                      value={purchaserClientId}
                      onValueChange={setPurchaserClientId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No client</SelectItem>
                        {facilityClients.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <User className="size-4" />
                        Recipient Name
                      </Label>
                      <Input
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <Mail className="size-4" />
                        Recipient Email
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <MessageSquare className="size-4" />
                      Personal Message
                    </Label>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Happy Birthday! Enjoy some pampering for your fur baby..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex cursor-pointer items-center gap-1.5">
                        <CalendarDays className="size-4" />
                        Schedule Delivery
                      </Label>
                      <Switch
                        checked={scheduleDelivery}
                        onCheckedChange={setScheduleDelivery}
                      />
                    </div>
                    {scheduleDelivery && (
                      <Input
                        type="date"
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                      />
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label className="cursor-pointer">Never Expires</Label>
                <Switch checked={neverExpires} onCheckedChange={setNeverExpires} />
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Card preview */}
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl p-6 text-white",
                  `bg-gradient-to-br ${selectedDesign.color}`,
                )}
              >
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute -right-6 -top-6 size-32 rounded-full bg-white" />
                  <div className="absolute -bottom-6 -left-6 size-24 rounded-full bg-white" />
                </div>
                <div className="relative flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedDesign.emoji}</span>
                      <span className="text-sm font-medium opacity-90">
                        {selectedDesign.label}
                      </span>
                    </div>
                    <p className="mt-3 text-3xl font-bold tracking-tight">
                      ${resolvedAmount.toFixed(2)}
                    </p>
                    {recipientName && (
                      <p className="mt-1 text-sm opacity-90">For {recipientName}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">
                      {mode === "digital" ? "Digital" : "Physical"}
                    </Badge>
                    <Sparkles className="mt-2 size-6 opacity-60" />
                  </div>
                </div>
                {message && (
                  <p className="relative mt-3 border-t border-white/20 pt-3 text-xs italic opacity-80">
                    &quot;{message}&quot;
                  </p>
                )}
              </div>

              <div className="bg-muted/50 space-y-2 rounded-xl p-4 text-sm">
                {mode === "digital" && (
                  <>
                    {recipientEmail && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Send className="size-3.5" />
                          Delivery
                        </span>
                        <span className="font-medium">
                          {scheduleDelivery && deliveryDate
                            ? `Scheduled for ${deliveryDate}`
                            : "Send immediately"}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {mode === "physical" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <QrCode className="size-3.5" />
                      Card #
                    </span>
                    <span className="font-mono font-medium">{physicalCardNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expiry</span>
                  <span className="font-medium">
                    {neverExpires
                      ? "Never expires"
                      : `Expires ${new Date(Date.now() + 365 * 86400000).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Amount</span>
                  <span className="text-lg font-bold text-green-600">
                    ${resolvedAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {resolvedAmount >= 200 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <span className="mt-0.5 text-base">🔐</span>
                  <span>
                    This card is above the $200 PIN threshold — the recipient will
                    need to set a PIN before redeeming.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((s) => (s + 1) as 2 | 3)}
                disabled={step === 1 ? !canProceed1 : !canProceed2}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={handleConfirm} disabled={loading} className="min-w-28">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <Gift className="mr-2 size-4" />
                    Issue Card
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
