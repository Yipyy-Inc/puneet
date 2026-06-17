"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
  Search,
  Check,
  X,
  Banknote,
  CreditCard,
  Store,
  Camera,
  ScanLine,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import type { GiftCard, PhysicalCardBatch } from "@/types/payments";
import { clients } from "@/data/clients";
import {
  physicalCardBatches,
  giftCardSettings,
  giftCards,
} from "@/data/gift-cards";

const CameraScanner = dynamic(
  () =>
    import("@/components/retail/CameraScanner").then((m) => m.CameraScanner),
  { ssr: false },
);

const PRESET_AMOUNTS = [25, 50, 75, 100, 150, 200];

// Hourly delivery slots, 9 AM through 9 PM.
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const h = 9 + i;
  const hour12 = ((h + 11) % 12) + 1;
  return {
    value: `${String(h).padStart(2, "0")}:00`,
    label: `${hour12} ${h < 12 ? "AM" : "PM"}`,
  };
});

// Radix <Select.Item> forbids an empty-string value, so the optional
// "No client" choice uses a sentinel that maps back to the empty-string state.
const NO_CLIENT = "__none__";

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash", icon: Banknote },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "pos", label: "POS Transaction", icon: Store },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["id"];

type CardDesign = {
  id: string;
  label: string;
  /** Built-in designs use an emoji + gradient; custom uploads use imageUrl. */
  emoji?: string;
  color?: string;
  imageUrl?: string;
};

const CARD_DESIGNS: CardDesign[] = [
  // Petcare-themed designs
  {
    id: "new_puppy",
    label: "New Puppy",
    emoji: "🐶",
    color: "from-amber-400 to-orange-500",
  },
  {
    id: "new_kitten",
    label: "New Kitten",
    emoji: "🐱",
    color: "from-pink-400 to-rose-500",
  },
  {
    id: "gotcha_day",
    label: "Gotcha Day",
    emoji: "🎉",
    color: "from-fuchsia-500 to-purple-600",
  },
  {
    id: "happy_howliday",
    label: "Happy Howliday",
    emoji: "🦴",
    color: "from-red-500 to-rose-600",
  },
  {
    id: "spa_day",
    label: "Spa Day for Pets",
    emoji: "🛁",
    color: "from-cyan-400 to-teal-500",
  },
  {
    id: "thank_you_boarding",
    label: "Thank You for Boarding",
    emoji: "🧳",
    color: "from-indigo-500 to-blue-600",
  },
  // General-occasion designs
  {
    id: "birthday",
    label: "Birthday",
    emoji: "🎂",
    color: "from-pink-500 to-rose-500",
  },
  {
    id: "holiday",
    label: "Holiday",
    emoji: "🎄",
    color: "from-green-500 to-emerald-600",
  },
  {
    id: "anniversary",
    label: "Anniversary",
    emoji: "💝",
    color: "from-purple-500 to-violet-600",
  },
  {
    id: "just_because",
    label: "Just Because",
    emoji: "🐾",
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "thank_you",
    label: "Thank You",
    emoji: "🌸",
    color: "from-sky-500 to-blue-600",
  },
  {
    id: "welcome",
    label: "Welcome",
    emoji: "🏠",
    color: "from-teal-500 to-cyan-600",
  },
];

interface SellGiftCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facilityId: number;
  mode: "digital" | "physical";
  onSuccess?: (card: Partial<GiftCard>) => void;
  /** Pre-fill the amount (e.g. when issuing a replacement for a voided card). */
  prefillAmount?: number;
  /** Batches used to resolve a scanned physical card's fixed denomination. */
  physicalBatches?: PhysicalCardBatch[];
  /** Whether a POS cart is open; defaults payment to "POS Transaction". */
  hasActivePosSession?: boolean;
}

export function SellGiftCardModal({
  open,
  onOpenChange,
  facilityId,
  mode,
  onSuccess,
  prefillAmount,
  physicalBatches = physicalCardBatches,
  hasActivePosSession = true,
}: SellGiftCardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number | "">(
    prefillAmount != null && PRESET_AMOUNTS.includes(prefillAmount)
      ? prefillAmount
      : "",
  );
  const [customAmount, setCustomAmount] = useState(
    prefillAmount != null && !PRESET_AMOUNTS.includes(prefillAmount)
      ? String(prefillAmount)
      : "",
  );
  const [selectedDesign, setSelectedDesign] = useState(CARD_DESIGNS[0]);
  const [purchaserClientId, setPurchaserClientId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [customerQuery, setCustomerQuery] = useState("");
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [matchedCustomerName, setMatchedCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [scheduleDelivery, setScheduleDelivery] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("10:00");
  const [neverExpires, setNeverExpires] = useState(false);
  const [physicalCardNumber, setPhysicalCardNumber] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    hasActivePosSession ? "pos" : "cash",
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const facilityClients = clients.filter((c) => c.id >= 15);
  const resolvedAmount = amount !== "" ? amount : parseFloat(customAmount) || 0;

  // Customer search (Step 2) — match the facility's clients by name or email.
  const customerMatches = (() => {
    const q = customerQuery.trim().toLowerCase();
    if (!q) return [];
    return facilityClients
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
      )
      .slice(0, 6);
  })();

  const selectCustomer = (c: (typeof facilityClients)[number]) => {
    setRecipientName(c.name);
    setRecipientEmail(c.email);
    setMatchedCustomerName(c.name);
    setCustomerQuery("");
    setShowCustomerResults(false);
  };

  const clearMatchedCustomer = () => {
    setMatchedCustomerName("");
    setRecipientName("");
    setRecipientEmail("");
  };

  // Turning on Schedule Delivery defaults to tomorrow at 10 AM.
  const handleScheduleToggle = (on: boolean) => {
    setScheduleDelivery(on);
    if (on && !deliveryDate) {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      setDeliveryDate(t.toISOString().split("T")[0]);
      setDeliveryTime("10:00");
    }
  };

  const schedulePreview =
    scheduleDelivery && deliveryDate
      ? `${new Date(`${deliveryDate}T00:00:00`).toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })} at ${TIME_SLOTS.find((s) => s.value === deliveryTime)?.label ?? ""}`
      : null;

  // First line of the personal message, truncated for the review card preview.
  const messagePreview = (() => {
    const firstLine = message.split("\n")[0].trim();
    if (!firstLine) return "";
    return firstLine.length > 40
      ? `${firstLine.slice(0, 40).trimEnd()}…`
      : firstLine;
  })();

  const purchaserName = purchaserClientId
    ? facilityClients.find((c) => c.id === parseInt(purchaserClientId))?.name
    : undefined;

  const paymentHint =
    paymentMethod === "pos"
      ? hasActivePosSession
        ? "This sale will be added to the current open POS cart."
        : "No active POS session — start one or choose another method."
      : paymentMethod === "card"
        ? purchaserName
          ? `Charge ${purchaserName}'s saved card on file.`
          : "Charge the customer's saved card on file (select a purchaser above)."
        : "Collect cash payment at the counter.";

  // Built-in designs plus the facility's one optional uploaded design.
  const customCardDesign = giftCardSettings.find(
    (s) => s.facilityId === facilityId,
  )?.customCardDesign;
  const designs: CardDesign[] = customCardDesign
    ? [
        ...CARD_DESIGNS,
        {
          id: "custom",
          label: customCardDesign.label,
          imageUrl: customCardDesign.imageUrl,
        },
      ]
    : CARD_DESIGNS;

  // Resolve a scanned physical card to its batch + card; fixed batches lock the amount.
  const query = physicalCardNumber.trim().toLowerCase();
  const matchedBatch =
    mode === "physical" && query
      ? physicalBatches.find((b) =>
          b.cards.some(
            (c) =>
              c.cardNumber.toLowerCase() === query ||
              c.barcode.toLowerCase() === query,
          ),
        )
      : undefined;
  const matchedCard = matchedBatch?.cards.find(
    (c) =>
      c.cardNumber.toLowerCase() === query || c.barcode.toLowerCase() === query,
  );
  // A card is only activatable if it's recognized and still inactive (unsold).
  const alreadyActivated = matchedCard
    ? matchedCard.status !== "inactive"
    : false;
  const activatedGiftCard = matchedCard?.giftCardId
    ? giftCards.find((g) => g.id === matchedCard.giftCardId)
    : undefined;
  const activatedDate = matchedCard?.activatedAt ?? matchedCard?.soldAt;
  const activatedDateLabel = activatedDate
    ? new Date(activatedDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const lockedDenomination = matchedBatch?.denomination ?? null;
  const effectiveAmount = lockedDenomination ?? resolvedAmount;

  const generateCode = () => {
    const ts = Date.now().toString(36).toUpperCase().slice(-4);
    const rnd = Math.random().toString(36).substring(2, 6).toUpperCase();
    return mode === "digital"
      ? `GIFT-${new Date().getFullYear()}-${ts}${rnd}`
      : `PHYS-${ts}-${rnd}-X`;
  };

  // Reset all per-card state back to a fresh Step 1 (without closing).
  const resetState = () => {
    setStep(1);
    setAmount("");
    setCustomAmount("");
    setSelectedDesign(CARD_DESIGNS[0]);
    setPurchaserClientId("");
    setRecipientName("");
    setRecipientEmail("");
    setCustomerQuery("");
    setShowCustomerResults(false);
    setMatchedCustomerName("");
    setMessage("");
    setScheduleDelivery(false);
    setDeliveryDate("");
    setDeliveryTime("10:00");
    setNeverExpires(false);
    setPhysicalCardNumber("");
    setCameraOpen(false);
    setPaymentMethod(hasActivePosSession ? "pos" : "cash");
    setDone(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1400));
    const card: Partial<GiftCard> = {
      id: `gc-${Date.now()}`,
      facilityId,
      code:
        mode === "physical" && physicalCardNumber
          ? physicalCardNumber
          : generateCode(),
      type: mode === "digital" ? "online" : "physical",
      initialAmount: effectiveAmount,
      currentBalance: effectiveAmount,
      currency: "USD",
      status: "active",
      purchasedBy: purchaserClientId
        ? facilityClients.find((c) => c.id === parseInt(purchaserClientId))
            ?.name
        : undefined,
      purchasedByClientId: purchaserClientId
        ? parseInt(purchaserClientId)
        : undefined,
      purchaseDate: new Date().toISOString().split("T")[0],
      recipientName: recipientName || undefined,
      recipientEmail: recipientEmail || undefined,
      message: message || undefined,
      neverExpires,
      createdAt: new Date().toISOString(),
      transactionHistory: [],
    };
    onSuccess?.(card);
    setLoading(false);
    setDone(true);
  };

  // Step gating differs by mode. Physical: Scan → Set Amount → Review.
  // Digital: Amount → Details → Review.
  const amountValid =
    lockedDenomination != null ||
    (resolvedAmount >= 10 && resolvedAmount <= 500);
  // Only a recognized, not-yet-activated card may proceed.
  const scanValid = !!matchedBatch && !alreadyActivated;
  const canContinue =
    mode === "physical"
      ? step === 1
        ? scanValid
        : amountValid
      : step === 1
        ? amountValid
        : recipientEmail.trim().length > 3;

  const stepLabels =
    mode === "physical"
      ? (["Scan Card", "Set Amount", "Review"] as const)
      : (["Amount", "Details", "Review"] as const);

  const title =
    mode === "digital"
      ? "Sell Digital Gift Card"
      : "Activate Physical Gift Card";

  if (done) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">
                {mode === "digital" ? "Gift card issued!" : "Card activated!"}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {mode === "digital"
                  ? `A confirmation email has been sent to ${recipientEmail || "the recipient"}.`
                  : matchedCustomerName && recipientEmail
                    ? `Confirmation email sent to ${recipientEmail}.`
                    : "The physical card is now active and ready to use."}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              {mode === "physical" && (
                <Button
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={resetState}
                >
                  <ScanLine className="size-4" />
                  Activate Another Card
                </Button>
              )}
              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Amount picker — locked to a fixed denomination when a fixed-batch card is
  // scanned, otherwise presets + custom entry.
  // Shared customer search/autocomplete control (digital recipient + physical link).
  const customerSearchControl = matchedCustomerName ? (
    <div className="border-primary/40 bg-primary/5 flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <Check className="text-primary size-4" />
        <span className="font-medium">{matchedCustomerName}</span>
        <span className="text-muted-foreground text-xs">{recipientEmail}</span>
      </span>
      <button
        type="button"
        onClick={clearMatchedCustomer}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
        <span className="sr-only">Clear selected customer</span>
      </button>
    </div>
  ) : (
    <div className="relative">
      <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
      <Input
        className="pl-9"
        value={customerQuery}
        onChange={(e) => {
          setCustomerQuery(e.target.value);
          setShowCustomerResults(true);
        }}
        onFocus={() => setShowCustomerResults(true)}
        placeholder="Search by name or email…"
      />
      {showCustomerResults && customerQuery.trim() && (
        <div className="bg-popover absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border shadow-md">
          {customerMatches.length > 0 ? (
            customerMatches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectCustomer(c)}
                className="hover:bg-accent flex w-full flex-col items-start px-3 py-2 text-left"
              >
                <span className="text-sm font-medium">{c.name}</span>
                <span className="text-muted-foreground text-xs">{c.email}</span>
              </button>
            ))
          ) : (
            <p className="text-muted-foreground px-3 py-2 text-sm">
              No matching customers.
            </p>
          )}
        </div>
      )}
    </div>
  );

  // Physical Step 2 — optionally link the card to a customer account.
  const linkCustomerSection = (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <User className="size-4" />
        Link to Customer (Optional)
      </Label>
      {customerSearchControl}
      <p className="text-muted-foreground text-xs">
        {matchedCustomerName
          ? "We’ll email this customer a confirmation with the card details."
          : "Link this card to a customer to email them a confirmation, or leave it anonymous."}
      </p>
    </div>
  );

  const amountSection =
    lockedDenomination != null && matchedBatch ? (
      <div>
        <Label className="text-muted-foreground text-sm font-medium">
          Load Amount
        </Label>
        <div className="bg-muted text-muted-foreground mt-2 cursor-not-allowed rounded-xl border px-4 py-4 text-center opacity-90">
          <p className="text-sm">
            This card will be loaded with{" "}
            <span className="text-foreground text-lg font-bold">
              ${lockedDenomination.toFixed(2)}
            </span>
          </p>
          <p className="mt-0.5 text-xs">(fixed batch denomination)</p>
        </div>
      </div>
    ) : (
      <div>
        <Label className="text-sm font-medium">
          {mode === "physical" ? "Load Amount" : "Select Amount"}
        </Label>
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
                  ? "border-primary bg-primary/10 text-primary font-semibold"
                  : "hover:border-primary/50",
              )}
            >
              <DollarSign className="mx-auto mb-0.5 size-4 opacity-60" />
              <span className="text-sm font-semibold">${p}</span>
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Label className="text-muted-foreground text-xs">
            Custom Amount ($10–$500)
          </Label>
          <div className="relative mt-1">
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
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
              placeholder="Enter custom amount"
            />
          </div>
        </div>
      </div>
    );

  const designSection = (
    <div className="border-t pt-4">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary size-4" />
        <Label className="text-base font-semibold">Choose a Design</Label>
      </div>
      <p className="text-muted-foreground mt-0.5 text-xs">
        The recipient sees this design on their gift card and email.
      </p>
      <div className="mt-3 grid max-h-[280px] grid-cols-3 gap-3 overflow-y-auto pr-1">
        {designs.map((d) => (
          <button
            key={d.id}
            type="button"
            onClick={() => setSelectedDesign(d)}
            aria-pressed={selectedDesign.id === d.id}
            className={cn(
              "overflow-hidden rounded-xl border text-left transition-all",
              selectedDesign.id === d.id
                ? "border-primary ring-primary/40 ring-2"
                : "hover:border-primary/50",
            )}
          >
            {d.imageUrl ? (
              <div
                role="img"
                aria-label={d.label}
                className="aspect-16/10 bg-cover bg-center"
                style={{ backgroundImage: `url(${d.imageUrl})` }}
              />
            ) : (
              <div
                className={cn(
                  "flex aspect-16/10 items-center justify-center bg-linear-to-br text-4xl",
                  d.color,
                )}
              >
                {d.emoji}
              </div>
            )}
            <div className="flex items-center justify-between px-2.5 py-2">
              <span className="truncate text-xs font-medium">{d.label}</span>
              {selectedDesign.id === d.id && (
                <CheckCircle2 className="text-primary size-3.5 shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>
      {customCardDesign && (
        <p className="text-muted-foreground mt-2 text-xs">
          “{customCardDesign.label}” is your facility&apos;s custom design.
        </p>
      )}
    </div>
  );

  // Step 1 (physical) — scan/enter the card number and validate it in real time.
  const scanCardSection = (
    <div className="space-y-4">
      <p className="px-4 text-center text-base font-medium">
        Scan the barcode on the physical card, or type the card number below.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="phys-card-number">Card Number</Label>
        <div className="flex gap-2">
          <Input
            id="phys-card-number"
            value={physicalCardNumber}
            onChange={(e) =>
              setPhysicalCardNumber(e.target.value.toUpperCase())
            }
            onKeyDown={(e) => {
              // USB keyboard-wedge scanners submit with Enter.
              if (e.key === "Enter" && scanValid) {
                e.preventDefault();
                setStep(2);
              }
            }}
            placeholder="Scan or type the card number"
            className="font-mono"
            autoFocus
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0 gap-1.5"
            onClick={() => setCameraOpen(true)}
          >
            <Camera className="size-4" />
            Scan
          </Button>
        </div>
      </div>

      {alreadyActivated && matchedBatch ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <X className="mt-0.5 size-4 shrink-0" />
          <span>
            This card was already activated
            {activatedDateLabel ? ` on ${activatedDateLabel}` : ""}
            {activatedGiftCard
              ? ` with a balance of $${activatedGiftCard.currentBalance.toFixed(2)}`
              : ""}
            .
          </span>
        </div>
      ) : matchedBatch ? (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          <Check className="mt-0.5 size-4 shrink-0" />
          <span>
            Card found in{" "}
            <span className="font-semibold">{matchedBatch.name}</span>. Not yet
            activated.
            {lockedDenomination != null && (
              <>
                {" "}
                Fixed{" "}
                <span className="font-semibold">
                  ${lockedDenomination.toFixed(2)}
                </span>{" "}
                — the load amount will be set automatically.
              </>
            )}
          </span>
        </div>
      ) : physicalCardNumber.trim() ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <X className="mt-0.5 size-4 shrink-0" />
          <span>Card number not found. Check the batch it came from.</span>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
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
            {stepLabels.map((label, i) => (
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
            {/* Step 1 — physical: scan card · digital: amount + design */}
            {step === 1 && (
              <div className="space-y-5">
                {mode === "physical" ? (
                  scanCardSection
                ) : (
                  <>
                    {amountSection}
                    {designSection}
                  </>
                )}
              </div>
            )}

            {/* Step 2 — physical: set amount · digital: recipient details */}
            {step === 2 && (
              <div className="space-y-4">
                {mode === "physical" ? (
                  <>
                    {amountSection}
                    {linkCustomerSection}
                  </>
                ) : (
                  <div className="space-y-3">
                    {/* Customer search — primary recipient input */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <Search className="size-4" />
                        Search Customer
                      </Label>
                      {customerSearchControl}
                      <p className="text-muted-foreground text-xs">
                        Find an existing customer to auto-fill the recipient
                        details.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <User className="size-4" />
                        Purchased By (Optional)
                      </Label>
                      <Select
                        value={purchaserClientId || NO_CLIENT}
                        onValueChange={(v) =>
                          setPurchaserClientId(v === NO_CLIENT ? "" : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_CLIENT}>No client</SelectItem>
                          {facilityClients.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="bg-border h-px flex-1" />
                      <span className="text-muted-foreground text-xs">
                        Or enter manually
                      </span>
                      <div className="bg-border h-px flex-1" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          <User className="size-4" />
                          Recipient Name
                        </Label>
                        <Input
                          value={recipientName}
                          onChange={(e) => {
                            setRecipientName(e.target.value);
                            setMatchedCustomerName("");
                          }}
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
                          onChange={(e) => {
                            setRecipientEmail(e.target.value);
                            setMatchedCustomerName("");
                          }}
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
                          onCheckedChange={handleScheduleToggle}
                        />
                      </div>
                      {scheduleDelivery && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-muted-foreground text-xs">
                                Date
                              </Label>
                              <DatePicker
                                value={deliveryDate}
                                onValueChange={(next) => setDeliveryDate(next)}
                                min={new Date().toISOString().split("T")[0]}
                                displayMode="dialog"
                                showManualInput={false}
                                placeholder="Pick a date"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-muted-foreground text-xs">
                                Time
                              </Label>
                              <Select
                                value={deliveryTime}
                                onValueChange={setDeliveryTime}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TIME_SLOTS.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                      {s.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {schedulePreview && (
                            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                              <CalendarDays className="size-3.5" />
                              Will be delivered:{" "}
                              <span className="text-foreground font-medium">
                                {schedulePreview}
                              </span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label className="cursor-pointer">Never Expires</Label>
                  <Switch
                    checked={neverExpires}
                    onCheckedChange={setNeverExpires}
                  />
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
                    !selectedDesign.imageUrl &&
                      `bg-linear-to-br ${selectedDesign.color}`,
                  )}
                >
                  {selectedDesign.imageUrl ? (
                    <>
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url(${selectedDesign.imageUrl})`,
                        }}
                      />
                      <div className="absolute inset-0 bg-black/45" />
                    </>
                  ) : (
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute -top-6 -right-6 size-32 rounded-full bg-white" />
                      <div className="absolute -bottom-6 -left-6 size-24 rounded-full bg-white" />
                    </div>
                  )}
                  <div className="relative flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {mode === "physical" ? (
                          <>
                            <Gift className="size-5" />
                            <span className="text-sm font-medium opacity-90">
                              Physical Gift Card
                            </span>
                          </>
                        ) : (
                          <>
                            {selectedDesign.emoji && (
                              <span className="text-2xl">
                                {selectedDesign.emoji}
                              </span>
                            )}
                            <span className="text-sm font-medium opacity-90">
                              {selectedDesign.label}
                            </span>
                          </>
                        )}
                      </div>
                      <p className="mt-3 text-3xl font-bold tracking-tight">
                        ${effectiveAmount.toFixed(2)}
                      </p>
                      {recipientName && (
                        <p className="mt-1 text-sm opacity-90">
                          For {recipientName}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-white/20 text-xs text-white hover:bg-white/30">
                        {mode === "digital" ? "Digital" : "Physical"}
                      </Badge>
                      <Sparkles className="mt-2 size-6 opacity-60" />
                    </div>
                  </div>
                  {messagePreview && (
                    <p className="relative mt-3 truncate border-t border-white/20 pt-3 text-xs italic opacity-80">
                      &quot;{messagePreview}&quot;
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
                            {schedulePreview
                              ? `Scheduled for ${schedulePreview}`
                              : "Send immediately"}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {mode === "physical" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <QrCode className="size-3.5" />
                          Card Number
                        </span>
                        <span className="font-mono font-medium">
                          •••• {physicalCardNumber.slice(-4)}
                        </span>
                      </div>
                      {matchedBatch && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Batch</span>
                          <span className="font-medium">
                            {matchedBatch.name}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Denomination
                        </span>
                        <span className="font-medium">
                          {lockedDenomination != null
                            ? `Fixed $${lockedDenomination.toFixed(2)}`
                            : "Open value"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <User className="size-3.5" />
                          Linked customer
                        </span>
                        <span className="font-medium">
                          {matchedCustomerName || "No customer linked"}
                        </span>
                      </div>
                    </>
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
                      ${effectiveAmount.toFixed(2)}
                      {lockedDenomination != null && (
                        <span className="text-muted-foreground ml-1 text-xs font-normal">
                          (fixed by batch)
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Payment collection (admin / in-person sale) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Payment collected via:
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((m) => {
                      const disabled = m.id === "pos" && !hasActivePosSession;
                      const active = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => setPaymentMethod(m.id)}
                          aria-pressed={active}
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-all",
                            active
                              ? "border-primary bg-primary/5 text-primary"
                              : "hover:border-primary/50",
                            disabled && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <m.icon className="size-5" />
                          <span className="text-xs font-medium">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-muted-foreground text-xs">{paymentHint}</p>
                </div>

                {effectiveAmount >= 200 && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <span className="mt-0.5 text-base">🔐</span>
                    <span>
                      This card is above the $200 PIN threshold — the recipient
                      will need to set a PIN before redeeming.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {step > 1 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                >
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
                  disabled={!canContinue}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="min-w-28"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Gift className="mr-2 size-4" />
                      {mode === "physical" ? "Activate Card" : "Issue Card"}
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mode === "physical" && (
        <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
          <DialogContent className="flex flex-col gap-0 p-0 max-sm:inset-0 max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none sm:max-w-sm">
            <DialogHeader className="px-5 pt-5 pb-3">
              <DialogTitle className="flex items-center gap-2">
                <ScanLine className="size-5" />
                Scan Card
              </DialogTitle>
              <DialogDescription>
                Point your camera at the card&apos;s barcode or QR code
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto px-5 pb-5">
              {cameraOpen && (
                <CameraScanner
                  onScan={(code) => {
                    setPhysicalCardNumber(code.toUpperCase());
                    setCameraOpen(false);
                  }}
                />
              )}
              <Button
                variant="outline"
                className="mt-3 w-full"
                onClick={() => setCameraOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
