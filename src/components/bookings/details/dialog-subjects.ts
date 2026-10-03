import type { BoardingGuest } from "@/data/boarding";
import type { UnifiedBooking } from "@/hooks/use-unified-bookings";
import type { AppLocale } from "@/lib/language-settings";
import { careGuestFromBooking } from "@/lib/daily-care/care-guest";
import { getPetSize } from "@/lib/pet-size";
import type { Booking } from "@/types/booking";
import type { Client } from "@/types/client";
import type { Pet } from "@/types/pet";

import { allergiesOf } from "@/lib/bookings/details/service-view";

// ============================================================================
// The two shapes older dialogs want instead of a booking — moved out of the
// page unchanged (2026-10-03).
//
//   earlyCheckoutSubject   what CheckOutDialog reads for an early checkout
//   kennelCardGuest        what the kennel card prints: the booking's OWN
//                          feeding and medications, through the conversion
//                          the Daily Care board reads (careGuestFromBooking)
// ============================================================================

export function nightsBetween(start: string, end: string) {
  const ms =
    new Date(end + "T00:00:00").getTime() -
    new Date(start + "T00:00:00").getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function earlyCheckoutSubject(
  booking: Booking,
  pet: Pet,
  client: Client,
): UnifiedBooking {
  const svc = booking.service.toLowerCase();
  return {
    id: `booking-${booking.id}`,
    rawId: String(booking.id),
    source: svc as UnifiedBooking["source"],
    serviceKey: svc,
    serviceLabel: booking.service,
    serviceColor: "#6366f1",
    serviceIcon: "bed",
    petId: pet.id,
    petName: pet.name,
    petBreed: pet.breed ?? "",
    ownerId: client.id,
    ownerName: client.name ?? "",
    ownerPhone: client.phone ?? "",
    status: "checked-in",
    scheduledStart: booking.startDate + "T12:00:00.000Z",
    actualStart: null,
    scheduledEnd: booking.endDate + "T12:00:00.000Z",
    actualEnd: null,
    isGoingHomeToday: false,
    price: booking.totalCost,
    totalNights: nightsBetween(booking.startDate, booking.endDate),
  };
}

export function kennelCardGuest(
  booking: Booking,
  pet: Pet,
  client: Client,
  kennelName: string | null,
  words: { t: (key: string) => string; locale: AppLocale },
  fallbacks: { unassigned: string; standardPackage: string },
): BoardingGuest {
  const refId = `bk-${String(booking.id).padStart(3, "0")}`;
  const nights = nightsBetween(booking.startDate, booking.endDate);
  const care = careGuestFromBooking(
    {
      id: refId,
      petId: pet.id,
      petNames: [pet.name],
      ownerName: client.name ?? "",
      ownerPhone: client.phone,
      roomName: kennelName ?? booking.kennel ?? null,
      scheduledArrival: booking.startDate,
      scheduledDeparture: booking.endDate,
      nights,
    },
    {
      feedingSchedule: booking.feedingSchedule,
      medications: booking.medications,
      specialRequests: booking.specialRequests,
    },
    words,
  );
  return {
    id: `synthetic-${booking.id}`,
    petId: pet.id,
    bookingId: refId,
    petName: pet.name,
    petBreed: pet.breed,
    petSize: getPetSize(pet),
    petWeight: pet.weight,
    petColor: pet.color,
    petPhotoUrl: pet.imageUrl,
    petAge: pet.age,
    ownerId: client.id ?? 0,
    ownerName: client.name ?? "",
    ownerPhone: client.phone ?? "",
    emergencyVetContact: "",
    checkInDate: booking.startDate,
    checkOutDate: booking.endDate,
    kennelId: kennelName ?? booking.kennel ?? "",
    kennelName: kennelName ?? booking.kennel ?? fallbacks.unassigned,
    status: "checked-in",
    packageType: booking.serviceType ?? fallbacks.standardPackage,
    totalNights: nights,
    nightlyRate: booking.basePrice,
    discountApplied: 0,
    peakSurcharge: 0,
    totalPrice: booking.totalCost,
    allergies: [...new Set([...allergiesOf(pet.allergies), ...care.allergies])],
    feedingInstructions: care.feedingInstructions,
    foodBrand: care.foodBrand,
    feedingTimes: care.feedingTimes,
    feedingAmount: care.feedingAmount,
    feedingMeals: care.feedingMeals?.map(({ time, what }) => ({ time, what })),
    medications: care.medications,
    tags: [],
    notes: booking.specialRequests ?? "",
    createdAt: booking.startDate,
  } as BoardingGuest;
}
