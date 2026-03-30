"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Ban,
  User,
  PawPrint,
  Calendar,
  Clock,
  MapPin,
  Scissors,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle,
  FileText,
  MessageSquare,
  DollarSign,
} from "lucide-react";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";
import { BookingActionBar } from "@/components/bookings/BookingActionBar";
import { BookingNotes } from "@/components/bookings/BookingNotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { bookings as initialBookings } from "@/data/bookings";
import { clients } from "@/data/clients";
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

// ========================================
// Detail Field — editable inline
// ========================================

function DetailField({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("group", className)}>
      <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
        {Icon && <Icon className="size-3" />}
        {label}
      </div>
      <div>{children}</div>
    </div>
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

  const isEditable =
    booking?.status === "confirmed" || booking?.status === "pending";
  const nights = booking
    ? nightsBetween(booking.startDate, booking.endDate)
    : 0;

  // Editable state
  const [service, setService] = useState(booking?.service ?? "daycare");
  const [specialRequests, setSpecialRequests] = useState(
    booking?.specialRequests ?? "",
  );
  const [editingRequests, setEditingRequests] = useState(false);

  // Modal states
  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

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

  return (
    <div className="animate-in fade-in flex-1 space-y-6 p-4 pt-6 duration-300 md:p-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
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
                    "size-2 animate-pulse rounded-full",
                    statusDot(booking.status),
                  )}
                />
                <span className="text-xs font-medium capitalize">
                  {booking.status}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatDateLong(booking.startDate)}
              {booking.startDate !== booking.endDate &&
                ` → ${formatDateLong(booking.endDate)}`}
              {nights > 0 && (
                <span className="text-foreground/60 ml-2">
                  · {nights} night{nights !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      <div className="animate-in slide-in-from-top-2 bg-card/50 rounded-lg border px-4 py-3 backdrop-blur-sm duration-300">
        <BookingActionBar
          booking={booking}
          onEdit={() => setEditOpen(true)}
          onPayment={() => setPaymentOpen(true)}
          onCancel={() => setCancelOpen(true)}
          onRefund={() => toast.info("Refund flow would open here")}
        />
      </div>

      {/* ── Main Grid ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Client & Pet — Side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Client Card */}
            <Card className="animate-in fade-in slide-in-from-left-2 group overflow-hidden duration-300">
              <CardHeader className="flex flex-row items-center gap-3 pb-3">
                <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                  <User className="text-primary size-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm font-semibold">
                    <Link
                      href={`/facility/dashboard/clients/${client?.id}`}
                      className="hover:text-primary transition-colors hover:underline"
                    >
                      {client?.name ?? "Unknown"}
                    </Link>
                  </CardTitle>
                  <p className="text-muted-foreground text-xs">Client</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {client?.email && (
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="text-muted-foreground size-3" />
                    <span className="text-muted-foreground truncate">
                      {client.email}
                    </span>
                  </div>
                )}
                {client?.phone && (
                  <div className="flex items-center gap-2 text-xs">
                    <Phone className="text-muted-foreground size-3" />
                    <span className="text-muted-foreground">
                      {client.phone}
                    </span>
                  </div>
                )}
                {client?.emergencyContact?.name && (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                    <span className="font-medium">Emergency:</span>{" "}
                    {client.emergencyContact.name} (
                    {client.emergencyContact.relationship})
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pet Card */}
            {pet && (
              <Card className="animate-in fade-in slide-in-from-right-2 group overflow-hidden duration-300">
                <CardHeader className="flex flex-row items-center gap-3 pb-3">
                  <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
                    <PawPrint className="text-primary size-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold">
                        {pet.name}
                      </CardTitle>
                      <TagList
                        entityType="pet"
                        entityId={pet.id}
                        compact
                        maxVisible={2}
                      />
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {pet.breed} · {pet.type}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <div className="flex gap-4 text-xs">
                    <span>
                      <span className="text-muted-foreground">Age:</span>{" "}
                      {pet.age} yrs
                    </span>
                    <span>
                      <span className="text-muted-foreground">Weight:</span>{" "}
                      {pet.weight} lbs
                    </span>
                    {pet.sex && (
                      <span>
                        <span className="text-muted-foreground">Sex:</span>{" "}
                        <span className="capitalize">{pet.sex}</span>
                      </span>
                    )}
                  </div>
                  {pet.allergies && pet.allergies !== "None" && (
                    <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
                      <ShieldCheck className="size-3 shrink-0" />
                      <span>
                        <span className="font-medium">Allergy:</span>{" "}
                        {pet.allergies}
                      </span>
                    </div>
                  )}
                  {pet.specialNeeds && pet.specialNeeds !== "None" && (
                    <div className="flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5 text-[11px] text-blue-700">
                      <AlertTriangle className="size-3 shrink-0" />
                      <span>
                        <span className="font-medium">Needs:</span>{" "}
                        {pet.specialNeeds}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Service Details — Editable grid */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="size-4" />
                Service Details
                {isEditable && (
                  <Badge
                    variant="outline"
                    className="ml-1 text-[9px] font-normal"
                  >
                    Editable
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3 lg:grid-cols-4">
                <DetailField icon={Scissors} label="Service">
                  {isEditable ? (
                    <Select
                      value={service}
                      onValueChange={(v) => {
                        setService(v);
                        toast.success(`Service changed to ${v}`);
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daycare">Daycare</SelectItem>
                        <SelectItem value="boarding">Boarding</SelectItem>
                        <SelectItem value="grooming">Grooming</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm font-medium capitalize">
                      {booking.service}
                    </p>
                  )}
                </DetailField>

                <DetailField icon={Calendar} label="Check-in">
                  <p className="text-sm font-medium">
                    {formatDateLong(booking.startDate)}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {booking.checkInTime ?? "—"}
                  </p>
                </DetailField>

                <DetailField icon={Calendar} label="Check-out">
                  <p className="text-sm font-medium">
                    {formatDateLong(booking.endDate)}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {booking.checkOutTime ?? "—"}
                  </p>
                </DetailField>

                <DetailField icon={Clock} label="Duration">
                  <p className="text-sm font-medium">
                    {nights > 0
                      ? `${nights} night${nights !== 1 ? "s" : ""}`
                      : "Same day"}
                  </p>
                  <p className="text-muted-foreground text-[11px]">
                    {booking.serviceType?.replace("_", " ") ?? "standard"}
                  </p>
                </DetailField>

                {booking.kennel && (
                  <DetailField icon={MapPin} label="Room / Kennel">
                    <p className="text-sm font-medium">{booking.kennel}</p>
                  </DetailField>
                )}

                {booking.stylistPreference && (
                  <DetailField icon={Scissors} label="Stylist">
                    <p className="text-sm font-medium">
                      {booking.stylistPreference}
                    </p>
                  </DetailField>
                )}

                {booking.trainerId && (
                  <DetailField icon={User} label="Trainer">
                    <p className="text-sm font-medium">{booking.trainerId}</p>
                  </DetailField>
                )}

                <DetailField icon={DollarSign} label="Payment">
                  <StatusBadge type="status" value={booking.paymentStatus} />
                </DetailField>
              </div>
            </CardContent>
          </Card>

          {/* Special Requests — Editable */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="size-4" />
                  Special Requests
                </CardTitle>
                {isEditable && !editingRequests && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px]"
                    onClick={() => setEditingRequests(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editingRequests ? (
                <div className="space-y-2">
                  <Input
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Enter special requests..."
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setEditingRequests(false);
                        toast.success("Special requests updated");
                      }
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setEditingRequests(false);
                        toast.success("Special requests updated");
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSpecialRequests(booking.specialRequests ?? "");
                        setEditingRequests(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p
                  className={cn(
                    "text-sm",
                    !specialRequests && "text-muted-foreground italic",
                  )}
                >
                  {specialRequests || "No special requests"}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Forms & Compliance */}
          {formRequirementsCheck && (
            <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <FileText className="size-4" />
                  Forms & Compliance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {formRequirementsCheck.missing.map((m) => (
                    <div
                      key={m.formId}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-all",
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
                <div className="bg-muted/50 mt-3 flex items-center gap-2 rounded-md px-3 py-2">
                  <CheckCircle className="text-muted-foreground size-3.5" />
                  <p className="text-muted-foreground text-xs">
                    {formRequirementsCheck.totalCompleted}/
                    {formRequirementsCheck.totalRequired} completed ·{" "}
                    {getStageLabel(formRequirementsCheck.stage)}
                  </p>
                </div>
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
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle className="size-4" />
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

          {/* Notes */}
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="size-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BookingNotes />
            </CardContent>
          </Card>
        </div>

        {/* ── Right Column — Invoice ── */}
        <div className="animate-in fade-in slide-in-from-right-3 duration-500">
          {booking.invoice ? (
            <InvoicePanel invoice={booking.invoice} />
          ) : (
            <Card className="sticky top-20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <DollarSign className="size-4" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">
                      Status
                    </span>
                    <StatusBadge type="status" value={booking.paymentStatus} />
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">
                      Base Price
                    </span>
                    <span className="font-[tabular-nums] text-sm">
                      ${booking.basePrice.toFixed(2)}
                    </span>
                  </div>
                  {booking.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Discount
                      </span>
                      <span className="font-[tabular-nums] text-sm text-emerald-600">
                        -${booking.discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="font-[tabular-nums] text-lg font-bold">
                      ${booking.totalCost.toFixed(2)}
                    </span>
                  </div>
                  {booking.paymentStatus !== "paid" && (
                    <Button
                      className="mt-2 w-full gap-1.5"
                      size="sm"
                      onClick={() => setPaymentOpen(true)}
                    >
                      <DollarSign className="size-3.5" />
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
            `Booking #${updated.id} updated — total: $${updated.totalCost}`,
          );
        }}
      />
      <ProcessPaymentModal
        booking={booking}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onConfirm={(bId, method) => {
          setPaymentOpen(false);
          toast.success(`Payment accepted via ${method} for booking #${bId}`);
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
