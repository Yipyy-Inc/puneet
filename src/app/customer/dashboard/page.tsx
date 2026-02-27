"use client";

import { useMemo, useState, useEffect } from "react";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dog,
  Calendar,
  MessageSquare,
  FileText,
  Scissors,
  AlertTriangle,
  AlertCircle,
  Clock,
  MapPin,
  Edit,
  ExternalLink,
  CheckCircle2,
  PawPrint,
  GraduationCap,
  Building2,
  User,
} from "lucide-react";
import Link from "next/link";
import { clients } from "@/data/clients";
import { bookings } from "@/data/bookings";
import { vaccinationRecords } from "@/data/pet-data";
import { payments, invoices } from "@/data/payments";
import { facilityConfig } from "@/data/facility-config";
import { clientCommunications } from "@/data/communications";
import { reportCards } from "@/data/pet-data";
import { customerLoyaltyData, loyaltySettings } from "@/data/marketing";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerDashboardPage() {
  const { selectedFacility } = useCustomerFacility();
  const [isMounted, setIsMounted] = useState(false);

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

  // Get past bookings
  const pastBookings = useMemo(() => {
    if (!isMounted) return [];
    const now = new Date();
    return customerBookings
      .filter((b) => {
        const bookingDate = new Date(b.endDate || b.startDate);
        return bookingDate < now || b.status === "completed";
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
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

  // Get messages count
  const messagesData = useMemo(() => {
    const customerMessages = clientCommunications.filter(
      (m) => m.clientId === MOCK_CUSTOMER_ID && m.facilityId === selectedFacility?.id
    );
    const unreadCount = customerMessages.filter((m) => m.status !== "read").length;
    const recentMessages = customerMessages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);
    return { total: customerMessages.length, unread: unreadCount, recent: recentMessages };
  }, [selectedFacility]);

  // Get report cards count
  const reportCardsData = useMemo(() => {
    const customerReportCards = reportCards.filter((rc) => {
      const booking = bookings.find((b) => b.id === rc.bookingId);
      return booking?.clientId === MOCK_CUSTOMER_ID && booking?.facilityId === selectedFacility?.id;
    });
    const latestReportCard = customerReportCards
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    return {
      total: customerReportCards.length,
      latest: latestReportCard ? new Date(latestReportCard.date) : null,
    };
  }, [selectedFacility]);

  // Get loyalty data
  const loyaltyData = useMemo(() => {
    const customerLoyalty = customerLoyaltyData.find((l) => l.clientId === MOCK_CUSTOMER_ID);
    if (!customerLoyalty) return null;

    const currentTier = loyaltySettings.tiers.find((t) => t.id === customerLoyalty.tier);
    const nextTier = loyaltySettings.tiers.find(
      (t) => t.minPoints > customerLoyalty.points
    );
    const pointsToNextTier = nextTier ? nextTier.minPoints - customerLoyalty.points : 0;
    const currentTierMaxPoints = nextTier ? nextTier.minPoints : Infinity;
    const currentTierMinPoints = currentTier?.minPoints || 0;
    const progressInTier = customerLoyalty.points - currentTierMinPoints;
    const tierRange = currentTierMaxPoints - currentTierMinPoints;
    const progressPercentage = tierRange > 0 ? (progressInTier / tierRange) * 100 : 0;

    return {
      ...customerLoyalty,
      currentTier,
      nextTier,
      pointsToNextTier,
      progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
    };
  }, []);

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
          (v) =>
            v.vaccineName.toLowerCase().includes(req.name.toLowerCase()) ||
            req.name.toLowerCase().includes(v.vaccineName.toLowerCase())
        );

        if (!vaccination) {
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
    const pendingBookings = customerBookings.filter((b) => b.status === "pending" || b.status === "request_submitted");
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
    const overdueInvoices = customerInvoices.filter((inv) => inv.status === "overdue");
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

    return actions.sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1;
      if (a.priority !== "high" && b.priority === "high") return 1;
      return 0;
    });
  }, [customer, customerPets, customerBookings, selectedFacility]);

  // Format date/time helper
  const formatDateTime = (dateString: string, timeString?: string) => {
    if (!isMounted) return "";
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    if (timeString) {
      return `${dateStr} - ${timeString}`;
    }
    return dateStr;
  };

  const formatDateShort = (date: Date) => {
    if (!isMounted) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!isMounted) return "";
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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
        return GraduationCap;
      default:
        return Calendar;
    }
  };

  // Get services for a pet
  const getPetServices = (petId: number) => {
    const petBookings = customerBookings.filter((b) => b.petId === petId);
    const services = new Set<string>();
    petBookings.forEach((b) => {
      services.add(b.service);
    });
    return Array.from(services);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {selectedFacility?.logo && (
            <img
              src={selectedFacility.logo}
              alt={selectedFacility.name}
              className="h-12 w-auto"
            />
          )}
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Welcome back{customer ? `, ${customer.name.split(" ")[0]}` : ""}!</h1>
            <p className="text-muted-foreground">
              {isMounted && selectedFacility
                ? `Manage your pets and book services at ${selectedFacility.name}`
                : "Manage your pets and book services with ease"}
            </p>
          </div>
        </div>

        {/* Next Appointment Card */}
        {nextBooking && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-lg">NEXT APPOINTMENT</CardTitle>
            </CardHeader>
            <CardContent>
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
                      {nextBookingPet && ` – ${nextBookingPet.name} (${nextBookingPet.breed})`}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(nextBooking.startDate, nextBooking.checkInTime || undefined)}
                    </p>
                    {nextBooking.groomingStyle && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {nextBooking.groomingStyle}
                        {nextBooking.groomingAddOns && nextBooking.groomingAddOns.length > 0 && (
                          <span> + {nextBooking.groomingAddOns.join(", ")}</span>
                        )}
                      </p>
                    )}
                    <p className="text-lg font-semibold mt-2">${nextBooking.totalCost}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/customer/bookings/${nextBooking.id}`}>Reschedule</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href={`/customer/bookings/${nextBooking.id}`}>View Details</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dashboard Summary Tiles */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.location.href = "/customer/pets"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Pets</CardTitle>
              <PawPrint className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerPets.length}</div>
              <p className="text-xs text-muted-foreground">
                {customerPets.length > 0
                  ? customerPets.map((p) => p.name).join(" & ")
                  : "Add your first pet"}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.location.href = "/customer/bookings"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingBookings.length}</div>
              <p className="text-xs text-muted-foreground">
                {upcomingBookings.length > 0 && nextBooking
                  ? `Next: ${formatDateShort(new Date(nextBooking.startDate))}`
                  : "No upcoming appointments"}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.location.href = "/customer/messages"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{messagesData.total}</div>
              <p className="text-xs text-muted-foreground">
                {messagesData.unread > 0 ? (
                  <span className="text-orange-600 font-medium">{messagesData.unread} new messages</span>
                ) : (
                  "No new messages"
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => window.location.href = "/customer/report-cards"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Report Cards</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportCardsData.total}</div>
              <p className="text-xs text-muted-foreground">
                {reportCardsData.latest
                  ? `Latest: ${formatDateShort(reportCardsData.latest)}`
                  : "No report cards yet"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Loyalty Rewards Section */}
        {loyaltyData && (
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="text-4xl font-bold">{loyaltyData.points} pts</div>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-xs uppercase tracking-wide mb-1">LOYALTY REWARDS</div>
                  <div className="text-sm mb-2">
                    {loyaltyData.currentTier?.name || "Bronze"}
                    {loyaltyData.nextTier && ` - ${loyaltyData.pointsToNextTier} pts to ${loyaltyData.nextTier.name}`}
                  </div>
                  {loyaltyData.nextTier && (
                    <>
                      <Progress value={loyaltyData.progressPercentage} className="h-2 mb-1" />
                      <div className="text-xs opacity-90">
                        {loyaltyData.points}/{loyaltyData.nextTier.minPoints} pts to {loyaltyData.nextTier.name}
                      </div>
                    </>
                  )}
                </div>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/customer/billing">Redeem Points</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* My Pets Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Pets</CardTitle>
                <Link href="/customer/pets" className="text-sm text-muted-foreground hover:text-foreground">
                  Manage all →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerPets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Dog className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No pets registered yet</p>
                  <Button variant="outline" size="sm" className="mt-4" asChild>
                    <Link href="/customer/pets/add">Add your first pet</Link>
                  </Button>
                </div>
              ) : (
                <>
                  {customerPets.map((pet) => {
                    const petServices = getPetServices(pet.id);
                    return (
                      <div key={pet.id} className="flex items-center gap-3 p-3 rounded-lg border bg-background/60">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Dog className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{pet.name}</p>
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <span className="text-xs text-muted-foreground">Healthy</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {pet.breed} - {pet.age} {pet.age === 1 ? "yr" : "yrs"}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {petServices.map((service) => (
                              <Badge key={service} variant="secondary" className="text-xs capitalize">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <Link
                    href="/customer/pets/add"
                    className="block text-center text-sm text-muted-foreground hover:text-foreground pt-2 border-t"
                  >
                    + Add a new pet
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          {/* Messages Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Messages</CardTitle>
                <Link href="/customer/messages" className="text-sm text-muted-foreground hover:text-foreground">
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {messagesData.recent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                messagesData.recent.map((message) => {
                  const isUnread = message.status !== "read";
                  const getIcon = () => {
                    if (message.staffName?.toLowerCase().includes("groomer")) return PawPrint;
                    if (message.staffName?.toLowerCase().includes("trainer")) return GraduationCap;
                    return Building2;
                  };
                  const Icon = getIcon();
                  return (
                    <div
                      key={message.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-background/60 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => window.location.href = "/customer/messages"}
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{message.staffName || "Facility Team"}</p>
                          {isUnread && <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{message.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(message.timestamp)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Needed / Getting Started */}
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
                  Getting Started
                </>
              )}
            </CardTitle>
            <CardDescription>
              {urgentActions.length > 0
                ? "Items requiring your attention"
                : "Complete your profile to get the most out of Yipyy"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentActions.length === 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Add your first pet: Done ✓</span>
                </div>
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
                        <p className="text-xs text-muted-foreground mt-1">{action.message}</p>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
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
          </CardContent>
        </Card>

        {/* Upcoming Bookings List */}
        {upcomingBookings.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upcoming Bookings</CardTitle>
                <Link href="/customer/bookings" className="text-sm text-muted-foreground hover:text-foreground">
                  View all →
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingBookings.slice(0, 5).map((booking) => {
                const pet = customerPets.find((p) => p.id === booking.petId);
                const ServiceIcon = getServiceIcon(booking.service);
                return (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-background/60 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => window.location.href = `/customer/bookings/${booking.id}`}
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ServiceIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm uppercase">{booking.service}</p>
                        <Badge variant="outline" className="text-xs">
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {pet?.name}
                        {booking.groomingStyle && ` - ${booking.groomingStyle}`}
                        {booking.groomingAddOns && booking.groomingAddOns.length > 0 && (
                          <span> + {booking.groomingAddOns.join(", ")}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(booking.startDate, booking.checkInTime || undefined)}
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-primary">${booking.totalCost}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
