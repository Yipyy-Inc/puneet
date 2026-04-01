"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  PawPrint,
  Pencil,
  Plus,
  Printer,
  Send,
  CreditCard,
  Banknote,
  ChevronDown,
  Mail,
  Smartphone,
  FileText,
  ClipboardList,
  ShieldCheck,
  RotateCcw,
  XCircle,
  Circle,
  CircleDot,
  CheckCircle2,
  ListChecks,
  Clock,
  CalendarDays,
  MapPin,
  AlertTriangle,
  HandCoins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { bookings as initialBookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { products } from "@/data/retail";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InvoicePanel } from "@/components/bookings/InvoicePanel";
import { BookingNotes } from "@/components/bookings/BookingNotes";
import { EditBookingModal } from "@/components/bookings/modals/EditBookingModal";
import { ProcessPaymentModal } from "@/components/bookings/modals/ProcessPaymentModal";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";
import { TagList } from "@/components/shared/TagList";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";
import { PaymentCheckoutFlow } from "@/components/bookings/PaymentCheckoutFlow";
import { TipSplitModal } from "@/components/bookings/TipSplitModal";
import { DepositChargeModal } from "@/components/bookings/DepositChargeModal";
import { SendEstimateModal } from "@/components/bookings/SendEstimateModal";
import { RefundModal } from "@/components/bookings/RefundModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getPetAgeDisplay } from "@/lib/pet-utils";
import type { InvoiceLineItem } from "@/types/booking";
import type { GeneratedTask } from "@/types/task";
import {
  getTasksForBooking,
  completeTask,
  startTask,
} from "@/data/generated-tasks";

// ========================================
// Helpers
// ========================================

function nightsBetween(start: string, end: string) {
  const ms =
    new Date(end + "T00:00:00").getTime() -
    new Date(start + "T00:00:00").getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function formatDateLong(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function statusConfig(status: string) {
  switch (status) {
    case "completed":
      return {
        dot: "bg-emerald-500",
        bg: "bg-emerald-50 border-emerald-200 text-emerald-700",
      };
    case "confirmed":
      return {
        dot: "bg-blue-500",
        bg: "bg-blue-50 border-blue-200 text-blue-700",
      };
    case "pending":
      return {
        dot: "bg-amber-500",
        bg: "bg-amber-50 border-amber-200 text-amber-700",
      };
    case "cancelled":
      return { dot: "bg-red-500", bg: "bg-red-50 border-red-200 text-red-700" };
    default:
      return { dot: "bg-muted-foreground", bg: "bg-muted" };
  }
}

// ========================================
// Page
// ========================================

export default function ClientBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string; bookingId: string }>;
}) {
  const { id, bookingId: bookingIdStr } = use(params);
  const clientId = parseInt(id, 10);
  const bookingId = parseInt(bookingIdStr, 10);

  const booking = useMemo(
    () => initialBookings.find((b) => b.id === bookingId),
    [bookingId],
  );
  const client = useMemo(
    () => clients.find((c) => c.id === clientId),
    [clientId],
  );
  const pet = useMemo(() => {
    if (!client || !booking) return null;
    const pid = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
    return client.pets?.find((p) => p.id === pid);
  }, [client, booking]);

  const nights = booking
    ? nightsBetween(booking.startDate, booking.endDate)
    : 0;
  const isCancelled = booking?.status === "cancelled";
  const isPaid = booking?.paymentStatus === "paid";

  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [tipSplitOpen, setTipSplitOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<InvoiceLineItem[]>([]);

  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  useEffect(() => {
    setTasks(getTasksForBooking(bookingId));
  }, [bookingId]);

  if (!booking || !client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Booking not found.</p>
      </div>
    );
  }

  const invoice = booking.invoice;
  const addedSubtotal = addedItems.reduce((s, i) => s + i.price, 0);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const sc = statusConfig(booking.status);

  return (
    <div className="space-y-5 p-5 md:p-7">
      {/* Breadcrumb */}
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
        <Link
          href={`/facility/dashboard/clients/${clientId}/overview`}
          className="hover:text-foreground transition-colors"
        >
          {client.name}
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <Link
          href={`/facility/dashboard/clients/${clientId}/bookings`}
          className="hover:text-foreground transition-colors"
        >
          Booking History
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-foreground font-medium">#{booking.id}</span>
      </div>

      {/* Deposit Notice — unpaid */}
      {!isPaid && !isCancelled && (invoice?.depositCollected ?? 0) === 0 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Banknote className="size-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800">
                Deposit Required
              </p>
              <p className="text-xs text-blue-600">
                Rule: 50% of service total — $
                {(booking.totalCost * 0.5).toFixed(2)} due before check-in
              </p>
              <p className="text-[10px] text-blue-500">
                Paying the deposit will auto-confirm this booking
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setDepositOpen(true)}
          >
            <Banknote className="size-3.5" />
            Charge Deposit
          </Button>
        </div>
      )}

      {/* Deposit Collected — with auto-confirm note */}
      {(invoice?.depositCollected ?? 0) > 0 && !isPaid && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-emerald-800">
                Deposit Collected — $
                {(invoice?.depositCollected ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-emerald-600">
                Remaining balance:{" "}
                <span className="font-[tabular-nums] font-medium">
                  ${(invoice?.remainingDue ?? booking.totalCost).toFixed(2)}
                </span>{" "}
                · Booking auto-confirmed
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {booking.status !== "confirmed" && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  toast.success(
                    "Checked in — invoice status changed to Open",
                  )
                }
              >
                Continue to Check In
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Finished Notice */}
      {(booking.status === "completed" || isPaid) && !isCancelled && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            This booking is <strong>finished</strong>. Date, time, service
            prices, and items are locked. You can still view the receipt, split
            tips, or issue a refund. If a correction is needed, cancel and
            refund this invoice, then create a new booking.
          </span>
        </div>
      )}

      {/* ── Hero Header ── */}
      <div className="from-card to-muted/20 rounded-xl border bg-gradient-to-r p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Booking #{booking.id}
              </h1>
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1",
                  sc.bg,
                )}
              >
                <div className={cn("size-2 rounded-full", sc.dot)} />
                <span className="text-xs font-semibold capitalize">
                  {booking.status}
                </span>
              </div>
            </div>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                {formatDateShort(booking.startDate)}
                {booking.startDate !== booking.endDate &&
                  ` → ${formatDateShort(booking.endDate)}`}
              </span>
              {nights > 0 && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {nights} night{nights !== 1 ? "s" : ""}
                </span>
              )}
              <span className="capitalize">{booking.service}</span>
              {booking.kennel && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5" />
                  {booking.kennel}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="font-[tabular-nums] text-2xl font-bold">
              ${(booking.invoice?.total ?? booking.totalCost).toFixed(2)}
            </p>
            <StatusBadge type="status" value={booking.paymentStatus} />
          </div>
        </div>

        {/* Action bar — inside the hero */}
        <div className="border-border/50 mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          {/* Edit Booking — not available on finished (completed/paid) bookings */}
          {booking.status !== "completed" && !isPaid && !isCancelled && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" />
              Edit Booking
            </Button>
          )}

          {/* View Estimate — only for estimate invoices */}
          {invoice?.status === "estimate" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setEstimateOpen(true)}
            >
              <FileText className="size-3.5" />
              View Estimate
            </Button>
          )}

          {/* Add Item — not on finished bookings */}
          {!isCancelled && booking.status !== "completed" && !isPaid && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                >
                  <Plus className="size-3.5" />
                  Add Item
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {products.slice(0, 5).map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => {
                      setAddedItems((prev) => [
                        ...prev,
                        {
                          name: p.name,
                          unitPrice: p.basePrice,
                          quantity: 1,
                          price: p.basePrice,
                        },
                      ]);
                      toast.success(`Added "${p.name}"`);
                    }}
                  >
                    {p.name} · ${p.basePrice}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                <Printer className="size-3.5" />
                Print
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => {
                  const inv = invoice;
                  const w = window.open("", "_blank", "width=600,height=800");
                  if (!w) return;
                  w.document
                    .write(`<!DOCTYPE html><html><head><title>Invoice #${inv?.id ?? booking.id}</title>
<style>body{font-family:-apple-system,sans-serif;padding:40px;color:#111;max-width:500px;margin:0 auto}
h1{font-size:20px;margin:0}h2{font-size:13px;color:#666;margin:4px 0 20px;font-weight:normal}
.row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #eee}
.row.total{border-top:2px solid #111;border-bottom:none;font-weight:700;font-size:15px;padding-top:10px}
.row.sub{color:#666}.header{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}
.section{margin-top:16px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
.footer{margin-top:30px;text-align:center;font-size:11px;color:#999}
@media print{body{padding:20px}}</style></head><body>
<div class="header"><h1>Invoice ${inv?.id ?? `#${booking.id}`}</h1>
<h2>${client.name} · ${pet?.name ?? "Pet"} · ${booking.service}</h2></div>
<div class="section">Services</div>
${(
  inv?.items ?? [
    {
      name: booking.service,
      unitPrice: booking.basePrice,
      quantity: 1,
      price: booking.totalCost,
    },
  ]
)
  .map(
    (item) =>
      `<div class="row"><span>${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ""}</span><span>$${item.price.toFixed(2)}</span></div>`,
  )
  .join("")}
${(inv?.fees ?? []).map((f) => `<div class="row sub"><span>${f.name}</span><span>$${f.price.toFixed(2)}</span></div>`).join("")}
<div class="row sub"><span>Subtotal</span><span>$${(inv?.subtotal ?? booking.totalCost).toFixed(2)}</span></div>
${(inv?.discount ?? 0) > 0 ? `<div class="row sub"><span>Discount${inv?.discountLabel ? ` (${inv.discountLabel})` : ""}</span><span>-$${(inv?.discount ?? 0).toFixed(2)}</span></div>` : ""}
${(inv?.taxes ?? []).map((t) => `<div class="row sub"><span>${t.name} (${(t.rate * 100).toFixed(t.rate < 0.1 ? 1 : 3)}%)</span><span>$${t.amount.toFixed(2)}</span></div>`).join("")}
${!inv?.taxes?.length && (inv?.taxAmount ?? 0) > 0 ? `<div class="row sub"><span>Tax</span><span>$${(inv?.taxAmount ?? 0).toFixed(2)}</span></div>` : ""}
<div class="row total"><span>Total</span><span>$${(inv?.total ?? booking.totalCost).toFixed(2)}</span></div>
${(inv?.depositCollected ?? 0) > 0 ? `<div class="row sub"><span>Deposit Paid</span><span>-$${(inv?.depositCollected ?? 0).toFixed(2)}</span></div><div class="row"><span>Remaining</span><span>$${(inv?.remainingDue ?? 0).toFixed(2)}</span></div>` : ""}
${(inv?.tipTotal ?? 0) > 0 ? `<div class="row sub"><span>Tip</span><span>$${(inv?.tipTotal ?? 0).toFixed(2)}</span></div>` : ""}
<div class="footer">Thank you for choosing us!<br>Example Pet Care Facility</div>
</body></html>`);
                  w.document.close();
                  w.print();
                }}
              >
                <FileText className="size-4" />
                Invoice / Receipt
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.success("Care sheet printed")}
              >
                <ClipboardList className="size-4" />
                Care Sheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
              >
                <Send className="size-3.5" />
                Send
                <ChevronDown className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => toast.success("Invoice emailed")}
              >
                <Mail className="size-4" />
                Email Invoice
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.success("SMS sent")}>
                <Smartphone className="size-4" />
                SMS Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Deposit — only on estimates with no deposit yet */}
          {invoice?.status === "estimate" &&
            !isCancelled &&
            (invoice?.depositCollected ?? 0) === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setDepositOpen(true)}
              >
                <Banknote className="size-3.5" />
                Charge Deposit
              </Button>
            )}

          {/* Mark as Ready — for confirmed/in-progress bookings */}
          {(booking.status === "confirmed" || booking.status === "pending") && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() =>
                toast.success("Service marked as ready — proceed to checkout")
              }
            >
              <CheckCircle2 className="size-3.5" />
              Mark as Ready
            </Button>
          )}

          {/* Checkout — for open/completed bookings */}
          {!isPaid && !isCancelled && (
            <>
              <Button
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setCheckoutOpen(true)}
              >
                <CreditCard className="size-3.5" />
                Proceed to Checkout
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() =>
                  toast.success(
                    "Appointment marked as finished — invoice stays open for later billing",
                  )
                }
              >
                <CheckCircle2 className="size-3.5" />
                Finish Without Payment
              </Button>
            </>
          )}

          <div className="flex-1" />

          {/* Paid booking actions */}
          {isPaid && !isCancelled && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => setTipSplitOpen(true)}
              >
                Split Tips
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() => {
                  const inv = invoice;
                  const w = window.open("", "_blank", "width=600,height=800");
                  if (!w) return;
                  w.document
                    .write(`<!DOCTYPE html><html><head><title>Receipt ${inv?.id ?? booking.id}</title>
<style>body{font-family:-apple-system,sans-serif;padding:40px;color:#111;max-width:500px;margin:0 auto}
h1{font-size:20px;margin:0}h2{font-size:13px;color:#666;margin:4px 0 20px;font-weight:normal}
.row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #eee}
.row.total{border-top:2px solid #111;border-bottom:none;font-weight:700;font-size:15px;padding-top:10px}
.row.sub{color:#666}.header{border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:16px}
.section{margin-top:16px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
.footer{margin-top:30px;text-align:center;font-size:11px;color:#999}
.paid{background:#ecfdf5;color:#059669;padding:8px 16px;border-radius:8px;text-align:center;margin-top:16px;font-weight:600}
</style></head><body>
<div class="header"><h1>Receipt</h1><h2>${inv?.id ?? `#${booking.id}`} · ${client.name} · ${pet?.name ?? "Pet"}</h2></div>
<div class="section">Services</div>
${(inv?.items ?? []).map((item) => `<div class="row"><span>${item.name}${item.staffName ? ` <small style="color:#888">· ${item.staffName}</small>` : ""}</span><span>$${item.price.toFixed(2)}</span></div>`).join("")}
${(inv?.fees ?? []).map((f) => `<div class="row sub"><span>${f.name}</span><span>$${f.price.toFixed(2)}</span></div>`).join("")}
<div class="row sub"><span>Subtotal</span><span>$${(inv?.subtotal ?? booking.totalCost).toFixed(2)}</span></div>
${(inv?.discount ?? 0) > 0 ? `<div class="row sub"><span>Discount</span><span>-$${(inv?.discount ?? 0).toFixed(2)}</span></div>` : ""}
${(inv?.taxes ?? []).map((t) => `<div class="row sub"><span>${t.name}</span><span>$${t.amount.toFixed(2)}</span></div>`).join("")}
${(inv?.tipTotal ?? 0) > 0 ? `<div class="row sub"><span>Tip</span><span>$${(inv?.tipTotal ?? 0).toFixed(2)}</span></div>` : ""}
<div class="row total"><span>Total Charged</span><span>$${(inv?.total ?? booking.totalCost).toFixed(2)}</span></div>
${(inv?.payments ?? []).length > 0 ? `<div class="section">Payment</div>${(inv?.payments ?? []).map((p) => `<div class="row"><span>${p.method}${p.transactionId ? ` · ${p.transactionId}` : ""}</span><span>$${p.amount.toFixed(2)}</span></div>`).join("")}` : ""}
${
  (inv?.tipTotal ?? 0) > 0
    ? `<div class="section">Tip Distribution</div>${(inv?.items ?? [])
        .filter((item) => item.price > 0 && item.type !== "package_credit")
        .map((item) => {
          const staffName =
            item.staffName ?? booking.stylistPreference ?? "Staff";
          const totalServiceValue = (inv?.items ?? [])
            .filter((i) => i.price > 0 && i.type !== "package_credit")
            .reduce((s, i) => s + i.price, 0);
          const pct =
            totalServiceValue > 0 ? item.price / totalServiceValue : 0;
          const tipShare = Math.round((inv?.tipTotal ?? 0) * pct * 100) / 100;
          return `<div class="row"><span>${staffName} <small style="color:#888">· ${item.name}</small></span><span>$${tipShare.toFixed(2)}</span></div>`;
        })
        .join("")}`
    : ""
}
<div class="paid">PAYMENT COMPLETE</div>
<div class="footer">Thank you for choosing us!<br>${booking.service} · ${new Date(booking.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>
</body></html>`);
                  w.document.close();
                }}
              >
                <FileText className="size-3.5" />
                View Receipt
              </Button>
            </>
          )}

          {isPaid && !isCancelled && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setRefundOpen(true)}
            >
              <RotateCcw className="size-3.5" />
              Issue Refund
            </Button>
          )}
          {/* Undo Check-In — reverts to confirmed */}
          {booking.status === "confirmed" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() =>
                toast.success(
                  "Check-in undone — status reverted to Confirmed. Deposit remains collected.",
                )
              }
            >
              <RotateCcw className="size-3.5" />
              Undo Check-In
            </Button>
          )}

          {/* Undo Confirm — reverts to pending */}
          {booking.status === "confirmed" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() =>
                toast.success(
                  "Confirmation undone — status reverted to Pending. Deposit remains collected.",
                )
              }
            >
              <RotateCcw className="size-3.5" />
              Undo Confirm
            </Button>
          )}

          {!isCancelled && booking.status !== "completed" && (
            <>
              {/* No-Show with deposit forfeit */}
              {(invoice?.depositCollected ?? 0) > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-amber-700 hover:bg-amber-50"
                  onClick={() =>
                    toast.success(
                      `No-show recorded — deposit of $${(invoice?.depositCollected ?? 0).toFixed(2)} forfeited as no-show fee`,
                    )
                  }
                >
                  <AlertTriangle className="size-3.5" />
                  No-Show
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10 h-8 gap-1.5 text-xs"
                onClick={() => setCancelOpen(true)}
              >
                <XCircle className="size-3.5" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left — 3 cols */}
        <div className="space-y-5 lg:col-span-3">
          {/* Booking Details + Pet — side by side */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Details */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                  <CalendarDays className="size-3.5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium capitalize">
                      {booking.service}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-in</span>
                    <span className="font-medium">
                      {formatDateLong(booking.startDate)}
                      {booking.checkInTime && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          {booking.checkInTime}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Check-out</span>
                    <span className="font-medium">
                      {formatDateLong(booking.endDate)}
                      {booking.checkOutTime && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          {booking.checkOutTime}
                        </span>
                      )}
                    </span>
                  </div>
                  {booking.kennel && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Room</span>
                      <span className="font-medium">{booking.kennel}</span>
                    </div>
                  )}
                  {booking.specialRequests && (
                    <div className="border-t pt-3">
                      <p className="text-muted-foreground mb-1 text-xs">
                        Special Requests
                      </p>
                      <p className="text-sm italic">
                        {booking.specialRequests}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pet */}
            {pet && (
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-3">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                    <PawPrint className="size-3.5" />
                    Pet
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-full">
                      <PawPrint className="text-primary size-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/facility/dashboard/clients/${clientId}/pets/${pet.id}`}
                        className="hover:text-primary text-sm font-semibold transition-colors hover:underline"
                      >
                        {pet.name}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {pet.breed} · {pet.type}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {getPetAgeDisplay(pet)} · {pet.weight} lbs
                        {pet.sex && (
                          <>
                            {" · "}
                            <span className="capitalize">{pet.sex}</span>
                          </>
                        )}
                      </p>
                      <div className="mt-2">
                        <TagList
                          entityType="pet"
                          entityId={pet.id}
                          compact
                          maxVisible={3}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Alerts */}
                  <div className="mt-3 space-y-1.5">
                    {pet.allergies && pet.allergies !== "None" && (
                      <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
                        <ShieldCheck className="size-3 shrink-0" />
                        <span>
                          <strong>Allergy:</strong> {pet.allergies}
                        </span>
                      </div>
                    )}
                    {pet.specialNeeds && pet.specialNeeds !== "None" && (
                      <div className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] text-blue-700">
                        <AlertTriangle className="size-3 shrink-0" />
                        <span>{pet.specialNeeds}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Tasks */}
          {tasks.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                    <ListChecks className="size-3.5" />
                    Tasks
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-[11px]">
                      {completedTasks} of {tasks.length} done
                    </span>
                    <div className="bg-muted h-1.5 w-16 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{
                          width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="space-y-0.5">
                  {tasks.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors",
                        task.status === "completed"
                          ? "opacity-50"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <button
                        onClick={() => {
                          if (task.status === "pending") startTask(task.id);
                          else if (task.status === "in_progress")
                            completeTask(task.id, "You");
                          setTasks(getTasksForBooking(bookingId));
                        }}
                        disabled={
                          task.status === "completed" ||
                          task.status === "skipped"
                        }
                        className="shrink-0"
                      >
                        {task.status === "completed" ? (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        ) : task.status === "in_progress" ? (
                          <CircleDot className="size-4 text-blue-500" />
                        ) : (
                          <Circle className="text-muted-foreground/30 size-4" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "text-[13px]",
                            task.status === "completed" &&
                              "text-muted-foreground line-through",
                          )}
                        >
                          {task.name}
                        </span>
                      </div>
                      {task.isRequired && task.status !== "completed" && (
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-[8px] text-red-600"
                        >
                          Required
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[8px] capitalize"
                      >
                        {task.category}
                      </Badge>
                      {task.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            completeTask(task.id, "You");
                            setTasks(getTasksForBooking(bookingId));
                            toast.success("Task completed");
                          }}
                        >
                          Done
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips Section */}
          {isPaid && (
            <Card id="tips" className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-wider uppercase">
                    <HandCoins className="size-3.5" />
                    Tips
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px]"
                    onClick={() => setTipSplitOpen(true)}
                  >
                    Edit Split
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {(invoice?.tipTotal ?? 0) > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground text-sm">
                        Total Tip
                      </span>
                      <span className="font-[tabular-nums] text-lg font-bold">
                        ${(invoice?.tipTotal ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <Separator />
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Distribution
                    </p>
                    <div className="space-y-1.5">
                      {(invoice?.items ?? [])
                        .filter(
                          (item) =>
                            item.price > 0 && item.type !== "package_credit",
                        )
                        .map((item, idx) => {
                          const staffName =
                            item.staffName ??
                            booking.stylistPreference ??
                            "Staff";
                          const totalSvc = (invoice?.items ?? [])
                            .filter(
                              (i) => i.price > 0 && i.type !== "package_credit",
                            )
                            .reduce((s, i) => s + i.price, 0);
                          const pct = totalSvc > 0 ? item.price / totalSvc : 0;
                          const tipShare =
                            Math.round((invoice?.tipTotal ?? 0) * pct * 100) /
                            100;
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-md border px-3 py-2"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  {staffName}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {item.name} · ${item.price.toFixed(2)} (
                                  {(pct * 100).toFixed(0)}%)
                                </p>
                              </div>
                              <span className="font-[tabular-nums] text-sm font-semibold">
                                ${tipShare.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground py-2 text-center text-sm">
                    No tip recorded for this booking
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-3">
              <CardTitle className="text-xs font-semibold tracking-wider uppercase">
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <BookingNotes />
            </CardContent>
          </Card>
        </div>

        {/* Right — 2 cols — Invoice */}
        <div className="lg:col-span-2">
          <div className="sticky top-4">
            {invoice ? (
              <InvoicePanel invoice={invoice} />
            ) : (
              <Card>
                <CardHeader className="bg-muted/30 pb-3">
                  <CardTitle className="text-xs font-semibold tracking-wider uppercase">
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Base Price</span>
                      <span className="font-[tabular-nums] font-medium">
                        ${booking.basePrice.toFixed(2)}
                      </span>
                    </div>
                    {booking.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discount</span>
                        <span className="font-[tabular-nums] font-medium text-emerald-600">
                          -${booking.discount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {addedSubtotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Added Items
                        </span>
                        <span className="font-[tabular-nums] font-medium text-amber-600">
                          +${addedSubtotal.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold">Total</span>
                      <span className="font-[tabular-nums] text-2xl font-bold">
                        ${(booking.totalCost + addedSubtotal).toFixed(2)}
                      </span>
                    </div>
                    {!isPaid && !isCancelled && (
                      <Button
                        className="mt-2 h-10 w-full gap-1.5"
                        onClick={() => setPaymentOpen(true)}
                      >
                        <CreditCard className="size-4" />
                        Accept Payment
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <PageAuditTrail area="bookings" entityId={String(bookingId)} />

      {/* Modals */}
      <EditBookingModal
        booking={booking}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(u) => {
          setEditOpen(false);
          toast.success(`Booking #${u.id} updated`);
        }}
      />
      <ProcessPaymentModal
        booking={booking}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onConfirm={(bId, m) => {
          setPaymentOpen(false);
          toast.success(`Payment via ${m} for #${bId}`);
        }}
      />
      <CancelBookingModal
        booking={booking}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={(bId, r) => {
          setCancelOpen(false);
          toast.success(`Booking #${bId} cancelled: ${r}`);
        }}
      />
      <PaymentCheckoutFlow
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        amountDue={invoice?.remainingDue ?? booking.totalCost}
        depositPaid={invoice?.depositCollected ?? 0}
        invoiceTotal={invoice?.total ?? booking.totalCost}
        onConfirm={(payment) => {
          toast.success(
            `Charged $${payment.amount.toFixed(2)} via ${payment.method}${payment.tip > 0 ? ` + $${payment.tip.toFixed(2)} tip` : ""}`,
          );
        }}
      />
      <TipSplitModal
        open={tipSplitOpen}
        onOpenChange={setTipSplitOpen}
        totalTip={invoice?.tipTotal ?? 5}
        staffServices={
          invoice?.items
            ? invoice.items
                .filter(
                  (item) => item.type !== "package_credit" && item.price > 0,
                )
                .map((item) => ({
                  staffName:
                    item.staffName ?? booking.stylistPreference ?? "Staff",
                  serviceName: item.name,
                  serviceValue: item.price,
                  multiStaff: false,
                }))
            : [
                {
                  staffName: booking.stylistPreference ?? "Staff",
                  serviceName: `${booking.service} — ${booking.serviceType?.replace("_", " ") ?? "standard"}`,
                  serviceValue: booking.basePrice,
                  multiStaff: false,
                },
              ]
        }
        onSave={() => {}}
      />
      <DepositChargeModal
        open={depositOpen}
        onOpenChange={setDepositOpen}
        ruleAmount={Math.round(booking.totalCost * 0.5 * 100) / 100}
        ruleLabel={`50% of total ($${(booking.totalCost * 0.5).toFixed(2)})`}
        onCharge={(amount, method) => {
          toast.success(
            `Deposit of $${amount.toFixed(2)} charged via ${method}`,
          );
        }}
      />
      <SendEstimateModal
        open={estimateOpen}
        onOpenChange={setEstimateOpen}
        clientName={client.name}
        clientEmail={client.email}
        clientPhone={client.phone}
        subtotal={invoice?.subtotal ?? booking.totalCost}
        discount={invoice?.discount ?? booking.discount}
        taxAmount={invoice?.taxAmount ?? 0}
        total={invoice?.total ?? booking.totalCost}
        depositRequired={Math.round(booking.totalCost * 0.5 * 100) / 100}
        onApplyDiscount={(amount, reason) => {
          toast.success(`Discount applied: $${amount.toFixed(2)} — ${reason}`);
        }}
      />
      <RefundModal
        open={refundOpen}
        onOpenChange={setRefundOpen}
        invoiceTotal={invoice?.total ?? booking.totalCost}
        amountPaid={invoice?.depositCollected ?? booking.totalCost}
        items={(invoice?.items ?? []).map((i) => ({
          name: i.name,
          price: i.price,
        }))}
        onConfirm={(refund) => {
          toast.success(
            `Refund of $${refund.amount.toFixed(2)} processed via ${refund.method}`,
          );
        }}
      />
    </div>
  );
}
