"use client";

import { use, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { bookings as initialBookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { getYipyyGoForm, getYipyyGoDisplayStatus } from "@/data/yipyygo-forms";
import { YipyyGoStatusBadge } from "@/components/yipyygo/YipyyGoStatusBadge";
import { YipyyGoStaffReviewModal } from "@/components/yipyygo/YipyyGoStaffReviewModal";
import { StatusBadge } from "@/components/ui/StatusBadge";

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

  const yipyyGoForm = useMemo(() => getYipyyGoForm(bookingId), [bookingId]);
  const yipyyGoStatus = useMemo(() => getYipyyGoDisplayStatus(bookingId), [bookingId]);

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
