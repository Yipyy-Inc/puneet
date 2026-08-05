// ============================================================================
// Who is at today's training sessions.
//
// A NEW SHAPE rather than the fixture's. `trainingSessions` is a class object
// with an `attendees` array of enrollment ids, and `useUnifiedBookings` fanned
// it out into one row per attendee with a composite id (`sess-3:enr-12`) that
// referred to nothing in the database. A booking is already per-pet, so this is
// one row per booking and the id is the booking's own ref — the thing every
// write here takes.
//
// The CLASS has no table yet: its name, its curriculum, its size. What comes
// back instead is what the booking itself carries — the service variant and the
// staff member assigned to it — and nothing is invented to fill the gap.
// ============================================================================

export type TrainingPresence = "scheduled" | "checked-in" | "checked-out";

export interface TrainingAttendee {
  /** The BOOKING's ref. */
  id: string;
  petId: number;
  petName: string;
  petBreed: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string;
  scheduledStart: string;
  scheduledEnd: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  status: TrainingPresence;
  /** The booking's service variant — "puppy_class", "private" — not a class name. */
  sessionType: string | null;
  trainerName: string | null;
  notes: string;
}

export interface TrainingAttendanceRow {
  booking_id: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  status: string;
  session_notes: string;
}

export interface TrainingBookingRow {
  id: string;
  ref: number;
  start_at: string;
  end_at: string;
  status: string;
  service_type: string | null;
  assigned_staff_name: string | null;
  clients: { ref: number; name: string; phone: string | null } | null;
  booking_pets:
    | { pets: { ref: number; name: string; breed: string | null } | null }[]
    | null;
  training_attendance: TrainingAttendanceRow | null;
}

export const TRAINING_BOOKING_SELECT = `
  id, ref, start_at, end_at, status, service_type, assigned_staff_name,
  clients ( ref, name, phone ),
  booking_pets ( pets ( ref, name, breed ) ),
  training_attendance ( booking_id, checked_in_at, checked_out_at, status,
                        session_notes )
` as const;

export function rowToTrainingAttendee(
  row: TrainingBookingRow,
): TrainingAttendee | null {
  const pet = (row.booking_pets ?? []).map((bp) => bp.pets).find(Boolean);
  if (!pet) return null;

  const attendance = row.training_attendance;
  return {
    id: String(row.ref),
    petId: pet.ref,
    petName: pet.name,
    petBreed: pet.breed ?? "",
    ownerId: row.clients?.ref ?? 0,
    ownerName: row.clients?.name ?? "",
    ownerPhone: row.clients?.phone ?? "",
    scheduledStart: row.start_at,
    scheduledEnd: row.end_at,
    checkedInAt: attendance?.checked_in_at ?? null,
    checkedOutAt: attendance?.checked_out_at ?? null,
    // Straight from the generated column. No row means booked and not arrived.
    status: (attendance?.status ?? "scheduled") as TrainingPresence,
    sessionType: row.service_type,
    trainerName: row.assigned_staff_name,
    notes: attendance?.session_notes ?? "",
  };
}
