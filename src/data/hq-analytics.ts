import type { HQOverviewMetrics } from "@/types/location";

export const hqOverviewMetrics: HQOverviewMetrics = {
  facilityId: 11,
  period: "2026-04",
  totalRevenue: 113060,
  revenueByLocation: [
    { locationId: "loc-dv-main",  locationName: "Plateau", revenue: 48720, percentage: 43.1 },
    { locationId: "loc-dv-ouest", locationName: "NDG",     revenue: 29450, percentage: 26.1 },
    { locationId: "loc-dv-laval", locationName: "Laval",   revenue: 34890, percentage: 30.8 },
  ],
  totalBookings: 751,
  bookingsByLocation: [
    { locationId: "loc-dv-main",  locationName: "Plateau", count: 312 },
    { locationId: "loc-dv-ouest", locationName: "NDG",     count: 198 },
    { locationId: "loc-dv-laval", locationName: "Laval",   count: 241 },
  ],
  totalNewCustomers: 113,
  totalReturningCustomers: 638,
  avgOccupancyRate: 82.3,
  topPerformingLocation: "loc-dv-main",
  revenueGrowth: 20.1,
  revenueTrend: [
    { date: "2026-01", "loc-dv-main": 38200, "loc-dv-ouest": 21300, "loc-dv-laval": 18900 },
    { date: "2026-02", "loc-dv-main": 41500, "loc-dv-ouest": 23800, "loc-dv-laval": 23100 },
    { date: "2026-03", "loc-dv-main": 44100, "loc-dv-ouest": 26200, "loc-dv-laval": 29400 },
    { date: "2026-04", "loc-dv-main": 48720, "loc-dv-ouest": 29450, "loc-dv-laval": 34890 },
  ],
  occupancyTrend: [
    { date: "2026-01", "loc-dv-main": 74, "loc-dv-ouest": 62, "loc-dv-laval": 58 },
    { date: "2026-02", "loc-dv-main": 79, "loc-dv-ouest": 68, "loc-dv-laval": 66 },
    { date: "2026-03", "loc-dv-main": 83, "loc-dv-ouest": 74, "loc-dv-laval": 75 },
    { date: "2026-04", "loc-dv-main": 87, "loc-dv-ouest": 78, "loc-dv-laval": 82 },
  ],
};

export const locationComparisonData = [
  {
    locationId: "loc-dv-main",
    name: "Plateau",
    shortCode: "PLT",
    color: "#0ea5e9",
    revenue: 48720,
    revenueGrowth: 12.4,
    bookings: 312,
    bookingsGrowth: 8.2,
    newCustomers: 34,
    returningCustomers: 278,
    occupancyRate: 87,
    staffUtilization: 91,
    avgBookingValue: 156.2,
    cancellationRate: 3.1,
    daycareAttendance: 892,
    groomingVolume: 148,
    boardingNights: 421,
    trainingSessionsCompleted: 67,
    staffCount: 5,
    activeServices: 4,
    topService: "Boarding",
    nps: 92,
  },
  {
    locationId: "loc-dv-ouest",
    name: "NDG",
    shortCode: "NDG",
    color: "#8b5cf6",
    revenue: 29450,
    revenueGrowth: 18.7,
    bookings: 198,
    bookingsGrowth: 14.3,
    newCustomers: 28,
    returningCustomers: 170,
    occupancyRate: 78,
    staffUtilization: 83,
    avgBookingValue: 148.7,
    cancellationRate: 4.2,
    daycareAttendance: 612,
    groomingVolume: 96,
    boardingNights: 0,
    trainingSessionsCompleted: 0,
    staffCount: 3,
    activeServices: 2,
    topService: "Grooming",
    nps: 88,
  },
  {
    locationId: "loc-dv-laval",
    name: "Laval",
    shortCode: "LVL",
    color: "#22c55e",
    revenue: 34890,
    revenueGrowth: 31.2,
    bookings: 241,
    bookingsGrowth: 24.6,
    newCustomers: 51,
    returningCustomers: 190,
    occupancyRate: 82,
    staffUtilization: 79,
    avgBookingValue: 144.8,
    cancellationRate: 5.8,
    daycareAttendance: 744,
    groomingVolume: 0,
    boardingNights: 358,
    trainingSessionsCompleted: 89,
    staffCount: 4,
    activeServices: 3,
    topService: "Training",
    nps: 85,
  },
];

// ── Extended trend data (12 months) ──────────────────────────────────────
// Used by the HQ Overview line chart and trend reports.
export const revenueTrend12Months: {
  month: string;
  "loc-dv-main": number;
  "loc-dv-ouest": number;
  "loc-dv-laval": number;
}[] = [
  { month: "May 2025",  "loc-dv-main": 36500, "loc-dv-ouest": 18200, "loc-dv-laval": 14200 },
  { month: "Jun 2025",  "loc-dv-main": 39800, "loc-dv-ouest": 19500, "loc-dv-laval": 15800 },
  { month: "Jul 2025",  "loc-dv-main": 44200, "loc-dv-ouest": 21000, "loc-dv-laval": 17600 },
  { month: "Aug 2025",  "loc-dv-main": 46800, "loc-dv-ouest": 22500, "loc-dv-laval": 19400 },
  { month: "Sep 2025",  "loc-dv-main": 41200, "loc-dv-ouest": 19800, "loc-dv-laval": 18900 },
  { month: "Oct 2025",  "loc-dv-main": 39600, "loc-dv-ouest": 20100, "loc-dv-laval": 19500 },
  { month: "Nov 2025",  "loc-dv-main": 40800, "loc-dv-ouest": 21800, "loc-dv-laval": 20800 },
  { month: "Dec 2025",  "loc-dv-main": 47500, "loc-dv-ouest": 24200, "loc-dv-laval": 24600 },
  { month: "Jan 2026",  "loc-dv-main": 38200, "loc-dv-ouest": 21300, "loc-dv-laval": 18900 },
  { month: "Feb 2026",  "loc-dv-main": 41500, "loc-dv-ouest": 23800, "loc-dv-laval": 23100 },
  { month: "Mar 2026",  "loc-dv-main": 44100, "loc-dv-ouest": 26200, "loc-dv-laval": 29400 },
  { month: "Apr 2026",  "loc-dv-main": 48720, "loc-dv-ouest": 29450, "loc-dv-laval": 34890 },
];

// ── Weekly occupancy (last 4 weeks, split by capacity model) ─────────────
export interface WeeklyOccupancyRow {
  week: string;
  daycare: { [locationId: string]: number };
  boarding: { [locationId: string]: number };
}

export const weeklyOccupancy: WeeklyOccupancyRow[] = [
  {
    week: "W14 · Apr 1–7",
    daycare:  { "loc-dv-main": 79, "loc-dv-ouest": 71, "loc-dv-laval": 75 },
    boarding: { "loc-dv-main": 81, "loc-dv-ouest": 0,  "loc-dv-laval": 76 },
  },
  {
    week: "W15 · Apr 8–14",
    daycare:  { "loc-dv-main": 84, "loc-dv-ouest": 76, "loc-dv-laval": 79 },
    boarding: { "loc-dv-main": 86, "loc-dv-ouest": 0,  "loc-dv-laval": 80 },
  },
  {
    week: "W16 · Apr 15–21",
    daycare:  { "loc-dv-main": 88, "loc-dv-ouest": 79, "loc-dv-laval": 82 },
    boarding: { "loc-dv-main": 89, "loc-dv-ouest": 0,  "loc-dv-laval": 84 },
  },
  {
    week: "W17 · Apr 22–28",
    daycare:  { "loc-dv-main": 91, "loc-dv-ouest": 81, "loc-dv-laval": 85 },
    boarding: { "loc-dv-main": 92, "loc-dv-ouest": 0,  "loc-dv-laval": 87 },
  },
];

// ── Service mix (revenue by service type, broken out by location) ────────
export interface ServiceMixRow {
  service: "Boarding" | "Daycare" | "Grooming" | "Training" | "Add-ons" | "Retail";
  total: number;
  byLocation: { [locationId: string]: number };
  color: string;
}

export const serviceMix: ServiceMixRow[] = [
  {
    service: "Boarding",
    total: 38240,
    byLocation: { "loc-dv-main": 21800, "loc-dv-ouest": 0, "loc-dv-laval": 16440 },
    color: "#0ea5e9",
  },
  {
    service: "Daycare",
    total: 32890,
    byLocation: { "loc-dv-main": 14200, "loc-dv-ouest": 12100, "loc-dv-laval": 6590 },
    color: "#8b5cf6",
  },
  {
    service: "Grooming",
    total: 17820,
    byLocation: { "loc-dv-main": 7600, "loc-dv-ouest": 10220, "loc-dv-laval": 0 },
    color: "#22c55e",
  },
  {
    service: "Training",
    total: 13680,
    byLocation: { "loc-dv-main": 3120, "loc-dv-ouest": 0, "loc-dv-laval": 10560 },
    color: "#f59e0b",
  },
  {
    service: "Add-ons",
    total: 6240,
    byLocation: { "loc-dv-main": 1800, "loc-dv-ouest": 1700, "loc-dv-laval": 2740 },
    color: "#ec4899",
  },
  {
    service: "Retail",
    total: 4190,
    byLocation: { "loc-dv-main": 200, "loc-dv-ouest": 5430, "loc-dv-laval": -1440 },
    color: "#64748b",
  },
];

// ── Cross-location client activity ───────────────────────────────────────
export interface CrossLocationClient {
  clientId: number;
  clientName: string;
  petNames: string[];
  locationsVisited: { locationId: string; visits: number; spend: number }[];
  totalVisits: number;
  totalSpend: number;
  loyaltyTier: "bronze" | "silver" | "gold" | "platinum";
  firstVisitedAt: string;
  lastVisitedAt: string;
  primaryLocationId: string;
}

export const crossLocationClients: CrossLocationClient[] = [
  {
    clientId: 12,
    clientName: "Alexandre Côté",
    petNames: ["Milou", "Bibi"],
    locationsVisited: [
      { locationId: "loc-dv-main",  visits: 18, spend: 2840 },
      { locationId: "loc-dv-ouest", visits: 7,  spend: 945 },
    ],
    totalVisits: 25,
    totalSpend: 3785,
    loyaltyTier: "gold",
    firstVisitedAt: "2024-09-12",
    lastVisitedAt: "2026-04-22",
    primaryLocationId: "loc-dv-main",
  },
  {
    clientId: 18,
    clientName: "Émilie Lavoie",
    petNames: ["Mocha"],
    locationsVisited: [
      { locationId: "loc-dv-main",  visits: 12, spend: 2120 },
      { locationId: "loc-dv-laval", visits: 14, spend: 2360 },
    ],
    totalVisits: 26,
    totalSpend: 4480,
    loyaltyTier: "platinum",
    firstVisitedAt: "2024-06-04",
    lastVisitedAt: "2026-04-26",
    primaryLocationId: "loc-dv-laval",
  },
  {
    clientId: 27,
    clientName: "Marc-Antoine Bélanger",
    petNames: ["Loki", "Freya"],
    locationsVisited: [
      { locationId: "loc-dv-ouest", visits: 22, spend: 1980 },
      { locationId: "loc-dv-laval", visits: 5,  spend: 740 },
    ],
    totalVisits: 27,
    totalSpend: 2720,
    loyaltyTier: "silver",
    firstVisitedAt: "2025-02-18",
    lastVisitedAt: "2026-04-19",
    primaryLocationId: "loc-dv-ouest",
  },
  {
    clientId: 33,
    clientName: "Sarah Hamilton",
    petNames: ["Daisy"],
    locationsVisited: [
      { locationId: "loc-dv-main",  visits: 9, spend: 1485 },
      { locationId: "loc-dv-ouest", visits: 4, spend: 380 },
      { locationId: "loc-dv-laval", visits: 3, spend: 525 },
    ],
    totalVisits: 16,
    totalSpend: 2390,
    loyaltyTier: "gold",
    firstVisitedAt: "2025-04-01",
    lastVisitedAt: "2026-04-28",
    primaryLocationId: "loc-dv-main",
  },
  {
    clientId: 41,
    clientName: "Jean-Philippe Tremblay",
    petNames: ["Otto"],
    locationsVisited: [
      { locationId: "loc-dv-main",  visits: 6, spend: 920 },
      { locationId: "loc-dv-laval", visits: 11, spend: 1685 },
    ],
    totalVisits: 17,
    totalSpend: 2605,
    loyaltyTier: "silver",
    firstVisitedAt: "2025-09-22",
    lastVisitedAt: "2026-04-21",
    primaryLocationId: "loc-dv-laval",
  },
];

// ── Staff cross-location performance ─────────────────────────────────────
export interface StaffCrossLocationPerformance {
  staffId: string;
  name: string;
  role: string;
  locations: {
    locationId: string;
    bookings: number;
    avgRating: number;
    completionRate: number;
    revenueGenerated: number;
    hoursWorked: number;
  }[];
}

export const staffCrossLocationPerformance: StaffCrossLocationPerformance[] = [
  {
    staffId: "staff-2",
    name: "Jean-François Roy",
    role: "Senior Groomer",
    locations: [
      {
        locationId: "loc-dv-main",
        bookings: 84,
        avgRating: 4.9,
        completionRate: 98,
        revenueGenerated: 6720,
        hoursWorked: 96,
      },
      {
        locationId: "loc-dv-ouest",
        bookings: 38,
        avgRating: 4.2,
        completionRate: 92,
        revenueGenerated: 2850,
        hoursWorked: 48,
      },
    ],
  },
  {
    staffId: "staff-4",
    name: "Lucas Martin",
    role: "Trainer",
    locations: [
      {
        locationId: "loc-dv-main",
        bookings: 22,
        avgRating: 4.7,
        completionRate: 95,
        revenueGenerated: 3300,
        hoursWorked: 64,
      },
      {
        locationId: "loc-dv-laval",
        bookings: 41,
        avgRating: 4.8,
        completionRate: 96,
        revenueGenerated: 6150,
        hoursWorked: 88,
      },
    ],
  },
];

export const sharedStaffPool = [
  {
    staffId: "staff-1",
    name: "Marie Tremblay",
    role: "Manager",
    avatar: null,
    primaryLocation: "loc-dv-main",
    primaryLocationName: "Plateau",
    assignedLocations: ["loc-dv-main"],
    hoursThisWeek: 40,
    utilizationRate: 95,
    upcomingShifts: [
      { locationId: "loc-dv-main", date: "2026-04-25", start: "08:00", end: "17:00" },
      { locationId: "loc-dv-main", date: "2026-04-26", start: "08:00", end: "17:00" },
    ],
  },
  {
    staffId: "staff-2",
    name: "Jean-François Roy",
    role: "Groomer",
    avatar: null,
    primaryLocation: "loc-dv-main",
    primaryLocationName: "Plateau",
    assignedLocations: ["loc-dv-main", "loc-dv-ouest"],
    hoursThisWeek: 36,
    utilizationRate: 88,
    upcomingShifts: [
      { locationId: "loc-dv-main",  date: "2026-04-25", start: "09:00", end: "17:00" },
      { locationId: "loc-dv-ouest", date: "2026-04-26", start: "10:00", end: "16:00" },
      { locationId: "loc-dv-main",  date: "2026-04-28", start: "09:00", end: "17:00" },
    ],
  },
  {
    staffId: "staff-3",
    name: "Sophie Côté",
    role: "Kennel Tech",
    avatar: null,
    primaryLocation: "loc-dv-main",
    primaryLocationName: "Plateau",
    assignedLocations: ["loc-dv-main"],
    hoursThisWeek: 40,
    utilizationRate: 82,
    upcomingShifts: [
      { locationId: "loc-dv-main", date: "2026-04-25", start: "07:00", end: "15:00" },
    ],
  },
  {
    staffId: "staff-4",
    name: "Lucas Martin",
    role: "Trainer",
    avatar: null,
    primaryLocation: "loc-dv-main",
    primaryLocationName: "Plateau",
    assignedLocations: ["loc-dv-main", "loc-dv-laval"],
    hoursThisWeek: 38,
    utilizationRate: 90,
    upcomingShifts: [
      { locationId: "loc-dv-main",  date: "2026-04-25", start: "10:00", end: "16:00" },
      { locationId: "loc-dv-laval", date: "2026-04-27", start: "09:00", end: "17:00" },
    ],
  },
  {
    staffId: "staff-5",
    name: "Amélie Dubois",
    role: "Front Desk",
    avatar: null,
    primaryLocation: "loc-dv-main",
    primaryLocationName: "Plateau",
    assignedLocations: ["loc-dv-main"],
    hoursThisWeek: 35,
    utilizationRate: 78,
    upcomingShifts: [
      { locationId: "loc-dv-main", date: "2026-04-25", start: "08:00", end: "16:00" },
    ],
  },
  {
    staffId: "staff-6",
    name: "Nathalie Bergeron",
    role: "Manager",
    avatar: null,
    primaryLocation: "loc-dv-ouest",
    primaryLocationName: "NDG",
    assignedLocations: ["loc-dv-ouest"],
    hoursThisWeek: 40,
    utilizationRate: 86,
    upcomingShifts: [
      { locationId: "loc-dv-ouest", date: "2026-04-25", start: "08:00", end: "17:00" },
    ],
  },
  {
    staffId: "staff-7",
    name: "Pierre Lafleur",
    role: "Groomer",
    avatar: null,
    primaryLocation: "loc-dv-ouest",
    primaryLocationName: "NDG",
    assignedLocations: ["loc-dv-ouest"],
    hoursThisWeek: 32,
    utilizationRate: 75,
    upcomingShifts: [
      { locationId: "loc-dv-ouest", date: "2026-04-25", start: "09:00", end: "15:00" },
    ],
  },
  {
    staffId: "staff-8",
    name: "Claudine Morin",
    role: "Manager",
    avatar: null,
    primaryLocation: "loc-dv-laval",
    primaryLocationName: "Laval",
    assignedLocations: ["loc-dv-laval"],
    hoursThisWeek: 40,
    utilizationRate: 84,
    upcomingShifts: [
      { locationId: "loc-dv-laval", date: "2026-04-25", start: "08:00", end: "17:00" },
    ],
  },
  {
    staffId: "staff-9",
    name: "Étienne Gagnon",
    role: "Trainer",
    avatar: null,
    primaryLocation: "loc-dv-laval",
    primaryLocationName: "Laval",
    assignedLocations: ["loc-dv-laval"],
    hoursThisWeek: 38,
    utilizationRate: 80,
    upcomingShifts: [
      { locationId: "loc-dv-laval", date: "2026-04-25", start: "09:00", end: "17:00" },
    ],
  },
  {
    staffId: "staff-10",
    name: "Valérie Fortin",
    role: "Kennel Tech",
    avatar: null,
    primaryLocation: "loc-dv-laval",
    primaryLocationName: "Laval",
    assignedLocations: ["loc-dv-laval"],
    hoursThisWeek: 40,
    utilizationRate: 77,
    upcomingShifts: [
      { locationId: "loc-dv-laval", date: "2026-04-26", start: "07:00", end: "15:00" },
    ],
  },
];
