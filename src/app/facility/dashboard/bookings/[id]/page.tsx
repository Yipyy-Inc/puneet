"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Ban } from "lucide-react";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  checkFormRequirements,
  getStageLabel,
  type RequirementStage,
} from "@/lib/form-requirements";
import { TagList } from "@/components/shared/TagList";

// Section label component
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
      {children}
    </p>
  );
}

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
    <div className="flex-1 p-4 pt-6 md:p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/facility/dashboard/bookings">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">Booking #{booking.id}</h1>
            <StatusBadge type="status" value={booking.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {booking.startDate} – {booking.endDate}
          </p>
        </div>
      </div>

      {/* 3-column grid: left 2/3 + right 1/3 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left panel */}
        <div className="space-y-6 lg:col-span-2">
          {/* Client */}
          <Card>
            <CardContent className="pt-6">
              <SectionLabel>Client</SectionLabel>
              <p className="text-sm font-medium">{client?.name ?? "Unknown"}</p>
              <p className="text-muted-foreground text-sm">
                {client?.email}
                {client?.phone && ` · ${client.phone}`}
              </p>
              {client?.emergencyContact?.name && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Emergency: {client.emergencyContact.name} (
                  {client.emergencyContact.relationship}) ·{" "}
                  {client.emergencyContact.phone}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Pet */}
          {pet && (
            <Card>
              <CardContent className="pt-6">
                <SectionLabel>Pet</SectionLabel>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{pet.name}</p>
                  <TagList
                    entityType="pet"
                    entityId={pet.id}
                    compact
                    maxVisible={3}
                  />
                </div>
                <p className="text-muted-foreground text-sm">
                  {pet.breed} · {pet.age} yrs · {pet.weight} lbs
                </p>
                {pet.allergies && pet.allergies !== "None" && (
                  <p className="mt-1 text-xs text-red-600">
                    Allergies: {pet.allergies}
                  </p>
                )}
                {pet.specialNeeds && pet.specialNeeds !== "None" && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Special needs: {pet.specialNeeds}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Service Details */}
          <Card>
            <CardContent className="pt-6">
              <SectionLabel>Service</SectionLabel>
              <div className="grid gap-y-2 text-sm sm:grid-cols-2">
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-medium capitalize">{booking.service}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dates</span>
                  <p className="font-medium">
                    {booking.startDate} – {booking.endDate}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Check-in</span>
                  <p className="font-medium">{booking.checkInTime ?? "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Check-out</span>
                  <p className="font-medium">{booking.checkOutTime ?? "—"}</p>
                </div>
                {booking.kennel && (
                  <div>
                    <span className="text-muted-foreground">Room / Kennel</span>
                    <p className="font-medium">{booking.kennel}</p>
                  </div>
                )}
                {booking.stylistPreference && (
                  <div>
                    <span className="text-muted-foreground">Stylist</span>
                    <p className="font-medium">{booking.stylistPreference}</p>
                  </div>
                )}
                {booking.trainerId && (
                  <div>
                    <span className="text-muted-foreground">Trainer</span>
                    <p className="font-medium">{booking.trainerId}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Special Requests */}
          {booking.specialRequests && (
            <Card>
              <CardContent className="pt-6">
                <SectionLabel>Special Requests</SectionLabel>
                <p className="text-sm">{booking.specialRequests}</p>
              </CardContent>
            </Card>
          )}

          {/* Forms */}
          {formRequirementsCheck && (
            <Card>
              <CardContent className="pt-6">
                <SectionLabel>Forms</SectionLabel>
                <div className="space-y-1.5">
                  {formRequirementsCheck.missing.map((m) => (
                    <div
                      key={m.formId}
                      className="flex items-center gap-2 text-sm"
                    >
                      {m.enforcement === "block" ? (
                        <Ban className="size-3.5 shrink-0 text-red-500" />
                      ) : (
                        <AlertTriangle className="size-3.5 shrink-0 text-amber-500" />
                      )}
                      <span>{m.formName}</span>
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 text-[10px]"
                      >
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
            <Card id="yipyygo">
              <CardContent className="pt-6">
                <SectionLabel>YipyyGo Pre-Check-In</SectionLabel>
                <div className="flex items-center gap-3">
                  <YipyyGoStatusBadge status={yipyyGoStatus} showIcon />
                  {(canReview || (yipyyGoEnabled && !yipyyGoForm)) && (
                    <Button
                      variant="outline"
                      size="sm"
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

        {/* Right panel — Invoice */}
        <div>
          {booking.invoice ? (
            <InvoicePanel invoice={booking.invoice} />
          ) : (
            <Card className="sticky top-20">
              <CardContent className="pt-6">
                <SectionLabel>Payment</SectionLabel>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge type="status" value={booking.paymentStatus} />
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span className="font-[tabular-nums]">
                      ${booking.totalCost.toFixed(2)}
                    </span>
                  </div>
                  {booking.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-[tabular-nums] text-green-600">
                        -${booking.discount.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <PageAuditTrail area="bookings" entityId={String(bookingId)} />

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
