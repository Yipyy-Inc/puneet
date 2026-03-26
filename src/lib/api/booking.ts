import { bookings } from "@/data/bookings";
import { BOOKING_REQUESTS } from "@/data/booking-requests";
import type { Booking, NewBooking } from "@/types/booking";

export const bookingQueries = {
  all: () => ({
    queryKey: ["bookings"] as const,
    queryFn: async () => bookings,
  }),
  detail: (id: number) => ({
    queryKey: ["bookings", id] as const,
    queryFn: async () => bookings.find((b) => b.id === id),
  }),
  byClient: (clientId: number) => ({
    queryKey: ["bookings", "by-client", clientId] as const,
    queryFn: async () => bookings.filter((b) => b.clientId === clientId),
  }),
  byFacility: (facilityId: number) => ({
    queryKey: ["bookings", "by-facility", facilityId] as const,
    queryFn: async () => bookings.filter((b) => b.facilityId === facilityId),
  }),
  requests: () => ({
    queryKey: ["booking-requests"] as const,
    queryFn: async () => BOOKING_REQUESTS,
  }),
};

export const bookingMutations = {
  create: async (data: NewBooking): Promise<Booking> => {
    const newId = Math.max(...bookings.map((b) => b.id), 0) + 1;
    const booking: Booking = { ...data, id: newId };
    bookings.push(booking);
    return booking;
  },
  update: async (
    id: number,
    data: Partial<NewBooking>,
  ): Promise<Booking | undefined> => {
    const index = bookings.findIndex((b) => b.id === id);
    if (index === -1) return undefined;
    bookings[index] = { ...bookings[index], ...data };
    return bookings[index];
  },
};
