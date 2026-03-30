"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Ban,
  PawPrint,
  Pencil,
  Plus,
  Printer,
  Send,
  CreditCard,
  ChevronDown,
  Mail,
  Smartphone,
  Copy,
  FileText,
  ClipboardList,
  Tag,
  ShieldCheck,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";
import { BookingNotes } from "@/components/bookings/BookingNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { bookings as initialBookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { products } from "@/data/retail";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import {
  getYipyyGoForm,
  getYipyyGoDisplayStatusForBooking,
} from "@/data/yipyygo-forms";
import { YipyyGoStatusBadge } from "@/components/yipyygo/YipyyGoStatusBadge";
import { YipyyGoStaffReviewModal } from "@/components/yipyygo/YipyyGoStaffReviewModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InvoicePanel } from "@/components/bookings/InvoicePanel";
import { EditBookingModal } from "@/components/bookings/modals/EditBookingModal";
import { ProcessPaymentModal } from "@/components/bookings/modals/ProcessPaymentModal";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";
import {
  checkFormRequirements,
  getStageLabel,
  type RequirementStage,
} from "@/lib/form-requirements";
import { TagList } from "@/components/shared/TagList";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { InvoiceLineItem } from "@/types/booking";

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

// Read-only label-value row
function InfoRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-baseline justify-between py-1.5", className)}
    >
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-right text-sm font-medium">{children}</span>
    </div>
  );
}

// Add Item Popover (additive — stays accessible)
function AddItemPopover({ onAdd }: { onAdd: (item: InvoiceLineItem) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const retailSuggestions = products.slice(0, 5);

  const handleAdd = () => {
    if (!name || !price) return;
    onAdd({
      name,
      unitPrice: parseFloat(price),
      quantity: 1,
      price: parseFloat(price),
    });
    setName("");
    setPrice("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Plus className="size-3.5" />
          Add Item
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3">
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
          Quick Add
        </p>
        <div className="mb-2 flex flex-wrap gap-1">
          {retailSuggestions.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                onAdd({
                  name: p.name,
                  unitPrice: p.basePrice,
                  quantity: 1,
                  price: p.basePrice,
                });
                setOpen(false);
                toast.success(`Added "${p.name}"`);
              }}
              className="hover:bg-foreground hover:text-background rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all"
            >
              {p.name.slice(0, 22)} · ${p.basePrice}
            </button>
          ))}
        </div>
        <Separator className="my-2" />
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
          Custom
        </p>
        <div className="space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name"
            className="h-7 text-xs"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price"
              className="h-7 flex-1 text-xs"
              min={0}
              step={0.01}
            />
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleAdd}
              disabled={!name || !price}
            >
              Add
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ========================================
// Page
// ========================================

export default function FacilityBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const bookingId = parseInt(id, 10);

  const booking = useMemo(
    () => initialBookings.find((b) => b.id === bookingId),
    [bookingId],
  );
  const client = useMemo(
    () => (booking ? clients.find((c) => c.id === booking.clientId) : null),
    [booking],
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

  // Modal states
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Invoice items (additive only from this page)
  const [addedItems, setAddedItems] = useState<InvoiceLineItem[]>([]);

  // YipyyGo
  const yipyyGoConfig = useMemo(
    () => (booking ? getYipyyGoConfig(booking.facilityId) : null),
    [booking],
  );
  const petIdForForm = useMemo(() => {
    if (!booking) return undefined;
    return Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
  }, [booking]);
  const yipyyGoForm = useMemo(
    () => getYipyyGoForm(bookingId, petIdForForm),
    [bookingId, petIdForForm],
  );
  const yipyyGoStatus = useMemo(
    () =>
      booking
        ? getYipyyGoDisplayStatusForBooking(bookingId, {
            facilityId: booking.facilityId,
            service: booking.service,
          })
        : "not_sent",
    [bookingId, booking],
  );
  const serviceType = booking?.service?.toLowerCase() as
    | "daycare"
    | "boarding"
    | "grooming"
    | "training";
  const yipyyGoEnabled =
    yipyyGoConfig?.enabled &&
    yipyyGoConfig?.serviceConfigs?.find((s) => s.serviceType === serviceType)
      ?.enabled;
  const canReview =
    yipyyGoEnabled &&
    (yipyyGoStatus === "submitted" ||
      yipyyGoStatus === "needs_review" ||
      yipyyGoStatus === "approved");

  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const open = () => {
      if (window.location.hash === "#yipyygo") setReviewModalOpen(true);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  // Form requirements
  const formRequirementsCheck = useMemo(() => {
    if (!booking) return null;
    const svc = booking.service?.toLowerCase() ?? "";
    const facilityId = booking.facilityId;
    const customerId = booking.clientId;
    let stage: RequirementStage = "before_booking";
    if (
      booking.status === "request_submitted" ||
      booking.status === "waitlisted"
    ) {
      stage = "before_approval";
    } else if (booking.status === "confirmed") {
      stage = "before_checkin";
    } else if (
      booking.status === "completed" ||
      booking.status === "cancelled"
    ) {
      return null;
    }
    const check = checkFormRequirements(facilityId, svc, stage, customerId);
    if (check.complete) return null;
    return { ...check, stage };
  }, [booking]);

  if (!booking) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Booking not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push("/facility/dashboard/bookings")}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to Bookings
        </Button>
      </div>
    );
  }

  const invoice = booking.invoice;
  const allItems = [...(invoice?.items ?? []), ...addedItems];
  const addedSubtotal = addedItems.reduce((s, i) => s + i.price, 0);

  return (
    <div className="animate-in fade-in flex-1 space-y-6 p-4 pt-6 duration-300 md:p-8">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/facility/dashboard/bookings">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                Booking #{booking.id}
              </h1>
              <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1">
                <div
                  className={cn(
                    "size-2 rounded-full",
                    statusDot(booking.status),
                  )}
                />
                <span className="text-xs font-medium capitalize">
                  {booking.status}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {client?.name ?? "Unknown client"} · {pet?.name ?? "Unknown pet"}{" "}
              · {booking.service}
            </p>
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="animate-in slide-in-from-top-2 bg-card/50 flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 backdrop-blur-sm duration-300">
        {/* Edit Booking — primary action */}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
          Edit Booking
        </Button>

        {/* Add Item — additive, safe */}
        {!isCancelled && (
          <AddItemPopover
            onAdd={(item) => {
              setAddedItems((prev) => [...prev, item]);
              toast.success(`Added "${item.name}" · $${item.price.toFixed(2)}`);
            }}
          />
        )}

        {/* Print */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Printer className="size-3.5" />
              Print
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => window.print()}>
              <FileText className="size-4" />
              Invoice / Receipt
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.success("Care sheet sent to printer")}
            >
              <ClipboardList className="size-4" />
              Care Sheet
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => toast.success("Kennel label printed")}
            >
              <Tag className="size-4" />
              Kennel Label
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Send */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Send className="size-3.5" />
              Send
              <ChevronDown className="size-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => toast.success("Invoice emailed")}>
              <Mail className="size-4" />
              Email Invoice
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.success("SMS link sent")}>
              <Smartphone className="size-4" />
              SMS Invoice Link
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/invoices/${booking.id}`,
                );
                toast.success("Link copied");
              }}
            >
              <Copy className="size-4" />
              Copy Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Payment */}
        {!isPaid && !isCancelled && (
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setPaymentOpen(true)}
          >
            <CreditCard className="size-3.5" />
            Accept Payment
          </Button>
        )}

        <div className="flex-1" />

        {/* Refund */}
        {isPaid && !isCancelled && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toast.info("Refund flow would open")}
          >
            <RotateCcw className="size-3.5" />
            Issue Refund
          </Button>
        )}

        {/* Cancel */}
        {!isCancelled && booking.status !== "completed" && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive gap-1.5"
            onClick={() => setCancelOpen(true)}
          >
            <XCircle className="size-3.5" />
            Cancel Booking
          </Button>
        )}
      </div>

      {/* ── Main Grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Booking Details — READ ONLY */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                  {booking.serviceType && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      ({booking.serviceType.replace("_", " ")})
                    </span>
                  )}
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
                {booking.stylistPreference && (
                  <InfoRow label="Stylist">{booking.stylistPreference}</InfoRow>
                )}
                {booking.trainerId && (
                  <InfoRow label="Trainer">{booking.trainerId}</InfoRow>
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

          {/* Pet — READ ONLY */}
          {pet && (
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Pet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 flex size-12 shrink-0 items-center justify-center rounded-full">
                    <PawPrint className="text-primary size-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/facility/dashboard/clients/${client?.id}/pets/${pet.id}`}
                        className="hover:text-primary text-sm font-semibold transition-colors hover:underline"
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
                      {pet.type} · {pet.age} yrs · {pet.weight} lbs
                      {pet.sex && (
                        <>
                          {" "}
                          · <span className="capitalize">{pet.sex}</span>
                        </>
                      )}
                      {pet.spayedNeutered && " · Neutered"}
                    </p>
                    {pet.allergies && pet.allergies !== "None" && (
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
                        <ShieldCheck className="size-3" />
                        Allergy: {pet.allergies}
                      </div>
                    )}
                    {pet.specialNeeds && pet.specialNeeds !== "None" && (
                      <div className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] text-blue-700">
                        <AlertTriangle className="size-3" />
                        {pet.specialNeeds}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Owner — READ ONLY */}
          {client && (
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Owner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  <InfoRow label="Name">
                    <Link
                      href={`/facility/dashboard/clients/${client.id}`}
                      className="hover:text-primary transition-colors hover:underline"
                    >
                      {client.name}
                    </Link>
                  </InfoRow>
                  {client.email && (
                    <InfoRow label="Email">{client.email}</InfoRow>
                  )}
                  {client.phone && (
                    <InfoRow label="Phone">{client.phone}</InfoRow>
                  )}
                  {client.emergencyContact?.name && (
                    <InfoRow label="Emergency">
                      {client.emergencyContact.name} (
                      {client.emergencyContact.relationship}) ·{" "}
                      {client.emergencyContact.phone}
                    </InfoRow>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingNotes />
            </CardContent>
          </Card>

          {/* Forms & Compliance */}
          {formRequirementsCheck && (
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Forms & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formRequirementsCheck.missing.map((m) => (
                    <div
                      key={m.formId}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                        m.enforcement === "block"
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-amber-200 bg-amber-50 text-amber-800",
                      )}
                    >
                      {m.enforcement === "block" ? (
                        <Ban className="size-4 shrink-0" />
                      ) : (
                        <AlertTriangle className="size-4 shrink-0" />
                      )}
                      <span className="flex-1">{m.formName}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {m.enforcement === "block" ? "Required" : "Recommended"}
                      </Badge>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {formRequirementsCheck.totalCompleted}/
                  {formRequirementsCheck.totalRequired} completed ·{" "}
                  {getStageLabel(formRequirementsCheck.stage)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* YipyyGo */}
          {yipyyGoEnabled && (
            <Card
              id="yipyygo"
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  YipyyGo Pre-Check-In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <YipyyGoStatusBadge status={yipyyGoStatus} showIcon />
                  {(canReview || (yipyyGoEnabled && !yipyyGoForm)) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setReviewModalOpen(true)}
                    >
                      {yipyyGoStatus === "approved"
                        ? "View form"
                        : yipyyGoForm
                          ? "Review form"
                          : "Review / complete"}
                    </Button>
                  )}
                </div>
                {yipyyGoEnabled && !yipyyGoForm && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    No form submitted yet.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right Column — Invoice ── */}
        <div className="animate-in fade-in slide-in-from-right-3 duration-500">
          {invoice ? (
            <div>
              <InvoicePanel invoice={invoice} />
              {/* Added items */}
              {addedItems.length > 0 && (
                <Card className="mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold">
                      Added Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {addedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1 text-xs"
                      >
                        <span>{item.name}</span>
                        <span className="font-medium">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    <Separator className="my-1" />
                    <div className="flex justify-between text-xs font-semibold text-amber-600">
                      <span>Additional charges</span>
                      <span>+${addedSubtotal.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <InfoRow label="Status">
                    <StatusBadge type="status" value={booking.paymentStatus} />
                  </InfoRow>
                  <Separator />
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
                  {addedSubtotal > 0 && (
                    <InfoRow label="Added Items">
                      <span className="text-amber-600">
                        +${addedSubtotal.toFixed(2)}
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
                  {!isPaid && !isCancelled && (
                    <Button
                      className="mt-2 w-full gap-1.5"
                      size="sm"
                      onClick={() => setPaymentOpen(true)}
                    >
                      <CreditCard className="size-3.5" />
                      Accept Payment
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Audit Trail ── */}
      <PageAuditTrail area="bookings" entityId={String(bookingId)} />

      {/* ── Modals ── */}
      <EditBookingModal
        booking={booking}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(updated) => {
          setEditOpen(false);
          toast.success(
            `Booking #${updated.id} updated — $${updated.totalCost}`,
          );
        }}
      />
      <ProcessPaymentModal
        booking={booking}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onConfirm={(bId, method) => {
          setPaymentOpen(false);
          toast.success(`Payment accepted via ${method} for #${bId}`);
        }}
      />
      <CancelBookingModal
        booking={booking}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        onConfirm={(bId, reason) => {
          setCancelOpen(false);
          toast.success(`Booking #${bId} cancelled: ${reason}`);
        }}
      />
      <YipyyGoStaffReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        form={yipyyGoForm}
        bookingId={bookingId}
        facilityId={booking.facilityId}
        onApproved={() => router.refresh()}
      />
    </div>
  );
}
