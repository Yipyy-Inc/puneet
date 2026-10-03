"use client";

import { useQuery } from "@tanstack/react-query";

import type { BookingTraining } from "@/app/api/bookings/[ref]/training/route";
import { useBookingStays } from "@/lib/api/boarding-rooms";
import { bookingHistoryQueries } from "@/lib/api/booking-history";
import { daycareKeys, fetchDaycareDay } from "@/lib/api/daycare-attendance";
import { groomingStationKeys } from "@/hooks/use-grooming-stations";
import type { GroomingAppointment } from "@/types/grooming";
import type { GroomingStation } from "@/types/rooms";

import type { BookingDetails } from "./use-booking-details";

// ============================================================================
// What each service knows about a booking that the booking row does not: the
// kennel a stay sleeps in, the group a day plays in, who grooms and where, the
// class a lesson belongs to — and who made the booking (its first history
// entry). Read only for the service the booking is, under the keys the boards
// already use, so a move or a check-in elsewhere refreshes this page too.
// ============================================================================

export function useServiceFacts(d: BookingDetails) {
  const booking = d.booking;
  const ref = booking?.id;
  const kind = d.kind;

  const stays = useBookingStays(kind === "boarding" ? ref : undefined);

  const day = booking?.startDate;
  const daycareDay = useQuery({
    queryKey: daycareKeys.day(day),
    queryFn: () => fetchDaycareDay(day),
    enabled: kind === "daycare" && Boolean(day),
  });
  const daycareVisit =
    daycareDay.data?.visits.find((v) => v.id === String(ref)) ?? null;

  const grooming = useQuery({
    queryKey: ["grooming", "appointments", "booking", ref ?? 0] as const,
    enabled: kind === "grooming" && Boolean(ref),
    queryFn: async (): Promise<GroomingAppointment | null> => {
      const response = await fetch(
        `/api/grooming/appointments?bookingRef=${ref}`,
      );
      if (!response.ok) throw new Error("Could not read the appointment.");
      const rows = (await response.json()) as GroomingAppointment[];
      return rows[0] ?? null;
    },
  });

  // The groom's table by name — the stations list the board keeps, same key.
  const stations = useQuery({
    queryKey: groomingStationKeys.all,
    enabled: kind === "grooming",
    queryFn: async (): Promise<GroomingStation[]> => {
      const response = await fetch("/api/grooming/stations");
      if (!response.ok) throw new Error("Could not read the stations.");
      return (await response.json()) as GroomingStation[];
    },
  });
  const stationId = grooming.data?.stationId;
  const stationName = stationId
    ? (stations.data?.find((s) => s.id === stationId)?.name ?? null)
    : null;

  const training = useQuery({
    queryKey: ["bookings", ref ?? 0, "training"] as const,
    enabled: kind === "training" && Boolean(ref),
    queryFn: async (): Promise<BookingTraining> => {
      const response = await fetch(`/api/bookings/${ref}/training`);
      if (!response.ok) throw new Error("Could not read the class.");
      return (await response.json()) as BookingTraining;
    },
  });

  // The oldest entry is the booking being made: who, and as what.
  const history = useQuery({
    ...bookingHistoryQueries.forBooking(ref ?? 0),
    enabled: Boolean(ref),
  });
  const created = [...(history.data ?? [])]
    .reverse()
    .find((entry) =>
      entry.changes.some((c) => c.field === "status" && c.from == null),
    );
  const createdAs = created?.changes.find((c) => c.field === "status")?.to;

  const kennels = (stays.data ?? [])
    .map((s) => s.roomName)
    .filter((name): name is string => Boolean(name));

  return {
    stays: stays.data ?? [],
    staysPending: stays.isPending && kind === "boarding",
    /** "Suite 02", or "Suite 02 → Condo 4" for a guest who moves. */
    kennelLabel: kennels.length > 0 ? [...new Set(kennels)].join(" → ") : null,
    daycareVisit,
    grooming: grooming.data ?? null,
    groomingPending: grooming.isPending && kind === "grooming",
    stationName,
    training: training.data ?? null,
    trainingPending: training.isPending && kind === "training",
    bookedBy: created
      ? {
          who: created.who,
          // A customer's own booking arrives as a request.
          online: createdAs === "request_submitted",
        }
      : null,
  };
}

export type ServiceFacts = ReturnType<typeof useServiceFacts>;
