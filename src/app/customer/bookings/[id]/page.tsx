"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, MapPin, DollarSign, User, Phone, Mail } from "lucide-react";
import { GroomingCheckInButton } from "@/components/grooming/GroomingCheckInButton";
import Link from "next/link";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { selectedFacility } = useCustomerFacility();

  const booking = useMemo(() => {
    return bookings.find((b) => String(b.id) === id && b.clientId === MOCK_CUSTOMER_ID);
  }, [id]);

  const customer = useMemo(() => {
    return clients.find((c) => c.id === MOCK_CUSTOMER_ID);
  }, []);

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Booking not found</h2>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/customer/bookings")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/customer/bookings")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Information */}
          <Card>
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
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
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">{booking.checkInTime || "Not specified"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {isSalon ? "Salon" : "Mobile Van"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="font-medium">${booking.totalCost.toFixed(2)}</p>
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
                <p className="text-sm text-muted-foreground mb-1">Service</p>
                <p className="font-medium">{booking.service}</p>
              </div>
              {booking.extraServices && booking.extraServices.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Add-ons</p>
                  <div className="flex flex-wrap gap-2">
                    {booking.extraServices.map((service, index) => (
                      <Badge key={index} variant="outline">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Check-in Section (Day of appointment, Salon only) */}
          {isGrooming && isSalon && isToday && isUpcoming && booking.status === "confirmed" && (
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
          {isGrooming && !isSalon && isToday && isUpcoming && booking.status === "confirmed" && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle>Groomer Arrival</CardTitle>
                <CardDescription>
                  You'll receive a notification when the groomer is 10 minutes away
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  The mobile grooming van will arrive at your location. You'll be notified when they're on their way.
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
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{customer.name}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{customer.phone || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{customer.email || "Not provided"}</p>
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
