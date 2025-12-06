import { bookings } from "./bookings";
import { clients } from "./clients";
import { facilities } from "./facilities";

// Helper functions for report calculations
export const calculateOccupancyRate = (
  facilityId: number,
  startDate: string,
  endDate: string,
) => {
  const facility = facilities.find((f) => f.id === facilityId);
  if (!facility) return { rate: 0, occupiedDays: 0, totalCapacity: 0 };

  const facilityBookings = bookings.filter(
    (b) =>
      b.facilityId === facilityId &&
      b.service === "boarding" &&
      b.status !== "cancelled",
  );

  const start = new Date(startDate);
  const end = new Date(endDate);
  const daysDiff =
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Assuming 20 kennels capacity
  const totalCapacity = daysDiff * 20;

  let occupiedDays = 0;
  facilityBookings.forEach((booking) => {
    const bookingStart = new Date(booking.startDate);
    const bookingEnd = new Date(booking.endDate);

    // Count nights between dates
    const nights = Math.ceil(
      (bookingEnd.getTime() - bookingStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Check if booking overlaps with our date range
    if (bookingStart <= end && bookingEnd >= start) {
      occupiedDays += nights;
    }
  });

  const rate = totalCapacity > 0 ? (occupiedDays / totalCapacity) * 100 : 0;

  return {
    rate: Math.round(rate * 100) / 100,
    occupiedDays,
    totalCapacity,
  };
};

export const calculateAOV = (
  facilityId: number,
  startDate: string,
  endDate: string,
) => {
  const facilityBookings = bookings.filter(
    (b) =>
      b.facilityId === facilityId &&
      b.paymentStatus === "paid" &&
      new Date(b.startDate) >= new Date(startDate) &&
      new Date(b.startDate) <= new Date(endDate),
  );

  const totalRevenue = facilityBookings.reduce(
    (sum, b) => sum + b.totalCost,
    0,
  );
  const orderCount = facilityBookings.length;

  return {
    aov: orderCount > 0 ? totalRevenue / orderCount : 0,
    totalRevenue,
    orderCount,
  };
};

export const calculateRetentionRate = (
  facilityId: number,
  months: number = 3,
) => {
  const facilityClients = clients.filter((c) => {
    const clientBookings = bookings.filter(
      (b) => b.facilityId === facilityId && b.clientId === c.id,
    );
    return clientBookings.length > 0;
  });

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - months);

  const returningClients = facilityClients.filter((client) => {
    const clientBookings = bookings.filter(
      (b) =>
        b.facilityId === facilityId &&
        b.clientId === client.id &&
        new Date(b.startDate) >= threeMonthsAgo,
    );
    return clientBookings.length > 1; // Has multiple bookings
  });

  return {
    rate:
      facilityClients.length > 0
        ? (returningClients.length / facilityClients.length) * 100
        : 0,
    returningClients: returningClients.length,
    totalClients: facilityClients.length,
  };
};

export const getTopCustomers = (facilityId: number, limit: number = 10) => {
  const facilityClients = clients.filter((c) => {
    const clientBookings = bookings.filter(
      (b) => b.facilityId === facilityId && b.clientId === c.id,
    );
    return clientBookings.length > 0;
  });

  const clientStats = facilityClients.map((client) => {
    const clientBookings = bookings.filter(
      (b) => b.facilityId === facilityId && b.clientId === client.id,
    );
    const totalSpent = clientBookings
      .filter((b) => b.paymentStatus === "paid")
      .reduce((sum, b) => sum + b.totalCost, 0);
    const totalBookings = clientBookings.length;
    const firstBooking = clientBookings.sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    )[0];
    const lastBooking = clientBookings.sort(
      (a, b) =>
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime(),
    )[0];

    // Calculate Customer Lifetime Value (CLV)
    const monthsSinceFirst = firstBooking
      ? (new Date().getTime() - new Date(firstBooking.startDate).getTime()) /
        (1000 * 60 * 60 * 24 * 30)
      : 1;
    const avgMonthlySpend =
      monthsSinceFirst > 0 ? totalSpent / monthsSinceFirst : totalSpent;
    const estimatedLifetimeMonths = 24; // Assume 2 year avg customer lifetime
    const clv = avgMonthlySpend * estimatedLifetimeMonths;

    return {
      client,
      totalSpent,
      totalBookings,
      averageOrderValue: totalBookings > 0 ? totalSpent / totalBookings : 0,
      firstBookingDate: firstBooking?.startDate,
      lastBookingDate: lastBooking?.startDate,
      clv,
      avgMonthlySpend,
    };
  });

  return clientStats
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
};

export interface OccupancyReportData {
  date: string;
  occupancyRate: number;
  occupiedKennels: number;
  totalKennels: number;
  revenue: number;
}

export interface NoShowReportData {
  date: string;
  service: string;
  clientName: string;
  petName: string;
  scheduledTime: string;
  status: "no-show" | "late-cancellation";
  revenue: number;
}

export interface CancellationReportData {
  date: string;
  service: string;
  clientName: string;
  petName: string;
  reason?: string;
  refundAmount: number;
  cancellationTime: string;
  advanceNotice: string; // e.g., "2 days", "1 hour"
}

// Generate sample occupancy report data
export const generateOccupancyReport = (
  facilityId: number,
  startDate: string,
  endDate: string,
): OccupancyReportData[] => {
  const data: OccupancyReportData[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const dayBookings = bookings.filter(
      (b) =>
        b.facilityId === facilityId &&
        b.service === "boarding" &&
        b.status !== "cancelled" &&
        new Date(b.startDate) <= d &&
        new Date(b.endDate) >= d,
    );

    const occupiedKennels = dayBookings.length;
    const totalKennels = 20; // Mock capacity
    const occupancyRate = (occupiedKennels / totalKennels) * 100;
    const revenue = dayBookings.reduce(
      (sum, b) =>
        sum +
        b.totalCost /
          ((new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) /
            (1000 * 60 * 60 * 24) || 1),
      0,
    );

    data.push({
      date: dateStr,
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      occupiedKennels,
      totalKennels,
      revenue: Math.round(revenue * 100) / 100,
    });
  }

  return data;
};

// Generate sample no-show report data
export const generateNoShowReport = (
  facilityId: number,
  startDate: string,
  endDate: string,
): NoShowReportData[] => {
  // In a real app, would track actual no-shows
  // For now, use cancelled bookings as proxy
  const cancelled = bookings.filter(
    (b) =>
      b.facilityId === facilityId &&
      b.status === "cancelled" &&
      new Date(b.startDate) >= new Date(startDate) &&
      new Date(b.startDate) <= new Date(endDate),
  );

  return cancelled.map((booking) => {
    const client = clients.find((c) => c.id === booking.clientId);
    const pet = client?.pets.find((p) => p.id === booking.petId);

    return {
      date: booking.startDate,
      service: booking.service,
      clientName: client?.name || "Unknown",
      petName: pet?.name || "Unknown",
      scheduledTime: booking.checkInTime || "N/A",
      status: "no-show" as const,
      revenue: booking.totalCost,
    };
  });
};

// Generate sample cancellation report data
export const generateCancellationReport = (
  facilityId: number,
  startDate: string,
  endDate: string,
): CancellationReportData[] => {
  const cancelled = bookings.filter(
    (b) =>
      b.facilityId === facilityId &&
      b.status === "cancelled" &&
      new Date(b.startDate) >= new Date(startDate) &&
      new Date(b.startDate) <= new Date(endDate),
  );

  return cancelled.map((booking) => {
    const client = clients.find((c) => c.id === booking.clientId);
    const pet = client?.pets.find((p) => p.id === booking.petId);
    const bookingAny = booking as typeof booking & {
      cancellationReason?: string;
      refundAmount?: number;
    };

    return {
      date: booking.startDate,
      service: booking.service,
      clientName: client?.name || "Unknown",
      petName: pet?.name || "Unknown",
      reason: bookingAny.cancellationReason || booking.specialRequests,
      refundAmount: bookingAny.refundAmount || 0,
      cancellationTime: booking.startDate, // Mock
      advanceNotice: "2 days", // Mock
    };
  });
};

// Report field definitions for custom report builder
export const reportFields = {
  bookings: [
    { key: "id", label: "Booking ID", type: "number" },
    { key: "startDate", label: "Start Date", type: "date" },
    { key: "endDate", label: "End Date", type: "date" },
    { key: "service", label: "Service", type: "text" },
    { key: "status", label: "Status", type: "text" },
    { key: "totalCost", label: "Total Cost", type: "currency" },
    { key: "paymentStatus", label: "Payment Status", type: "text" },
  ],
  clients: [
    { key: "name", label: "Client Name", type: "text" },
    { key: "email", label: "Email", type: "text" },
    { key: "phone", label: "Phone", type: "text" },
    { key: "status", label: "Status", type: "text" },
  ],
  pets: [
    { key: "name", label: "Pet Name", type: "text" },
    { key: "type", label: "Pet Type", type: "text" },
    { key: "breed", label: "Breed", type: "text" },
    { key: "age", label: "Age", type: "number" },
  ],
  payments: [
    { key: "id", label: "Payment ID", type: "number" },
    { key: "bookingId", label: "Booking ID", type: "number" },
    { key: "amount", label: "Amount", type: "currency" },
    { key: "paymentDate", label: "Payment Date", type: "date" },
    { key: "paymentMethod", label: "Payment Method", type: "text" },
    { key: "status", label: "Status", type: "text" },
  ],
};

export interface CustomReportConfig {
  id: string;
  name: string;
  description?: string;
  dataSource: "bookings" | "clients" | "pets" | "payments";
  selectedFields: string[];
  filters: {
    field: string;
    operator: "equals" | "contains" | "greater_than" | "less_than" | "between";
    value: string | number | boolean | string[];
  }[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  schedule?: {
    enabled: boolean;
    frequency: "daily" | "weekly" | "monthly";
    recipients: string[];
  };
  createdAt: string;
  createdBy: string;
}

export const savedCustomReports: CustomReportConfig[] = [
  {
    id: "custom-001",
    name: "Weekly Revenue Summary",
    description: "All paid bookings with revenue breakdown",
    dataSource: "bookings",
    selectedFields: ["startDate", "service", "totalCost", "paymentStatus"],
    filters: [
      {
        field: "paymentStatus",
        operator: "equals",
        value: "paid",
      },
    ],
    sortBy: "startDate",
    sortOrder: "desc",
    schedule: {
      enabled: true,
      frequency: "weekly",
      recipients: ["manager@facility.com"],
    },
    createdAt: "2024-01-15T10:00:00Z",
    createdBy: "Sarah Johnson",
  },
  {
    id: "custom-002",
    name: "Active Clients with Pets",
    description: "All active clients and their registered pets",
    dataSource: "clients",
    selectedFields: ["name", "email", "phone", "status"],
    filters: [
      {
        field: "status",
        operator: "equals",
        value: "active",
      },
    ],
    sortBy: "name",
    sortOrder: "asc",
    createdAt: "2024-02-01T14:00:00Z",
    createdBy: "Mike Davis",
  },
];
