import {
  boardingGuests,
  boardingRates,
  multiNightDiscounts,
  peakSurcharges,
  dailyCareSheets,
  boardingCapacity,
  facilityDailyCareConfig,
} from "@/data/boarding";
import {
  BOARDING_ROOM_TYPES,
  BOARDING_ROOMS,
  BOARDING_BOOKING_REQUESTS,
} from "@/data/boarding-ops";

export const boardingQueries = {
  guests: () => ({
    queryKey: ["boarding", "guests"] as const,
    queryFn: async () => boardingGuests,
  }),
  guestDetail: (id: string) => ({
    queryKey: ["boarding", "guests", id] as const,
    queryFn: async () => boardingGuests.find((g) => g.id === id),
  }),
  currentGuests: () => ({
    queryKey: ["boarding", "guests", "current"] as const,
    queryFn: async () =>
      boardingGuests.filter((g) => g.status === "checked-in"),
  }),
  rates: () => ({
    queryKey: ["boarding", "rates"] as const,
    queryFn: async () => boardingRates,
  }),
  discounts: () => ({
    queryKey: ["boarding", "discounts"] as const,
    queryFn: async () => multiNightDiscounts,
  }),
  surcharges: () => ({
    queryKey: ["boarding", "surcharges"] as const,
    queryFn: async () => peakSurcharges,
  }),
  careSheets: () => ({
    queryKey: ["boarding", "care-sheets"] as const,
    queryFn: async () => dailyCareSheets,
  }),
  careSheetsByGuest: (guestId: string) => ({
    queryKey: ["boarding", "care-sheets", guestId] as const,
    queryFn: async () => dailyCareSheets.filter((s) => s.guestId === guestId),
  }),
  capacity: () => ({
    queryKey: ["boarding", "capacity"] as const,
    queryFn: async () => boardingCapacity,
  }),
  roomTypes: () => ({
    queryKey: ["boarding", "room-types"] as const,
    queryFn: async () => BOARDING_ROOM_TYPES,
  }),
  rooms: () => ({
    queryKey: ["boarding", "rooms"] as const,
    queryFn: async () => BOARDING_ROOMS,
  }),
  bookingRequests: () => ({
    queryKey: ["boarding", "booking-requests"] as const,
    queryFn: async () => BOARDING_BOOKING_REQUESTS,
  }),
  dailyCareConfig: () => ({
    queryKey: ["boarding", "daily-care-config"] as const,
    queryFn: async () => facilityDailyCareConfig,
  }),
};
