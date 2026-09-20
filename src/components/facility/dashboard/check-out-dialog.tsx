"use client";

import { usePortalHref } from "@/lib/nav/use-portal-href";
import { useStaffText } from "@/lib/staff/use-staff-text";
import {
  formatDateLong,
  formatMoney as formatMoneyIn,
} from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import Image from "next/image";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bed,
  CalendarClock,
  GraduationCap,
  LogOut,
  PawPrint,
  Scissors,
  Settings,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { cn } from "@/lib/utils";
import { getPetImage, type UnifiedBooking } from "@/hooks/use-unified-bookings";
import { useSettings } from "@/hooks/use-settings";
import type {
  EarlyCheckoutPolicy,
  EarlyCheckoutPolicyConfig,
  ModuleConfig,
} from "@/types/facility";

export interface EarlyCheckoutAdjustment {
  unusedNights: number;
  unusedValue: number;
  policy: EarlyCheckoutPolicy;
  refundAmount: number;
  creditAmount: number;
  feeAmount: number;
  creditExpiresDays?: number;
  customerNote?: string;
}

interface CheckOutDialogProps {
  booking: UnifiedBooking;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEarlyCheckout?: boolean;
  onConfirm: (options: {
    timestamp: string;
    reason?: string;
    earlyCheckout?: EarlyCheckoutAdjustment;
  }) => void;
}

const BUILTIN_ICONS: Record<string, typeof Sun> = {
  daycare: Sun,
  boarding: Bed,
  grooming: Scissors,
  training: GraduationCap,
};

const POLICY_KEY: Record<EarlyCheckoutPolicy, string> = {
  none: "policyNone",
  full_refund: "policyFullRefund",
  partial_refund: "policyPartialRefund",
  credit: "policyCredit",
  fee: "policyFee",
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function toTimeInputValue(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function toIsoDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function combineDateTime(isoDate: string, time: string): string {
  const [y, mo, d] = isoDate.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const dt = new Date(y ?? 1970, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, 0, 0);
  return dt.toISOString();
}

function bookingIsoToDateString(iso: string): string {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return toIsoDateString(d);
}

function startOfDay(iso: string): number {
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function getServiceConfig(
  serviceKey: string,
  settings: ReturnType<typeof useSettings>,
): ModuleConfig | undefined {
  switch (serviceKey) {
    case "boarding":
      return settings.boarding;
    case "daycare":
      return settings.daycare;
    case "grooming":
      return settings.grooming;
    case "training":
      return settings.training;
    default:
      return undefined;
  }
}

function computeAdjustment(
  booking: UnifiedBooking,
  checkoutIso: string,
  policy: EarlyCheckoutPolicyConfig,
): EarlyCheckoutAdjustment | null {
  const scheduledEndMs = startOfDay(booking.scheduledEnd);
  const checkoutMs = startOfDay(checkoutIso);
  const daysBefore = Math.max(
    0,
    Math.round((scheduledEndMs - checkoutMs) / MS_PER_DAY),
  );
  if (daysBefore <= 0) return null;

  const totalNights = booking.totalNights ?? 0;
  const totalPrice = booking.price ?? 0;
  const nightlyRate = totalNights > 0 ? totalPrice / totalNights : totalPrice;
  const unusedNights = daysBefore;
  const unusedValue = nightlyRate * unusedNights;

  let refundAmount = 0;
  let creditAmount = 0;
  let feeAmount = 0;

  switch (policy.policy) {
    case "none":
      break;
    case "full_refund":
      refundAmount = unusedValue;
      break;
    case "partial_refund":
      refundAmount = unusedValue * ((policy.refundPercent ?? 0) / 100);
      break;
    case "credit":
      creditAmount = unusedValue;
      break;
    case "fee":
      feeAmount =
        policy.feeType === "percentage"
          ? unusedValue * ((policy.feeAmount ?? 0) / 100)
          : (policy.feeAmount ?? 0);
      break;
  }

  return {
    unusedNights,
    unusedValue: round2(unusedValue),
    policy: policy.policy,
    refundAmount: round2(refundAmount),
    creditAmount: round2(creditAmount),
    feeAmount: round2(feeAmount),
    creditExpiresDays: policy.creditExpiresDays,
    customerNote: policy.customerNote,
  };
}

function money(n: number, locale: AppLocale): string {
  return formatMoneyIn(n, locale);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function CheckOutDialog({
  booking,
  open,
  onOpenChange,
  isEarlyCheckout = false,
  onConfirm,
}: CheckOutDialogProps) {
  const settings = useSettings();
  const { t, fill, locale } = useStaffText("checkOutDialog");
  const moduleConfig = getServiceConfig(booking.serviceKey, settings);
  const policy = moduleConfig?.settings.earlyCheckout;

  const todayIso = useMemo(() => toIsoDateString(new Date()), []);
  const [date, setDate] = useState<string>(todayIso);
  const [time, setTime] = useState(() => toTimeInputValue(null));
  const [reason, setReason] = useState("");

  const petImage = useMemo(() => getPetImage(booking.petId), [booking.petId]);
  const Icon = BUILTIN_ICONS[booking.serviceKey];

  const checkoutIso = combineDateTime(date, time);
  const isBoarding = booking.source === "boarding";

  const minDateIso = useMemo(() => {
    if (!isBoarding) return todayIso;
    const startIso = booking.actualStart ?? booking.scheduledStart;
    const startDateIso = bookingIsoToDateString(startIso);
    return startDateIso > todayIso ? startDateIso : todayIso;
  }, [booking.actualStart, booking.scheduledStart, isBoarding, todayIso]);

  const maxDateIso = useMemo(
    () =>
      isBoarding ? bookingIsoToDateString(booking.scheduledEnd) : todayIso,
    [booking.scheduledEnd, isBoarding, todayIso],
  );

  const adjustment = useMemo<EarlyCheckoutAdjustment | null>(() => {
    if (!isBoarding) return null;
    if (!policy || !policy.enabled) {
      const scheduledEndMs = startOfDay(booking.scheduledEnd);
      const checkoutMs = startOfDay(checkoutIso);
      const daysBefore = Math.max(
        0,
        Math.round((scheduledEndMs - checkoutMs) / MS_PER_DAY),
      );
      if (daysBefore <= 0) return null;
      // Early but no policy — surface the fact and treat as no-refund.
      return computeAdjustment(booking, checkoutIso, {
        enabled: true,
        policy: "none",
      });
    }
    return computeAdjustment(booking, checkoutIso, policy);
  }, [booking, checkoutIso, policy, isBoarding]);

  const earlyCheckoutDisabled = isBoarding && policy && !policy.enabled;

  const handleConfirm = () => {
    onConfirm({
      timestamp: checkoutIso,
      reason: isEarlyCheckout ? reason : undefined,
      earlyCheckout: adjustment ?? undefined,
    });
    onOpenChange(false);
    setDate(todayIso);
    setTime(toTimeInputValue(null));
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="size-4" />
            {isEarlyCheckout ? t("titleEarly") : t("title")}
            <span className="text-ink-tertiary font-normal tabular-nums">
              #{booking.rawId}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="border-line flex items-center gap-3 rounded-2xl border p-3">
          {petImage ? (
            <div className="ring-background size-14 overflow-hidden rounded-2xl ring-2">
              <Image
                src={petImage}
                alt={booking.petName}
                width={56}
                height={56}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground ring-background flex size-14 items-center justify-center rounded-2xl ring-2">
              <PawPrint className="size-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm leading-none font-semibold">
                {booking.petName}
              </p>
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{
                  color: booking.serviceColor,
                  borderColor: `${booking.serviceColor}40`,
                  backgroundColor: `${booking.serviceColor}12`,
                }}
              >
                {Icon ? (
                  <Icon className="size-3" />
                ) : (
                  <DynamicIcon name={booking.serviceIcon} className="size-3" />
                )}
                {booking.serviceLabel}
              </span>
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {booking.petBreed} · {booking.ownerName}
            </p>
            {isBoarding && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                <CalendarClock className="mr-1 inline size-3" />
                {fill("scheduled", {
                  start: formatDateLong(booking.scheduledStart, locale),
                  end: formatDateLong(booking.scheduledEnd, locale),
                })}
                {booking.totalNights
                  ? ` · ${fill(
                      booking.totalNights > 1 ? "nightsMany" : "nightsOne",
                      { n: booking.totalNights },
                    )}`
                  : ""}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4 py-1">
          <div
            className={cn(
              "grid gap-3",
              isBoarding ? "sm:grid-cols-2" : "sm:grid-cols-1",
            )}
          >
            {isBoarding && (
              <div className="grid gap-2">
                <Label className="text-sm font-medium">{t("date")}</Label>
                <DatePicker
                  value={date}
                  onValueChange={(next) => {
                    if (next) setDate(next);
                  }}
                  min={minDateIso}
                  max={maxDateIso}
                  displayMode="dialog"
                  popoverClassName="w-[296px] rounded-xl border-slate-200/90 shadow-[0_28px_60px_-28px_rgba(15,23,42,0.55)]"
                  calendarClassName="p-1"
                  showQuickPresets={false}
                  placeholder={t("datePlaceholder")}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="check-out-time" className="text-sm font-medium">
                {t("time")}
              </Label>
              <TimePickerLux
                id="check-out-time"
                value={time}
                onValueChange={setTime}
                displayMode="dialog"
              />
            </div>
          </div>

          {isEarlyCheckout && (
            <div className="grid gap-2">
              <Label
                htmlFor="early-checkout-reason"
                className="text-sm font-medium"
              >
                {t("reason")}
              </Label>
              <Textarea
                id="early-checkout-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                className="min-h-20 resize-none text-sm"
              />
            </div>
          )}

          {adjustment && adjustment.unusedNights > 0 && (
            <EarlyCheckoutSummary
              adjustment={adjustment}
              disabledByPolicy={!!earlyCheckoutDisabled}
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("keep")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !!earlyCheckoutDisabled || (isEarlyCheckout && !reason.trim())
            }
          >
            <LogOut className="size-4" />
            {isEarlyCheckout || (adjustment && adjustment.unusedNights > 0)
              ? t("confirmEarly")
              : fill("checkOutPet", { pet: booking.petName })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EarlyCheckoutSummary({
  adjustment,
  disabledByPolicy,
}: {
  adjustment: EarlyCheckoutAdjustment;
  disabledByPolicy: boolean;
}) {
  const { t: earlyText } = useStaffText("bookingActions");
  const { t, fill, locale } = useStaffText("checkOutDialog");
  // Boarding settings have no page in /employee, so staff are not offered one.
  const { reachable } = usePortalHref();
  const policyHref =
    "/facility/dashboard/services/boarding/settings#early-checkout";
  const { unusedNights, unusedValue, policy, customerNote } = adjustment;

  return (
    <div className="border-warning space-y-3 rounded-2xl border p-3">
      <div className="text-body-ink flex flex-wrap items-center gap-2 text-sm font-semibold">
        <AlertTriangle className="text-warning size-4" />
        {t("summaryTitle")} ·{" "}
        <span className="font-normal">{t(POLICY_KEY[policy])}</span>
      </div>

      {disabledByPolicy ? (
        <Alert variant="destructive" className="text-xs">
          <AlertDescription>
            {t("disabled")}{" "}
            {reachable(policyHref) && (
              <Link
                href={policyHref}
                className="inline-flex items-center gap-1 underline"
              >
                <Settings className="size-4" />
                {t("setPolicy")}
              </Link>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-1 text-xs">
            <Row
              label={fill("unusedNights", { n: unusedNights })}
              value={money(unusedValue, locale)}
              muted
            />
          </div>
          {/* The refund, store credit, fee or forfeit this policy works out
              were shown here as amounts — and nothing applied them: the
              checkout records the departure and the balance, not the policy.
              Until that is a real money write, it says so instead (§5s). */}
          <p className="text-warning text-xs/snug">
            {earlyText("earlyCheckoutNotApplied")}
          </p>
          {customerNote && (
            <p className="text-ink-secondary text-xs/snug">{customerNote}</p>
          )}
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "blue" | "rose";
  muted?: boolean;
}) {
  const accentClass =
    accent === "emerald"
      ? "text-success"
      : accent === "blue"
        ? "text-info"
        : accent === "rose"
          ? "text-destructive"
          : "";
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        muted && "text-ink-secondary",
      )}
    >
      <span>{label}</span>
      <span className={cn("font-semibold tabular-nums", accentClass)}>
        {value}
      </span>
    </div>
  );
}
