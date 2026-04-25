import type {
  Location,
  HQSettings,
  LocationWeeklyHours,
} from "@/types/location";

const standardHours: LocationWeeklyHours = {
  monday:    { open: "07:00", close: "19:00" },
  tuesday:   { open: "07:00", close: "19:00" },
  wednesday: { open: "07:00", close: "19:00" },
  thursday:  { open: "07:00", close: "19:00" },
  friday:    { open: "07:00", close: "18:00" },
  saturday:  { open: "08:00", close: "17:00" },
  sunday:    { open: "09:00", close: "15:00", closed: false },
};

const weekdayOnlyHours: LocationWeeklyHours = {
  monday:    { open: "08:00", close: "18:00" },
  tuesday:   { open: "08:00", close: "18:00" },
  wednesday: { open: "08:00", close: "18:00" },
  thursday:  { open: "08:00", close: "18:00" },
  friday:    { open: "08:00", close: "17:00" },
  saturday:  { open: "09:00", close: "15:00" },
  sunday:    { open: "10:00", close: "14:00", closed: true },
};

export const locations: Location[] = [
  // ── Doggieville MTL — 3 locations ─────────────────────────────────────────
  {
    id: "loc-dv-main",
    facilityId: 11,
    name: "Doggieville – Plateau",
    shortCode: "PLT",
    address: "4215 Boul Saint-Laurent",
    city: "Montréal",
    province: "QC",
    postalCode: "H2W 1Z4",
    country: "CA",
    phone: "(514) 555-0101",
    email: "plateau@doggieville.ca",
    isActive: true,
    isPrimary: true,
    services: ["daycare", "boarding", "grooming", "training"],
    capacity: { daycare: 40, boarding: 25, grooming: 6, training: 3 },
    hours: standardHours,
    holidays: ["2026-01-01", "2026-07-01", "2026-12-25", "2026-12-26"],
    taxes: [
      { id: "gst", name: "GST", rate: 0.05, enabled: true },
      { id: "qst", name: "QST", rate: 0.09975, enabled: true },
    ],
    pricingOverride: false,
    pricing: [],
    staffAssignments: [
      { staffId: "staff-1", staffName: "Marie Tremblay", role: "manager", isPrimary: true, scheduleConflictDetection: true },
      { staffId: "staff-2", staffName: "Jean-François Roy", role: "groomer", isPrimary: true, scheduleConflictDetection: true },
      { staffId: "staff-3", staffName: "Sophie Côté", role: "kennel_tech", isPrimary: true, scheduleConflictDetection: false },
      { staffId: "staff-4", staffName: "Lucas Martin", role: "trainer", isPrimary: true, scheduleConflictDetection: false },
      { staffId: "staff-5", staffName: "Amélie Dubois", role: "front_desk", isPrimary: true, scheduleConflictDetection: false },
    ],
    timezone: "America/Toronto",
    color: "#0ea5e9",
    createdAt: "2024-03-01",
    metrics: {
      locationId: "loc-dv-main",
      period: "2026-04",
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
    },
  },
  {
    id: "loc-dv-ouest",
    facilityId: 11,
    name: "Doggieville – NDG",
    shortCode: "NDG",
    address: "5700 Ave Monkland",
    city: "Montréal",
    province: "QC",
    postalCode: "H4A 1E5",
    country: "CA",
    phone: "(514) 555-0202",
    email: "ndg@doggieville.ca",
    isActive: true,
    isPrimary: false,
    services: ["daycare", "grooming"],
    capacity: { daycare: 28, grooming: 4 },
    hours: standardHours,
    holidays: ["2026-01-01", "2026-07-01", "2026-12-25"],
    taxes: [
      { id: "gst", name: "GST", rate: 0.05, enabled: true },
      { id: "qst", name: "QST", rate: 0.09975, enabled: true },
    ],
    pricingOverride: true,
    pricing: [
      { serviceId: "daycare-full", serviceName: "Full Day Daycare", basePrice: 42, currency: "CAD" },
      { serviceId: "daycare-half", serviceName: "Half Day Daycare", basePrice: 26, currency: "CAD" },
      { serviceId: "grooming-bath", serviceName: "Bath & Brush", basePrice: 55, currency: "CAD" },
    ],
    staffAssignments: [
      { staffId: "staff-6", staffName: "Nathalie Bergeron", role: "manager", isPrimary: true, scheduleConflictDetection: true },
      { staffId: "staff-7", staffName: "Pierre Lafleur", role: "groomer", isPrimary: true, scheduleConflictDetection: true },
      { staffId: "staff-2", staffName: "Jean-François Roy", role: "groomer", isPrimary: false, scheduleConflictDetection: true },
    ],
    timezone: "America/Toronto",
    color: "#8b5cf6",
    createdAt: "2024-08-15",
    metrics: {
      locationId: "loc-dv-ouest",
      period: "2026-04",
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
    },
  },
  {
    id: "loc-dv-laval",
    facilityId: 11,
    name: "Doggieville – Laval",
    shortCode: "LVL",
    address: "3030 Boul Le Carrefour",
    city: "Laval",
    province: "QC",
    postalCode: "H7T 2J6",
    country: "CA",
    phone: "(450) 555-0303",
    email: "laval@doggieville.ca",
    isActive: true,
    isPrimary: false,
    services: ["daycare", "boarding", "training"],
    capacity: { daycare: 35, boarding: 30, training: 4 },
    hours: weekdayOnlyHours,
    holidays: ["2026-01-01", "2026-07-01", "2026-12-25", "2026-12-26"],
    taxes: [
      { id: "gst", name: "GST", rate: 0.05, enabled: true },
      { id: "qst", name: "QST", rate: 0.09975, enabled: true },
    ],
    pricingOverride: false,
    pricing: [],
    staffAssignments: [
      { staffId: "staff-8", staffName: "Claudine Morin", role: "manager", isPrimary: true, scheduleConflictDetection: true },
      { staffId: "staff-9", staffName: "Étienne Gagnon", role: "trainer", isPrimary: true, scheduleConflictDetection: true },
      { staffId: "staff-10", staffName: "Valérie Fortin", role: "kennel_tech", isPrimary: true, scheduleConflictDetection: false },
      { staffId: "staff-4", staffName: "Lucas Martin", role: "trainer", isPrimary: false, scheduleConflictDetection: true },
    ],
    timezone: "America/Toronto",
    color: "#22c55e",
    createdAt: "2025-01-10",
    metrics: {
      locationId: "loc-dv-laval",
      period: "2026-04",
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
    },
  },
];

export const hqSettings: HQSettings = {
  facilityId: 11,
  sharedStaffPool: true,
  centralizedCustomerData: true,
  pricingModel: "per_location",
  agreementsScope: "global",
  tagsScope: "global",
  paymentMethodsScope: "global",
  internalNotesScope: "per_location",
  transferRequiresCustomerApproval: false,
  transferPricingPolicy: "staff_choice",
  sharedEmailTemplates: true,
  sharedAutomations: false,
  sharedServices: ["daycare", "boarding", "grooming", "training"],
  locations: ["loc-dv-main", "loc-dv-ouest", "loc-dv-laval"],
};

export function getLocationById(id: string): Location | undefined {
  return locations.find((l) => l.id === id);
}

export function getLocationsByFacility(facilityId: number): Location[] {
  return locations.filter((l) => l.facilityId === facilityId);
}

export function getPrimaryLocation(facilityId: number): Location | undefined {
  return locations.find((l) => l.facilityId === facilityId && l.isPrimary);
}

export function getSharedStaff(facilityId: number): string[] {
  const locs = getLocationsByFacility(facilityId);
  const staffCounts: Record<string, number> = {};
  locs.forEach((loc) => {
    loc.staffAssignments.forEach((s) => {
      staffCounts[s.staffId] = (staffCounts[s.staffId] ?? 0) + 1;
    });
  });
  return Object.entries(staffCounts)
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
}

const FACILITY_LOCATION_IDS = [
  "loc-dv-main",
  "loc-dv-ouest",
  "loc-dv-laval",
] as const;

/**
 * Deterministically maps any entity ID to one of the 3 Doggieville locations.
 * For strings, extracts the trailing numeric suffix ("bg-003" → 3).
 * For numbers, uses the number directly.
 * Result is stable: same ID always maps to the same location.
 */
export function deriveLocationId(id: string | number): string {
  const n =
    typeof id === "number"
      ? id
      : parseInt(String(id).replace(/.*?(\d+)$/, "$1") || "0", 10);
  return FACILITY_LOCATION_IDS[((n % 3) + 3) % 3];
}
