"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { getYipyyGoForm, getYipyyGoDisplayStatus } from "@/data/yipyygo-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck,
  Calendar,
  CheckCircle2,
  QrCode,
  FileEdit,
  AlertCircle,
  ArrowRight,
  Dog,
} from "lucide-react";

const MOCK_CUSTOMER_ID = 15;

const STATUS_NEEDS_ACTION = ["not_sent", "sent", "incomplete", "needs_review"] as const;
const STATUS_COMPLETED = ["submitted", "approved"] as const;

export default function CustomerYipyyGoPage() {
  const { selectedFacility } = useCustomerFacility();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const customer = useMemo(() => clients.find((c) => c.id === MOCK_CUSTOMER_ID), []);
  const customerBookings = useMemo(() => {
    if (!selectedFacility) return [];
    return bookings.filter(
      (b) => b.clientId === MOCK_CUSTOMER_ID && b.facilityId === selectedFacility.id && b.status !== "cancelled"
    );
  }, [selectedFacility]);

  const config = useMemo(
    () => (selectedFacility ? getYipyyGoConfig(selectedFacility.id) : null),
    [selectedFacility]
  );

  const { upcomingNeeded, completedForms, qrAccessList } = useMemo(() => {
    if (!isMounted || !config?.enabled) {
      return { upcomingNeeded: [], completedForms: [], qrAccessList: [] };
    }
    const now = new Date();
    const needed: typeof customerBookings = [];
    const completed: typeof customerBookings = [];
    const qrList: { booking: (typeof customerBookings)[0]; petName: string }[] = [];

    customerBookings.forEach((b) => {
      const svc = b.service?.toLowerCase() as "daycare" | "boarding" | "grooming" | "training";
      const serviceConfig = config.serviceConfigs.find((s) => s.serviceType === svc);
      if (!serviceConfig?.enabled) return;

      const form = getYipyyGoForm(b.id);
      const status = getYipyyGoDisplayStatus(b.id);
      const petId = Array.isArray(b.petId) ? b.petId[0] : b.petId;
      const petName = customer?.pets?.find((p) => p.id === petId)?.name ?? "Pet";

      if (form?.qrCheckInToken) {
        qrList.push({ booking: b, petName });
      }
      if (STATUS_COMPLETED.includes(status as (typeof STATUS_COMPLETED)[number])) {
        completed.push(b);
      } else if (STATUS_NEEDS_ACTION.includes(status as (typeof STATUS_NEEDS_ACTION)[number])) {
        const bookingDate = new Date(b.startDate);
        if (bookingDate >= now) {
          needed.push(b);
        }
      }
    });

    needed.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    completed.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    return { upcomingNeeded: needed, completedForms: completed, qrAccessList: qrList };
  }, [isMounted, config, customerBookings, customer]);

  const getPetName = (booking: (typeof customerBookings)[0]) => {
    const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
    return customer?.pets?.find((p) => p.id === petId)?.name ?? "Pet";
  };

  const formatDate = (dateStr: string, timeStr?: string) => {
    if (!isMounted) return "";
    const d = new Date(dateStr);
    const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return timeStr ? `${date} · ${timeStr}` : date;
  };

  if (!selectedFacility) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">Select a facility to view YipyyGo.</p>
            <Button asChild className="w-full mt-4">
              <Link href="/customer/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardCheck className="h-7 w-7 text-primary" />
              YipyyGo
            </h1>
            <p className="text-muted-foreground mt-1">Pre-check-in forms</p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                YipyyGo pre-check-in is not enabled for {selectedFacility.name}. You’ll complete check-in at the facility.
              </p>
              <Button asChild variant="outline" className="w-full mt-4">
                <Link href="/customer/bookings">View Bookings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardCheck className="h-7 w-7 text-primary" />
              YipyyGo
            </h1>
            <p className="text-muted-foreground mt-1">
              Pre-check-in forms and fast-track QR for {selectedFacility.name}
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/customer/bookings">
              <Calendar className="h-4 w-4 mr-1" />
              My Bookings
            </Link>
          </Button>
        </div>

        {/* Upcoming forms needed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-amber-600" />
              Forms to complete
            </CardTitle>
            <CardDescription>
              Complete these pre-check-in forms before your visit for a faster check-in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingNeeded.length === 0 ? (
              <p className="text-sm text-muted-foreground">No forms need your action right now.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingNeeded.map((booking) => (
                  <li key={booking.id}>
                    <Link
                      href={`/customer/bookings/${booking.id}/yipyygo-form`}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-900/30">
                          <AlertCircle className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {getPetName(booking)}’s {booking.service}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(booking.startDate, booking.checkInTime)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        Complete form
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* QR access */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              Check-in QR codes
            </CardTitle>
            <CardDescription>
              Show this QR at drop-off for fast-track check-in (after you’ve submitted the form).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {qrAccessList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Complete a pre-check-in form to get your QR code for drop-off.
              </p>
            ) : (
              <ul className="space-y-3">
                {qrAccessList.map(({ booking, petName }) => (
                  <li key={booking.id}>
                    <Link
                      href={`/customer/bookings/${booking.id}/check-in-qr`}
                      className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-md bg-primary/10">
                          <QrCode className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{petName} · {booking.service}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(booking.startDate, booking.checkInTime)}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">Show QR at drop-off</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Completed forms history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Completed forms
            </CardTitle>
            <CardDescription>Pre-check-in forms you’ve already submitted or that were approved.</CardDescription>
          </CardHeader>
          <CardContent>
            {completedForms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed forms yet.</p>
            ) : (
              <ul className="space-y-3">
                {completedForms.map((booking) => {
                  const form = getYipyyGoForm(booking.id);
                  const status = getYipyyGoDisplayStatus(booking.id);
                  return (
                    <li key={booking.id}>
                      <Link
                        href={`/customer/bookings/${booking.id}`}
                        className="flex items-center justify-between gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-md bg-green-100 dark:bg-green-900/30">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {getPetName(booking)}’s {booking.service}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(booking.startDate, booking.checkInTime)}
                              {form?.submittedAt && (
                                <> · Submitted {isMounted && new Date(form.submittedAt).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <Badge variant={status === "approved" ? "default" : "secondary"} className="shrink-0">
                          {status === "approved" ? "Approved" : "Submitted"}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
