// The kiosk's name for the arrival writer map, kept so its imports still read.
// The map itself lives in src/lib/bookings/arrival-writer.ts since 2026-09-18,
// when the booking page and the calendar started checking in through it too.
export {
  arrivalWriterFor as checkInWriterFor,
  ARRIVAL_PERMISSION as CHECK_IN_PERMISSION,
  ANY_ARRIVAL_PERMISSION as ANY_CHECK_IN_PERMISSION,
  type ArrivalWriter as CheckInWriter,
} from "@/lib/bookings/arrival-writer";
