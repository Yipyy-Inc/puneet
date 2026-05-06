"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle,
  Clock,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CancelBookingDialog } from "@/components/customer/CancelBookingDialog";
import { AddNoteModal } from "@/components/shared/AddNoteModal";
import { CustomerUnfinishedBookings } from "@/components/bookings/CustomerUnfinishedBookings";
import { TipPromptDialog } from "@/components/bookings/TipPromptDialog";
import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { getUnfinishedBookingsForCustomer } from "@/data/unfinished-bookings";
import { useCustomerFacility } from "@/hooks/use-customer-facility";
import { useSettings } from "@/hooks/use-settings";
import {
  BookingFilters,
  type ServiceFilter,
} from "./_components/BookingFilters";
import { UpcomingBookingCard } from "./_components/UpcomingBookingCard";
import { PastBookingCard } from "./_components/PastBookingCard";
import {
  getPetForBooking,
  type Booking,
} from "./_components/booking-helpers";

// Mock customer ID - TODO: Get from auth context
const MOCK_CUSTOMER_ID = 15;

export default function CustomerBookingsPage() {
  const searchParams = useSearchParams();
  const { selectedFacility } = useCustomerFacility();
  const { tipConfig } = useSettings();

  const [tipBooking, setTipBooking] = useState<Booking | null>(null);
  const [tipsGiven, setTipsGiven] = useState<Record<string, number>>({});
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [addNoteDialogOpen, setAddNoteDialogOpen] = useState(false);
  const [bookingForNote, setBookingForNote] = useState<Booking | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>("all");

  const isMounted = useSyncExternalStore(
    (cb) => {
      cb();
      return () => {};
    },
    () => true,
    () => false,
  );

  const customer = useMemo(
    () => clients.find((c) => c.id === MOCK_CUSTOMER_ID),
    [],
  );

  const customerPets = customer?.pets ?? [];

  const myUnfinishedBookings = useMemo(
    () => getUnfinishedBookingsForCustomer(MOCK_CUSTOMER_ID),
    [],
  );

  // Redirect to new-booking page when ?service=... is present
  useEffect(() => {
    const service = searchParams?.get("service");
    if (service && typeof window !== "undefined") {
      window.location.href = `/customer/bookings/new?service=${encodeURIComponent(service)}`;
    }
  }, [searchParams]);

  const customerBookings = useMemo(() => {
    const all = bookings.filter((b) => b.clientId === MOCK_CUSTOMER_ID);
    if (!selectedFacility) return all;
    const filtered = all.filter((b) => b.facilityId === selectedFacility.id);
    return filtered.length > 0 ? filtered : all;
  }, [selectedFacility]);

  // Apply search + service filter before splitting upcoming/past
  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customerBookings.filter((b) => {
      if (serviceFilter !== "all" && b.service.toLowerCase() !== serviceFilter) {
        return false;
      }
      if (!q) return true;
      const pet = getPetForBooking(b, customerPets);
      return (
        b.service.toLowerCase().includes(q) ||
        b.serviceType?.toLowerCase().includes(q) ||
        pet?.name.toLowerCase().includes(q) ||
        false
      );
    });
  }, [customerBookings, searchQuery, serviceFilter, customerPets]);

  const { upcomingBookings, pastBookings } = useMemo(() => {
    if (!isMounted) return { upcomingBookings: [], pastBookings: [] };
    const now = new Date();
    const upcoming = filteredBookings.filter((b) => {
      const bookingDate = new Date(b.startDate);
      return bookingDate >= now && b.status !== "cancelled";
    });
    const past = filteredBookings.filter((b) => {
      const bookingDate = new Date(b.startDate);
      return (
        bookingDate < now ||
        b.status === "completed" ||
        b.status === "cancelled"
      );
    });
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [filteredBookings, isMounted]);

  const handleCancelBooking = (booking: Booking) => {
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

  const handleAddNote = (booking: Booking) => {
    setBookingForNote(booking);
    setAddNoteDialogOpen(true);
  };

  const filtersActive = searchQuery.trim() !== "" || serviceFilter !== "all";

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
          <StatCard
            title="Upcoming"
            value={upcomingBookings.length}
            subtitle="Confirmed bookings"
            icon={Calendar}
          />
          <StatCard
            title="Completed"
            value={pastBookings.filter((b) => b.status === "completed").length}
            subtitle="Past bookings"
            icon={CheckCircle}
          />
          {myUnfinishedBookings.length > 0 && (
            <StatCard
              title="Unfinished"
              value={myUnfinishedBookings.length}
              subtitle="Incomplete reservations"
              icon={Clock}
              tone="amber"
            />
          )}
        </div>

        {/* Bookings list */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
            <CardDescription>
              Manage your upcoming and past service bookings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <BookingFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              serviceFilter={serviceFilter}
              onServiceFilterChange={setServiceFilter}
            />

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
                    <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white">
                      {myUnfinishedBookings.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="upcoming" className="space-y-4">
                {upcomingBookings.length > 0 ? (
                  <div className="grid gap-4">
                    {upcomingBookings.map((booking) => (
                      <UpcomingBookingCard
                        key={booking.id}
                        booking={booking}
                        pets={customerPets}
                        facilityName={selectedFacility?.name}
                        isMounted={isMounted}
                        onCancel={handleCancelBooking}
                        onAddNote={handleAddNote}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Calendar}
                    title={
                      filtersActive
                        ? "No matching upcoming bookings"
                        : "No upcoming bookings"
                    }
                    body={
                      filtersActive
                        ? "Try clearing your filters or search."
                        : "Book your first service to get started"
                    }
                    showBookCTA={!filtersActive}
                  />
                )}
              </TabsContent>

              <TabsContent value="past" className="space-y-4">
                {pastBookings.length > 0 ? (
                  <div className="grid gap-4">
                    {pastBookings.map((booking) => {
                      const existingTip =
                        tipsGiven[booking.id] ?? booking.tipAmount ?? 0;
                      const canTip =
                        booking.status === "completed" &&
                        tipConfig.enabled &&
                        existingTip <= 0;
                      return (
                        <PastBookingCard
                          key={booking.id}
                          booking={booking}
                          pets={customerPets}
                          isMounted={isMounted}
                          existingTip={existingTip}
                          canTip={canTip}
                          onLeaveTip={setTipBooking}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Clock}
                    title={
                      filtersActive
                        ? "No matching past bookings"
                        : "No past bookings"
                    }
                    body={
                      filtersActive
                        ? "Try clearing your filters or search."
                        : "Your completed bookings will appear here"
                    }
                  />
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
          title={`Add Note — ${getPetForBooking(bookingForNote, customerPets)?.name ?? "Booking"}`}
          onSave={() => {
            toast.success("Note added to booking");
            setAddNoteDialogOpen(false);
            setBookingForNote(null);
          }}
        />
      )}

      {/* Post-stay tip dialog */}
      {tipBooking && (
        <TipPromptDialog
          open={!!tipBooking}
          onOpenChange={(open) => {
            if (!open) setTipBooking(null);
          }}
          tipConfig={tipConfig}
          subtotal={tipBooking.totalCost}
          tipAmount={tipsGiven[tipBooking.id] ?? 0}
          onTipChange={(amount) => {
            if (amount > 0) {
              setTipsGiven((prev) => ({ ...prev, [tipBooking.id]: amount }));
              toast.success(
                `Thank you! $${amount.toFixed(2)} sent to the team.`,
              );
            }
            setTipBooking(null);
          }}
          petName={getPetForBooking(tipBooking, customerPets)?.name}
          serviceLabel={tipBooking.service}
          confirmLabel="Send tip"
          contextTitle={
            getPetForBooking(tipBooking, customerPets)?.name
              ? `${getPetForBooking(tipBooking, customerPets)!.name} is home safe 🏠`
              : "Your pet is home safe 🏠"
          }
          contextSubtitle="The team would love to hear how they did. Your tip goes straight to them."
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: typeof Calendar;
  tone?: "amber";
}) {
  return (
    <Card className={tone === "amber" ? "border-amber-200 dark:border-amber-800" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle
          className={
            tone === "amber"
              ? "text-sm font-medium text-amber-700 dark:text-amber-400"
              : "text-sm font-medium"
          }
        >
          {title}
        </CardTitle>
        <Icon
          className={
            tone === "amber"
              ? "size-4 text-amber-500"
              : "text-muted-foreground size-4"
          }
        />
      </CardHeader>
      <CardContent>
        <div
          className={
            tone === "amber"
              ? "text-2xl font-bold text-amber-600"
              : "text-2xl font-bold"
          }
        >
          {value}
        </div>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  showBookCTA = false,
}: {
  icon: typeof Calendar;
  title: string;
  body: string;
  showBookCTA?: boolean;
}) {
  return (
    <div className="py-12 text-center">
      <Icon className="text-muted-foreground mx-auto mb-4 size-12" />
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mb-4">{body}</p>
      {showBookCTA && (
        <Button asChild>
          <Link href="/customer/bookings/new">
            <Plus className="mr-2 size-4" />
            Book a Service
          </Link>
        </Button>
      )}
    </div>
  );
}
