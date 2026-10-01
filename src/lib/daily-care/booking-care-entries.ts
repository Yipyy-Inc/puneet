import {
  applyFeedingLog,
  applyMedicationLog,
  feedingEntriesFromSchedule,
  medicationEntriesFromItems,
} from "@/lib/bookings/care-instructions";
import type { CareLogEntry } from "@/app/api/care-log/route";
import { bookingStay } from "@/lib/medications/schedule";
import type { Booking } from "@/types/booking";

// ============================================================================
// Today's meals and doses for one booking, with what the care log says was
// done — ONE answer for the panels that show them and the gate that stops a
// checkout while some are unlogged.
//
// The gate read `feedingInstructions` / `medicationInstructions`, the fixture
// CHECKLIST fields no booking made in this app carries, while the panels
// built their rows from what the owner actually gave (`feedingSchedule`,
// `medications`) plus the care log. So the gate never fired on a real
// booking: a stay with three unlogged doses checked out without a word. The
// fixture fields stay first so the two hand-written demo bookings still read.
//
// The booking's own days come too, when the caller has them: a medication
// given "every day except checkout" or on chosen dates has nothing due on the
// other days, and a gate that asked for it would hold the pet back over a dose
// the owner said not to give (2026-10-01).
// ============================================================================

export function bookingCareEntries(
  booking: Pick<
    Booking,
    | "feedingInstructions"
    | "feedingSchedule"
    | "medicationInstructions"
    | "medications"
  > & { service?: string; startDate?: string; endDate?: string },
  careLog: CareLogEntry[] | undefined,
  day: string,
) {
  const feeding = applyFeedingLog(
    booking.feedingInstructions?.length
      ? booking.feedingInstructions
      : feedingEntriesFromSchedule(booking.feedingSchedule),
    careLog,
    day,
  );
  const medication = applyMedicationLog(
    booking.medicationInstructions?.length
      ? booking.medicationInstructions
      : medicationEntriesFromItems(
          booking.medications,
          day,
          booking.startDate ? bookingStay(booking) : undefined,
        ),
    careLog,
    day,
  );
  return { feeding, medication };
}
