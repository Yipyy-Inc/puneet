"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { getYipyyGoForm } from "@/data/yipyygo-forms";
import { CheckInQRCode } from "@/components/yipyygo/CheckInQRCode";

const MOCK_CUSTOMER_ID = 15;

export default function CheckInQRPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const booking = useMemo(
    () =>
      bookings.find(
        (b) => String(b.id) === id && b.clientId === MOCK_CUSTOMER_ID,
      ),
    [id],
  );
  const form = useMemo(
    () => (booking ? getYipyyGoForm(booking.id) : null),
    [booking],
  );
  const hasToken = Boolean(form?.qrCheckInToken);

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">
              Booking not found.
            </p>
            <Button variant="outline" className="mt-4 w-full" asChild>
              <Link href="/customer/bookings">Back to Bookings</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
  const client = clients.find((c) => c.id === booking.clientId);
  const pet = client?.pets?.find((p) => p.id === petId);

  return (
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-lg space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/customer/bookings/${booking.id}`}>
            <ArrowLeft className="mr-2 size-4" />
            Back to booking
          </Link>
        </Button>

        <Card className="border-primary/30 bg-card">
          <CardHeader className="pb-2 text-center">
            <CardTitle className="text-xl">Show QR at drop-off</CardTitle>
            <CardDescription>
              Staff will scan this code to open your reservation and complete
              check-in quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-4">
            {hasToken ? (
              <>
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <CheckInQRCode token={form!.qrCheckInToken!} size={240} />
                </div>
                <p className="text-muted-foreground mt-4 text-center text-sm">
                  Booking #{booking.id} · {pet?.name ?? "Pet"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {booking.startDate} · {booking.checkInTime ?? "—"}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground py-8 text-center">
                No QR code available. Complete your Express Check-in form first.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="size-4" />
              QR also available in
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>· This portal (booking details page)</p>
            <p>· Confirmation email after you submit the form</p>
            <p>· SMS reminder (if enabled)</p>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" asChild>
          <Link href={`/customer/bookings/${booking.id}`}>
            View booking details
          </Link>
        </Button>
      </div>
    </div>
  );
}
