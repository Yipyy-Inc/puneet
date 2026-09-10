"use client";

import { useState } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
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
  Send,
} from "lucide-react";
import { YipyyPose } from "@/components/ui/yipyy-pose";
import { cn } from "@/lib/utils";
import { giftCardSettings } from "@/data/gift-cards";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import {
  formatDateLong,
  formatMoney,
  formatTimeOfDay,
} from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";

// A MOCK — see the debt map, "Gift cards". Its labels are keys.
const SAVED_CARDS = [
  { id: "visa-4242", brand: "VISA", last4: "4242", labelKey: "cardDefault" },
  {
    id: "mc-8888",
    brand: "Mastercard",
    last4: "8888",
    labelKey: "cardPersonal",
  },
];

// DESIGN TODO (pre-launch): the emoji + gradient tiles below are placeholders.
// Before public launch, replace each design with a unique branded illustration
// or photo matching the petcare facility aesthetic (add an `image` field and
// render it in the tiles, the live preview, and the success/review cards).
const CARD_DESIGNS = [
  {
    id: "birthday",
    labelKey: "designBirthday",
    emoji: "🎂",
    gradient: "from-pink-400 via-rose-400 to-red-500",
    accentBg: "bg-pink-50 dark:bg-pink-950/20",
    border: "border-pink-200 dark:border-pink-800",
  },
  {
    id: "holiday",
    labelKey: "designHoliday",
    emoji: "🎄",
    gradient: "from-green-400 via-emerald-500 to-teal-600",
    accentBg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800",
  },
  {
    id: "anniversary",
    labelKey: "designAnniversary",
    emoji: "💝",
    gradient: "from-purple-400 via-violet-500 to-indigo-600",
    accentBg: "bg-purple-50 dark:bg-purple-950/20",
    border: "border-purple-200 dark:border-purple-800",
  },
  {
    id: "just_because",
    labelKey: "designJustBecause",
    emoji: "🐾",
    gradient: "from-amber-400 via-orange-400 to-red-400",
    accentBg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800",
  },
  {
    id: "thank_you",
    labelKey: "designThankYou",
    emoji: "🌸",
    gradient: "from-sky-400 via-blue-500 to-indigo-500",
    accentBg: "bg-sky-50 dark:bg-sky-950/20",
    border: "border-sky-200 dark:border-sky-800",
  },
  {
    id: "welcome",
    labelKey: "designWelcome",
    emoji: "🏠",
    gradient: "from-teal-400 via-cyan-500 to-sky-500",
    accentBg: "bg-teal-50 dark:bg-teal-950/20",
    border: "border-teal-200 dark:border-teal-800",
  },
  {
    id: "new_pet",
    labelKey: "designNewPet",
    emoji: "🐶",
    gradient: "from-orange-400 via-amber-500 to-yellow-500",
    accentBg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-800",
  },
  {
    id: "gotcha_day",
    labelKey: "designGotchaDay",
    emoji: "🎉",
    gradient: "from-emerald-400 via-teal-500 to-green-600",
    accentBg: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
  },
];

// Hourly delivery slots, 9 AM through 9 PM. The label is formatTimeOfDay
// at render — "9:00 AM" · "9 h 00" (§5q).
const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => ({
  value: `${String(9 + i).padStart(2, "0")}:00`,
}));

const STEPS = [
  { id: 1, labelKey: "stepAmount" },
  { id: 2, labelKey: "stepDesign" },
  { id: 3, labelKey: "stepRecipient" },
  { id: 4, labelKey: "stepPayment" },
] as const;

interface BuyGiftCardFlowProps {
  facilityId: number;
  onComplete?: () => void;
  /** Switch the parent tabs to "Cards I sent" from the success screen. */
  onViewSent?: () => void;
}

export function BuyGiftCardFlow({
  facilityId,
  onComplete,
  onViewSent,
}: BuyGiftCardFlowProps) {
  const { t, fill, locale } = useCustomerText("giftCards");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  // Purchaser's first name, pre-filled into "From (Your Name)". It was a module
  // constant read out of the mock clients array by hardcoded id, so every buyer
  // was pre-filled as Alice; it is derived from the session now, and stays a
  // single source so the initial state and resetFlow cannot drift.
  const customerFirstName = customer?.name?.split(" ")[0] ?? "";

  const settings = giftCardSettings.find((s) => s.facilityId === facilityId);
  const presets = settings?.presetAmounts ?? [25, 50, 75, 100, 150, 200];

  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState<number | "">("");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedDesign, setSelectedDesign] = useState(CARD_DESIGNS[0]);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  // Pre-fill "From" with the customer's first name (editable).
  const [senderName, setSenderName] = useState(customerFirstName);
  const [emailError, setEmailError] = useState("");
  const [attemptedStep3, setAttemptedStep3] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduleDelivery, setScheduleDelivery] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("10:00");
  const [sendCopy, setSendCopy] = useState(false);
  const [paymentCardId, setPaymentCardId] = useState(SAVED_CARDS[0].id);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  const resolvedAmount = amount !== "" ? amount : parseFloat(customAmount) || 0;

  // Inline range error for a typed custom amount (presets are always valid).
  const amountError =
    customAmount.trim() !== "" && (resolvedAmount < 10 || resolvedAmount > 500)
      ? "Amount must be between $10 and $500."
      : "";

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const purchaserEmail = customer?.email ?? t("yourEmail");
  const activeCard =
    SAVED_CARDS.find((c) => c.id === paymentCardId) ?? SAVED_CARDS[0];
  const hasPaymentMethod = SAVED_CARDS.length > 0 && !!activeCard;

  // Scheduled delivery is allowed from tomorrow up to a year out.
  // Build YYYY-MM-DD from LOCAL components (toISOString would shift the day in
  // behind-UTC timezones during the evening).
  const toLocalISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const oneYearOut = new Date();
  oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);
  const minDeliveryDate = toLocalISO(tomorrow);
  const maxDeliveryDate = toLocalISO(oneYearOut);

  const handleScheduleToggle = (on: boolean) => {
    setScheduleDelivery(on);
    if (on) {
      // Default to the earliest allowed slot (tomorrow at 10 AM) so the
      // confirmation line has a valid value to show right away.
      if (!deliveryDate) {
        setDeliveryDate(minDeliveryDate);
        setDeliveryTime("10:00");
      }
    } else {
      // Toggling off reverts to "send immediately" — clear the picked date.
      setDeliveryDate("");
    }
  };

  // First line of the personal message, truncated to ~40 chars for the
  // Step 4 review card preview.
  const messagePreview = (() => {
    const firstLine = message.split("\n")[0].trim();
    if (!firstLine) return "";
    return firstLine.length > 40
      ? `${firstLine.slice(0, 40).trimEnd()}…`
      : firstLine;
  })();

  const schedulePreview =
    scheduleDelivery && deliveryDate
      ? fill("dateAtTime", {
          date: formatDateLong(deliveryDate, locale),
          time: formatTimeOfDay(deliveryTime, locale),
        })
      : null;

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

  // Step 3 Continue stays clickable so we can surface inline required errors.
  const handleContinue = () => {
    if (step === 3) {
      const nameOk = recipientName.trim().length > 0;
      const emailOk = isValidEmail(recipientEmail.trim());
      if (!nameOk || !emailOk) {
        setAttemptedStep3(true);
        if (recipientEmail.trim().length > 0 && !emailOk) {
          setEmailError("Please enter a valid email address.");
        }
        return;
      }
    }
    setStep((s) => (s + 1) as typeof s);
  };

  const handlePurchase = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    const code = generateCode();
    setGeneratedCode(code);
    setLoading(false);
    setDone(true);
  };

  // Reset to a fresh purchase (used when no onComplete handler is provided).
  const resetFlow = () => {
    setStep(1);
    setAmount("");
    setCustomAmount("");
    setSelectedDesign(CARD_DESIGNS[0]);
    setRecipientName("");
    setRecipientEmail("");
    setSenderName(customerFirstName);
    setMessage("");
    setScheduleDelivery(false);
    setDeliveryDate("");
    setDeliveryTime("10:00");
    setSendCopy(false);
    setPaymentCardId(SAVED_CARDS[0].id);
    setShowCardSelector(false);
    setGeneratedCode("");
    setDone(false);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        {/* §5d2: a finished flow gets `success` at 132 on its confirmation
            panel. He replaces the green disc-and-sparkle stack, which was two
            decorations doing one job. */}
        <YipyyPose name="success" size={132} />

        {/* Gift card visual */}
        <div
          className={cn(
            "relative w-full max-w-xs overflow-hidden rounded-2xl p-6 text-white shadow-2xl",
            `bg-linear-to-br ${selectedDesign.gradient}`,
          )}
        >
          <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 size-20 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-3xl">{selectedDesign.emoji}</span>
              <Badge className="bg-white/20 text-xs text-white hover:bg-white/30">
                {t("giftCard")}
              </Badge>
            </div>
            <p className="mt-3 text-3xl font-bold">
              {formatMoney(resolvedAmount, locale)}
            </p>
            <p className="mt-1 text-sm opacity-80">
              {fill("forRecipient", { name: recipientName })}
            </p>
            <p className="mt-3 border-t border-white/20 pt-2 font-mono text-xs opacity-60">
              {generatedCode}
            </p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-lg font-semibold">
            {fill("giftCardSentTo", {
              name: recipientName || t("yourRecipient"),
            })}
          </p>
          <p className="text-muted-foreground text-sm">
            {rich(t(schedulePreview ? "emailSentToOn" : "emailSentToNow"), {
              email: (
                <span className="text-foreground font-medium">
                  {recipientEmail}
                </span>
              ),
              when: schedulePreview ?? "",
            })}
            {sendCopy && ` ${t("copySentToYou")}`}
          </p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button onClick={onComplete ?? resetFlow}>
            <Gift className="size-4" />
            {t("sendAnotherGiftCard")}
          </Button>
          {onViewSent && (
            <Button variant="outline" onClick={onViewSent}>
              <Send className="size-4" />
              {t("viewCardsISent")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step progress */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className="flex flex-1 items-center gap-1 last:flex-none"
          >
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
                "hidden text-xs sm:block",
                step === s.id ? "font-semibold" : "text-muted-foreground",
              )}
            >
              {t(s.labelKey)}
            </span>
            {i < STEPS.length - 1 && (
              <div className="bg-border mx-1 h-px flex-1" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1 — Amount */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h3 className="font-semibold">{t("chooseAnAmount")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("pickAPresetOrEnter")}
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
            {/* Amount selection */}
            <div className="space-y-5">
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
                      <div className="absolute inset-0 -z-10 bg-linear-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20" />
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
                      {formatMoney(p, locale, { whole: true })}
                    </p>
                  </button>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-sm">
                  {t("customAmount")}
                </Label>
                <div className="relative">
                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
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
                    placeholder={t("enterAmount")}
                    aria-invalid={amountError !== ""}
                  />
                </div>
                {amountError && (
                  <p className="text-destructive text-xs">{amountError}</p>
                )}
              </div>
            </div>

            {/* Live card preview */}
            <div className="sm:order-last">
              <div
                className={cn(
                  "relative overflow-hidden rounded-2xl p-4 text-white shadow-lg transition-all",
                  `bg-linear-to-br ${selectedDesign.gradient}`,
                )}
              >
                <div className="absolute -top-4 -right-4 size-16 rounded-full bg-white/10" />
                <div className="relative">
                  <span className="text-2xl">{selectedDesign.emoji}</span>
                  {resolvedAmount > 0 ? (
                    <p className="mt-2 text-2xl font-bold">
                      {formatMoney(resolvedAmount, locale)}
                    </p>
                  ) : (
                    <p className="mt-2 text-base font-semibold opacity-80">
                      {t("chooseAnAmount")}
                    </p>
                  )}
                  <p className="text-[10px] tracking-wide uppercase opacity-70">
                    {t("giftCard")}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mt-2 text-center text-xs">
                {t("livePreview")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Design */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">{t("pickADesign")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("chooseTheCardThemeThat")}
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
                    ? "border-primary ring-primary ring-2 ring-offset-2"
                    : "hover:border-primary/40 border-transparent",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 p-4 text-white",
                    `bg-linear-to-br ${d.gradient}`,
                  )}
                >
                  <span className="text-3xl">{d.emoji}</span>
                  <span className="text-sm font-semibold">{t(d.labelKey)}</span>
                  <span className="font-mono text-xs opacity-70">
                    {formatMoney(resolvedAmount, locale)}
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
            <h3 className="font-semibold">{t("whoIsThisFor")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("fillInTheRecipientDetails")}
            </p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <User className="size-4" />
                {t("recipientName")}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder={t("janeSmith")}
                aria-invalid={
                  attemptedStep3 && recipientName.trim().length === 0
                }
              />
              {attemptedStep3 && recipientName.trim().length === 0 && (
                <p className="text-destructive text-xs">
                  {t("recipientNameIsRequired")}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Mail className="size-4" />
                {t("recipientEmail")}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                type="email"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onBlur={() => {
                  if (
                    recipientEmail.trim().length > 0 &&
                    !isValidEmail(recipientEmail.trim())
                  ) {
                    setEmailError("Please enter a valid email address.");
                  }
                }}
                placeholder={t("janeExampleCom")}
                aria-invalid={
                  emailError !== "" ||
                  (attemptedStep3 && recipientEmail.trim().length === 0)
                }
              />
              {attemptedStep3 && recipientEmail.trim().length === 0 ? (
                <p className="text-destructive text-xs">
                  {t("recipientEmailIsRequired")}
                </p>
              ) : (
                emailError && (
                  <p className="text-destructive text-xs">{emailError}</p>
                )
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <User className="size-4" />
                {t("fromYourName")}
              </Label>
              <Input
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder={t("alice")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <MessageSquare className="size-4" />
                {t("personalMessage")}
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("happyBirthdayEnjoySomePampering")}
                rows={3}
                maxLength={300}
              />
              <p className="text-muted-foreground text-right text-xs">
                {message.length}/300
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <Checkbox
                checked={sendCopy}
                onCheckedChange={(v) => setSendCopy(v === true)}
              />
              <span className="text-sm">{t("sendMeACopyOf")}</span>
            </label>
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <Label className="flex cursor-pointer items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {t("scheduleDelivery")}
                </Label>
                <Switch
                  checked={scheduleDelivery}
                  onCheckedChange={handleScheduleToggle}
                />
              </div>
              {scheduleDelivery && (
                <div className="animate-in fade-in-0 slide-in-from-top-2 mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">
                        {t("date")}
                      </Label>
                      <DatePicker
                        value={deliveryDate}
                        onValueChange={(next) => setDeliveryDate(next)}
                        min={minDeliveryDate}
                        max={maxDeliveryDate}
                        displayMode="dialog"
                        showManualInput={false}
                        placeholder={t("pickADate")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-xs">
                        {t("time")}
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
                              {formatTimeOfDay(s.value, locale)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {schedulePreview && (
                    <p className="text-muted-foreground text-xs">
                      {t("willBeDeliveredOn")}{" "}
                      <span className="text-foreground font-medium">
                        {schedulePreview}
                      </span>
                      .
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Payment / Review */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">{t("reviewPay")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("confirmYourGiftCardOrder")}
            </p>
          </div>

          {/* Card preview */}
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl p-5 text-white shadow-xl",
              `bg-linear-to-br ${selectedDesign.gradient}`,
            )}
          >
            <div className="absolute -top-6 -right-6 size-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-5 -left-5 size-20 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-3xl">{selectedDesign.emoji}</span>
                  <p className="mt-2 text-3xl font-bold">
                    {formatMoney(resolvedAmount, locale)}
                  </p>
                  <p className="mt-0.5 text-sm opacity-80">
                    {fill("forRecipient", {
                      name: recipientName || t("recipient"),
                    })}
                  </p>
                </div>
                <Badge className="bg-white/20 text-xs text-white hover:bg-white/30">
                  {t(selectedDesign.labelKey)}
                </Badge>
              </div>
              {messagePreview && (
                <p className="mt-3 truncate border-t border-white/20 pt-2 text-xs italic opacity-80">
                  &quot;{messagePreview}&quot;
                </p>
              )}
            </div>
          </div>

          {/* Order summary */}
          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("recipient")}</span>
                <span className="font-medium">{recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("deliveryTo")}</span>
                <span className="font-medium">{recipientEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("delivery")}</span>
                <span className="font-medium">
                  {schedulePreview ?? t("immediatelyAfterPurchase")}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">{t("total")}</span>
                <span className="price-value text-lg font-bold text-green-600">
                  {formatMoney(resolvedAmount, locale)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* "Send a copy" reassurance */}
          {sendCopy && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <Mail className="size-3.5" />
              {rich(t("copyWillBeSentTo"), {
                email: (
                  <span className="text-foreground font-medium">
                    {purchaserEmail}
                  </span>
                ),
              })}
            </p>
          )}

          {/* Payment method */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("paymentMethod")}</Label>
            {!hasPaymentMethod ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-4 text-center">
                <CreditCard className="text-muted-foreground size-6" />
                <p className="text-muted-foreground text-sm">
                  {t("noSavedPaymentMethod")}
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/customer/billing">{t("addAPaymentMethod")}</Link>
                </Button>
              </div>
            ) : !showCardSelector ? (
              <>
                <div className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="bg-muted flex size-9 items-center justify-center rounded-md border">
                    <CreditCard className="size-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {activeCard.brand} •••• {activeCard.last4}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t(activeCard.labelKey)}
                    </p>
                  </div>
                  <CheckCircle2 className="size-5 text-green-600" />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => setShowCardSelector(false)}
                  >
                    {t("useThisCard")}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCardSelector(true)}
                  >
                    {t("useDifferentCard")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-2 rounded-xl border p-2">
                {SAVED_CARDS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setPaymentCardId(c.id);
                      setShowCardSelector(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      c.id === paymentCardId
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/40",
                    )}
                  >
                    <CreditCard className="text-muted-foreground size-5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {c.brand} •••• {c.last4}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {t(c.labelKey)}
                      </p>
                    </div>
                    {c.id === paymentCardId && (
                      <CheckCircle2 className="text-primary size-4" />
                    )}
                  </button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowCardSelector(false)}
                >
                  {t("cancel")}
                </Button>
              </div>
            )}
          </div>

          {resolvedAmount >= 200 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
              <span className="mt-0.5">🔐</span>
              <span>{t("highValueCardPin")}</span>
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
          {t("back")}
        </Button>

        {step < 4 ? (
          <Button
            onClick={handleContinue}
            disabled={step < 3 && !canProceed}
            className="gap-1.5"
          >
            {t("continue")}
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={handlePurchase}
            disabled={loading || !hasPaymentMethod}
            className="min-w-32 gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              <>
                <Gift className="size-4" />
                {fill("purchaseAmount", {
                  amount: formatMoney(resolvedAmount, locale),
                })}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
