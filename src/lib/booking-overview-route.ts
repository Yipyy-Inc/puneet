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

  const candidates = bookings.filter((booking) => {
    const petMatch = hasPet(booking.petId, petId);
    const clientMatch = clientId ? booking.clientId === clientId : true;
    return petMatch && clientMatch;
  });

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
