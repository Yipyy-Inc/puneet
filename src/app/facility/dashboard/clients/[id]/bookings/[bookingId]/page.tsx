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
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusDot(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500";
    case "confirmed":
      return "bg-blue-500";
    case "pending":
      return "bg-amber-500";
    case "cancelled":
      return "bg-red-500";
    default:
      return "bg-muted-foreground";
  }
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{children}</span>
    </div>
  );
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
  const [addedItems, setAddedItems] = useState<InvoiceLineItem[]>([]);

  // Tasks
  const [tasks, setTasks] = useState<GeneratedTask[]>([]);
  useEffect(() => {
    setTasks(getTasksForBooking(bookingId));
  }, [bookingId]);

  if (!booking || !client) {
    return (
      <div>
        <p className="text-muted-foreground">Booking not found.</p>
      </div>
    );
  }

  const invoice = booking.invoice;
  const addedSubtotal = addedItems.reduce((s, i) => s + i.price, 0);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-6 p-4 pt-5 md:p-6">
      {/* Breadcrumb */}
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Link
          href={`/facility/dashboard/clients/${clientId}`}
          className="hover:text-foreground transition-colors"
        >
          {client.name}
        </Link>
        <span>/</span>
        <Link
          href={`/facility/dashboard/clients/${clientId}/bookings`}
          className="hover:text-foreground transition-colors"
        >
          Bookings
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">#{booking.id}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Booking #{booking.id}</h1>
            <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1">
              <div
                className={cn("size-2 rounded-full", statusDot(booking.status))}
              />
              <span className="text-xs font-medium capitalize">
                {booking.status}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {booking.service} · {pet?.name ?? "Unknown pet"} ·{" "}
            {formatDateLong(booking.startDate)}
            {booking.startDate !== booking.endDate &&
              ` → ${formatDateLong(booking.endDate)}`}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-card/50 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>

        {!isCancelled && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
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
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="size-3.5" />
              Print
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => window.print()}>
              <FileText className="size-4" />
              Invoice
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
            <Button variant="outline" size="sm" className="gap-1.5">
              <Send className="size-3.5" />
              Send
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => toast.success("Invoice emailed")}>
              <Mail className="size-4" />
              Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success("SMS sent")}>
              <Smartphone className="size-4" />
              SMS
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!isPaid && !isCancelled && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setPaymentOpen(true)}
          >
            <CreditCard className="size-3.5" />
            Payment
          </Button>
        )}

        <div className="flex-1" />

        {isPaid && !isCancelled && (
          <Button variant="outline" size="sm" className="gap-1.5">
            <RotateCcw className="size-3.5" />
            Refund
          </Button>
        )}
        {!isCancelled && booking.status !== "completed" && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive gap-1.5"
            onClick={() => setCancelOpen(true)}
          >
            <XCircle className="size-3.5" />
            Cancel
          </Button>
        )}
      </div>

      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Booking details — read only */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                <InfoRow label="Status">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={cn(
                        "size-2 rounded-full",
                        statusDot(booking.status),
                      )}
                    />
                    <span className="capitalize">{booking.status}</span>
                  </div>
                </InfoRow>
                <InfoRow label="Service">
                  <span className="capitalize">{booking.service}</span>
                </InfoRow>
                <InfoRow label="Arriving">
                  {formatDateLong(booking.startDate)}
                  {booking.checkInTime && ` at ${booking.checkInTime}`}
                </InfoRow>
                <InfoRow label="Departing">
                  {formatDateLong(booking.endDate)}
                  {booking.checkOutTime && ` at ${booking.checkOutTime}`}
                </InfoRow>
                <InfoRow label="Duration">
                  {nights > 0
                    ? `${nights} night${nights !== 1 ? "s" : ""}`
                    : "Same day"}
                </InfoRow>
                {booking.kennel && (
                  <InfoRow label="Room">{booking.kennel}</InfoRow>
                )}
                <InfoRow label="Payment">
                  <StatusBadge type="status" value={booking.paymentStatus} />
                </InfoRow>
                {booking.specialRequests && (
                  <InfoRow label="Requests">
                    <span className="max-w-[250px] text-right italic">
                      {booking.specialRequests}
                    </span>
                  </InfoRow>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pet */}
          {pet && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Pet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-full">
                    <PawPrint className="text-primary size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/facility/dashboard/clients/${clientId}/pets/${pet.id}`}
                        className="hover:text-primary text-sm font-semibold hover:underline"
                      >
                        {pet.name}
                      </Link>
                      <span className="text-muted-foreground text-sm">
                        {pet.breed}
                      </span>
                      <TagList
                        entityType="pet"
                        entityId={pet.id}
                        compact
                        maxVisible={3}
                      />
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {pet.type} · {getPetAgeDisplay(pet)} · {pet.weight} lbs
                    </p>
                    {pet.allergies && pet.allergies !== "None" && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700">
                        <ShieldCheck className="size-3" />
                        {pet.allergies}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ListChecks className="size-4" />
                  Tasks
                  <Badge variant="secondary" className="text-[10px]">
                    {completedTasks}/{tasks.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {tasks.slice(0, 8).map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-1.5",
                        task.status === "completed" && "opacity-60",
                      )}
                    >
                      <button
                        onClick={() => {
                          if (task.status === "pending") {
                            startTask(task.id);
                          } else if (task.status === "in_progress") {
                            completeTask(task.id, "You");
                          }
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
                          <Circle className="text-muted-foreground/40 size-4" />
                        )}
                      </button>
                      <span
                        className={cn(
                          "text-xs",
                          task.status === "completed" && "line-through",
                        )}
                      >
                        {task.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingNotes />
            </CardContent>
          </Card>
        </div>

        {/* Right — Invoice */}
        <div>
          {invoice ? (
            <InvoicePanel invoice={invoice} />
          ) : (
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <InfoRow label="Base Price">
                    ${booking.basePrice.toFixed(2)}
                  </InfoRow>
                  {booking.discount > 0 && (
                    <InfoRow label="Discount">
                      <span className="text-emerald-600">
                        -${booking.discount.toFixed(2)}
                      </span>
                    </InfoRow>
                  )}
                  <Separator />
                  <div className="flex justify-between py-1">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="font-[tabular-nums] text-lg font-bold">
                      ${(booking.totalCost + addedSubtotal).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
    </div>
  );
}
