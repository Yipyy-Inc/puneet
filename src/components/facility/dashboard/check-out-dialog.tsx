"use client";

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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePickerLux } from "@/components/ui/time-picker-lux";
import { cn } from "@/lib/utils";
import {
  getPetImage,
  type UnifiedBooking,
} from "@/hooks/use-unified-bookings";
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
  onConfirm: (options: {
    timestamp: string;
    earlyCheckout?: EarlyCheckoutAdjustment;
  }) => void;
}

const BUILTIN_ICONS: Record<string, typeof Sun> = {
  daycare: Sun,
  boarding: Bed,
  grooming: Scissors,
  training: GraduationCap,
};

const POLICY_LABEL: Record<EarlyCheckoutPolicy, string> = {
  none: "No refund",
  full_refund: "Full refund",
  partial_refund: "Partial refund",
  credit: "Store credit",
  fee: "Early checkout fee",
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
  const dt = new Date(
    y ?? 1970,
    (mo ?? 1) - 1,
    d ?? 1,
    h ?? 0,
    mi ?? 0,
    0,
    0,
  );
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
  const nightlyRate =
    totalNights > 0 ? totalPrice / totalNights : totalPrice;
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

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CheckOutDialog({
  booking,
  open,
  onOpenChange,
  onConfirm,
}: CheckOutDialogProps) {
  const settings = useSettings();
  const moduleConfig = getServiceConfig(booking.serviceKey, settings);
  const policy = moduleConfig?.settings.earlyCheckout;

  const todayIso = useMemo(() => toIsoDateString(new Date()), []);
  const [date, setDate] = useState<string>(todayIso);
  const [time, setTime] = useState(() => toTimeInputValue(null));

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
      earlyCheckout: adjustment ?? undefined,
    });
    onOpenChange(false);
    setDate(todayIso);
    setTime(toTimeInputValue(null));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="size-4" />
            Check Out
            <span className="text-muted-foreground font-normal">
              #{booking.rawId}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-2xl border bg-muted/30 p-3">
          {petImage ? (
            <div className="size-14 overflow-hidden rounded-2xl ring-2 ring-background">
              <Image
                src={petImage}
                alt={booking.petName}
                width={56}
                height={56}
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl ring-2 ring-background">
              <PawPrint className="size-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold leading-none">
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
                Scheduled {formatDate(booking.scheduledStart)} →{" "}
                {formatDate(booking.scheduledEnd)}
                {booking.totalNights
                  ? ` · ${booking.totalNights} night${booking.totalNights > 1 ? "s" : ""}`
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
                <Label className="text-sm font-medium">Check-out Date</Label>
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
                  placeholder="Select check-out date"
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="check-out-time" className="text-sm font-medium">
                Check-out Time
              </Label>
              <TimePickerLux
                id="check-out-time"
                value={time}
                onValueChange={setTime}
                displayMode="dialog"
              />
            </div>
          </div>

          {adjustment && adjustment.unusedNights > 0 && (
            <EarlyCheckoutSummary
              adjustment={adjustment}
              disabledByPolicy={!!earlyCheckoutDisabled}
            />
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!!earlyCheckoutDisabled}
            className={cn(
              "gap-1",
              "bg-violet-600 text-white hover:bg-violet-700",
            )}
          >
            <LogOut className="size-3.5" />
            {adjustment && adjustment.unusedNights > 0
              ? "Confirm Early Checkout"
              : "Check Out"}
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
  const {
    unusedNights,
    unusedValue,
    policy,
    refundAmount,
    creditAmount,
    feeAmount,
    creditExpiresDays,
    customerNote,
  } = adjustment;

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
        <AlertTriangle className="size-4" />
        Early Checkout ·{" "}
        <span className="font-normal">{POLICY_LABEL[policy]}</span>
      </div>

      {disabledByPolicy ? (
        <Alert variant="destructive" className="text-xs">
          <AlertDescription>
            Early checkout is currently disabled for boarding.{" "}
            <Link
              href="/facility/dashboard/services/boarding/settings#early-checkout"
              className="inline-flex items-center gap-1 underline"
            >
              <Settings className="size-3" />
              Configure policy
            </Link>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-1 text-xs">
            <Row
              label={`Unused nights (${unusedNights})`}
              value={formatMoney(unusedValue)}
              muted
            />
            {refundAmount > 0 && (
              <Row
                label="Refund to customer"
                value={formatMoney(refundAmount)}
                accent="emerald"
              />
            )}
            {creditAmount > 0 && (
              <Row
                label={
                  creditExpiresDays && creditExpiresDays > 0
                    ? `Store credit (expires in ${creditExpiresDays} days)`
                    : "Store credit"
                }
                value={formatMoney(creditAmount)}
                accent="blue"
              />
            )}
            {feeAmount > 0 && (
              <Row
                label="Early checkout fee"
                value={`− ${formatMoney(feeAmount)}`}
                accent="rose"
              />
            )}
            {policy === "none" && (
              <Row
                label="Customer forfeits"
                value={formatMoney(unusedValue)}
                accent="rose"
              />
            )}
          </div>
          {customerNote && (
            <p className="text-[11px] italic leading-snug text-amber-900/80 dark:text-amber-200/80">
              {customerNote}
            </p>
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
      ? "text-emerald-700 dark:text-emerald-300"
      : accent === "blue"
        ? "text-blue-700 dark:text-blue-300"
        : accent === "rose"
          ? "text-rose-700 dark:text-rose-300"
          : "";
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        muted && "text-muted-foreground",
      )}
    >
      <span>{label}</span>
      <span className={cn("font-semibold tabular-nums", accentClass)}>
        {value}
      </span>
    </div>
  );
}
