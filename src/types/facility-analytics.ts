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

// ============================================================================
// Derived report selectors (src/lib/report-data-sources.ts)
// Shared inputs + typed output series for the pure, memoized selectors that
// derive every report metric from the real operational stores.
// ============================================================================

export type Granularity = "day" | "week" | "month";

/** A closed date range. Endpoints accept ISO strings or Date objects. */
export interface DateRange {
  from: string | Date;
  to: string | Date;
}

/** Optional scoping applied where the underlying store supports it. */
export interface ReportFilterOpts {
  /** Filter transaction-derived metrics to a POS location. */
  locationId?: string;
  /** Filter booking-derived metrics to a single service (e.g. "boarding"). */
  service?: string;
  /** Bucket granularity for period series (defaults to "day"). */
  granularity?: Granularity;
}

/** One period bucket of money totals, from retail transactions. */
export interface RevenuePeriodPoint {
  period: string;
  revenue: number;
  subtotal: number;
  tax: number;
  tips: number;
  discounts: number;
  refunds: number;
  transactions: number;
}

/** Revenue rolled up by service line. */
export interface RevenueByServicePoint {
  service: string;
  revenue: number;
  bookings: number;
  percentage: number;
  color: string;
}

/** One period bucket of booking volume + outcomes. */
export interface BookingsPeriodPoint {
  period: string;
  bookings: number;
  completed: number;
  cancelled: number;
  noShows: number;
}

/** Per-day boarding occupancy. */
export interface OccupancyPoint {
  date: string;
  occupancyRate: number;
  occupied: number;
  capacity: number;
  revenue: number;
}

/** Capacity utilization by service over the range. */
export interface UtilizationPoint {
  service: string;
  booked: number;
  capacity: number;
  utilizationRate: number;
}

/** One acquisition-source bucket (inferred — clients carry no source field). */
export interface AcquisitionSourcePoint {
  source: string;
  clients: number;
}

/** Client base health, derived from transaction history. */
export interface ClientMetrics {
  newClients: number;
  returningClients: number;
  activeClients: number;
  retentionRate: number;
  avgLtv: number;
  acquisitionBySource: AcquisitionSourcePoint[];
}

/** New vs returning clients for one period. */
export interface ClientTrendPoint {
  period: string;
  newClients: number;
  returningClients: number;
}

/** A client ranked by spend (from transaction history). */
export interface TopClientPoint {
  name: string;
  spend: number;
  transactions: number;
}

/** A lapsed client worth a reactivation nudge. */
export interface ReactivationClient {
  id: number;
  name: string;
  lastVisit: string;
  daysSince: number;
}

/** Client-base composition, derived from the client roster. */
export interface ClientBase {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalPets: number;
  avgPetsPerClient: number;
  reactivation: ReactivationClient[];
}

/** One point on the recency/retention curve (share of clients active within N days). */
export interface RetentionCurvePoint {
  window: string;
  days: number;
  clients: number;
  percentage: number;
}

/** Sales attributed to a staff member, with scheduled hours where known. */
export interface StaffPerformancePoint {
  staffId: string;
  staffName: string;
  transactions: number;
  revenue: number;
  itemsSold: number;
  hoursWorked: number;
  salesPerHour: number;
}

/** Labor cost per staff member, from scheduled shifts × pay rate. */
export interface LaborCostPoint {
  staffId: string;
  staffName: string;
  hoursWorked: number;
  laborCost: number;
  revenue: number;
  laborCostPct: number;
}

/**
 * Reconciled revenue totals for a range, derived from retail transactions.
 * `totalCollected` (== sum of Transaction.total) is authoritative and equals
 * both the daily table sum and the raw transaction sum (`rawTotal`).
 */
export interface RevenueSummary {
  /** Pre-discount line-item total. */
  subtotal: number;
  discounts: number;
  tax: number;
  tips: number;
  /** Sum of Transaction.total — the headline "Total Revenue" (gross, pre-refund). */
  totalCollected: number;
  refunds: number;
  /** Gross minus refunds. */
  netRevenue: number;
  transactions: number;
  avgTransaction: number;
  /** True when totalCollected matches the raw transaction sum to the cent. */
  reconciled: boolean;
  /** Independent sum of getAllTransactions().total for the range (reconciliation leg). */
  rawTotal: number;
}

/** One payment-method bucket (card/cash/gift card/store credit/…) from Transaction.payments. */
export interface PaymentMethodPoint {
  method: string;
  label: string;
  amount: number;
  count: number;
  percentage: number;
}

// ── Booking & occupancy analytics ───────────────────────────────────────────

/** Bookings over time split by service, ready for a stacked chart. */
export interface BookingsByServiceOverTime {
  /** Service display names present in the range (the stack keys). */
  services: string[];
  /** One row per period: `{ period, [service]: count, … }`. */
  data: Record<string, string | number>[];
}

/** Booking-source mix (Online / In-Person from grooming, Staff/Direct for bookings). */
export interface BookingSourcePoint {
  source: string;
  bookings: number;
  percentage: number;
}

/** Headline booking rates for a range (bookings seed; lead time from grooming appts). */
export interface BookingRates {
  total: number;
  completed: number;
  cancelled: number;
  noShows: number;
  completionRate: number;
  cancellationRate: number;
  noShowRate: number;
  /** Avg days between booking creation and appointment (grooming appts only — bookings carry no booked-at). */
  avgLeadTimeDays: number;
  revenue: number;
  avgBookingValue: number;
}

/** One day-of-week × hour cell for the booking heatmap. */
export interface HeatmapCell {
  /** 0 = Sunday … 6 = Saturday. */
  dow: number;
  /** Hour of day (24h). */
  hour: number;
  count: number;
}

// ── Per-service-module analytics ────────────────────────────────────────────

/** Grooming module analytics, derived from groomingAppointments. */
export interface GroomingAnalytics {
  appointments: number;
  completed: number;
  cancelled: number;
  noShows: number;
  revenue: number;
  tips: number;
  /** Revenue ÷ non-cancelled appointments. */
  avgTicket: number;
  /** Share of clients with more than one appointment in the range (repeat/rebook proxy). */
  rebookRate: number;
  serviceMix: { name: string; count: number; revenue: number }[];
  byGroomer: {
    stylistId: string;
    name: string;
    appointments: number;
    revenue: number;
    avgTicket: number;
  }[];
}

/** Boarding module analytics, derived from boardingGuests (status-based). */
export interface BoardingAnalytics {
  currentGuests: number;
  capacity: number;
  occupancyRate: number;
  /** Average daily rate (mean nightly rate). */
  adr: number;
  /** Average length of stay, nights. */
  avgLengthOfStay: number;
  revenue: number;
  totalGuests: number;
}

/** Daycare module analytics, derived from daycareCheckIns + rate card. */
export interface DaycareAnalytics {
  currentCount: number;
  checkedOutToday: number;
  capacity: number;
  occupancyRate: number;
  /** Average visit length, hours. */
  avgStayHours: number;
  /** Recognized revenue for the day's check-ins, from the real size/rate card. */
  todayRevenue: number;
}

/** Capacity used vs available per service (daily-occupancy framing). */
export interface CapacityUtilizationPoint {
  service: string;
  /** Daily slot count (kennels / spots / stations / seats). */
  capacity: number;
  /** Highest concurrent occupancy on any day in the range. */
  peakUsed: number;
  /** Mean daily occupancy across the range. */
  avgUsed: number;
  /** avgUsed / capacity, %. */
  utilizationRate: number;
  /** peakUsed / capacity, %. */
  peakUtilizationRate: number;
  /** Total bookings in the range for this service. */
  bookings: number;
  revenue: number;
  /** Revenue each available slot generated over the range (revenue / capacity). */
  revenuePerAvailableSlot: number;
}
