"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bookingMutations } from "@/lib/api/booking";
import { useAssignBoardingRoom } from "@/lib/api/boarding-rooms";
import type { Booking, NewBooking } from "@/types/booking";

/**
 * What the edit wizard may change on an EXISTING booking.
 *
 * ── WHY A LIST, NOT THE WHOLE PAYLOAD ─────────────────────────────────────
 *
 * The wizard hands back the same `NewBooking` it builds for a new booking,
 * and that carries a `status` — "confirmed" for most flows. Sent as-is it
 * would move a checked-in guest back to confirmed, and a completed stay back
 * to one that has not happened. It also carries the client, the pets and the
 * service, none of which an edit can change without the rows derived from
 * them (the grooming appointment, the booking's pets) going out of step. So
 * an edit sends the fields that are safe to change and nothing else.
 *
 * Dates are among them: `sync_boarding_stay` moves a boarding stay with its
 * booking, and refuses a move onto an occupied kennel.
 */
const EDITABLE: (keyof NewBooking)[] = [
  "startDate",
  "endDate",
  "checkInTime",
  "checkOutTime",
  "basePrice",
  "discount",
  "discountReason",
  "totalCost",
  "specialRequests",
  "assignedStaff",
  "feedingSchedule",
  "walkSchedule",
  "medications",
  "extraServices",
  "daycareSelectedDates",
  "daycareDateTimes",
  "sectionId",
];

export function editablePatch(
  current: Booking,
  edited: NewBooking,
): Partial<NewBooking> {
  const patch: Partial<NewBooking> = {};
  for (const key of EDITABLE) {
    const next = edited[key];
    if (next === undefined) continue;
    if (JSON.stringify(next) === JSON.stringify(current[key])) continue;
    (patch as Record<string, unknown>)[key] = next;
  }
  return patch;
}

/**
 * Saves the booking-detail page's edit wizard.
 *
 * It used to close the wizard and toast "{ref} updated" — and write nothing.
 * Now the changed fields go through `PATCH /api/bookings/[ref]`, and a
 * changed kennel through `PUT /api/boarding/stays`, which is where a
 * kennel move is decided (and refused with a 409 if someone else has it).
 */
export function useSaveBookingEdit(current: Booking | undefined) {
  const queryClient = useQueryClient();
  const assignRoom = useAssignBoardingRoom();

  return useMutation({
    mutationFn: async (edited: NewBooking) => {
      if (!current) throw new Error("No booking to update.");
      const patch = editablePatch(current, edited);
      if (Object.keys(patch).length > 0) {
        await bookingMutations.update(current.id, patch as Partial<Booking>);
      }
      const nextRoom = edited.unitAssignment;
      const roomChanged =
        current.service === "boarding" &&
        Boolean(nextRoom) &&
        nextRoom !== current.unitAssignment;
      if (roomChanged) {
        await assignRoom.mutateAsync({
          bookingRef: current.id,
          roomId: nextRoom!,
        });
      }
      return Object.keys(patch).length > 0 || roomChanged;
    },
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
