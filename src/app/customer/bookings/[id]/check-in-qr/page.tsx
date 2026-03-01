"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Smartphone, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    () => bookings.find((b) => String(b.id) === id && b.clientId === MOCK_CUSTOMER_ID),
    [id]
  );
  const form = useMemo(() => (booking ? getYipyyGoForm(booking.id) : null), [booking]);
  const hasToken = Boolean(form?.qrCheckInToken);

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center">Booking not found.</p>
            <Button variant="outline" className="w-full mt-4" asChild>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/customer/bookings/${booking.id}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to booking
          </Link>
        </Button>

        <Card className="border-primary/30 bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Show QR at drop-off</CardTitle>
            <CardDescription>
              Staff will scan this code to open your reservation and complete check-in quickly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-4">
            {hasToken ? (
              <>
                <div className="p-4 bg-white rounded-xl shadow-sm">
                  <CheckInQRCode token={form!.qrCheckInToken!} size={240} />
                </div>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Booking #{booking.id} · {pet?.name ?? "Pet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {booking.startDate} · {booking.checkInTime ?? "—"}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No QR code available. Complete your YipyyGo form first.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              QR also available in
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>· This portal (booking details page)</p>
            <p>· Confirmation email after you submit the form</p>
            <p>· SMS reminder (if enabled)</p>
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" asChild>
          <Link href={`/customer/bookings/${booking.id}`}>View booking details</Link>
        </Button>
      </div>
    </div>
  );
}
