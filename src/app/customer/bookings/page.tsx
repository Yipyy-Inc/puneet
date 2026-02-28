"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import {
  Calendar,
  Clock,
  DollarSign,
  X,
  Edit,
  CheckCircle,
  AlertCircle,
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
  FileText,
} from "lucide-react";
import Link from "next/link";
import { CustomerBookingModal } from "@/components/customer/CustomerBookingModal";
import { CancelBookingDialog } from "@/components/customer/CancelBookingDialog";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerBookingsPage() {
  const searchParams = useSearchParams();
  const { selectedFacility } = useCustomerFacility();
  const { bookingFlow, grooming } = useSettings();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<typeof bookings[0] | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<typeof bookings[0] | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [bookingForNote, setBookingForNote] = useState<typeof bookings[0] | null>(null);
  
  // Check if grooming is enabled (status.disabled !== true means enabled)
  const isGroomingEnabled = grooming?.status?.disabled !== true;
  
  // Get customer data
  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    []
  );

  // Check for service query parameter to auto-open booking modal
  useEffect(() => {
    setIsMounted(true);
    const service = searchParams?.get("service");
    if (service) {
      setIsBookingModalOpen(true);
    }
  }, [searchParams]);

  // Get customer's bookings for selected facility
  const customerBookings = useMemo(() => {
    if (!selectedFacility) return [];
    return bookings.filter(
      (b) => b.clientId === MOCK_CUSTOMER_ID && b.facilityId === selectedFacility.id
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
      return bookingDate < now || b.status === "completed" || b.status === "cancelled";
    });
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [customerBookings, isMounted]);

  const handleCancelBooking = (booking: typeof bookings[0]) => {
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
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel booking");
    }
  };

  const handleRescheduleBooking = (booking: typeof bookings[0]) => {
    setSelectedBooking(booking);
    setIsBookingModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!isMounted) return dateString; // Return raw string during SSR
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    if (!isMounted) return dateString; // Return raw string during SSR
    const date = new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return timeString ? `${date} at ${timeString}` : date;
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
  const getPetForBooking = (booking: typeof bookings[0]) => {
    if (!customer) return null;
    const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
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

  // Calculate duration
  const getDuration = (booking: typeof bookings[0]) => {
    if (booking.checkInTime && booking.checkOutTime) {
      const start = new Date(`2000-01-01T${booking.checkInTime}`);
      const end = new Date(`2000-01-01T${booking.checkOutTime}`);
      const diffMs = end.getTime() - start.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes > 0 ? `${diffMinutes}m` : ""}`;
      }
      return `${diffMinutes}m`;
    }
    return "—";
  };

  // Generate calendar file (.ics)
  const handleAddToCalendar = (booking: typeof bookings[0]) => {
    const pet = getPetForBooking(booking);
    const petName = pet?.name || "Pet";
    const startDateTime = new Date(`${booking.startDate}T${booking.checkInTime || "09:00"}`);
    const endDateTime = booking.endDate && booking.checkOutTime
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

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `booking-${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Calendar event downloaded");
  };

  const handleAddNote = (booking: typeof bookings[0]) => {
    setBookingForNote(booking);
    setAddNoteDialogOpen(true);
  };

  const columns: ColumnDef<typeof bookings[0]>[] = [
    {
      key: "service",
      label: "Service",
      render: (booking) => (
        <div className="flex items-center gap-2">
          <span className="font-medium capitalize">{booking.service}</span>
          {booking.serviceType && (
            <Badge variant="outline" className="text-xs">
              {booking.serviceType.replace("_", " ")}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "date",
      label: "Date",
      render: (booking) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatDateTime(booking.startDate, booking.checkInTime)}</span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (booking) => getStatusBadge(booking.status),
    },
    {
      key: "total",
      label: "Total",
      render: (booking) => (
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">${booking.totalCost.toFixed(2)}</span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (booking) => {
        // Check if YipyyGo is enabled for this booking
        const yipyyGoConfig = getYipyyGoConfig(booking.facilityId);
        const isYipyyGoEnabled = yipyyGoConfig?.enabled && yipyyGoConfig.serviceConfigs.some(
          (sc) => sc.serviceType === booking.service.toLowerCase() && sc.enabled
        );
        const isUpcoming = new Date(booking.startDate) >= new Date();

        return (
          <div className="flex items-center gap-2">
            {isYipyyGoEnabled && booking.status === "confirmed" && isUpcoming && (
              <Button
                variant="default"
                size="sm"
                asChild
              >
                <Link href={`/customer/bookings/${booking.id}/yipyygo-form`}>
                  <FileText className="h-4 w-4 mr-1" />
                  YipyyGo
                </Link>
              </Button>
            )}
            {booking.status === "confirmed" || booking.status === "pending" ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRescheduleBooking(booking)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Reschedule
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCancelBooking(booking)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </>
            ) : null}
          </div>
        );
      },
    },
  ];

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
          <Button onClick={() => setIsBookingModalOpen(true)} variant="default" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Book a Service
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
              <div className="text-2xl font-bold">{upcomingBookings.length}</div>
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
                        <Card key={booking.id} className="hover:shadow-lg transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              {/* Pet Photo */}
                              <div className="flex-shrink-0">
                                {pet?.imageUrl ? (
                                  <img
                                    src={pet.imageUrl}
                                    alt={pet.name}
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
                                            • {booking.serviceType.replace(/_/g, " ")}
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
                                    {booking.status === "request_submitted" && (
                                      <Badge variant="outline" className="text-xs">
                                        <Clock className="h-3 w-3 mr-1" />
                                        Response in ~24h
                                      </Badge>
                                    )}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-muted-foreground">Date</p>
                                      <p className="font-medium">{formatDate(booking.startDate)}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-muted-foreground">Time</p>
                                      <p className="font-medium">
                                        {booking.checkInTime || "—"}
                                        {booking.checkOutTime && ` - ${booking.checkOutTime}`}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-muted-foreground">Location</p>
                                      <p className="font-medium">{selectedFacility?.name || "—"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="text-muted-foreground">Total</p>
                                      <p className="font-medium">${booking.totalCost.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t">
                                  {(booking.status === "confirmed" || booking.status === "pending") && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRescheduleBooking(booking)}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Reschedule
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCancelBooking(booking)}
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
                                      onClick={() => {
                                        window.location.href = "/customer/messages";
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
                                      <DropdownMenuItem onClick={() => handleAddNote(booking)}>
                                        <MessageSquare className="h-4 w-4 mr-2" />
                                        Add Note/Message
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleAddToCalendar(booking)}>
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
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No upcoming bookings</h3>
                    <p className="text-muted-foreground mb-4">
                      Book your first service to get started
                    </p>
                    <Button onClick={() => setIsBookingModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Book a Service
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
                        <Card key={booking.id} className="opacity-75">
                          <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                              <div className="flex-shrink-0">
                                {pet?.imageUrl ? (
                                  <img
                                    src={pet.imageUrl}
                                    alt={pet.name}
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
                                      {pet?.name || "Pet"} • {formatDate(booking.startDate)}
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
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No past bookings</h3>
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

      {/* Unified Booking Flow */}
      <CustomerBookingModal
        open={isBookingModalOpen}
        onOpenChange={(open) => {
          setIsBookingModalOpen(open);
          if (!open) setSelectedBooking(null);
        }}
        existingBooking={selectedBooking}
        onBookingCreated={() => {
          setIsBookingModalOpen(false);
          setSelectedBooking(null);
          toast.success(
            selectedBooking ? "Booking rescheduled successfully!" : "Booking created successfully!"
          );
        }}
      />

      {/* Cancel Booking Dialog */}
      <CancelBookingDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        booking={bookingToCancel}
        onConfirm={confirmCancelBooking}
      />

      {/* Add Note Dialog */}
      <Dialog open={addNoteDialogOpen} onOpenChange={setAddNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note or Message</DialogTitle>
            <DialogDescription>
              Send a message or add a note to your booking
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {bookingForNote && (
              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-1">Booking Details:</p>
                <p>
                  {getPetForBooking(bookingForNote)?.name} • {bookingForNote.service} • {formatDate(bookingForNote.startDate)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="note">Message</Label>
              <Textarea
                id="note"
                placeholder="Add any notes or questions about this booking..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              // TODO: Send message/note
              toast.success("Message sent to facility");
              setAddNoteDialogOpen(false);
              setBookingForNote(null);
            }}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
