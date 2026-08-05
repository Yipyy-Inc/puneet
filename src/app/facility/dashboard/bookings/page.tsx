"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
  TrendingUp,
  Hourglass,
} from "lucide-react";
import { KpiTile } from "@/components/facility/dashboard/kpi-tile";
import { getYipyyGoConfig } from "@/data/yipyygo-config";
import { getYipyyGoDisplayStatusForBooking } from "@/data/yipyygo-forms";
import { YipyyGoStatusBadge } from "@/components/yipyygo/YipyyGoStatusBadge";
import { TagList } from "@/components/shared/TagList";
import { getTagsByType, getNoteCount } from "@/data/tags-notes";
import { BookingDateRangeFilter } from "@/components/bookings/BookingDateRangeFilter";
import { useLocationContext } from "@/hooks/use-location-context";
import { usePermission } from "@/hooks/use-facility-rbac";
import { useAssignedScope } from "@/lib/facility-permissions";
import { bookingMutations, bookingQueries } from "@/lib/api/booking";
import { useFieldMask } from "@/lib/staff/mask";
import { deriveLocationId, getLocationById } from "@/data/locations";
import { LocationFilterBanner } from "@/components/hq/LocationFilterBanner";
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

export default function FacilityBookingsPage() {
  const router = useRouter();
  // Section 5B: this table is shared by both portals. In the employee portal the
  // row must open the detail INSIDE the /employee shell, so the RBAC provider
  // stays mounted and the detail's gates + scope actually apply.
  const pathname = usePathname();
  const inEmployeePortal = pathname?.startsWith("/employee") ?? false;
  const facilityId = 11;
  const facility = facilities.find((f) => f.id === facilityId);
  const { setRequests: setBookingRequests } = useBookingRequestsStore();
  const { currentLocationId, isHQView, isMultiLocation } = useLocationContext();
  // Table 21 masking: booking $ hidden from staff without view_booking_financials;
  // the Revenue KPI is Manager+ (financial_view_revenue).
  const { maskAmount, canSee } = useFieldMask();
  const canSeeRevenue = usePermission("financial_view_revenue");
  // Section 3C / Table 5: without view_booking_financials, OMIT the Cost and
  // Payment-status columns from the DOM entirely (not just mask the values).
  const canSeeBookingAmounts = canSee("booking_financials");
  // Section 8B: when view_bookings resolves to assigned_only, this is the
  // viewer's fs-* id; otherwise undefined (full access, as admin sees).
  const assignedStaffId = useAssignedScope("view_bookings");

  // Section 8B scoping is applied by the FACTORY, not here: `bookingQueries.all`
  // runs `scopeBookingsToStaff` when an assigned id is passed, which is the
  // same call admin makes with no scope at all.
  const { data: bookings = [], isLoading } = useQuery(
    bookingQueries.all(assignedStaffId ? { assignedStaffId } : undefined),
  );

  const queryClient = useQueryClient();
  const saveBooking = useMutation({
    mutationFn: async (booking: Booking) =>
      bookings.some((b) => b.id === booking.id)
        ? bookingMutations.update(booking.id, booking)
        : bookingMutations.create(booking),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });

  const facilityBookings = bookings.filter(
    (booking) => booking.facilityId === facilityId,
  );

  const locationScopedBookings =
    isMultiLocation && !isHQView && currentLocationId
      ? facilityBookings.filter(
          (b) => deriveLocationId(b.id) === currentLocationId,
        )
      : facilityBookings;

  // Section 8B scoping already happened in the query factory — applying
  // `scopeBookingsToStaff` a second time here would be a no-op that reads like
  // the rule, and the next person to change the rule would edit the wrong one.
  const locationBookings = locationScopedBookings;

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  const [activeTab, setActiveTab] = useState("all");
  const [filterStart, setFilterStart] = useState<Date | null>(null);
  const [filterEnd, setFilterEnd] = useState<Date | null>(null);

  useEffect(() => {
    // Not until the list is here. The draft's id is derived from the highest
    // one already in use, so running against an EMPTY list would produce id 1 —
    // which `saveBooking` would then find in the list and treat as an edit of
    // booking #1. The key is only consumed once, so re-running is harmless.
    if (isLoading) return;
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

      // A placeholder above every id in use, so the save is a CREATE and the
      // server assigns the real reference.
      const maxId = Math.max(...bookings.map((b) => b.id ?? 0), 0);
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
    } finally {
      localStorage.removeItem("booking_requests_schedule_draft");
    }
  }, [facilityId, isLoading, bookings]);

  if (!facility) {
    return <div>Facility not found</div>;
  }

  // Filter bookings by tab
  const allBookings = locationBookings;
  const todayBookings = locationBookings.filter((b) => isToday(b.startDate));
  const upcomingBookings = locationBookings.filter(
    (b) => isUpcoming(b.startDate) && b.status !== "cancelled",
  );
  const pendingBookings = locationBookings.filter(
    (b) => b.status === "pending",
  );

  // Calculate stats
  const totalBookings = locationBookings.length;
  const totalRevenue = locationBookings
    .filter((b) => b.paymentStatus === "paid")
    .reduce((sum, b) => sum + b.totalCost, 0);
  const pendingRevenue = locationBookings
    .filter((b) => b.paymentStatus === "pending")
    .reduce((sum, b) => sum + b.totalCost, 0);

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
    ...(isMultiLocation && isHQView
      ? [
          {
            key: "location",
            label: "Location",
            icon: CircleDot,
            defaultVisible: true,
            render: (booking: (typeof bookings)[number]) => {
              const loc = getLocationById(deriveLocationId(booking.id));
              if (!loc)
                return <span className="text-muted-foreground text-xs">—</span>;
              return (
                <div className="flex items-center gap-1.5">
                  <div
                    className="size-2 rounded-full"
                    style={{ backgroundColor: loc.color }}
                  />
                  <span className="text-xs font-medium">{loc.shortCode}</span>
                </div>
              );
            },
          } as ColumnDef<(typeof bookings)[number]>,
        ]
      : []),
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
      // ── Where the pet is, and it means the same thing for every service ──
      //
      // A SEPARATE AXIS FROM `status`. Grooming records arrival by moving
      // `bookings.status` ('checked_in', 'in_progress', 'ready'); daycare and
      // boarding leave the status alone and stamp a timestamp on their own
      // table. So this list could tell you a groom was in the building and
      // could not tell you the same about a boarding guest — it showed
      // "Confirmed" for a dog that had been in kennel 4 since Tuesday.
      //
      // `booking_presence` (20260806960000) derives one answer from whichever
      // table owns it. `unknown` is honest: training and custom services have
      // no attendance table at all.
      key: "presence",
      label: "On site",
      icon: CircleDot,
      defaultVisible: true,
      sortable: true,
      sortValue: (booking) => booking.presence ?? "unknown",
      render: (booking) => {
        const presence = booking.presence ?? "unknown";
        if (presence === "unknown") {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        const label =
          presence === "on-site"
            ? "On site"
            : presence === "departed"
              ? "Gone home"
              : "Expected";
        return (
          <span
            data-presence={presence}
            className="data-[presence=departed]:text-muted-foreground inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium data-[presence=expected]:border-amber-200 data-[presence=expected]:text-amber-700 data-[presence=on-site]:border-emerald-200 data-[presence=on-site]:text-emerald-700 dark:data-[presence=expected]:text-amber-400 dark:data-[presence=on-site]:text-emerald-400"
          >
            {label}
          </span>
        );
      },
    },
    // Payment-status column — omitted without view_booking_financials (3C).
    ...(canSeeBookingAmounts
      ? [
          {
            key: "payment",
            label: "Payment",
            icon: DollarSign,
            defaultVisible: true,
            render: (booking: (typeof bookings)[number]) => (
              <StatusBadge type="status" value={booking.paymentStatus} />
            ),
          } as ColumnDef<(typeof bookings)[number]>,
        ]
      : []),
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
      label: "Yipyy Express Check-in",
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
    // Cost column — omitted without view_booking_financials (3C).
    ...(canSeeBookingAmounts
      ? [
          {
            key: "totalCost",
            label: "Cost",
            icon: DollarSign,
            defaultVisible: true,
            sortable: true,
            sortValue: (booking: (typeof bookings)[number]) =>
              booking.totalCost,
            render: (booking: (typeof bookings)[number]) => (
              <span className="price-value">
                {maskAmount(
                  `$${booking.totalCost.toFixed(2)}`,
                  "booking_financials",
                )}
              </span>
            ),
          } as ColumnDef<(typeof bookings)[number]>,
        ]
      : []),
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
        { value: "evaluation", label: "Evaluation" },
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

  // Convert a Date to a YYYY-MM-DD string without timezone shift
  const toDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Keep bookings whose date range overlaps the selected filter range
  const applyDateFilter = (list: Booking[]) => {
    if (!filterStart) return list;
    const startStr = toDateStr(filterStart);
    const endStr = filterEnd ? toDateStr(filterEnd) : startStr;
    return list.filter((b) => b.startDate <= endStr && b.endDate >= startStr);
  };

  const getDataForTab = () => {
    const base = activeTab === "today" ? todayBookings : allBookings;
    return applyDateFilter(base);
  };

  // The cancel, payment and refund modals used to live here with their
  // handlers. NOTHING EVER OPENED THEM: `setProcessingPayment`,
  // `setCancellingBooking` and `setRefundingBooking` were only ever called with
  // null, to close a dialog that could not be opened. This DataTable has no
  // actions column at all — a row is a link to the booking, which is where
  // those three now record real money.

  const handleSaveBooking = (updatedBooking: Booking) => {
    setEditingBooking(null);
    saveBooking.mutate(updatedBooking, {
      onSuccess: (saved) => {
        // If this booking originated from a booking request, mark that request
        // as scheduled. Only after the write lands — a request marked scheduled
        // against a booking that failed to save points at nothing.
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
        toast.success(`Booking #${saved?.id ?? updatedBooking.id} saved`);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="flex-1 space-y-5 p-4 pt-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Bookings</h2>
            <p className="text-muted-foreground text-sm">{facility.name}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
        <LocationFilterBanner />
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiTile
          label="All Bookings"
          value={totalBookings}
          hint="Total on record"
          icon={Calendar}
          tone="indigo"
          active={activeTab === "all"}
          onClick={() => setActiveTab("all")}
        />
        <KpiTile
          label="Today"
          value={todayBookings.length}
          hint="Active today"
          icon={CalendarDays}
          tone="amber"
          active={activeTab === "today"}
          onClick={() => setActiveTab(activeTab === "today" ? "all" : "today")}
        />
        <KpiTile
          label="Upcoming"
          value={upcomingBookings.length}
          hint="Scheduled ahead"
          icon={Hourglass}
          tone="violet"
        />
        <KpiTile
          label="Pending"
          value={pendingBookings.length}
          hint="Awaiting action"
          icon={Clock}
          tone="rose"
        />
        {canSeeRevenue && (
          <KpiTile
            label="Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            hint={`$${pendingRevenue.toFixed(0)} pending`}
            icon={TrendingUp}
            tone="emerald"
          />
        )}
      </div>

      {/* Table View */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          <TabsList className="bg-muted/60 h-9 shrink-0 gap-0.5 p-1">
            {(
              [
                { value: "all", label: "All", count: allBookings.length },
                { value: "today", label: "Today", count: todayBookings.length },
              ] as const
            ).map(({ value, label, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-7 gap-1.5 px-3 text-xs font-medium"
              >
                {label}
                <span className="bg-background/70 text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums shadow-sm">
                  {count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          <BookingDateRangeFilter
            rangeStart={filterStart}
            rangeEnd={filterEnd}
            onChange={(start, end) => {
              setFilterStart(start);
              setFilterEnd(end);
            }}
          />
        </div>
        <TabsContent value={activeTab} className="mt-4">
          {getDataForTab().length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <div className="bg-muted/60 mb-4 flex size-16 items-center justify-center rounded-2xl">
                  <CalendarX className="text-muted-foreground/50 size-8" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold">
                  No bookings found
                </h3>
                <p className="text-muted-foreground max-w-xs text-center text-sm">
                  There are no bookings in this category yet.
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
                  inEmployeePortal
                    ? `/employee/bookings/${booking.id}`
                    : `/facility/dashboard/clients/${booking.clientId}/bookings/${booking.id}`,
                )
              }
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Booking Modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          open={!!editingBooking}
          onOpenChange={(open) => !open && setEditingBooking(null)}
          onSave={handleSaveBooking}
        />
      )}
    </div>
  );
}
