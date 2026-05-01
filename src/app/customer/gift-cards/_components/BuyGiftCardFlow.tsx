"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Gift,
  DollarSign,
  Mail,
  User,
  MessageSquare,
  CalendarDays,
  CreditCard,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { giftCardSettings } from "@/data/gift-cards";

const CARD_DESIGNS = [
  {
    id: "birthday",
    label: "Birthday",
    emoji: "🎂",
    gradient: "from-pink-400 via-rose-400 to-red-500",
    accentBg: "bg-pink-50 dark:bg-pink-950/20",
    border: "border-pink-200 dark:border-pink-800",
  },
  {
    id: "holiday",
    label: "Holiday",
    emoji: "🎄",
    gradient: "from-green-400 via-emerald-500 to-teal-600",
    accentBg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800",
  },
  {
    id: "anniversary",
    label: "Anniversary",
    emoji: "💝",
    gradient: "from-purple-400 via-violet-500 to-indigo-600",
    accentBg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-800",
  },
  {
    id: "just_because",
    label: "Just Because",
    emoji: "🐾",
    gradient: "from-amber-400 via-orange-400 to-red-400",
    accentBg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    id: "thank_you",
    label: "Thank You",
    emoji: "🌸",
    gradient: "from-sky-400 via-blue-500 to-indigo-500",
    accentBg: "bg-sky-50 dark:bg-sky-950/20",
    border: "border-sky-200 dark:border-sky-800",
  },
  {
    id: "welcome",
    label: "Welcome",
    emoji: "🏠",
    gradient: "from-teal-400 via-cyan-500 to-sky-500",
    accentBg: "bg-teal-50 dark:bg-teal-950/20",
    border: "border-teal-200 dark:border-teal-800",
  },
];

const STEPS = [
  { id: 1, label: "Amount" },
  { id: 2, label: "Design" },
  { id: 3, label: "Recipient" },
  { id: 4, label: "Payment" },
] as const;

interface BuyGiftCardFlowProps {
  facilityId: number;
  onComplete?: () => void;
}

export function BuyGiftCardFlow({ facilityId, onComplete }: BuyGiftCardFlowProps) {
  const settings = giftCardSettings.find((s) => s.facilityId === facilityId);
  const presets = settings?.presetAmounts ?? [25, 50, 100, 150, 200];

  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState<number | "">("");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedDesign, setSelectedDesign] = useState(CARD_DESIGNS[0]);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleDelivery, setScheduleDelivery] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  const resolvedAmount = amount !== "" ? amount : parseFloat(customAmount) || 0;

  const generateCode = () => {
    const ts = Date.now().toString(36).toUpperCase().slice(-5);
    const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GIFT-${new Date().getFullYear()}-${ts}${rnd}`;
  };

  const canProceed = [
    resolvedAmount >= 10 && resolvedAmount <= 500,
    true,
    recipientEmail.includes("@") && recipientName.trim().length > 0,
    true,
  ][step - 1];

  const handlePurchase = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    const code = generateCode();
    setGeneratedCode(code);
    setLoading(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <div className="relative">
          <div className="flex size-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="size-10 text-green-600" />
          </div>
          <div className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-green-500 text-white">
            <Sparkles className="size-3.5" />
          </div>
        </div>

        {/* Gift card visual */}
        <div
          className={cn(
            "relative w-full max-w-xs overflow-hidden rounded-2xl p-6 text-white shadow-2xl",
            `bg-gradient-to-br ${selectedDesign.gradient}`,
          )}
        >
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 size-20 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-3xl">{selectedDesign.emoji}</span>
              <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">
                Gift Card
              </Badge>
            </div>
            <p className="mt-3 text-3xl font-bold">${resolvedAmount.toFixed(2)}</p>
            <p className="mt-1 text-sm opacity-80">For {recipientName}</p>
            <p className="mt-3 border-t border-white/20 pt-2 font-mono text-xs opacity-60">
              {generatedCode}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-lg font-semibold">Your gift is on its way!</p>
          <p className="text-muted-foreground text-sm">
            A beautifully branded email has been sent to{" "}
            <span className="font-medium text-foreground">{recipientEmail}</span>
            {scheduleDelivery && deliveryDate ? ` on ${deliveryDate}` : " right now"}.
          </p>
        </div>

        <Button onClick={onComplete} className="w-full max-w-xs">
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step progress */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => step > s.id && setStep(s.id)}
              className={cn(
                "flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-semibold transition-all",
                step === s.id
                  ? "bg-primary text-primary-foreground"
                  : step > s.id
                    ? "cursor-pointer bg-green-500 text-white hover:bg-green-600"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {step > s.id ? "✓" : s.id}
            </button>
            <span
              className={cn(
                "text-xs hidden sm:block",
                step === s.id ? "font-semibold" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className="mx-1 h-px flex-1 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Amount */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold">Choose an amount</h3>
            <p className="text-muted-foreground text-sm">
              Pick a preset or enter a custom value ($10–$500)
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setAmount(p);
                  setCustomAmount("");
                }}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-2 p-4 text-center transition-all",
                  amount === p
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "hover:border-primary/40",
                )}
              >
                {amount === p && (
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20" />
                )}
                <DollarSign
                  className={cn(
                    "mx-auto mb-1 size-5",
                    amount === p ? "text-primary" : "text-muted-foreground",
                  )}
                />
                <p
                  className={cn(
                    "text-lg font-bold",
                    amount === p ? "text-primary" : "",
                  )}
                >
                  ${p}
                </p>
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-sm">Custom Amount</Label>
            <div className="relative">
              <span className="text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
                $
              </span>
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
                placeholder="Enter amount"
              />
            </div>
          </div>
          {resolvedAmount > 0 && (
            <div className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 p-4 text-white">
              <p className="text-sm opacity-80">Gift card value</p>
              <p className="text-3xl font-bold">${resolvedAmount.toFixed(2)}</p>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Design */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Pick a design</h3>
            <p className="text-muted-foreground text-sm">
              Choose the card theme that fits the occasion
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CARD_DESIGNS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setSelectedDesign(d)}
                className={cn(
                  "overflow-hidden rounded-2xl border-2 transition-all",
                  selectedDesign.id === d.id
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-transparent hover:border-primary/40",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 p-4 text-white",
                    `bg-gradient-to-br ${d.gradient}`,
                  )}
                >
                  <span className="text-3xl">{d.emoji}</span>
                  <span className="text-sm font-semibold">{d.label}</span>
                  <span className="font-mono text-xs opacity-70">
                    ${resolvedAmount.toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Recipient */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Who is this for?</h3>
            <p className="text-muted-foreground text-sm">
              Fill in the recipient details and your personal message
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <User className="size-4" />
                Recipient Name
                <span className="text-destructive">*</span>
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
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <User className="size-4" />
                From (Your Name)
              </Label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Alice"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MessageSquare className="size-4" />
                Personal Message
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Happy birthday! Enjoy some pampering for your fur baby..."
                rows={3}
              />
              <p className="text-muted-foreground text-right text-xs">
                {message.length}/200
              </p>
            </div>
            <div className="rounded-xl border p-3">
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
                  className="mt-2"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Payment / Review */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Review & Pay</h3>
            <p className="text-muted-foreground text-sm">
              Confirm your gift card order before purchasing
            </p>
          </div>

          {/* Card preview */}
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl p-5 text-white shadow-xl",
              `bg-gradient-to-br ${selectedDesign.gradient}`,
            )}
          >
            <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-5 -left-5 size-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-3xl">{selectedDesign.emoji}</span>
                  <p className="mt-2 text-3xl font-bold">
                    ${resolvedAmount.toFixed(2)}
                  </p>
                  <p className="mt-0.5 text-sm opacity-80">
                    For {recipientName || "Recipient"}
                  </p>
                </div>
                <Badge className="bg-white/20 text-white hover:bg-white/30 text-xs">
                  {selectedDesign.label}
                </Badge>
              </div>
              {message && (
                <p className="mt-3 border-t border-white/20 pt-2 text-xs italic opacity-80">
                  &quot;{message}&quot;
                </p>
              )}
            </div>
          </div>

          {/* Order summary */}
          <Card>
            <CardContent className="py-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-medium">{recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery to</span>
                <span className="font-medium">{recipientEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Send date</span>
                <span className="font-medium">
                  {scheduleDelivery && deliveryDate
                    ? new Date(deliveryDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Immediately"}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Total</span>
                <span className="price-value text-lg font-bold text-green-600">
                  ${resolvedAmount.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment method */}
          <div className="rounded-xl border p-3">
            <div className="flex items-center gap-3">
              <CreditCard className="text-muted-foreground size-5" />
              <div className="flex-1">
                <p className="text-sm font-medium">VISA •••• 4242</p>
                <p className="text-muted-foreground text-xs">Default card</p>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">
                Change
              </Button>
            </div>
          </div>

          {resolvedAmount >= 200 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <span className="mt-0.5">🔐</span>
              <span>
                This is a high-value card. The recipient will be asked to set a 4-digit
                PIN when they redeem it for extra security.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(1, s - 1) as typeof s)}
          disabled={step === 1}
        >
          Back
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => (s + 1) as typeof s)}
            disabled={!canProceed}
            className="gap-1.5"
          >
            Continue
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={handlePurchase}
            disabled={loading}
            className="min-w-32 gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Processing…
              </>
            ) : (
              <>
                <Gift className="size-4" />
                Purchase ${resolvedAmount.toFixed(2)}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
