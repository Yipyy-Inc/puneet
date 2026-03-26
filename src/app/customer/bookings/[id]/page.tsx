"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  User,
  Phone,
  Mail,
  FileText,
} from "lucide-react";
import { GroomingCheckInButton } from "@/components/grooming/GroomingCheckInButton";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { getYipyyGoForm } from "@/data/yipyygo-forms";
import { CheckInQRCode } from "@/components/yipyygo/CheckInQRCode";
import Link from "next/link";
import { QrCode } from "lucide-react";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { selectedFacility: _selectedFacility } = useCustomerFacility();

  const booking = useMemo(() => {
    return bookings.find(
      (b) => String(b.id) === id && b.clientId === MOCK_CUSTOMER_ID,
    );
  }, [id]);

  const customer = useMemo(() => {
    return clients.find((c) => c.id === MOCK_CUSTOMER_ID);
  }, []);

  // Check if YipyyGo is enabled for this booking
  const yipyyGoConfig = useMemo(() => {
    if (!booking) return null;
    return getYipyyGoConfig(booking.facilityId);
  }, [booking]);

  const isYipyyGoEnabled = useMemo(() => {
    if (!booking || !yipyyGoConfig || !yipyyGoConfig.enabled) return false;
    const serviceType = booking.service.toLowerCase() as
      | "daycare"
      | "boarding"
      | "grooming"
      | "training";
    const serviceConfig = yipyyGoConfig.serviceConfigs.find(
      (sc) => sc.serviceType === serviceType,
    );
    return serviceConfig?.enabled || false;
  }, [yipyyGoConfig, booking]);

  const yipyyGoForm = useMemo(
    () => (booking ? getYipyyGoForm(booking.id) : null),
    [booking],
  );

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Booking not found</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/customer/bookings")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  const bookingDate = new Date(booking.startDate);
  const isToday = bookingDate.toDateString() === new Date().toDateString();
  const isUpcoming = bookingDate >= new Date();
  const isGrooming = booking.service.toLowerCase() === "grooming";
  const isSalon = booking.serviceType === "salon" || !booking.serviceType; // Default to salon if not specified
  const hasCheckInQR = Boolean(
    yipyyGoForm?.qrCheckInToken &&
    (yipyyGoForm.submittedAt || yipyyGoForm.staffStatus === "approved"),
  );

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/customer/bookings")}
          >
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Booking Details</h1>
            <p className="text-muted-foreground">Booking #{booking.id}</p>
          </div>
        </div>
        <Badge
          variant={
            booking.status === "confirmed"
              ? "default"
              : booking.status === "completed"
                ? "secondary"
                : booking.status === "cancelled"
                  ? "destructive"
                  : "outline"
          }
        >
          {booking.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Booking Information */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="text-muted-foreground mt-0.5 h-5 w-5" />
                  <div>
                    <p className="text-muted-foreground text-sm">Date</p>
                    <p className="font-medium">
                      {bookingDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="text-muted-foreground mt-0.5 h-5 w-5" />
                  <div>
                    <p className="text-muted-foreground text-sm">Time</p>
                    <p className="font-medium">
                      {booking.checkInTime || "Not specified"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="text-muted-foreground mt-0.5 h-5 w-5" />
                  <div>
                    <p className="text-muted-foreground text-sm">Location</p>
                    <p className="font-medium">
                      {isSalon ? "Salon" : "Mobile Van"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="text-muted-foreground mt-0.5 h-5 w-5" />
                  <div>
                    <p className="text-muted-foreground text-sm">Total Cost</p>
                    <p className="font-medium">
                      ${booking.totalCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Information */}
          <Card>
            <CardHeader>
              <CardTitle>Service Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground mb-1 text-sm">Service</p>
                <p className="font-medium">{booking.service}</p>
              </div>
              {booking.extraServices && booking.extraServices.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1 text-sm">Add-ons</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.extraServices.map((service, index) => {
                      // Handle both string[] (grooming) and ExtraService[] (daycare/boarding) types
                      const serviceName =
                        typeof service === "string"
                          ? service
                          : typeof service === "object" &&
                              "serviceId" in service
                            ? service.serviceId
                                .replace(/-/g, " ")
                                .replace(/\b\w/g, (l) => l.toUpperCase())
                            : String(service);

                      return (
                        <Badge key={index} variant="outline">
                          {serviceName}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Show QR at drop-off (after YipyyGo submitted) */}
          {hasCheckInQR && isUpcoming && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="text-primary h-5 w-5" />
                  Fast-track check-in QR
                </CardTitle>
                <CardDescription>
                  Show this QR at drop-off so staff can open your reservation
                  and check you in quickly.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="rounded-xl bg-white p-4 shadow-sm">
                  <CheckInQRCode
                    token={yipyyGoForm!.qrCheckInToken!}
                    size={200}
                  />
                </div>
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href={`/customer/bookings/${booking.id}/check-in-qr`}>
                    Full-screen QR page
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Check-in Section (Day of appointment, Salon only) */}
          {isGrooming &&
            isSalon &&
            isToday &&
            isUpcoming &&
            booking.status === "confirmed" && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle>Check In</CardTitle>
                  <CardDescription>
                    Let us know when you arrive at the salon
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <GroomingCheckInButton
                    bookingId={String(booking.id)}
                    clientId={MOCK_CUSTOMER_ID}
                  />
                </CardContent>
              </Card>
            )}

          {/* Mobile Groomer Arrival Notification */}
          {isGrooming &&
            !isSalon &&
            isToday &&
            isUpcoming &&
            booking.status === "confirmed" && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle>Groomer Arrival</CardTitle>
                  <CardDescription>
                    You&apos;ll receive a notification when the groomer is 10
                    minutes away
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    The mobile grooming van will arrive at your location.
                    You&apos;ll be notified when they&apos;re on their way.
                  </p>
                </CardContent>
              </Card>
            )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customer && (
                <>
                  <div className="flex items-start gap-3">
                    <User className="text-muted-foreground mt-0.5 h-5 w-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">Name</p>
                      <p className="font-medium">{customer.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="text-muted-foreground mt-0.5 h-5 w-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">Phone</p>
                      <p className="font-medium">
                        {customer.phone || "Not provided"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="text-muted-foreground mt-0.5 h-5 w-5" />
                    <div>
                      <p className="text-muted-foreground text-sm">Email</p>
                      <p className="font-medium">
                        {customer.email || "Not provided"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/customer/bookings">View All Bookings</Link>
              </Button>
              {isYipyyGoEnabled &&
                booking.status === "confirmed" &&
                isUpcoming && (
                  <Button className="w-full" asChild>
                    <Link
                      href={`/customer/bookings/${booking.id}/yipyygo-form`}
                    >
                      <FileText className="mr-2 size-4" />
                      Complete YipyyGo Form
                    </Link>
                  </Button>
                )}
              {booking.status === "confirmed" && isUpcoming && (
                <Button variant="outline" className="w-full">
                  Reschedule
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
