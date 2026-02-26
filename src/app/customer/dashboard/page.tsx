"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dog, Calendar, MessageSquare, FileText, CreditCard, Camera, Shield, Scissors, AlertTriangle, AlertCircle, Clock, MapPin, Edit, X, ExternalLink, Upload, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { petCams } from "@/data/additional-features";
import { setUserRole, setFacilityRole } from "@/lib/role-utils";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { vaccinationRecords } from "@/data/pet-data";
import { payments, invoices } from "@/data/payments";
import { facilityConfig } from "@/data/facility-config";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerDashboardPage() {
  const { selectedFacility } = useCustomerFacility();
  const [isMounted, setIsMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get customer data
  const customer = useMemo(() => clients.find((c) => c.id === MOCK_CUSTOMER_ID), []);
  const customerPets = useMemo(() => customer?.pets || [], [customer]);

  // Get customer bookings for selected facility
  const customerBookings = useMemo(() => {
    if (!selectedFacility) return [];
    return bookings.filter(
      (b) => b.clientId === MOCK_CUSTOMER_ID && b.facilityId === selectedFacility.id
    );
  }, [selectedFacility]);

  // Get upcoming bookings (sorted by date)
  const upcomingBookings = useMemo(() => {
    if (!isMounted) return [];
    const now = new Date();
    return customerBookings
      .filter((b) => {
        const bookingDate = new Date(b.startDate);
        return bookingDate >= now && b.status !== "cancelled";
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [customerBookings, isMounted]);

  // Get next booking
  const nextBooking = useMemo(() => {
    return upcomingBookings[0] || null;
  }, [upcomingBookings]);

  // Get pet for next booking
  const nextBookingPet = useMemo(() => {
    if (!nextBooking || !customer) return null;
    return customer.pets.find((p) => p.id === nextBooking.petId);
  }, [nextBooking, customer]);

  // Check for urgent actions
  const urgentActions = useMemo(() => {
    const actions: Array<{
      type: "vaccination_expired" | "vaccination_expiring" | "booking_pending" | "payment_failed" | "waiver_expiring";
      priority: "high" | "medium";
      title: string;
      message: string;
      actionLabel: string;
      actionLink: string;
      petName?: string;
    }> = [];

    if (!customer) return actions;

    // Check for expired vaccinations
    customerPets.forEach((pet) => {
      const petVaccinations = vaccinationRecords.filter((v) => v.petId === pet.id);
      const requiredVaccines = facilityConfig.vaccinationRequirements.requiredVaccinations.filter(
        (v) => v.required
      );

      requiredVaccines.forEach((req) => {
        const vaccination = petVaccinations.find(
          (v) => v.vaccineName.toLowerCase().includes(req.name.toLowerCase()) ||
                req.name.toLowerCase().includes(v.vaccineName.toLowerCase())
        );

        if (!vaccination) {
          // Missing vaccination
          actions.push({
            type: "vaccination_expired",
            priority: "high",
            title: `Vaccination missing for ${pet.name}`,
            message: `${req.name} vaccination is required — upload now`,
            actionLabel: "Upload Vaccination",
            actionLink: `/customer/pets/${pet.id}`,
            petName: pet.name,
          });
        } else {
          const expiryDate = new Date(vaccination.expiryDate);
          const now = new Date();
          const daysUntilExpiry = Math.floor(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiry < 0) {
            // Expired
            actions.push({
              type: "vaccination_expired",
              priority: "high",
              title: `Vaccines expired for ${pet.name}`,
              message: `${req.name} expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) > 1 ? "s" : ""} ago — upload now`,
              actionLabel: "Upload Vaccination",
              actionLink: `/customer/pets/${pet.id}`,
              petName: pet.name,
            });
          } else if (daysUntilExpiry <= 30) {
            // Expiring soon
            actions.push({
              type: "vaccination_expiring",
              priority: "medium",
              title: `Vaccination expiring for ${pet.name}`,
              message: `${req.name} expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? "s" : ""}`,
              actionLabel: "Update Vaccination",
              actionLink: `/customer/pets/${pet.id}`,
              petName: pet.name,
            });
          }
        }
      });
    });

    // Check for pending booking requests
    const pendingBookings = customerBookings.filter(
      (b) => b.status === "pending"
    );
    if (pendingBookings.length > 0) {
      actions.push({
        type: "booking_pending",
        priority: "medium",
        title: "Booking request pending",
        message: `You have ${pendingBookings.length} booking request${pendingBookings.length > 1 ? "s" : ""} pending facility approval`,
        actionLabel: "View Bookings",
        actionLink: "/customer/bookings",
      });
    }

    // Check for failed payments
    const customerPayments = payments.filter(
      (p) => p.clientId === MOCK_CUSTOMER_ID && p.facilityId === selectedFacility?.id
    );
    const failedPayments = customerPayments.filter((p) => p.status === "failed");
    if (failedPayments.length > 0) {
      actions.push({
        type: "payment_failed",
        priority: "high",
        title: "Payment failed",
        message: "Update your payment method to continue using services",
        actionLabel: "Update Payment",
        actionLink: "/customer/billing",
      });
    }

    // Check for overdue invoices
    const customerInvoices = invoices.filter(
      (inv) => inv.clientId === MOCK_CUSTOMER_ID && inv.facilityId === selectedFacility?.id
    );
    const overdueInvoices = customerInvoices.filter(
      (inv) => inv.status === "overdue"
    );
    if (overdueInvoices.length > 0) {
      actions.push({
        type: "payment_failed",
        priority: "high",
        title: "Payment overdue",
        message: `You have ${overdueInvoices.length} overdue invoice${overdueInvoices.length > 1 ? "s" : ""}`,
        actionLabel: "View Invoices",
        actionLink: "/customer/billing",
      });
    }

    // TODO: Check for expiring waivers
    // This would require waiver data structure

    // Sort by priority (high first)
    return actions.sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (a.priority !== "high" && b.priority === "high") return 1;
      return 0;
    });
  }, [customer, customerPets, customerBookings, selectedFacility]);

  const switchToAdmin = () => {
    startTransition(() => {
      setUserRole("super_admin");
      window.location.href = "/dashboard";
    });
  };

  const switchToGroomer = () => {
    startTransition(() => {
      window.location.href = "/groomer/auth/login";
    });
  };

  // Check if cameras are enabled for customers
  const camerasEnabled = useMemo(() => {
    if (!isMounted) return false; // Safe default during SSR
    const customerAccessibleCameras = petCams.filter(
      (cam) =>
        cam.accessLevel === "public" || cam.accessLevel === "customers_only"
    );
    return customerAccessibleCameras.length > 0;
  }, [isMounted]);

  // Format date/time helper
  const formatDateTime = (dateString: string, timeString?: string) => {
    if (!isMounted) return "";
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (timeString) {
      return `${dateStr} at ${timeString}`;
    }
    return dateStr;
  };

  // Get service icon
  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "grooming":
        return Scissors;
      case "daycare":
        return Dog;
      case "boarding":
        return Calendar;
      case "training":
        return Shield;
      default:
        return Calendar;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header with Logo and Welcome */}
        <div className="flex items-center gap-4">
          {selectedFacility?.logo && (
            <img
              src={selectedFacility.logo}
              alt={selectedFacility.name}
              className="h-12 w-auto"
            />
          )}
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">
              Welcome back{customer ? `, ${customer.name.split(" ")[0]}` : ""}!
            </h1>
            <p className="text-muted-foreground">
              {isMounted && selectedFacility
                ? `Manage your pets and book services at ${selectedFacility.name}`
                : "Manage your pets and book services with ease"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.location.href = "/customer/pets"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Pets</CardTitle>
              <Dog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerPets.length}</div>
              <p className="text-xs text-muted-foreground">
                {customerPets.length === 0
                  ? "Add your first pet to get started"
                  : `${customerPets.length} pet${customerPets.length > 1 ? "s" : ""} registered`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingBookings.length}</div>
              <p className="text-xs text-muted-foreground">
                {upcomingBookings.length === 0
                  ? "No upcoming appointments"
                  : `${upcomingBookings.length} appointment${upcomingBookings.length > 1 ? "s" : ""} scheduled`}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.location.href = "/customer/messages"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                No new messages
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.location.href = "/customer/report-cards"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Report Cards</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                No report cards yet
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/customer/bookings">
                  <Calendar className="mr-2 h-4 w-4" />
                  Book a Service
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/customer/pets">
                  <Dog className="mr-2 h-4 w-4" />
                  Manage Pets
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/customer/report-cards">
                  <FileText className="mr-2 h-4 w-4" />
                  View Report Cards
                </Link>
              </Button>
              <Button className="w-full justify-start" variant="outline" asChild>
                <Link href="/customer/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Billing & Payments
                </Link>
              </Button>
              {camerasEnabled && (
                <Button className="w-full justify-start" variant="outline" asChild>
                  <Link href="/customer/cameras">
                    <Camera className="mr-2 h-4 w-4" />
                    Live Cameras
                  </Link>
                </Button>
              )}
              <Button 
                className="w-full justify-start" 
                variant="outline" 
                onClick={switchToGroomer}
                disabled={isPending}
              >
                <Scissors className="mr-2 h-4 w-4" />
                Switch to Groomer
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline" 
                onClick={switchToAdmin}
                disabled={isPending}
              >
                <Shield className="mr-2 h-4 w-4" />
                Switch to Admin
              </Button>
            </CardContent>
          </Card>

          {/* Action Needed Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {urgentActions.length > 0 ? (
                  <>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Action Needed
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    All Set
                  </>
                )}
              </CardTitle>
              <CardDescription>
                {urgentActions.length > 0
                  ? "Items requiring your attention"
                  : "You're all caught up!"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {urgentActions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                  <p>No urgent actions needed at this time.</p>
                </div>
              ) : (
                urgentActions.slice(0, 3).map((action, index) => (
                  <Alert
                    key={index}
                    variant={action.priority === "high" ? "destructive" : "default"}
                    className="border-l-4"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{action.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {action.message}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          asChild
                        >
                          <Link href={action.actionLink}>
                            {action.actionLabel}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))
              )}
              {urgentActions.length > 3 && (
                <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                  <Link href="/customer/dashboard">
                    View all {urgentActions.length} actions
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Next Booking Preview */}
        {nextBooking && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Next Booking
              </CardTitle>
              <CardDescription>
                Your upcoming appointment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    {(() => {
                      const ServiceIcon = getServiceIcon(nextBooking.service);
                      return <ServiceIcon className="h-6 w-6 text-primary" />;
                    })()}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="font-semibold text-lg capitalize">
                        {nextBooking.service}
                        {nextBooking.serviceType && (
                          <span className="text-muted-foreground font-normal">
                            {" "}• {nextBooking.serviceType.replace(/_/g, " ")}
                          </span>
                        )}
                      </h3>
                      {nextBookingPet && (
                        <p className="text-sm text-muted-foreground">
                          For {nextBookingPet.name}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {formatDateTime(nextBooking.startDate, nextBooking.checkInTime || undefined)}
                        </span>
                      </div>
                      {selectedFacility && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedFacility.name}</span>
                        </div>
                      )}
                      <Badge
                        variant={
                          nextBooking.status === "confirmed"
                            ? "default"
                            : nextBooking.status === "pending"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {nextBooking.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/customer/bookings/${nextBooking.id}`}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/customer/bookings/${nextBooking.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Modify
                    </Link>
                  </Button>
                  {nextBooking.status !== "confirmed" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/customer/bookings/${nextBooking.id}`}>
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
