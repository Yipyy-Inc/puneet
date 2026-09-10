"use client";

import { use, useMemo } from "react";
import { useCurrentCustomer } from "@/lib/api/current-customer";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { bookings } from "@/data/bookings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  QrCode,
  ShoppingBag,
  Sparkles,
  Tag,
  CircleDollarSign,
  AlertTriangle,
  RotateCcw,
  MessageSquare,
  ClipboardList,
  XCircle,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { GroomingCheckInButton } from "@/components/grooming/GroomingCheckInButton";
import { useCustomerYipyyGo } from "@/lib/api/customer-yipyy-go";
import { yipyyGoRequirementFor } from "@/lib/settings/yipyy-go";
import { getYipyyGoForm } from "@/data/yipyygo-forms";
import { CheckInQRCode } from "@/components/yipyygo/CheckInQRCode";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatBookingRef } from "@/lib/booking-id";
import type { Booking } from "@/types/booking";
import { PageHeader } from "@/components/ui/page-header";
import { useCustomerText } from "@/lib/customer/use-customer-text";
import type { AppLocale } from "@/lib/language-settings";
import {
  formatDateLong,
  formatMoney,
  formatPercent,
  formatTimeOfDay,
  formatWeight,
} from "@/lib/i18n/format";
import { serviceTypeLabel, statusLabel } from "@/lib/i18n/labels";
import { rich } from "@/lib/i18n/rich";

// ── Helpers ──────────────────────────────────────────────────────────────────

// §5q: Intl, in the reader's locale. `fmtTime` was a hand-built "9:00 AM",
// which French reads as "9 h 00".
function fmtDate(dateStr: string, locale: AppLocale) {
  return formatDateLong(dateStr, locale);
}

function fmtTime(time: string, locale: AppLocale) {
  return formatTimeOfDay(time, locale);
}

/**
 * "Grooming — Full groom" · "Toilettage — Toilettage complet".
 *
 * The service comes from `messages.serviceTypes`; the sub-type from this
 * page's catalogue, keyed by the id the record carries. An id nobody mapped
 * reads as the record has it, underscores turned to spaces — never raw.
 */
function getServiceName(
  booking: Booking,
  locale: AppLocale,
  t: (key: string) => string,
) {
  const base = serviceTypeLabel(locale, booking.service);
  if (!booking.serviceType) return base;
  // french-ok: a catalogue KEY built from the id the record carries, not copy
  const key = `serviceType_${booking.serviceType}`;
  const translated = t(key);
  const sub =
    translated === key ? booking.serviceType.replace(/_/g, " ") : translated;
  return `${base} — ${sub}`;
}

// The VARIANT per status. The words come from `messages.status` — and a
// status this table does not know now reads as itself, where it used to be
// labelled "Pending" whatever it actually was.
const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  estimate_sent: "outline",
  declined: "destructive",
  confirmed: "default",
  completed: "secondary",
  cancelled: "destructive",
  pending: "outline",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { t, fill, locale } = useCustomerText("bookingDetail");
  const { client: customer } = useCurrentCustomer();
  const customerId = customer?.id;

  const { id } = use(params);
  const { selectedFacility: _selectedFacility } = useCustomerFacility();

  const booking = useMemo(
    () =>
      bookings.find((b) => String(b.id) === id && b.clientId === customerId),
    [customerId, id],
  );

  const pet = useMemo(() => {
    if (!booking || !customer) return null;
    const pid = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
    return customer.pets.find((p) => p.id === pid) ?? null;
  }, [booking, customer]);

  // Their facility's Yipyy Go setup, read through their client row. It used to
  // be `getYipyyGoConfig(booking.facilityId)` — a fixture array in the bundle,
  // so this page told a customer about a form a seed file had written.
  const { config: yipyyGoConfig, isPending: yipyyGoPending } =
    useCustomerYipyyGo();

  const isYipyyGoEnabled = useMemo(() => {
    // Not while it is loading. The fallback is switched off, so rendering
    // through the pending state hides a form the customer is actually expected
    // to complete before they arrive.
    if (yipyyGoPending || !booking) return false;
    return Boolean(
      yipyyGoRequirementFor(yipyyGoConfig, booking.service.toLowerCase()),
    );
  }, [yipyyGoConfig, yipyyGoPending, booking]);

  const yipyyGoForm = useMemo(
    () => (booking ? getYipyyGoForm(booking.id) : null),
    [booking],
  );

  if (!booking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-in fade-in text-center duration-500">
          <h2 className="text-2xl font-bold">{t("notFound")}</h2>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/customer/bookings">
              <ArrowLeft className="mr-2 size-4" />
              {t("backToBookings")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const bookingDate = new Date(booking.startDate);
  const isToday = bookingDate.toDateString() === new Date().toDateString();
  const isUpcoming = bookingDate >= new Date();
  const isGrooming = booking.service.toLowerCase() === "grooming";
  const isSalon = booking.serviceType === "salon" || !booking.serviceType;
  const hasCheckInQR = Boolean(
    yipyyGoForm?.qrCheckInToken &&
    (yipyyGoForm.submittedAt || yipyyGoForm.staffStatus === "approved"),
  );

  const inv = booking.invoice;
  const isPaid = inv ? inv.remainingDue <= 0 : false;
  const isCancelled = booking.status === "cancelled";
  const isCompleted = booking.status === "completed";
  const isEstimate = booking.status === "estimate_sent";

  const statusVariant = STATUS_VARIANT[booking.status] ?? "outline";

  // Categorize invoice items
  const serviceItems =
    inv?.items.filter((i) => !i.type || i.type === "service") ?? [];
  const addonItems = inv?.items.filter((i) => i.type === "addon") ?? [];
  const productItems = inv?.items.filter((i) => i.type === "product") ?? [];
  const creditItems =
    inv?.items.filter((i) => i.type === "package_credit") ?? [];

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground mb-4 -ml-2 gap-1.5"
        asChild
      >
        <Link href="/customer/bookings">
          <ArrowLeft className="size-4" />
          {t("backToBookings")}
        </Link>
      </Button>

      {/* Header */}
      <div className="animate-in fade-in slide-in-from-top-2 mb-6 flex items-start justify-between gap-3 duration-300">
        <PageHeader
          title={formatBookingRef(booking.id)}
          description={fmtDate(booking.startDate, locale)}
        />
        <Badge variant={statusVariant} className="text-xs">
          {statusLabel(locale, booking.status)}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* ── Estimate Banner ── */}
        {isEstimate && (
          <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-violet-200 bg-violet-50 p-5 duration-400 dark:border-violet-900 dark:bg-violet-950/20">
            <div className="flex items-start gap-3">
              <Receipt className="mt-0.5 size-5 shrink-0 text-violet-600" />
              <div className="flex-1">
                <p className="font-semibold text-violet-900 dark:text-violet-200">
                  {t("estimateTitle")}
                </p>
                <p className="mt-0.5 text-sm text-violet-700 dark:text-violet-300">
                  {t("estimateBody")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1 gap-1.5"
                onClick={() => toast.success(t("estimateAcceptedToast"))}
              >
                <CheckCircle2 className="size-4" />
                {t("confirmAndBook")}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => toast.info(t("estimateDeclinedToast"))}
              >
                <XCircle className="size-4" />
                {t("declineEstimate")}
              </Button>
            </div>
          </div>
        )}

        {/* ── Cancelled Banner ── */}
        {isCancelled && (
          <div className="animate-in fade-in slide-in-from-top-2 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 duration-400 dark:border-red-900 dark:bg-red-950/20">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-500" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-200">
                {t("cancelledTitle")}
              </p>
              {booking.cancellationReason && (
                <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">
                  {booking.cancellationReason}
                </p>
              )}
              {booking.refundAmount != null && booking.refundAmount > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-300">
                  <RotateCcw className="size-3.5" />
                  {rich(
                    t(
                      booking.refundMethod === "store_credit"
                        ? "refundedAsCredit"
                        : "refundedToPayment",
                    ),
                    {
                      amount: (
                        <span className="price-value">
                          {formatMoney(booking.refundAmount, locale)}
                        </span>
                      ),
                    },
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Pet + Appointment ── */}
        <Card className="animate-in fade-in slide-in-from-bottom-2 overflow-hidden duration-300">
          <CardContent className="p-0">
            {/* Pet strip */}
            {pet && (
              <div className="bg-muted/30 flex items-center gap-3.5 border-b px-5 py-4">
                <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full text-lg font-bold ring-2 ring-white">
                  {pet.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold">{pet.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {pet.breed}
                    {pet.sex
                      ? ` · ${pet.sex === "male" ? t("sexMale") : t("sexFemale")}`
                      : ""}
                    {/* Metric leads, imperial follows (§5q). This read
                        "{weight} lbs" while the booking wizard reads the SAME
                        field as kilograms — recorded in the debt map. */}
                    {pet.weight ? ` · ${formatWeight(pet.weight, locale)}` : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Service + Times */}
            <div className="p-5">
              <p className="text-lg font-semibold">
                {getServiceName(booking, locale, t)}
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <DetailRow
                  label={
                    booking.service === "boarding" ? t("checkIn") : t("date")
                  }
                  value={
                    booking.checkInTime
                      ? fill("dateAtTime", {
                          date: fmtDate(booking.startDate, locale),
                          time: fmtTime(booking.checkInTime, locale),
                        })
                      : fmtDate(booking.startDate, locale)
                  }
                />
                {booking.service === "boarding" && (
                  <DetailRow
                    label={t("checkOut")}
                    value={
                      booking.checkOutTime
                        ? fill("dateAtTime", {
                            date: fmtDate(booking.endDate, locale),
                            time: fmtTime(booking.checkOutTime, locale),
                          })
                        : fmtDate(booking.endDate, locale)
                    }
                  />
                )}
                {booking.service !== "boarding" &&
                  booking.checkInTime &&
                  booking.checkOutTime && (
                    <DetailRow
                      label={t("time")}
                      value={`${fmtTime(booking.checkInTime, locale)} – ${fmtTime(booking.checkOutTime, locale)}`}
                    />
                  )}
                {booking.kennel && (
                  <DetailRow label={t("room")} value={booking.kennel} />
                )}
              </div>

              {/* Special requests */}
              {booking.specialRequests && (
                <div className="bg-muted/20 mt-4 rounded-lg border border-dashed px-4 py-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <ClipboardList className="text-muted-foreground size-3.5" />
                    <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      {t("specialRequests")}
                    </span>
                  </div>
                  <p className="text-sm/relaxed">{booking.specialRequests}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Invoice Breakdown ── */}
        {inv && (
          <Card className="animate-in fade-in slide-in-from-bottom-3 overflow-hidden duration-400">
            <CardContent className="p-0">
              {/* Invoice header */}
              <div className="bg-muted/30 flex items-center justify-between border-b px-5 py-3">
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  {t("invoice")}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  #{inv.id}
                </span>
              </div>

              <div className="p-5">
                {/* Services */}
                {serviceItems.length > 0 && (
                  <InvoiceSection icon={Sparkles} label={t("services")}>
                    {serviceItems.map((item, idx) => (
                      <Row
                        key={`s${idx}`}
                        label={item.name}
                        amount={item.price}
                      />
                    ))}
                  </InvoiceSection>
                )}

                {/* Add-ons */}
                {addonItems.length > 0 && (
                  <InvoiceSection icon={Tag} label={t("addOns")}>
                    {addonItems.map((item, idx) => (
                      <Row
                        key={`a${idx}`}
                        label={item.name}
                        amount={item.price}
                      />
                    ))}
                  </InvoiceSection>
                )}

                {/* Products */}
                {productItems.length > 0 && (
                  <InvoiceSection icon={ShoppingBag} label={t("products")}>
                    {productItems.map((item, idx) => (
                      <Row
                        key={`p${idx}`}
                        label={`${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ""}`}
                        amount={item.price}
                      />
                    ))}
                  </InvoiceSection>
                )}

                {/* Fees */}
                {inv.fees.length > 0 && (
                  <InvoiceSection icon={CircleDollarSign} label={t("fees")}>
                    {inv.fees.map((fee, idx) => (
                      <Row
                        key={`f${idx}`}
                        label={fee.name}
                        amount={fee.price}
                      />
                    ))}
                  </InvoiceSection>
                )}

                <Separator className="my-3" />

                {/* Subtotal */}
                <Row label={t("subtotal")} amount={inv.subtotal} bold />

                {/* Discounts */}
                {inv.discounts && inv.discounts.length > 0
                  ? inv.discounts.map((d, idx) => (
                      <Row
                        key={`d${idx}`}
                        label={d.name}
                        amount={-d.price}
                        green
                      />
                    ))
                  : inv.discount > 0 && (
                      <Row
                        label={inv.discountLabel ?? t("discount")}
                        amount={-inv.discount}
                        green
                      />
                    )}

                {/* Package credits */}
                {creditItems.map((item, idx) => (
                  <Row
                    key={`pc${idx}`}
                    label={item.name}
                    amount={-Math.abs(item.price)}
                    green
                  />
                ))}

                {/* Tax */}
                {inv.taxes && inv.taxes.length > 0
                  ? inv.taxes.map((tax, idx) => (
                      <Row
                        key={`t${idx}`}
                        label={`${tax.name} (${formatPercent(tax.rate * 100, locale, (tax.rate * 100) % 1 === 0 ? 0 : 3)})`}
                        amount={tax.amount}
                      />
                    ))
                  : inv.taxAmount > 0 && (
                      <Row
                        label={fill("taxWithRate", {
                          rate: formatPercent(inv.taxRate * 100, locale, 2),
                        })}
                        amount={inv.taxAmount}
                      />
                    )}

                <Separator className="my-3" />

                {/* Total — emphasized */}
                <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2.5">
                  <span className="text-base font-bold">{t("total")}</span>
                  <span className="price-value text-base">
                    {formatMoney(inv.total, locale)}
                  </span>
                </div>

                {/* Payments + Balance */}
                {(inv.payments.length > 0 || inv.depositCollected > 0) && (
                  <div className="mt-4">
                    <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                      {t("payments")}
                    </p>
                    {inv.payments.map((p, idx) => (
                      <Row
                        key={`pay${idx}`}
                        label={`${p.method === "card" ? t("methodCard") : p.method === "cash" ? t("methodCash") : p.method} — ${fmtDate(p.date, locale)}`}
                        amount={-p.amount}
                        green
                      />
                    ))}
                    {inv.depositCollected > 0 &&
                      !inv.payments.some(
                        (p) => p.amount === inv.depositCollected,
                      ) && (
                        <Row
                          label={t("deposit")}
                          amount={-inv.depositCollected}
                          green
                        />
                      )}

                    <div
                      className={cn(
                        "mt-2 flex items-center justify-between rounded-lg px-3 py-2.5",
                        isPaid
                          ? "bg-emerald-50 dark:bg-emerald-950/20"
                          : "bg-amber-50 dark:bg-amber-950/20",
                      )}
                    >
                      <span className="font-bold">{t("balance")}</span>
                      {isPaid ? (
                        <span className="flex items-center gap-1.5 font-[tabular-nums] font-bold text-emerald-600">
                          <CheckCircle2 className="size-4" />
                          {t("paidInFull")}
                        </span>
                      ) : (
                        <span className="price-value text-amber-700 dark:text-amber-400">
                          {formatMoney(inv.remainingDue, locale)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Membership badge */}
                {inv.membershipApplied && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                    <Sparkles className="size-3.5" />
                    {fill("membershipApplied", {
                      plan: inv.membershipApplied,
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── YipyyGo QR ── */}
        {hasCheckInQR && isUpcoming && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 border-primary/30 bg-primary/5 duration-500">
            <CardContent className="flex flex-col items-center p-5">
              <QrCode className="text-primary mb-1 size-5" />
              <p className="mb-3 text-sm font-medium">{t("qrHelp")}</p>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <CheckInQRCode
                  token={yipyyGoForm!.qrCheckInToken!}
                  size={160}
                />
              </div>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href={`/customer/bookings/${booking.id}/check-in-qr`}>
                  {t("qrFullScreen")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Grooming check-in ── */}
        {isGrooming &&
          isSalon &&
          isToday &&
          isUpcoming &&
          booking.status === "confirmed" && (
            <Card className="animate-in fade-in border-primary/30 bg-primary/5 duration-400">
              <CardContent className="p-5">
                <p className="mb-2 font-semibold">{t("readyToCheckIn")}</p>
                <GroomingCheckInButton
                  bookingId={String(booking.id)}
                  clientId={customerId ?? 0}
                />
              </CardContent>
            </Card>
          )}

        {/* ── Actions ── */}
        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-2 pt-2 duration-500 sm:flex-row">
          <Button variant="outline" className="flex-1" asChild>
            <Link href="/customer/bookings">
              <ArrowLeft className="mr-1.5 size-4" />
              {t("allBookings")}
            </Link>
          </Button>
          {isYipyyGoEnabled && booking.status === "confirmed" && isUpcoming && (
            <Button className="flex-1" asChild>
              <Link href={`/customer/bookings/${booking.id}/yipyygo-form`}>
                <FileText className="mr-1.5 size-4" />
                {t("completeExpressForm")}
              </Link>
            </Button>
          )}
          {!isCancelled && isUpcoming && (
            <Button variant="outline" className="flex-1" asChild>
              <Link href="/customer/messages">
                <MessageSquare className="mr-1.5 size-4" />
                {t("messageUs")}
              </Link>
            </Button>
          )}
          {isCompleted && (
            <Button className="flex-1" asChild>
              <Link href="/customer/bookings/new">
                <RotateCcw className="mr-1.5 size-4" />
                {t("bookAgain")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function InvoiceSection({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="text-muted-foreground/60 size-3.5" />
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  amount,
  bold,
  green,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  green?: boolean;
}) {
  const { locale } = useCustomerText("bookingDetail");
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-sm", bold && "font-semibold")}>{label}</span>
      <span className={cn("price-value text-sm", green && "text-emerald-600")}>
        {amount < 0
          ? `−${formatMoney(Math.abs(amount), locale)}`
          : formatMoney(amount, locale)}
      </span>
    </div>
  );
}
