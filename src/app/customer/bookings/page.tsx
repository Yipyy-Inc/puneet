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
import { getUnfinishedBookingsForCustomer } from "@/data/unfinished-bookings";
import { CustomerUnfinishedBookings } from "@/components/bookings/CustomerUnfinishedBookings";

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

  const myUnfinishedBookings = useMemo(
    () => getUnfinishedBookingsForCustomer(MOCK_CUSTOMER_ID),
    [],
  );

  // Check for service query parameter to redirect to new booking page
  useEffect(() => {
    const service = searchParams?.get("service");
    if (service && typeof window !== "undefined") {
      window.location.href = `/customer/bookings/new${service ? `?service=${encodeURIComponent(service)}` : ""}`;
    }
  }, [searchParams]);

  // Get customer's bookings (show all facilities — filter by facility switcher if desired)
  const customerBookings = useMemo(() => {
    const all = bookings.filter((b) => b.clientId === MOCK_CUSTOMER_ID);
    if (!selectedFacility) return all;
    // If the selected facility has bookings, filter; otherwise show all
    const filtered = all.filter((b) => b.facilityId === selectedFacility.id);
    return filtered.length > 0 ? filtered : all;
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
    <div className="from-background via-muted/20 to-background min-h-screen bg-linear-to-br p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
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
              <Plus className="mr-2 size-4" />
              Book a Service
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <Calendar className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {upcomingBookings.length}
              </div>
              <p className="text-muted-foreground text-xs">
                Confirmed bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pastBookings.filter((b) => b.status === "completed").length}
              </div>
              <p className="text-muted-foreground text-xs">Past bookings</p>
            </CardContent>
          </Card>

          {myUnfinishedBookings.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Unfinished
                </CardTitle>
                <Clock className="size-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {myUnfinishedBookings.length}
                </div>
                <p className="text-muted-foreground text-xs">
                  Incomplete reservations
                </p>
              </CardContent>
            </Card>
          )}
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
                <TabsTrigger value="unfinished" className="relative">
                  Unfinished
                  {myUnfinishedBookings.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {myUnfinishedBookings.length}
                    </span>
                  )}
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
                          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                {/* Pet Photo */}
                                <div className="shrink-0">
                                  {pet?.imageUrl ? (
                                    <Image
                                      src={pet.imageUrl}
                                      alt={pet.name}
                                      width={64}
                                      height={64}
                                      className="h-16 w-16 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-lg">
                                      <PetIcon className="text-primary size-8" />
                                    </div>
                                  )}
                                </div>

                                {/* Booking Details */}
                                <div className="flex-1 space-y-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="mb-1 flex items-center gap-2">
                                        <ServiceIcon className="text-muted-foreground size-5" />
                                        <h3 className="text-lg font-semibold capitalize">
                                          {booking.service}
                                          {booking.serviceType && (
                                            <span className="text-muted-foreground ml-2 font-normal">
                                              •{" "}
                                              {booking.serviceType.replace(
                                                /_/g,
                                                " ",
                                              )}
                                            </span>
                                          )}
                                        </h3>
                                      </div>
                                      <p className="text-muted-foreground text-sm">
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
                                          <Clock className="mr-1 size-3" />
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
                                            className="rounded-sm border border-blue-200 bg-blue-50 p-2 text-xs dark:border-blue-800 dark:bg-blue-950/20"
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

                                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="text-muted-foreground size-4" />
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
                                      <Clock className="text-muted-foreground size-4" />
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
                                      <MapPin className="text-muted-foreground size-4" />
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
                                      <DollarSign className="text-muted-foreground size-4" />
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
                                    className="flex items-center gap-2 border-t pt-2"
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
                                          <Edit className="mr-2 size-4" />
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
                                          <X className="mr-2 size-4" />
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
                                        <MessageSquare className="mr-2 size-4" />
                                        Message Facility
                                      </Button>
                                    )}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <Download className="mr-2 size-4" />
                                          More
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => handleAddNote(booking)}
                                        >
                                          <MessageSquare className="mr-2 size-4" />
                                          Add Note/Message
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleAddToCalendar(booking)
                                          }
                                        >
                                          <CalendarIcon className="mr-2 size-4" />
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
                  <div className="py-12 text-center">
                    <Calendar className="text-muted-foreground mx-auto mb-4 size-12" />
                    <h3 className="mb-2 text-lg font-semibold">
                      No upcoming bookings
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Book your first service to get started
                    </p>
                    <Button asChild>
                      <Link href="/customer/bookings/new">
                        <Plus className="mr-2 size-4" />
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
                          <Card className="cursor-pointer opacity-75 transition-opacity hover:opacity-90">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="shrink-0">
                                  {pet?.imageUrl ? (
                                    <Image
                                      src={pet.imageUrl}
                                      alt={pet.name}
                                      width={64}
                                      height={64}
                                      className="h-16 w-16 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-lg">
                                      <PetIcon className="text-primary size-8" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="mb-1 flex items-center gap-2">
                                        <ServiceIcon className="text-muted-foreground size-5" />
                                        <h3 className="font-semibold capitalize">
                                          {booking.service}
                                        </h3>
                                      </div>
                                      <p className="text-muted-foreground text-sm">
                                        {pet?.name || "Pet"} •{" "}
                                        {formatDate(booking.startDate)}
                                      </p>
                                    </div>
                                    {getStatusBadge(booking.status)}
                                  </div>
                                  <div className="text-muted-foreground flex items-center gap-4 text-sm">
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
                  <div className="py-12 text-center">
                    <Clock className="text-muted-foreground mx-auto mb-4 size-12" />
                    <h3 className="mb-2 text-lg font-semibold">
                      No past bookings
                    </h3>
                    <p className="text-muted-foreground">
                      Your completed bookings will appear here
                    </p>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="unfinished" className="space-y-4">
                <CustomerUnfinishedBookings bookings={myUnfinishedBookings} />
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
