// View-model types for the facility profile Overview KPIs + Reports tab.

export interface OverviewKpis {
  /** SUM of completed payments in the last 6 months. */
  totalRevenue: number;
  staffCount: number;
  activeClients: number;
  locations: number;
}

export interface FacilityReport {
  summary: {
    totalRevenue: number;
    revenueGrowth: number;
    totalBookings: number;
    bookingGrowth: number;
    activeClients: number;
    clientGrowth: number;
    avgBookingValue: number;
  };
  revenueByService: { name: string; value: number; percentage: number }[];
  monthlyRevenue: { month: string; revenue: number; bookings: number }[];
  bookingsByDay: { day: string; bookings: number; completed: number }[];
  clientGrowth: { month: string; newClients: number; returning: number }[];
  topClients: { name: string; visits: number; spent: number }[];
  recentReports: {
    id: number;
    name: string;
    type: string;
    generatedAt: string;
    status: string;
  }[];
  scheduledReports: {
    id: number;
    name: string;
    frequency: string;
    nextRun: string;
    recipients: number;
  }[];
  bookingMetrics: {
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
  };
}
