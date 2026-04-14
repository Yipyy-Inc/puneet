"use client";

import { use, useMemo } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
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
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { getYipyyGoForm } from "@/data/yipyygo-forms";
import { CheckInQRCode } from "@/components/yipyygo/CheckInQRCode";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatBookingRef } from "@/lib/booking-id";
import type { Booking } from "@/types/booking";

const MOCK_CUSTOMER_ID = 15;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getServiceName(booking: Booking) {
  const base =
    booking.service.charAt(0).toUpperCase() + booking.service.slice(1);
  const types: Record<string, string> = {
    full_groom: "Full Groom",
    bath_only: "Bath Only",
    standard: "Standard",
    full_day: "Full Day",
    half_day: "Half Day",
    deluxe: "Deluxe Suite",
    premium_suite: "Premium Suite",
    private_session: "Private Session",
    group_class: "Group Class",
  };
  const sub = booking.serviceType
    ? (types[booking.serviceType] ?? booking.serviceType)
    : null;
  return sub ? `${base} — ${sub}` : base;
}

const statusConfig: Record<
  string,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    label: string;
  }
> = {
  estimate_sent: { variant: "outline", label: "Estimate" },
  declined: { variant: "destructive", label: "Declined" },
  confirmed: { variant: "default", label: "Confirmed" },
  completed: { variant: "secondary", label: "Completed" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  pending: { variant: "outline", label: "Pending" },
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { selectedFacility: _selectedFacility } = useCustomerFacility();

  const booking = useMemo(
    () =>
      bookings.find(
        (b) => String(b.id) === id && b.clientId === MOCK_CUSTOMER_ID,
      ),
    [id],
  );

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  const pet = useMemo(() => {
    if (!booking || !customer) return null;
    const pid = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
    return customer.pets.find((p) => p.id === pid) ?? null;
  }, [booking, customer]);

  // YipyyGo
  const yipyyGoConfig = useMemo(() => {
    if (!booking) return null;
    return getYipyyGoConfig(booking.facilityId);
  }, [booking]);

  const isYipyyGoEnabled = useMemo(() => {
    if (!booking || !yipyyGoConfig || !yipyyGoConfig.enabled) return false;
    const svc = booking.service.toLowerCase() as
      | "daycare"
      | "boarding"
      | "grooming"
      | "training";
    return (
      yipyyGoConfig.serviceConfigs.find((s) => s.serviceType === svc)
        ?.enabled || false
    );
  }, [yipyyGoConfig, booking]);

  const yipyyGoForm = useMemo(
    () => (booking ? getYipyyGoForm(booking.id) : null),
    [booking],
  );

  if (!booking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-in fade-in text-center duration-500">
          <h2 className="text-2xl font-bold">Booking not found</h2>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/customer/bookings">
              <ArrowLeft className="mr-2 size-4" />
              Back to Bookings
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

  const status = statusConfig[booking.status] ?? statusConfig.pending;

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
          Back to Bookings
        </Link>
      </Button>

      {/* Header */}
      <div className="animate-in fade-in slide-in-from-top-2 mb-6 flex items-start justify-between gap-3 duration-300">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {formatBookingRef(booking.id)}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {fmtDate(booking.startDate)}
          </p>
        </div>
        <Badge variant={status.variant} className="text-xs">
          {status.label}
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
                  Price Estimate
                </p>
                <p className="mt-0.5 text-sm text-violet-700 dark:text-violet-300">
                  Review the details below and let us know if you&apos;d like to
                  proceed.
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1 gap-1.5"
                onClick={() =>
                  toast.success(
                    "Booking confirmed! The facility has been notified.",
                  )
                }
              >
                <CheckCircle2 className="size-4" />
                Confirm &amp; Book
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() =>
                  toast.info(
                    "Estimate declined. The facility has been notified.",
                  )
                }
              >
                <XCircle className="size-4" />
                Decline
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
                This booking was cancelled
              </p>
              {booking.cancellationReason && (
                <p className="mt-0.5 text-sm text-red-700 dark:text-red-300">
                  {booking.cancellationReason}
                </p>
              )}
              {booking.refundAmount != null && booking.refundAmount > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-700 dark:text-red-300">
                  <RotateCcw className="size-3.5" />
                  <span className="price-value">
                    ${booking.refundAmount.toFixed(2)}
                  </span>{" "}
                  refunded
                  {booking.refundMethod === "store_credit"
                    ? " as store credit"
                    : " to original payment"}
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
                      ? ` · ${pet.sex === "male" ? "Male" : "Female"}`
                      : ""}
                    {pet.weight ? ` · ${pet.weight} lbs` : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Service + Times */}
            <div className="p-5">
              <p className="text-lg font-semibold">{getServiceName(booking)}</p>
              <div className="mt-3 space-y-2 text-sm">
                <DetailRow
                  label={booking.service === "boarding" ? "Check-in" : "Date"}
                  value={`${fmtDate(booking.startDate)}${booking.checkInTime ? ` at ${fmtTime(booking.checkInTime)}` : ""}`}
                />
                {booking.service === "boarding" && (
                  <DetailRow
                    label="Check-out"
                    value={`${fmtDate(booking.endDate)}${booking.checkOutTime ? ` at ${fmtTime(booking.checkOutTime)}` : ""}`}
                  />
                )}
                {booking.service !== "boarding" &&
                  booking.checkInTime &&
                  booking.checkOutTime && (
                    <DetailRow
                      label="Time"
                      value={`${fmtTime(booking.checkInTime)} — ${fmtTime(booking.checkOutTime)}`}
                    />
                  )}
                {booking.kennel && (
                  <DetailRow label="Room" value={booking.kennel} />
                )}
              </div>

              {/* Special requests */}
              {booking.specialRequests && (
                <div className="bg-muted/20 mt-4 rounded-lg border border-dashed px-4 py-3">
                  <div className="mb-1 flex items-center gap-1.5">
                    <ClipboardList className="text-muted-foreground size-3.5" />
                    <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      Special Requests
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
                  Invoice
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  #{inv.id}
                </span>
              </div>

              <div className="p-5">
                {/* Services */}
                {serviceItems.length > 0 && (
                  <InvoiceSection icon={Sparkles} label="Services">
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
                  <InvoiceSection icon={Tag} label="Add-ons">
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
                  <InvoiceSection icon={ShoppingBag} label="Products">
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
                  <InvoiceSection icon={CircleDollarSign} label="Fees">
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
                <Row label="Subtotal" amount={inv.subtotal} bold />

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
                        label={inv.discountLabel ?? "Discount"}
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
                  ? inv.taxes.map((t, idx) => (
                      <Row
                        key={`t${idx}`}
                        label={`${t.name} (${(t.rate * 100).toFixed((t.rate * 100) % 1 === 0 ? 0 : 3)}%)`}
                        amount={t.amount}
                      />
                    ))
                  : inv.taxAmount > 0 && (
                      <Row
                        label={`Tax (${(inv.taxRate * 100).toFixed(2)}%)`}
                        amount={inv.taxAmount}
                      />
                    )}

                <Separator className="my-3" />

                {/* Total — emphasized */}
                <div className="bg-muted/40 flex items-center justify-between rounded-lg px-3 py-2.5">
                  <span className="text-base font-bold">Total</span>
                  <span className="price-value text-base">
                    ${inv.total.toFixed(2)}
                  </span>
                </div>

                {/* Payments + Balance */}
                {(inv.payments.length > 0 || inv.depositCollected > 0) && (
                  <div className="mt-4">
                    <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                      Payments
                    </p>
                    {inv.payments.map((p, idx) => (
                      <Row
                        key={`pay${idx}`}
                        label={`${p.method === "card" ? "Card" : p.method === "cash" ? "Cash" : p.method} — ${fmtDate(p.date)}`}
                        amount={-p.amount}
                        green
                      />
                    ))}
                    {inv.depositCollected > 0 &&
                      !inv.payments.some(
                        (p) => p.amount === inv.depositCollected,
                      ) && (
                        <Row
                          label="Deposit"
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
                      <span className="font-bold">Balance</span>
                      {isPaid ? (
                        <span className="flex items-center gap-1.5 font-[tabular-nums] font-bold text-emerald-600">
                          <CheckCircle2 className="size-4" />
                          Paid in full
                        </span>
                      ) : (
                        <span className="price-value text-amber-700 dark:text-amber-400">
                          ${inv.remainingDue.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Membership badge */}
                {inv.membershipApplied && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
                    <Sparkles className="size-3.5" />
                    {inv.membershipApplied} membership applied
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
              <p className="mb-3 text-sm font-medium">
                Show at drop-off for fast check-in
              </p>
              <div className="rounded-xl bg-white p-3 shadow-sm">
                <CheckInQRCode
                  token={yipyyGoForm!.qrCheckInToken!}
                  size={160}
                />
              </div>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href={`/customer/bookings/${booking.id}/check-in-qr`}>
                  Full-screen QR
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
                <p className="mb-2 font-semibold">Ready to check in?</p>
                <GroomingCheckInButton
                  bookingId={String(booking.id)}
                  clientId={MOCK_CUSTOMER_ID}
                />
              </CardContent>
            </Card>
          )}

        {/* ── Actions ── */}
        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-2 pt-2 duration-500 sm:flex-row">
          <Button variant="outline" className="flex-1" asChild>
            <Link href="/customer/bookings">
              <ArrowLeft className="mr-1.5 size-4" />
              All Bookings
            </Link>
          </Button>
          {isYipyyGoEnabled && booking.status === "confirmed" && isUpcoming && (
            <Button className="flex-1" asChild>
              <Link href={`/customer/bookings/${booking.id}/yipyygo-form`}>
                <FileText className="mr-1.5 size-4" />
                Complete Express Check-in Form
              </Link>
            </Button>
          )}
          {!isCancelled && isUpcoming && (
            <Button variant="outline" className="flex-1" asChild>
              <Link href="/customer/messages">
                <MessageSquare className="mr-1.5 size-4" />
                Message Us
              </Link>
            </Button>
          )}
          {isCompleted && (
            <Button className="flex-1" asChild>
              <Link href="/customer/bookings/new">
                <RotateCcw className="mr-1.5 size-4" />
                Book Again
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
  return (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-sm", bold && "font-semibold")}>{label}</span>
      <span className={cn("price-value text-sm", green && "text-emerald-600")}>
        {amount < 0
          ? `-$${Math.abs(amount).toFixed(2)}`
          : `$${amount.toFixed(2)}`}
      </span>
    </div>
  );
}
