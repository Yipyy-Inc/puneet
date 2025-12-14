"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { bookings as initialBookings, type Booking } from "@/data/bookings";
import { clients } from "@/data/clients";
import { facilities } from "@/data/facilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DataTable, ColumnDef, FilterDef } from "@/components/ui/DataTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookingModal } from "@/components/modals/BookingModal";
import { GenericCalendar, CalendarItem } from "@/components/ui/GenericCalendar";
import { EditBookingModal } from "@/components/bookings/modals/EditBookingModal";
import { CancelBookingModal } from "@/components/bookings/modals/CancelBookingModal";
import { ProcessPaymentModal } from "@/components/bookings/modals/ProcessPaymentModal";
import { RefundBookingModal } from "@/components/bookings/modals/RefundBookingModal";
import {
  Download,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  TrendingUp,
  MoreVertical,
  Eye,
  Edit,
  X,
  CalendarDays,
  CalendarX,
} from "lucide-react";
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
  const searchParams = useSearchParams();
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);

  const [bookings, setBookings] = useState<Booking[]>(
    initialBookings as Booking[],
  );

  // Handle URL parameters for highlighting specific bookings
  const highlightBookingId = searchParams.get("highlight");
  const facilityBookings = bookings.filter(
    (booking) => booking.facilityId === facilityId,
  );
  const bookingToHighlight = highlightBookingId
    ? facilityBookings.find(
        (booking) => booking.id.toString() === highlightBookingId,
      )
    : null;

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(
    bookingToHighlight || null,
  );
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

  // Determine initial active tab based on highlighted booking
  const getInitialActiveTab = () => {
    if (bookingToHighlight) {
      if (isToday(bookingToHighlight.startDate)) return "today";
      if (isUpcoming(bookingToHighlight.startDate)) return "upcoming";
      if (isPast(bookingToHighlight.startDate)) return "past";
      if (bookingToHighlight.status === "pending") return "pending";
    }
    return "all";
  };

  const [activeTab, setActiveTab] = useState(getInitialActiveTab());
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");

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

  const columns: ColumnDef<(typeof bookings)[number]>[] = [
    {
      key: "id",
      label: "ID",
      icon: Calendar,
      defaultVisible: true,
      render: (booking) => (
        <span className="font-mono text-sm">#{booking.id}</span>
      ),
    },
    {
      key: "client",
      label: "Client",
      icon: Calendar,
      defaultVisible: true,
      render: (booking) => {
        const client = clients.find((c) => c.id === booking.clientId);
        const pet = client?.pets.find((p) => p.id === booking.petId);
        return (
          <div className="flex flex-col">
            <span className="font-medium">{client?.name || "Unknown"}</span>
            <span className="text-xs text-muted-foreground">
              Pet: {pet?.name || "Unknown"}
            </span>
          </div>
        );
      },
    },
    {
      key: "service",
      label: "Service",
      icon: Calendar,
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
      render: (booking) => {
        const duration = calculateDuration(booking.startDate, booking.endDate);
        return (
          <div className="flex flex-col">
            <span className="text-sm">{booking.startDate}</span>
            {booking.startDate !== booking.endDate && (
              <span className="text-xs text-muted-foreground">
                to {booking.endDate}
              </span>
            )}
            <span className="text-xs text-muted-foreground mt-0.5">
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
      icon: Calendar,
      defaultVisible: true,
      render: (booking) => (
        <div className="flex flex-col gap-1">
          <StatusBadge type="status" value={booking.status} />
          <StatusBadge type="status" value={booking.paymentStatus} />
        </div>
      ),
    },
    {
      key: "totalCost",
      label: "Cost",
      icon: DollarSign,
      defaultVisible: true,
      render: (booking) => (
        <span className="font-semibold">${booking.totalCost}</span>
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

  const handleSaveBooking = (updatedBooking: Booking) => {
    setBookings(
      bookings.map((b) => (b.id === updatedBooking.id ? updatedBooking : b)),
    );
    alert(`Booking #${updatedBooking.id} has been updated successfully.`);
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

  const handleConfirmBooking = (bookingId: number) => {
    setBookings(
      bookings.map((b) =>
        b.id === bookingId ? { ...b, status: "confirmed" as const } : b,
      ),
    );
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

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {"Bookings Management"}
          </h2>
          <p className="text-muted-foreground">{facility.name}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setViewMode(viewMode === "calendar" ? "table" : "calendar")
            }
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {viewMode === "calendar" ? "Table View" : "Calendar View"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportBookingsToCSV(getDataForTab())}
          >
            <Download className="mr-2 h-4 w-4" />
            {"Export"}
          </Button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"All Bookings"}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {upcomingBookings.length} upcoming bookings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Today's Bookings"}
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayBookings.length}</div>
            <p className="text-xs text-muted-foreground">{"Active today"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Completed Bookings"}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedBookings}</div>
            <p className="text-xs text-muted-foreground">
              {totalBookings > 0
                ? Math.round((completedBookings / totalBookings) * 100)
                : 0}
              % {"completion rate"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Pending Bookings"}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingBookings.length}</div>
            <p className="text-xs text-muted-foreground">
              ${pendingRevenue} pending revenue
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {"Total Revenue"}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              {"Total received"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Service */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{"Revenue by Service"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(revenueByService).map(
              ([service, revenue]: [string, number]) => (
                <div
                  key={service}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted"
                >
                  <Badge variant="outline" className="capitalize">
                    {service}
                  </Badge>
                  <span className="font-semibold">${revenue}</span>
                </div>
              ),
            )}
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
                daycare: "bg-blue-500",
                boarding: "bg-purple-500",
                grooming: "bg-pink-500",
                vet: "bg-green-500",
              };
              return colors[booking.service] || "bg-gray-500";
            },
            getItemBorderColor: (booking) => {
              const colors: Record<string, string> = {
                pending: "border-yellow-500",
                confirmed: "border-blue-500",
                completed: "border-green-500",
                cancelled: "border-gray-500",
              };
              return colors[booking.status] || "border-gray-500";
            },
            legendItems: [
              { color: "bg-blue-500", label: "Daycare" },
              { color: "bg-purple-500", label: "Boarding" },
              { color: "bg-pink-500", label: "Grooming" },
              { color: "bg-green-500", label: "Vet" },
            ],
          }}
          view="month"
        />
      ) : (
        /* Tabs for filtering bookings */
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all" className="relative">
              {"All"}
              <Badge
                variant="secondary"
                className="ml-2 px-1.5 py-0 text-xs h-5"
              >
                {allBookings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="today" className="relative">
              {"Today"}
              <Badge
                variant="secondary"
                className="ml-2 px-1.5 py-0 text-xs h-5"
              >
                {todayBookings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="relative">
              {"Upcoming"}
              <Badge
                variant="secondary"
                className="ml-2 px-1.5 py-0 text-xs h-5"
              >
                {upcomingBookings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="past" className="relative">
              {"Past"}
              <Badge
                variant="secondary"
                className="ml-2 px-1.5 py-0 text-xs h-5"
              >
                {pastBookings.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="relative">
              {"Pending"}
              <Badge
                variant="secondary"
                className="ml-2 px-1.5 py-0 text-xs h-5"
              >
                {pendingBookings.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {getDataForTab().length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <CalendarX className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {"No bookings found"}
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md">
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
                actions={(booking) => (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>{"Actions"}</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() =>
                          setSelectedBooking(booking as unknown as Booking)
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {"View Details"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setEditingBooking(booking as unknown as Booking)
                        }
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        {"Edit Booking"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>{"Status"}</DropdownMenuLabel>
                      {booking.status === "pending" && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleConfirmBooking(
                              (booking as unknown as Booking).id,
                            )
                          }
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {"Confirm Booking"}
                        </DropdownMenuItem>
                      )}
                      {booking.status === "confirmed" && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleCompleteBooking(
                              (booking as unknown as Booking).id,
                            )
                          }
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {"Mark as Completed"}
                        </DropdownMenuItem>
                      )}
                      {booking.paymentStatus === "pending" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              setProcessingPayment(
                                booking as unknown as Booking,
                              )
                            }
                          >
                            <DollarSign className="mr-2 h-4 w-4" />
                            {"Process Payment"}
                          </DropdownMenuItem>
                        </>
                      )}
                      {booking.paymentStatus === "paid" &&
                        booking.status !== "cancelled" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                setRefundingBooking(
                                  booking as unknown as Booking,
                                )
                              }
                            >
                              <DollarSign className="mr-2 h-4 w-4" />
                              Process Refund
                            </DropdownMenuItem>
                          </>
                        )}
                      {(booking.status === "pending" ||
                        booking.status === "confirmed") && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              setCancellingBooking(
                                booking as unknown as Booking,
                              )
                            }
                          >
                            <X className="mr-2 h-4 w-4" />
                            {"Cancel Booking"}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              />
            )}
          </TabsContent>
        </Tabs>
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

      <Dialog
        open={!!selectedBooking}
        onOpenChange={() => setSelectedBooking(null)}
      >
        <DialogContent className="min-w-5xl max-h-[90vh] flex flex-col p-0">
          <div className="p-6 flex-1 overflow-y-auto">
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
