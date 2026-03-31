"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { bookings as initialBookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import type { Booking } from "@/types/booking";
import { useBookingRequestsStore } from "@/hooks/use-booking-requests";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookingModal } from "@/components/modals/BookingModal";
import { GenericCalendar, CalendarItem } from "@/components/ui/GenericCalendar";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";
import { ProcessPaymentModal } from "@/components/bookings/modals/ProcessPaymentModal";
import { RefundBookingModal } from "@/components/bookings/modals/RefundBookingModal";
import { EditBookingModal } from "@/components/bookings/modals/EditBookingModal";
import {
  Download,
  Calendar,
  DollarSign,
  Clock,
  CalendarDays,
  CalendarX,
  CheckSquare,
  FileText,
  Hash,
  User,
  CircleDot,
} from "lucide-react";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { getYipyyGoDisplayStatusForBooking } from "@/data/yipyygo-forms";
import { YipyyGoStatusBadge } from "@/components/yipyygo/YipyyGoStatusBadge";
import { TagList } from "@/components/shared/TagList";
import { getTagsByType, getNoteCount } from "@/data/tags-notes";
const calculateTaskCount = (booking: Booking): number => {
  let count = 0;

  // Feeding tasks
  if (booking.feedingSchedule) {
    count += booking.feedingSchedule.length;
  }

  // Medication tasks (each medication can have multiple times)
  if (booking.medications) {
    booking.medications.forEach((med) => {
      count += med.times.length;
    });
  }

  // Extra services
  if (booking.extraServices) {
    count += booking.extraServices.length;
  }

  // Walk schedule for boarding
  if (booking.service === "boarding" && booking.walkSchedule) {
    count += 1;
  }

  return count;
};

const exportBookingsToCSV = (bookingsData: Booking[]) => {
  const headers = [
    "ID",
    "Client",
    "Pet",
    "Service",
    "Start Date",
    "End Date",
    "Duration",
    "Status",
    "Tasks",
    "Total Cost",
    "Payment Status",
    "Check In",
    "Check Out",
  ];

  const csvContent = [
    headers.join(","),
    ...bookingsData.map((booking: Booking) => {
      const client = clients.find((c) => c.id === booking.clientId);
      const pet = client?.pets.find((p) => p.id === booking.petId);
      const duration = calculateDuration(booking.startDate, booking.endDate);
      return [
        booking.id,
        `"${client?.name || "Unknown"}"`,
        `"${pet?.name || "Unknown"}"`,
        booking.service,
        booking.startDate,
        booking.endDate,
        duration,
        booking.status,
        calculateTaskCount(booking),
        booking.totalCost,
        booking.paymentStatus,
        booking.checkInTime || "",
        booking.checkOutTime || "",
      ].join(",");
    }),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `bookings_export_${new Date().toISOString().split("T")[0]}.csv`,
  );
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const calculateDuration = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0
    ? "Same day"
    : `${diffDays + 1} day${diffDays > 0 ? "s" : ""}`;
};

const isToday = (dateString: string): boolean => {
  const today = new Date("2024-03-10"); // Mock today's date
  const date = new Date(dateString);
  return date.toDateString() === today.toDateString();
};

const isUpcoming = (dateString: string): boolean => {
  const today = new Date("2024-03-10"); // Mock today's date
  const date = new Date(dateString);
  return date > today;
};

const isPast = (dateString: string): boolean => {
  const today = new Date("2024-03-10"); // Mock today's date
  const date = new Date(dateString);
  return date < today && !isToday(dateString);
};

export default function FacilityBookingsPage() {
  const router = useRouter();
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const { setRequests: setBookingRequests } = useBookingRequestsStore();

  const [bookings, setBookings] = useState<Booking[]>(
    initialBookings as Booking[],
  );

  const facilityBookings = bookings.filter(
    (booking) => booking.facilityId === facilityId,
  );

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(
    null,
  );
  const [processingPayment, setProcessingPayment] = useState<Booking | null>(
    null,
  );
  const [refundingBooking, setRefundingBooking] = useState<Booking | null>(
    null,
  );

  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

  useEffect(() => {
    const raw = localStorage.getItem("booking_requests_schedule_draft");
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as {
        requestId: string;
        clientId: number;
        petId: number;
        service: string;
        appointmentAt: string;
      };
      // Create a draft booking that staff can edit, then Save will add it.
      const appointment = new Date(draft.appointmentAt);
      const isoDate = appointment.toISOString().slice(0, 10);
      const hh = String(appointment.getHours()).padStart(2, "0");
      const mm = String(appointment.getMinutes()).padStart(2, "0");
      const time = `${hh}:${mm}`;

      const maxId = Math.max(...initialBookings.map((b) => b.id ?? 0), 0);
      setEditingBooking({
        id: maxId + 1,
        clientId: draft.clientId,
        petId: draft.petId,
        facilityId,
        service: draft.service,
        startDate: isoDate,
        endDate: isoDate,
        checkInTime: time,
        checkOutTime: time,
        status: "pending",
        basePrice: 0,
        discount: 0,
        totalCost: 0,
        paymentStatus: "pending",
        specialRequests: `Scheduled from request ${draft.requestId}`,
      } as Booking);
      setViewMode("calendar");
    } finally {
      localStorage.removeItem("booking_requests_schedule_draft");
    }
  }, [facilityId]);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  // Filter bookings by tab
  const allBookings = facilityBookings;
  const todayBookings = facilityBookings.filter((b) => isToday(b.startDate));
  const upcomingBookings = facilityBookings.filter(
    (b) => isUpcoming(b.startDate) && b.status !== "cancelled",
  );
  const pastBookings = facilityBookings.filter((b) => isPast(b.startDate));
  const pendingBookings = facilityBookings.filter(
    (b) => b.status === "pending",
  );

  // Calculate stats
  const totalBookings = facilityBookings.length;
  const completedBookings = facilityBookings.filter(
    (b) => b.status === "completed",
  ).length;
  const totalRevenue = facilityBookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + b.totalCost, 0);
  const pendingRevenue = facilityBookings
    .filter((b) => b.paymentStatus === "pending")
    .reduce((sum, b) => sum + b.totalCost, 0);

  // Revenue by service
  const revenueByService = facilityBookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce(
      (acc, b) => {
        acc[b.service] = (acc[b.service] || 0) + b.totalCost;
        return acc;
      },
      {} as Record<string, number>,
    );

  const fmtDate = (d: string) => {
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const columns: ColumnDef<(typeof bookings)[number]>[] = [
    {
      key: "id",
      label: "ID",
      icon: Hash,
      defaultVisible: true,
      render: (booking) => (
        <span className="font-mono text-sm">#{booking.id}</span>
      ),
    },
    {
      key: "client",
      label: "Client",
      icon: User,
      defaultVisible: true,
      sortable: true,
      sortValue: (booking) =>
        clients.find((c) => c.id === booking.clientId)?.name || "Unknown",
      render: (booking) => {
        const client = clients.find((c) => c.id === booking.clientId);
        const pet = client?.pets.find((p) => p.id === booking.petId);
        return (
          <div className="flex flex-col">
            <span className="font-medium">{client?.name || "Unknown"}</span>
            <span className="text-muted-foreground text-xs">
              Pet: {pet?.name || "Unknown"}
            </span>
          </div>
        );
      },
    },
    {
      key: "service",
      label: "Service",
      icon: CalendarDays,
      defaultVisible: true,
      render: (booking) => (
        <Badge variant="outline" className="capitalize">
          {booking.service}
        </Badge>
      ),
    },
    {
      key: "dates",
      label: "Dates",
      icon: Calendar,
      defaultVisible: true,
      sortable: true,
      sortValue: (booking) => booking.startDate,
      render: (booking) => {
        const duration = calculateDuration(booking.startDate, booking.endDate);
        return (
          <div className="flex flex-col">
            <span className="text-sm">{fmtDate(booking.startDate)}</span>
            {booking.startDate !== booking.endDate && (
              <span className="text-muted-foreground text-xs">
                to {fmtDate(booking.endDate)}
              </span>
            )}
            <span className="text-muted-foreground mt-0.5 text-xs">
              {duration}
            </span>
          </div>
        );
      },
    },
    {
      key: "time",
      label: "Time",
      icon: Clock,
      defaultVisible: true,
      sortable: true,
      sortValue: (booking) => booking.checkInTime,
      render: (booking) => (
        <div className="flex flex-col text-xs">
          <span>In: {booking.checkInTime}</span>
          <span className="text-muted-foreground">
            Out: {booking.checkOutTime}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      icon: CircleDot,
      defaultVisible: true,
      sortable: true,
      sortValue: (booking) => booking.status,
      render: (booking) => <StatusBadge type="status" value={booking.status} />,
    },
    {
      key: "payment",
      label: "Payment",
      icon: DollarSign,
      defaultVisible: true,
      render: (booking) => (
        <StatusBadge type="status" value={booking.paymentStatus} />
      ),
    },
    {
      key: "tags",
      label: "Tags",
      icon: FileText,
      defaultVisible: true,
      render: (booking) => (
        <TagList
          entityType="booking"
          entityId={booking.id}
          compact
          maxVisible={2}
        />
      ),
    },
    {
      key: "notes",
      label: "Notes",
      icon: FileText,
      defaultVisible: true,
      sortable: true,
      sortValue: (booking) => getNoteCount("booking", booking.id),
      render: (booking) => {
        const count = getNoteCount("booking", booking.id);
        return count > 0 ? (
          <Badge variant="outline" className="gap-1 text-xs">
            {count} {count === 1 ? "note" : "notes"}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    {
      key: "yipyygo",
      label: "YipyyGo",
      icon: FileText,
      defaultVisible: true,
      sortValue: (booking) => {
        const config = getYipyyGoConfig(booking.facilityId);
        const st = booking.service?.toLowerCase() as
          | "daycare"
          | "boarding"
          | "grooming"
          | "training";
        const enabled = config?.serviceConfigs?.find(
          (s) => s.serviceType === st,
        )?.enabled;
        if (!enabled) return "—";
        return getYipyyGoDisplayStatusForBooking(booking.id, {
          facilityId: booking.facilityId,
          service: booking.service,
        });
      },
      render: (booking) => {
        const config = getYipyyGoConfig(booking.facilityId);
        const st = booking.service?.toLowerCase() as
          | "daycare"
          | "boarding"
          | "grooming"
          | "training";
        const enabled =
          config?.enabled &&
          config?.serviceConfigs?.find((s) => s.serviceType === st)?.enabled;
        if (!enabled)
          return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <YipyyGoStatusBadge
            status={getYipyyGoDisplayStatusForBooking(booking.id, {
              facilityId: booking.facilityId,
              service: booking.service,
            })}
            showIcon
          />
        );
      },
    },
    {
      key: "tasks",
      label: "Tasks",
      icon: CheckSquare,
      defaultVisible: true,
      sortable: true,
      sortValue: (booking) => calculateTaskCount(booking),
      render: (booking) => {
        const taskCount = calculateTaskCount(booking);
        return (
          <span className="text-muted-foreground text-sm">{taskCount}</span>
        );
      },
    },
    {
      key: "totalCost",
      label: "Cost",
      icon: DollarSign,
      defaultVisible: true,
      sortable: true,
      sortValue: (booking) => booking.totalCost,
      render: (booking) => (
        <span className="font-[tabular-nums] font-medium">
          ${booking.totalCost.toFixed(2)}
        </span>
      ),
    },
  ];

  const filters: FilterDef[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "all", label: "All Status" },
        { value: "pending", label: "Pending" },
        { value: "confirmed", label: "Confirmed" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "service",
      label: "Service",
      options: [
        { value: "all", label: "All Services" },
        { value: "daycare", label: "Daycare" },
        { value: "boarding", label: "Boarding" },
        { value: "grooming", label: "Grooming" },
        { value: "vet", label: "Vet" },
      ],
    },
    {
      key: "paymentStatus",
      label: "Payment",
      options: [
        { value: "all", label: "All Payments" },
        { value: "paid", label: "Paid" },
        { value: "pending", label: "Pending" },
        { value: "refunded", label: "Refunded" },
      ],
    },
    {
      key: "tag",
      label: "Tag",
      options: [
        { value: "all", label: "All Tags" },
        ...getTagsByType("booking").map((t) => ({
          value: t.id,
          label: t.name,
        })),
      ],
    },
  ];

  const getDataForTab = () => {
    switch (activeTab) {
      case "today":
        return todayBookings;
      case "upcoming":
        return upcomingBookings;
      case "past":
        return pastBookings;
      case "pending":
        return pendingBookings;
      default:
        return allBookings;
    }
  };

  const handleCancelBooking = (
    bookingId: number,
    cancellationReason: string,
    refundMethod: "card" | "store_credit",
    refundAmount: number,
  ) => {
    setBookings(
      bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              status: "cancelled" as const,
              paymentStatus:
                b.paymentStatus === "paid"
                  ? ("refunded" as const)
                  : b.paymentStatus,
              cancellationReason,
              refundMethod,
              refundAmount,
            }
          : b,
      ),
    );
    alert(
      `Booking #${bookingId} has been cancelled${refundAmount > 0 ? ` and $${refundAmount} refunded via ${refundMethod.replace("_", " ")}` : ""}.`,
    );
  };

  const handleProcessPayment = (
    bookingId: number,
    paymentMethod: "cash" | "card",
  ) => {
    setBookings(
      bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              paymentStatus: "paid" as const,
              paymentMethod,
            }
          : b,
      ),
    );
    alert(
      `Payment of $${bookings.find((b) => b.id === bookingId)?.totalCost} has been processed via ${paymentMethod}.`,
    );
  };

  const handleConfirmBooking = async (bookingId: number) => {
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    // Update booking status
    setBookings(
      bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "confirmed" as const } : b,
      ),
    );

    // Trigger YipyyGo if applicable
    try {
      const { processBookingConfirmationForYipyyGo } =
        await import("@/lib/yipyygo-trigger");
      const { clients } = await import("@/data/clients");
      const client = clients.find((c) => c.id === booking.clientId);

      // Handle single pet or multiple pets
      const petIds = Array.isArray(booking.petId)
        ? booking.petId
        : [booking.petId];

      // Process YipyyGo for each pet in the booking
      for (const petId of petIds) {
        const pet = client?.pets?.find((p) => p.id === petId);

        if (pet) {
          await processBookingConfirmationForYipyyGo({
            id: booking.id,
            clientId: booking.clientId,
            petId: petId,
            petName: pet.name,
            facilityId: booking.facilityId,
            service: booking.service,
            startDate: booking.startDate,
            checkInTime: booking.checkInTime,
            status: "confirmed",
          });
        }
      }
    } catch (error) {
      console.error("Error triggering YipyyGo:", error);
      // Don't block booking confirmation if YipyyGo fails
    }

    alert(`Booking #${bookingId} has been confirmed.`);
  };

  const handleCompleteBooking = (bookingId: number) => {
    setBookings(
      bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "completed" as const } : b,
      ),
    );
    alert(`Booking #${bookingId} has been marked as completed.`);
  };

  const handleProcessRefund = (
    bookingId: number,
    refundReason: string,
    refundMethod: "card" | "store_credit",
    refundAmount: number,
  ) => {
    setBookings(
      bookings.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              paymentStatus: "refunded" as const,
              refundMethod,
              refundAmount: (b.refundAmount || 0) + refundAmount,
              cancellationReason: refundReason, // Store refund reason
            }
          : b,
      ),
    );
    alert(
      `Refund of $${refundAmount} has been processed via ${refundMethod.replace("_", " ")} for booking #${bookingId}.`,
    );
  };

  const handleSaveBooking = (updatedBooking: Booking) => {
    setBookings((prev) => {
      const exists = prev.some((b) => b.id === updatedBooking.id);
      return exists
        ? prev.map((b) => (b.id === updatedBooking.id ? updatedBooking : b))
        : [updatedBooking, ...prev];
    });
    setEditingBooking(null);
    // If this booking originated from a booking request, mark that request as scheduled.
    const special = updatedBooking.specialRequests ?? "";
    const match =
      typeof special === "string"
        ? special.match(/Scheduled from request\s+([A-Za-z0-9-]+)/)
        : null;
    const requestId = match?.[1];
    if (requestId) {
      setBookingRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, status: "scheduled" } : r,
        ),
      );
    }
    alert(`Booking #${updatedBooking.id} has been updated.`);
  };

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Header */}
      <div className="space-y-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Bookings</h2>
          <p className="text-muted-foreground text-sm">{facility.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setViewMode(viewMode === "calendar" ? "table" : "calendar")
            }
          >
            <CalendarDays className="mr-2 size-4" />
            {viewMode === "calendar" ? "Table View" : "Calendar View"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportBookingsToCSV(getDataForTab())}
          >
            <Download className="mr-2 size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Compact Stats Row */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-sm">All</span>
            <span className="text-sm font-semibold">{totalBookings}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-sm">Today</span>
            <span className="text-sm font-semibold">
              {todayBookings.length}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-sm">Completed</span>
            <span className="text-sm font-semibold">{completedBookings}</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-sm">Pending</span>
            <span className="text-sm font-semibold">
              {pendingBookings.length}
            </span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-sm">Revenue</span>
            <span className="font-[tabular-nums] text-sm font-semibold">
              ${totalRevenue.toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Calendar or Table View */}
      {viewMode === "calendar" ? (
        <GenericCalendar<Booking & CalendarItem>
          items={facilityBookings.map((booking) => ({
            ...booking,
            date: booking.startDate,
          }))}
          config={{
            onItemClick: (booking) => setSelectedBooking(booking),
            getItemColor: (booking) => {
              const colors: Record<string, string> = {
                daycare: "bg-blue-200 dark:bg-blue-900/40",
                boarding: "bg-purple-200 dark:bg-purple-900/40",
                grooming: "bg-pink-200 dark:bg-pink-900/40",
                vet: "bg-green-200 dark:bg-green-900/40",
              };
              return colors[booking.service] || "bg-gray-200";
            },
            getItemBorderColor: (booking) => {
              const colors: Record<string, string> = {
                pending: "border-amber-300",
                confirmed: "border-blue-300",
                completed: "border-green-300",
                cancelled: "border-gray-300",
              };
              return colors[booking.status] || "border-gray-300";
            },
            legendItems: [
              { color: "bg-blue-200", label: "Daycare" },
              { color: "bg-purple-200", label: "Boarding" },
              { color: "bg-pink-200", label: "Grooming" },
              { color: "bg-green-200", label: "Vet" },
            ],
          }}
          view="month"
        />
      ) : (
        /* Tabs for filtering bookings */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-auto">
            <TabsTrigger value="all">
              All
              <span className="text-muted-foreground ml-1.5 text-xs">
                {allBookings.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="today">
              Today
              <span className="text-muted-foreground ml-1.5 text-xs">
                {todayBookings.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming
              <span className="text-muted-foreground ml-1.5 text-xs">
                {upcomingBookings.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="past">
              Past
              <span className="text-muted-foreground ml-1.5 text-xs">
                {pastBookings.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              <span className="text-muted-foreground ml-1.5 text-xs">
                {pendingBookings.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {getDataForTab().length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CalendarX className="text-muted-foreground/50 mb-4 h-16 w-16" />
                  <h3 className="mb-2 text-lg font-semibold">
                    {"No bookings found"}
                  </h3>
                  <p className="text-muted-foreground max-w-md text-center">
                    {"There are no bookings in this category yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <DataTable
                data={getDataForTab() as unknown as Record<string, unknown>[]}
                columns={
                  columns as unknown as ColumnDef<Record<string, unknown>>[]
                }
                filters={filters}
                searchKey="id"
                searchPlaceholder={"Search by booking ID, client, or pet..."}
                itemsPerPage={15}
                onRowClick={(booking) =>
                  router.push(
                    `/facility/dashboard/clients/${booking.clientId}/bookings/${booking.id}`,
                  )
                }
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Cancel Booking Modal */}
      {cancellingBooking && (
        <CancelBookingModal
          booking={cancellingBooking}
          open={!!cancellingBooking}
          onOpenChange={(open) => !open && setCancellingBooking(null)}
          onConfirm={handleCancelBooking}
        />
      )}

      {/* Process Payment Modal */}
      {processingPayment && (
        <ProcessPaymentModal
          booking={processingPayment}
          open={!!processingPayment}
          onOpenChange={(open) => !open && setProcessingPayment(null)}
          onConfirm={handleProcessPayment}
        />
      )}

      {/* Refund Booking Modal */}
      {refundingBooking && (
        <RefundBookingModal
          booking={refundingBooking}
          open={!!refundingBooking}
          onOpenChange={(open) => !open && setRefundingBooking(null)}
          onConfirm={handleProcessRefund}
        />
      )}

      {/* Edit Booking Modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          open={!!editingBooking}
          onOpenChange={(open) => !open && setEditingBooking(null)}
          onSave={handleSaveBooking}
        />
      )}

      <Dialog
        open={!!selectedBooking}
        onOpenChange={() => setSelectedBooking(null)}
      >
        <DialogContent className="flex max-h-[90vh] min-w-5xl flex-col p-0">
          <div className="flex-1 overflow-y-auto p-6">
            <DialogHeader className="sr-only">
              <DialogTitle>Booking #{selectedBooking?.id} Details</DialogTitle>
            </DialogHeader>
            {selectedBooking && (
              <BookingModal booking={selectedBooking as never} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
