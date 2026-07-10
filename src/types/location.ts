export type HQRole =
  | "hq_admin"
  | "location_admin"
  | "location_manager"
  | "location_staff";

export interface LocationHours {
  open: string;
  close: string;
  closed?: boolean;
}

export interface LocationWeeklyHours {
  monday: LocationHours;
  tuesday: LocationHours;
  wednesday: LocationHours;
  thursday: LocationHours;
  friday: LocationHours;
  saturday: LocationHours;
  sunday: LocationHours;
}

export interface LocationTax {
  id: string;
  name: string;
  rate: number;
  enabled: boolean;
}

export interface LocationPricing {
  serviceId: string;
  serviceName: string;
  basePrice: number;
  currency: string;
}

export interface LocationStaffAssignment {
  staffId: string;
  staffName: string;
  role: string;
  isPrimary: boolean;
  scheduleConflictDetection: boolean;
}

export interface Location {
  id: string;
  facilityId: number;
  name: string;
  shortCode: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  isActive: boolean;
  /** Lifecycle status. Falls back to isActive (active/inactive) when unset;
   *  "coming_soon" marks a branch that is announced but not yet operating. */
  status?: "active" | "inactive" | "coming_soon";
  isPrimary: boolean;
  services: string[];
  capacity: {
    daycare?: number;
    boarding?: number;
    grooming?: number;
    training?: number;
  };
  hours: LocationWeeklyHours;
  holidays: string[];
  taxes: LocationTax[];
  pricingOverride: boolean;
  pricing: LocationPricing[];
  staffAssignments: LocationStaffAssignment[];
  timezone: string;
  color: string;
  imageUrl?: string;
  createdAt: string;
  metrics?: LocationMetrics;
}

export interface LocationMetrics {
  locationId: string;
  period: string;
  revenue: number;
  revenueGrowth: number;
  bookings: number;
  bookingsGrowth: number;
  newCustomers: number;
  returningCustomers: number;
  occupancyRate: number;
  staffUtilization: number;
  avgBookingValue: number;
  cancellationRate: number;
  daycareAttendance: number;
  groomingVolume: number;
  boardingNights: number;
  trainingSessionsCompleted: number;
  // ── Extended comparison metrics (Table 27) — optional so existing mock
  //    LocationMetrics remain valid; populated in hq-analytics comparison data.
  /** Net Promoter Score (0–100). */
  nps?: number;
  /** New bookings in period. */
  newBookings?: number;
  /** No-show rate (%). */
  noShowRate?: number;
  /** Average booking lead time in days. */
  avgLeadTimeDays?: number;
  /** Boarding occupancy (%). */
  boardingOccupancy?: number;
  /** Daycare occupancy (%). */
  daycareOccupancy?: number;
  /** Client retention rate (%). */
  retentionRate?: number;
  /** Published review count. */
  reviewCount?: number;
  /** Average client rating (0–5). */
  avgClientRating?: number;
  /** Open/outstanding invoice count. */
  outstandingInvoices?: number;
  /** Revenue per available kennel-night ($). */
  revPAK?: number;
  /** Services delivered per staff-hour. */
  servicesPerStaffHour?: number;
}

export interface HQOverviewMetrics {
  facilityId: number;
  period: string;
  totalRevenue: number;
  revenueByLocation: {
    locationId: string;
    locationName: string;
    revenue: number;
    percentage: number;
  }[];
  totalBookings: number;
  bookingsByLocation: {
    locationId: string;
    locationName: string;
    count: number;
  }[];
  totalNewCustomers: number;
  totalReturningCustomers: number;
  avgOccupancyRate: number;
  topPerformingLocation: string;
  revenueGrowth: number;
  revenueTrend: { date: string; [locationId: string]: number | string }[];
  occupancyTrend: { date: string; [locationId: string]: number | string }[];
}

export interface BookingTransfer {
  id: string;
  bookingId: number;
  fromLocationId: string;
  toLocationId: string;
  initiatedBy: string;
  initiatedAt: string;
  status: "pending_approval" | "approved" | "completed" | "rejected";
  pricingPolicy: "keep_original" | "apply_destination";
  priceDelta: number;
  requiresCustomerApproval: boolean;
  customerApprovedAt?: string;
  completedAt?: string;
  reason?: string;
  customerNotified: boolean;
  notes?: string;
}

export interface TransferAvailabilityCheck {
  serviceAvailable: boolean;
  capacityAvailable: boolean;
  staffAvailable: boolean;
  priceDelta: number;
  destinationPrice: number;
  originalPrice: number;
  warnings: string[];
  blockers: string[];
}

export interface HQSettings {
  facilityId: number;
  sharedStaffPool: boolean;
  centralizedCustomerData: boolean;
  pricingModel: "centralized" | "per_location";
  agreementsScope: "global" | "per_location";
  tagsScope: "global" | "per_location";
  paymentMethodsScope: "global" | "per_location";
  internalNotesScope: "global" | "per_location";
  transferRequiresCustomerApproval: boolean;
  transferPricingPolicy: "keep_original" | "apply_destination" | "staff_choice";
  sharedEmailTemplates: boolean;
  sharedAutomations: boolean;
  sharedServices: string[];
  locations: string[];

  // ── Cross-location features (toggle-gated) ─────────────────────────────
  /** Loyalty points earnable + redeemable across all locations */
  crossLocationLoyalty: boolean;
  /** Gift cards usable at any location regardless of where purchased */
  crossLocationGiftCards: boolean;
  /** Sign waivers once — valid across all locations until version updated */
  sharedWaivers: boolean;
  /** Shared incident history visible at every location (safety-critical) */
  sharedIncidentHistory: boolean;
  /** Shared vaccination + medical records across all locations */
  sharedMedicalRecords: boolean;
  /** Primary location ID — drives default cascades */
  primaryLocationId: string;
  /** User IDs (other than owner) that can access HQ-level views */
  delegatedHqAccess: string[];

  // ── Network branding ────────────────────────────────────────────────────
  /** Business-name policy: one network name, each location's own name, or
   *  both (network name with the location as a suffix). */
  brandingNameScope: "network" | "per_location" | "both";
  /** Logo policy: one shared logo across all locations, or per-location logos. */
  brandingLogoScope: "global" | "per_location";
  /** Primary brand colour policy: one global colour, or per-location. */
  brandingColorScope: "global" | "per_location";
}
