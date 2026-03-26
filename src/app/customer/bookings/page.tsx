"use client";

import { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  DollarSign,
  X,
  Edit,
  CheckCircle,
  Plus,
  MapPin,
  MessageSquare,
  Download,
  Calendar as CalendarIcon,
  Dog,
  Cat,
  Scissors,
  Home,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { CancelBookingDialog } from "@/components/customer/CancelBookingDialog";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagList } from "@/components/shared/TagList";
import { AddNoteModal } from "@/components/shared/AddNoteModal";
import { getNotesForEntity } from "@/data/tags-notes";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerBookingsPage() {
  const searchParams = useSearchParams();
  const { selectedFacility } = useCustomerFacility();
  const router = useRouter();
  useSettings();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<
    (typeof bookings)[0] | null
  >(null);
  const isMounted = useSyncExternalStore(
    (cb) => {
      cb();
      return () => {};
    },
    () => true,
    () => false,
  );
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [bookingForNote, setBookingForNote] = useState<
    (typeof bookings)[0] | null
  >(null);

  // Get customer data
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  // Check for service query parameter to redirect to new booking page
  useEffect(() => {
    const service = searchParams?.get("service");
    if (service && typeof window !== "undefined") {
      window.location.href = `/customer/bookings/new${service ? `?service=${encodeURIComponent(service)}` : ""}`;
    }
  }, [searchParams]);

  // Get customer's bookings for selected facility
  const customerBookings = useMemo(() => {
    if (!selectedFacility) return [];
    return bookings.filter(
      (b) =>
        b.clientId === MOCK_CUSTOMER_ID && b.facilityId === selectedFacility.id,
    );
  }, [selectedFacility]);

  // Separate upcoming and past bookings (only on client to avoid hydration issues)
  const { upcomingBookings, pastBookings } = useMemo(() => {
    if (!isMounted) {
      // Return safe defaults during SSR
      return { upcomingBookings: [], pastBookings: [] };
    }
    const now = new Date();
    const upcoming = customerBookings.filter((b) => {
      const bookingDate = new Date(b.startDate);
      return bookingDate >= now && b.status !== "cancelled";
    });
    const past = customerBookings.filter((b) => {
      const bookingDate = new Date(b.startDate);
      return (
        bookingDate < now ||
        b.status === "completed" ||
        b.status === "cancelled"
      );
    });
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [customerBookings, isMounted]);

  const handleCancelBooking = (booking: (typeof bookings)[0]) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const confirmCancelBooking = async () => {
    if (!bookingToCancel) return;

    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Booking cancelled successfully");
      setCancelDialogOpen(false);
      setBookingToCancel(null);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel booking",
      );
    }
  };

  const handleRescheduleBooking = () => {
    router.push("/customer/bookings/new");
  };

  const formatDate = (dateString: string) => {
    if (!isMounted) return dateString; // Return raw string during SSR
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge variant="default">Confirmed</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "request_submitted":
        return <Badge variant="secondary">Request Submitted</Badge>;
      case "waitlisted":
        return <Badge variant="outline">Waitlisted</Badge>;
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get pet for a booking
  const getPetForBooking = (booking: (typeof bookings)[0]) => {
    if (!customer) return null;
    const petId = Array.isArray(booking.petId)
      ? booking.petId[0]
      : booking.petId;
    return customer.pets.find((p) => p.id === petId);
  };

  // Get service icon
  const getServiceIcon = (service: string) => {
    switch (service.toLowerCase()) {
      case "grooming":
        return Scissors;
      case "daycare":
        return Dog;
      case "boarding":
        return Home;
      case "training":
        return GraduationCap;
      default:
        return Calendar;
    }
  };

  // Generate calendar file (.ics)
  const handleAddToCalendar = (booking: (typeof bookings)[0]) => {
    const pet = getPetForBooking(booking);
    const petName = pet?.name || "Pet";
    const startDateTime = new Date(
      `${booking.startDate}T${booking.checkInTime || "09:00"}`,
    );
    const endDateTime =
      booking.endDate && booking.checkOutTime
        ? new Date(`${booking.endDate}T${booking.checkOutTime}`)
        : new Date(startDateTime.getTime() + 60 * 60 * 1000); // Default 1 hour

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Yipyy//Booking//EN",
      "BEGIN:VEVENT",
      `UID:booking-${booking.id}@yipyy.com`,
      `DTSTART:${formatICSDate(startDateTime)}`,
      `DTEND:${formatICSDate(endDateTime)}`,
      `SUMMARY:${booking.service.charAt(0).toUpperCase() + booking.service.slice(1)} - ${petName}`,
      `DESCRIPTION:Service: ${booking.service}\\nPet: ${petName}\\nLocation: ${selectedFacility?.name || "Facility"}`,
      `LOCATION:${selectedFacility?.name || "Facility"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], {
      type: "text/calendar;charset=utf-8",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `booking-${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Calendar event downloaded");
  };

  const handleAddNote = (booking: (typeof bookings)[0]) => {
    setBookingForNote(booking);
    setAddNoteDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Bookings</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your service bookings
            </p>
          </div>
          <Button asChild variant="default" size="lg">
            <Link href="/customer/bookings/new">
              <Plus className="h-4 w-4 mr-2" />
              Book a Service
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {upcomingBookings.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Confirmed bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pastBookings.filter((b) => b.status === "completed").length}
              </div>
              <p className="text-xs text-muted-foreground">Past bookings</p>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
            <CardDescription>
              Manage your upcoming and past service bookings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList>
                <TabsTrigger value="upcoming">
                  Upcoming ({upcomingBookings.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                  Past ({pastBookings.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="space-y-4">
                {upcomingBookings.length > 0 ? (
                  <div className="grid gap-4">
                    {upcomingBookings.map((booking) => {
                      const pet = getPetForBooking(booking);
                      const ServiceIcon = getServiceIcon(booking.service);
                      const PetIcon = pet?.type === "Cat" ? Cat : Dog;

                      return (
                        <Link
                          key={booking.id}
                          href={`/customer/bookings/${booking.id}`}
                          className="block"
                        >
                          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                {/* Pet Photo */}
                                <div className="flex-shrink-0">
                                  {pet?.imageUrl ? (
                                    <Image
                                      src={pet.imageUrl}
                                      alt={pet.name}
                                      width={64}
                                      height={64}
                                      className="w-16 h-16 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <PetIcon className="h-8 w-8 text-primary" />
                                    </div>
                                  )}
                                </div>

                                {/* Booking Details */}
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <ServiceIcon className="h-5 w-5 text-muted-foreground" />
                                        <h3 className="font-semibold text-lg capitalize">
                                          {booking.service}
                                          {booking.serviceType && (
                                            <span className="text-muted-foreground font-normal ml-2">
                                              •{" "}
                                              {booking.serviceType.replace(
                                                /_/g,
                                                " ",
                                              )}
                                            </span>
                                          )}
                                        </h3>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {pet?.name || "Pet"}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(booking.status)}
                                      {booking.status ===
                                        "request_submitted" && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs"
                                        >
                                          <Clock className="h-3 w-3 mr-1" />
                                          Response in ~24h
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <TagList
                                    entityType="booking"
                                    entityId={booking.id}
                                    compact
                                    maxVisible={3}
                                    isCustomerView
                                  />

                                  {/* Shared booking notes */}
                                  {(() => {
                                    const sharedNotes = getNotesForEntity(
                                      "booking",
                                      booking.id,
                                    ).filter(
                                      (n) =>
                                        n.visibility === "shared_with_customer",
                                    );
                                    if (sharedNotes.length === 0) return null;
                                    return (
                                      <div className="space-y-1">
                                        {sharedNotes.map((note) => (
                                          <blockquote
                                            key={note.id}
                                            className="text-xs bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded p-2"
                                            aria-label={`Staff note from ${note.createdBy}`}
                                          >
                                            <span className="font-medium">
                                              {note.createdBy}:
                                            </span>{" "}
                                            {note.content}
                                          </blockquote>
                                        ))}
                                      </div>
                                    );
                                  })()}

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <p className="text-muted-foreground">
                                          Date
                                        </p>
                                        <p className="font-medium">
                                          {formatDate(booking.startDate)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <p className="text-muted-foreground">
                                          Time
                                        </p>
                                        <p className="font-medium">
                                          {booking.checkInTime || "—"}
                                          {booking.checkOutTime &&
                                            ` - ${booking.checkOutTime}`}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <p className="text-muted-foreground">
                                          Location
                                        </p>
                                        <p className="font-medium">
                                          {selectedFacility?.name || "—"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                                      <div>
                                        <p className="text-muted-foreground">
                                          Total
                                        </p>
                                        <p className="font-medium">
                                          ${booking.totalCost.toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Actions - stop propagation so clicking buttons doesn't navigate */}
                                  <div
                                    className="flex items-center gap-2 pt-2 border-t"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {(booking.status === "confirmed" ||
                                      booking.status === "pending") && (
                                      <>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleRescheduleBooking();
                                          }}
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Reschedule
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            handleCancelBooking(booking);
                                          }}
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <X className="h-4 w-4 mr-2" />
                                          Cancel
                                        </Button>
                                      </>
                                    )}
                                    {booking.status === "request_submitted" && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          window.location.href =
                                            "/customer/messages";
                                        }}
                                      >
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Message Facility
                                      </Button>
                                    )}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <Download className="h-4 w-4 mr-2" />
                                          More
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => handleAddNote(booking)}
                                        >
                                          <MessageSquare className="h-4 w-4 mr-2" />
                                          Add Note/Message
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleAddToCalendar(booking)
                                          }
                                        >
                                          <CalendarIcon className="h-4 w-4 mr-2" />
                                          Add to Calendar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No upcoming bookings
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Book your first service to get started
                    </p>
                    <Button asChild>
                      <Link href="/customer/bookings/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Book a Service
                      </Link>
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="past" className="space-y-4">
                {pastBookings.length > 0 ? (
                  <div className="grid gap-4">
                    {pastBookings.map((booking) => {
                      const pet = getPetForBooking(booking);
                      const ServiceIcon = getServiceIcon(booking.service);
                      const PetIcon = pet?.type === "Cat" ? Cat : Dog;

                      return (
                        <Link
                          key={booking.id}
                          href={`/customer/bookings/${booking.id}`}
                          className="block"
                        >
                          <Card className="opacity-75 hover:opacity-90 transition-opacity cursor-pointer">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                  {pet?.imageUrl ? (
                                    <Image
                                      src={pet.imageUrl}
                                      alt={pet.name}
                                      width={64}
                                      height={64}
                                      className="w-16 h-16 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                                      <PetIcon className="h-8 w-8 text-primary" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <ServiceIcon className="h-5 w-5 text-muted-foreground" />
                                        <h3 className="font-semibold capitalize">
                                          {booking.service}
                                        </h3>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {pet?.name || "Pet"} •{" "}
                                        {formatDate(booking.startDate)}
                                      </p>
                                    </div>
                                    {getStatusBadge(booking.status)}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>${booking.totalCost.toFixed(2)}</span>
                                    {booking.checkInTime && (
                                      <span>{booking.checkInTime}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No past bookings
                    </h3>
                    <p className="text-muted-foreground">
                      Your completed bookings will appear here
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Booking Dialog */}
      <CancelBookingDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        booking={bookingToCancel}
        onConfirm={confirmCancelBooking}
      />

      {/* Add Note Dialog */}
      {bookingForNote && (
        <AddNoteModal
          open={addNoteDialogOpen}
          onOpenChange={(open) => {
            setAddNoteDialogOpen(open);
            if (!open) setBookingForNote(null);
          }}
          title={`Add Note — ${getPetForBooking(bookingForNote)?.name ?? "Booking"}`}
          onSave={() => {
            toast.success("Note added to booking");
            setAddNoteDialogOpen(false);
            setBookingForNote(null);
          }}
        />
      )}
    </div>
  );
}
