"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
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
} from "lucide-react";
import { CustomerBookingModal } from "@/components/customer/CustomerBookingModal";
import { CancelBookingDialog } from "@/components/customer/CancelBookingDialog";
import { GroomingBookingFlow } from "@/components/grooming/GroomingBookingFlow";
import { toast } from "sonner";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerBookingsPage() {
  const searchParams = useSearchParams();
  const { selectedFacility } = useCustomerFacility();
  const { bookingFlow, grooming } = useSettings();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isGroomingBookingOpen, setIsGroomingBookingOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<typeof bookings[0] | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<typeof bookings[0] | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  // Check if grooming is enabled (status.disabled !== true means enabled)
  const isGroomingEnabled = grooming?.status?.disabled !== true;

  // Check for service query parameter to auto-open booking modal
  useEffect(() => {
    setIsMounted(true);
    const service = searchParams?.get("service");
    if (service === "grooming" && isGroomingEnabled) {
      setIsGroomingBookingOpen(true);
    } else if (service && ["daycare", "boarding"].includes(service)) {
      setIsBookingModalOpen(true);
    }
  }, [searchParams, isGroomingEnabled]);

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
      case "completed":
        return <Badge variant="outline">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
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
      render: (booking) => (
        <div className="flex items-center gap-2">
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
      ),
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
          <div className="flex gap-2">
            {isGroomingEnabled && (
              <Button onClick={() => setIsGroomingBookingOpen(true)} variant="default">
                <Plus className="h-4 w-4 mr-2" />
                Book Grooming
              </Button>
            )}
            <Button onClick={() => setIsBookingModalOpen(true)} variant={isGroomingEnabled ? "outline" : "default"}>
              <Plus className="h-4 w-4 mr-2" />
              {isGroomingEnabled ? "Book Other Service" : "New Booking"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
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
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {pastBookings
                  .filter((b) => b.paymentStatus === "paid")
                  .reduce((sum, b) => sum + b.totalCost, 0)
                  .toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
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
                  <DataTable data={upcomingBookings} columns={columns} />
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
                  <DataTable data={pastBookings} columns={columns} />
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

      {/* Grooming Booking Flow */}
      {isGroomingEnabled && (
        <GroomingBookingFlow
          open={isGroomingBookingOpen}
          onOpenChange={(open) => {
            setIsGroomingBookingOpen(open);
            if (!open) {
              // Refresh bookings list when modal closes
              toast.success("Grooming booking completed!");
            }
          }}
        />
      )}

      {/* Booking Modal */}
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
    </div>
  );
}
