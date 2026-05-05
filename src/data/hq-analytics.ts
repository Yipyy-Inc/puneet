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

// ──────────────────────────────────────────────────────────────────────
// 12-month revenue trend (one row per month, one column per location)
// ──────────────────────────────────────────────────────────────────────

export const revenueTrend12Months: {
  month: string;
  [locationId: string]: number | string;
}[] = [
  { month: "May", "loc-dv-main": 32100, "loc-dv-ouest": 18400, "loc-dv-laval": 14200 },
  { month: "Jun", "loc-dv-main": 33800, "loc-dv-ouest": 19200, "loc-dv-laval": 15800 },
  { month: "Jul", "loc-dv-main": 35600, "loc-dv-ouest": 19800, "loc-dv-laval": 17100 },
  { month: "Aug", "loc-dv-main": 36200, "loc-dv-ouest": 20100, "loc-dv-laval": 18400 },
  { month: "Sep", "loc-dv-main": 37100, "loc-dv-ouest": 20400, "loc-dv-laval": 19200 },
  { month: "Oct", "loc-dv-main": 37800, "loc-dv-ouest": 20800, "loc-dv-laval": 20100 },
  { month: "Nov", "loc-dv-main": 38500, "loc-dv-ouest": 21000, "loc-dv-laval": 21400 },
  { month: "Dec", "loc-dv-main": 39600, "loc-dv-ouest": 21600, "loc-dv-laval": 22800 },
  { month: "Jan", "loc-dv-main": 38200, "loc-dv-ouest": 21300, "loc-dv-laval": 18900 },
  { month: "Feb", "loc-dv-main": 41500, "loc-dv-ouest": 23800, "loc-dv-laval": 23100 },
  { month: "Mar", "loc-dv-main": 44100, "loc-dv-ouest": 26200, "loc-dv-laval": 29400 },
  { month: "Apr", "loc-dv-main": 48720, "loc-dv-ouest": 29450, "loc-dv-laval": 34890 },
];

// ──────────────────────────────────────────────────────────────────────
// Weekly occupancy: per-location daycare/boarding utilization (4 weeks)
// ──────────────────────────────────────────────────────────────────────

export interface WeeklyOccupancyRow {
  week: string;
  daycare: Record<string, number>;
  boarding: Record<string, number>;
}

export const weeklyOccupancy: WeeklyOccupancyRow[] = [
  {
    week: "W1",
    daycare: { "loc-dv-main": 78, "loc-dv-ouest": 64, "loc-dv-laval": 71 },
    boarding: { "loc-dv-main": 72, "loc-dv-laval": 65 },
  },
  {
    week: "W2",
    daycare: { "loc-dv-main": 82, "loc-dv-ouest": 69, "loc-dv-laval": 76 },
    boarding: { "loc-dv-main": 76, "loc-dv-laval": 71 },
  },
  {
    week: "W3",
    daycare: { "loc-dv-main": 86, "loc-dv-ouest": 73, "loc-dv-laval": 80 },
    boarding: { "loc-dv-main": 81, "loc-dv-laval": 78 },
  },
  {
    week: "W4",
    daycare: { "loc-dv-main": 89, "loc-dv-ouest": 78, "loc-dv-laval": 84 },
    boarding: { "loc-dv-main": 87, "loc-dv-laval": 82 },
  },
];

// ──────────────────────────────────────────────────────────────────────
// Service mix: revenue per service line, broken down by location
// ──────────────────────────────────────────────────────────────────────

export interface ServiceMixRow {
  service: string;
  color: string;
  total: number;
  byLocation: Record<string, number>;
}

export const serviceMix: ServiceMixRow[] = [
  {
    service: "Boarding",
    color: "#6366f1",
    total: 42600,
    byLocation: { "loc-dv-main": 26400, "loc-dv-laval": 16200 },
  },
  {
    service: "Daycare",
    color: "#0ea5e9",
    total: 31200,
    byLocation: {
      "loc-dv-main": 14600,
      "loc-dv-ouest": 8400,
      "loc-dv-laval": 8200,
    },
  },
  {
    service: "Grooming",
    color: "#a855f7",
    total: 22400,
    byLocation: {
      "loc-dv-main": 7720,
      "loc-dv-ouest": 12650,
      "loc-dv-laval": 2030,
    },
  },
  {
    service: "Training",
    color: "#22c55e",
    total: 16860,
    byLocation: { "loc-dv-main": 0, "loc-dv-laval": 8460, "loc-dv-ouest": 8400 },
  },
];

// ──────────────────────────────────────────────────────────────────────
// Cross-location client activity report
// ──────────────────────────────────────────────────────────────────────

export interface CrossLocationClient {
  clientId: string;
  clientName: string;
  petNames: string[];
  locationsVisited: {
    locationId: string;
    visits: number;
    spend: number;
  }[];
  primaryLocationId: string;
  totalSpend: number;
  loyaltyTier: "bronze" | "silver" | "gold" | "platinum";
  firstVisitedAt: string;
}

export const crossLocationClients: CrossLocationClient[] = [
  {
    clientId: "cli-3001",
    clientName: "Émilie Tremblay",
    petNames: ["Biscuit", "Mocha"],
    locationsVisited: [
      { locationId: "loc-dv-main", visits: 24, spend: 3120 },
      { locationId: "loc-dv-ouest", visits: 6, spend: 540 },
      { locationId: "loc-dv-laval", visits: 4, spend: 720 },
    ],
    primaryLocationId: "loc-dv-main",
    totalSpend: 4380,
    loyaltyTier: "platinum",
    firstVisitedAt: "2024-02-14",
  },
  {
    clientId: "cli-3002",
    clientName: "David Cohen",
    petNames: ["Rex"],
    locationsVisited: [
      { locationId: "loc-dv-main", visits: 18, spend: 2240 },
      { locationId: "loc-dv-laval", visits: 9, spend: 1480 },
    ],
    primaryLocationId: "loc-dv-main",
    totalSpend: 3720,
    loyaltyTier: "platinum",
    firstVisitedAt: "2024-05-22",
  },
  {
    clientId: "cli-3003",
    clientName: "Sophie Lavoie",
    petNames: ["Luna", "Coco"],
    locationsVisited: [
      { locationId: "loc-dv-ouest", visits: 14, spend: 1680 },
      { locationId: "loc-dv-main", visits: 5, spend: 620 },
    ],
    primaryLocationId: "loc-dv-ouest",
    totalSpend: 2300,
    loyaltyTier: "gold",
    firstVisitedAt: "2024-08-03",
  },
  {
    clientId: "cli-3004",
    clientName: "Marc Bélanger",
    petNames: ["Tucker"],
    locationsVisited: [
      { locationId: "loc-dv-laval", visits: 16, spend: 2080 },
      { locationId: "loc-dv-main", visits: 3, spend: 420 },
      { locationId: "loc-dv-ouest", visits: 2, spend: 180 },
    ],
    primaryLocationId: "loc-dv-laval",
    totalSpend: 2680,
    loyaltyTier: "gold",
    firstVisitedAt: "2024-11-10",
  },
  {
    clientId: "cli-3005",
    clientName: "Isabelle Dubé",
    petNames: ["Pixel"],
    locationsVisited: [
      { locationId: "loc-dv-main", visits: 11, spend: 1340 },
      { locationId: "loc-dv-ouest", visits: 4, spend: 360 },
    ],
    primaryLocationId: "loc-dv-main",
    totalSpend: 1700,
    loyaltyTier: "gold",
    firstVisitedAt: "2025-01-18",
  },
  {
    clientId: "cli-3006",
    clientName: "Olivier Roy",
    petNames: ["Bear", "Oslo"],
    locationsVisited: [
      { locationId: "loc-dv-ouest", visits: 9, spend: 1140 },
      { locationId: "loc-dv-laval", visits: 3, spend: 480 },
    ],
    primaryLocationId: "loc-dv-ouest",
    totalSpend: 1620,
    loyaltyTier: "silver",
    firstVisitedAt: "2025-02-04",
  },
  {
    clientId: "cli-3007",
    clientName: "Julie Pelletier",
    petNames: ["Maple"],
    locationsVisited: [
      { locationId: "loc-dv-main", visits: 8, spend: 980 },
      { locationId: "loc-dv-laval", visits: 5, spend: 740 },
    ],
    primaryLocationId: "loc-dv-main",
    totalSpend: 1720,
    loyaltyTier: "silver",
    firstVisitedAt: "2025-03-21",
  },
  {
    clientId: "cli-3008",
    clientName: "Pierre Gauthier",
    petNames: ["Scout", "Daisy", "Mango"],
    locationsVisited: [
      { locationId: "loc-dv-laval", visits: 12, spend: 1860 },
      { locationId: "loc-dv-main", visits: 4, spend: 580 },
      { locationId: "loc-dv-ouest", visits: 1, spend: 95 },
    ],
    primaryLocationId: "loc-dv-laval",
    totalSpend: 2535,
    loyaltyTier: "gold",
    firstVisitedAt: "2024-09-30",
  },
  {
    clientId: "cli-3009",
    clientName: "Catherine Morin",
    petNames: ["Nala"],
    locationsVisited: [
      { locationId: "loc-dv-main", visits: 6, spend: 720 },
      { locationId: "loc-dv-ouest", visits: 3, spend: 280 },
    ],
    primaryLocationId: "loc-dv-main",
    totalSpend: 1000,
    loyaltyTier: "silver",
    firstVisitedAt: "2025-06-14",
  },
  {
    clientId: "cli-3010",
    clientName: "Antoine Lévesque",
    petNames: ["Otto"],
    locationsVisited: [
      { locationId: "loc-dv-ouest", visits: 5, spend: 440 },
      { locationId: "loc-dv-laval", visits: 2, spend: 220 },
    ],
    primaryLocationId: "loc-dv-ouest",
    totalSpend: 660,
    loyaltyTier: "bronze",
    firstVisitedAt: "2025-09-02",
  },
  {
    clientId: "cli-3011",
    clientName: "Mélanie Côté",
    petNames: ["Pepper"],
    locationsVisited: [
      { locationId: "loc-dv-main", visits: 4, spend: 380 },
      { locationId: "loc-dv-laval", visits: 2, spend: 240 },
    ],
    primaryLocationId: "loc-dv-main",
    totalSpend: 620,
    loyaltyTier: "bronze",
    firstVisitedAt: "2025-10-19",
  },
  {
    clientId: "cli-3012",
    clientName: "Nicolas Beaulieu",
    petNames: ["Hugo", "Frida"],
    locationsVisited: [
      { locationId: "loc-dv-laval", visits: 7, spend: 920 },
      { locationId: "loc-dv-main", visits: 4, spend: 510 },
    ],
    primaryLocationId: "loc-dv-laval",
    totalSpend: 1430,
    loyaltyTier: "silver",
    firstVisitedAt: "2025-04-08",
  },
];

// ──────────────────────────────────────────────────────────────────────
// Staff cross-location performance report
// ──────────────────────────────────────────────────────────────────────

export interface StaffCrossLocationPerformance {
  staffId: string;
  name: string;
  role: string;
  locations: {
    locationId: string;
    avgRating: number;
    bookings: number;
    completionRate: number;
    revenueGenerated: number;
    hoursWorked: number;
  }[];
}

export const staffCrossLocationPerformance: StaffCrossLocationPerformance[] = [
  {
    staffId: "staff-2",
    name: "Jean-François Roy",
    role: "Groomer",
    locations: [
      {
        locationId: "loc-dv-main",
        avgRating: 4.8,
        bookings: 96,
        completionRate: 98,
        revenueGenerated: 11820,
        hoursWorked: 142,
      },
      {
        locationId: "loc-dv-ouest",
        avgRating: 4.2,
        bookings: 38,
        completionRate: 94,
        revenueGenerated: 4180,
        hoursWorked: 64,
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
        avgRating: 4.6,
        bookings: 42,
        completionRate: 96,
        revenueGenerated: 8400,
        hoursWorked: 118,
      },
      {
        locationId: "loc-dv-laval",
        avgRating: 4.7,
        bookings: 51,
        completionRate: 97,
        revenueGenerated: 10620,
        hoursWorked: 132,
      },
    ],
  },
  {
    staffId: "staff-11",
    name: "Camille Bouchard",
    role: "Manager",
    locations: [
      {
        locationId: "loc-dv-main",
        avgRating: 4.9,
        bookings: 0,
        completionRate: 100,
        revenueGenerated: 0,
        hoursWorked: 64,
      },
      {
        locationId: "loc-dv-ouest",
        avgRating: 4.7,
        bookings: 0,
        completionRate: 100,
        revenueGenerated: 0,
        hoursWorked: 48,
      },
      {
        locationId: "loc-dv-laval",
        avgRating: 4.8,
        bookings: 0,
        completionRate: 100,
        revenueGenerated: 0,
        hoursWorked: 52,
      },
    ],
  },
  {
    staffId: "staff-12",
    name: "Antoine Lemieux",
    role: "Kennel Tech",
    locations: [
      {
        locationId: "loc-dv-main",
        avgRating: 4.5,
        bookings: 184,
        completionRate: 99,
        revenueGenerated: 0,
        hoursWorked: 156,
      },
      {
        locationId: "loc-dv-laval",
        avgRating: 4.4,
        bookings: 124,
        completionRate: 98,
        revenueGenerated: 0,
        hoursWorked: 102,
      },
    ],
  },
  {
    staffId: "staff-13",
    name: "Sarah Allard",
    role: "Groomer",
    locations: [
      {
        locationId: "loc-dv-ouest",
        avgRating: 4.9,
        bookings: 78,
        completionRate: 99,
        revenueGenerated: 9620,
        hoursWorked: 124,
      },
      {
        locationId: "loc-dv-laval",
        avgRating: 4.6,
        bookings: 32,
        completionRate: 95,
        revenueGenerated: 3940,
        hoursWorked: 58,
      },
    ],
  },
];
