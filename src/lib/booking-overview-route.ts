// ============================================================================
// A booking overview link, resolved by SEARCHING THE FIXTURE.
//
// ── DO NOT POINT A REAL SCREEN AT THIS ────────────────────────────────────
//
// It scans `src/data/bookings` for a row with the same pet and returns a link
// to the newest match. For a booking that lives in Postgres there is no match,
// so it returns null — and its callers then fall through to whatever they do
// when they cannot find a booking.
//
// That is what the facility home board did until 2026-09-20: tapping a guest
// on the live activity board opened the OWNER'S WHOLE BOOKING HISTORY instead
// of the booking that was tapped, because every guest on that board is real.
// The worse case is a pet that DOES have a fixture entry, where it returns a
// link to an invented booking that reads as a record.
//
// A screen reading Postgres already knows its booking's ref and its client's
// ref, which is the whole link — see `handleOpen` in
// components/facility/dashboard/booking-card.tsx. No lookup is needed and none
// should be added.
//
// The one remaining caller is TrainingSection.tsx, which reads
// `src/data/training` and `src/data/clients` throughout. Fixture to fixture is
// self-consistent; this function goes when that screen is converted.
// ============================================================================
import { bookings } from "@/data/bookings";

type BookingLookupInput = {
  petId: number;
  clientId?: number;
  service?: string;
};

const normalize = (value?: string | null): string =>
  value?.trim().toLowerCase() ?? "";

const hasPet = (bookingPetId: number | number[] | undefined, petId: number) =>
  Array.isArray(bookingPetId)
    ? bookingPetId.includes(petId)
    : bookingPetId === petId;

const byNewestBooking = (
  a: { startDate?: string; id: number },
  b: { startDate?: string; id: number },
) => {
  const aTime = Date.parse(a.startDate ?? "");
  const bTime = Date.parse(b.startDate ?? "");

  if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
    return bTime - aTime;
  }

  return b.id - a.id;
};

export function getBookingOverviewHref({
  petId,
  clientId,
  service,
}: BookingLookupInput): string | null {
  const serviceKey = normalize(service);

  let candidates = bookings.filter((booking) => {
    const petMatch = hasPet(booking.petId, petId);
    const clientMatch = clientId ? booking.clientId === clientId : true;
    return petMatch && clientMatch;
  });

  // Fallback: petId-only when ownerIds differ between data sources
  if (candidates.length === 0) {
    candidates = bookings.filter((booking) => hasPet(booking.petId, petId));
  }

  if (candidates.length === 0) return null;

  const serviceMatches = serviceKey
    ? candidates.filter((booking) => {
        const bookingService = normalize(booking.service);
        const bookingServiceType = normalize(booking.serviceType);
        return (
          bookingService === serviceKey || bookingServiceType === serviceKey
        );
      })
    : candidates;

  const target = [...(serviceMatches.length > 0 ? serviceMatches : candidates)]
    .sort(byNewestBooking)
    .at(0);

  if (!target) return null;

  return `/facility/dashboard/clients/${target.clientId}/bookings/${target.id}`;
}
