"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Heart, ChevronDown, ShieldAlert, AlertTriangle, Ban, CheckCircle, Shield } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { playdateAlertLogs, getAlertStatusVariant, formatAlertChannel } from "@/data/marketing";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { bookings as initialBookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { getYipyyGoForm, getYipyyGoDisplayStatusForBooking } from "@/data/yipyygo-forms";
import { YipyyGoStatusBadge } from "@/components/yipyygo/YipyyGoStatusBadge";
import { YipyyGoStaffReviewModal } from "@/components/yipyygo/YipyyGoStaffReviewModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { checkFormRequirements, getStageLabel, type RequirementStage } from "@/lib/form-requirements";

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
    [bookingId]
  );

  const client = useMemo(
    () => (booking ? clients.find((c) => c.id === booking.clientId) : null),
    [booking]
  );

  const pet = useMemo(() => {
    if (!client || !booking) return null;
    const pid = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
    return client.pets?.find((p) => p.id === pid);
  }, [client, booking]);

  const yipyyGoConfig = useMemo(
    () => (booking ? getYipyyGoConfig(booking.facilityId) : null),
    [booking]
  );

  const petIdForForm = useMemo(() => {
    if (!booking) return undefined;
    return Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
  }, [booking]);
  const yipyyGoForm = useMemo(() => getYipyyGoForm(bookingId, petIdForForm), [bookingId, petIdForForm]);
  const yipyyGoStatus = useMemo(
    () =>
      booking
        ? getYipyyGoDisplayStatusForBooking(bookingId, {
            facilityId: booking.facilityId,
            service: booking.service,
          })
        : "not_sent",
    [bookingId, booking]
  );

  const serviceType = booking?.service?.toLowerCase() as "daycare" | "boarding" | "grooming" | "training";
  const yipyyGoEnabled =
    yipyyGoConfig?.enabled &&
    yipyyGoConfig?.serviceConfigs?.find((s) => s.serviceType === serviceType)?.enabled;

  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Open review modal when hash is #yipyygo
  useEffect(() => {
    if (typeof window === "undefined") return;
    const open = () => {
      if (window.location.hash === "#yipyygo") setReviewModalOpen(true);
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);

  if (!booking) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Booking not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/facility/dashboard/bookings")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bookings
        </Button>
      </div>
    );
  }

  const canReview =
    yipyyGoEnabled &&
    (yipyyGoStatus === "submitted" || yipyyGoStatus === "needs_review" || yipyyGoStatus === "approved");

  const bookingAlerts = useMemo(() => {
    const petId = pet?.id ?? -1;
    const all = playdateAlertLogs.filter(
      (a) => a.triggerBookingId === `bk-${bookingId}` || a.triggerPetId === petId
    );
    const sent = all.filter((a) => a.status === "sent");
    const suppressed = all.filter((a) => a.status !== "sent");
    return { all, sent, suppressed };
  }, [bookingId, pet?.id]);

  // 7.1 Form requirements check — determine which stage to check based on booking status
  const formRequirementsCheck = useMemo(() => {
    if (!booking) return null;
    const svc = booking.service?.toLowerCase() ?? "";
    const facilityId = booking.facilityId;
    const customerId = booking.clientId;

    // Determine relevant stage based on booking status
    let stage: RequirementStage = "before_booking";
    if (booking.status === "request_submitted" || booking.status === "waitlisted") {
      stage = "before_approval";
    } else if (booking.status === "confirmed") {
      stage = "before_checkin";
    } else if (booking.status === "completed" || booking.status === "cancelled") {
      return null; // No requirement checks for completed/cancelled
    }

    const check = checkFormRequirements(facilityId, svc, stage, customerId);
    if (check.complete) return null; // All good
    return { ...check, stage };
  }, [booking]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/facility/dashboard/bookings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Booking #{booking.id}</h1>
          <p className="text-muted-foreground">
            {client?.name} · {pet?.name ?? "Pet"} · {booking.service}
          </p>
        </div>
      </div>

      {/* 7.1 Form Requirements Banner */}
      {formRequirementsCheck && (
        <Card className={formRequirementsCheck.hasBlocker ? "border-red-300 bg-red-50/50" : "border-amber-300 bg-amber-50/50"}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              {formRequirementsCheck.hasBlocker ? (
                <ShieldAlert className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm font-semibold ${formRequirementsCheck.hasBlocker ? "text-red-800" : "text-amber-800"}`}>
                  {formRequirementsCheck.hasBlocker ? "Incomplete Requirements" : "Missing Recommended Forms"}
                </h3>
                <p className={`text-xs mt-0.5 ${formRequirementsCheck.hasBlocker ? "text-red-700" : "text-amber-700"}`}>
                  {formRequirementsCheck.missing.length} form{formRequirementsCheck.missing.length !== 1 ? "s" : ""} required{" "}
                  <span className="font-medium lowercase">{getStageLabel(formRequirementsCheck.stage)}</span>
                  {" "}· {formRequirementsCheck.totalCompleted}/{formRequirementsCheck.totalRequired} completed
                </p>
                <div className="mt-2 space-y-1.5">
                  {formRequirementsCheck.missing.map((m) => (
                    <div key={m.formId} className="flex items-center gap-2 text-sm">
                      {m.enforcement === "block" ? (
                        <Ban className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className={m.enforcement === "block" ? "text-red-800" : "text-amber-800"}>
                        {m.formName}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-4 px-1.5 ${
                          m.enforcement === "block"
                            ? "bg-red-100 text-red-700 border-red-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        }`}
                      >
                        {m.enforcement === "block" ? "Required" : "Recommended"}
                      </Badge>
                    </div>
                  ))}
                </div>
                {formRequirementsCheck.hasBlocker && (
                  <p className="text-xs text-red-600 mt-2 font-medium">
                    This booking cannot proceed until all required forms are submitted.
                  </p>
                )}
              </div>
              <Badge variant="outline" className="shrink-0 text-xs capitalize">
                {getStageLabel(formRequirementsCheck.stage)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge type="status" value={booking.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <StatusBadge type="status" value={booking.paymentStatus} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dates</span>
              <span>{booking.startDate} – {booking.endDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span>{booking.checkInTime ?? "—"} – {booking.checkOutTime ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span>${booking.totalCost}</span>
            </div>
          </CardContent>
        </Card>

        {yipyyGoEnabled && (
          <Card id="yipyygo">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                YipyyGo Pre-Check-In
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <YipyyGoStatusBadge status={yipyyGoStatus} showIcon />
              </div>
              {(canReview || (yipyyGoEnabled && !yipyyGoForm)) && (
                <Button onClick={() => setReviewModalOpen(true)}>
                  {yipyyGoStatus === "approved" ? "View form" : yipyyGoForm ? "Review form" : "Review / complete"}
                </Button>
              )}
              {yipyyGoEnabled && !yipyyGoForm && (
                <p className="text-sm text-muted-foreground">
                  No form submitted yet. You can mark as manually completed from the review screen.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Playdate Alerts Sent */}
      {bookingAlerts.all.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Playdate Alerts Sent: {bookingAlerts.sent.length} owner{bookingAlerts.sent.length !== 1 ? "s" : ""} notified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between mb-2">
                  <span>View {bookingAlerts.all.length} alert{bookingAlerts.all.length !== 1 ? "s" : ""}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2">
                  {bookingAlerts.all.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{alert.recipientCustomerName}</span>
                        <span className="text-muted-foreground">({alert.recipientPetName})</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {formatAlertChannel(alert.channel)}
                        </Badge>
                      </div>
                      <Badge variant={getAlertStatusVariant(alert.status)}>
                        {alert.status}
                      </Badge>
                    </div>
                  ))}
                  {bookingAlerts.suppressed.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {bookingAlerts.suppressed.length} alert{bookingAlerts.suppressed.length !== 1 ? "s" : ""} suppressed
                      ({bookingAlerts.suppressed.map((a) => a.reasonSuppressed).filter(Boolean).join("; ")})
                    </p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      <YipyyGoStaffReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        form={yipyyGoForm}
        bookingId={bookingId}
        facilityId={booking.facilityId}
        onApproved={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
