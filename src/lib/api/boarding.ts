// `boardingCapacity` and `BOARDING_ROOMS` are gone from these imports: the
// kennels and their occupancy come from /api/boarding/rooms.
import {
  boardingGuests,
  boardingRates,
  multiNightDiscounts,
  peakSurcharges,
  dailyCareSheets,
  facilityDailyCareConfig,
} from "@/data/boarding";
import {
  BOARDING_ROOM_TYPES,
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
  // `capacity` and `rooms` used to sit here, serving `boardingCapacity` and
  // `BOARDING_ROOMS` from the fixture. Both are gone rather than repointed --
  // the kennels come from `useBoardingRooms` (src/lib/api/boarding-rooms.ts),
  // and neither factory had a caller left: the screens imported the fixtures
  // directly, which is how the two disagreed for so long.
  //
  // `boardingCapacity.total` was 30 across standard/premium/luxury while
  // BOARDING_ROOMS listed 6 across standard/deluxe/vip/cat-suite. The boarding
  // page rendered "X of 30 kennels occupied" beside an assignment board
  // offering six. Occupancy is counted from the rooms table now, which is the
  // only version that cannot drift from what you can actually assign.
  roomTypes: () => ({
    queryKey: ["boarding", "room-types"] as const,
    queryFn: async () => BOARDING_ROOM_TYPES,
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
