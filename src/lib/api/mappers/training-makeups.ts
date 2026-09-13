import { z } from "zod";

// ============================================================================
// Training make-ups (20260913090803 a_missed_training_session_can_be_made_up).
//
// A missed session is not a row: training_missed_sessions() derives it from a
// session booking that never checked in. What happened next is a
// training_makeups row, and the function returns both, flat. They are mapped
// here into the shape both portals draw — the missed session, and its make-up
// when there is one. `petId` and `ownerId` are the REFS every training screen
// keys on.
// ============================================================================

export type MakeupStatus =
  | "requested"
  | "offered"
  | "declined"
  | "skipped"
  | "ineligible";

export interface TrainingMissedSessionRow {
  booking_id: string;
  booking_ref: number;
  booking_status: string;
  pet_ref: number;
  pet_name: string;
  client_ref: number;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  series_id: string;
  series_name: string;
  course_name: string;
  session_id: string;
  session_number: number;
  session_start_at: string;
  enrollment_id: string | null;
  enrollment_status: string | null;
  makeup_id: string | null;
  makeup_status: string | null;
  owner_note: string | null;
  ineligible_reason: string | null;
  requested_at: string | null;
  offered_at: string | null;
  offered_by_name: string | null;
  answered_at: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  host_session_id: string | null;
  host_session_number: number | null;
  host_start_at: string | null;
  host_series_id: string | null;
  host_series_name: string | null;
  host_booking_ref: number | null;
  host_booking_status: string | null;
}

export interface MakeupSeat {
  sessionId: string;
  sessionNumber: number | null;
  startAt: string | null;
  seriesId: string | null;
  seriesName: string | null;
  bookingRef: number | null;
  bookingStatus: string | null;
}

export interface TrainingMakeup {
  id: string;
  status: MakeupStatus;
  ownerNote: string | null;
  ineligibleReason: string | null;
  requestedAt: string | null;
  offeredAt: string | null;
  offeredByName: string | null;
  answeredAt: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  seat: MakeupSeat | null;
}

export interface TrainingMissedSession {
  /** The missed BOOKING's uuid — every make-up action names it. */
  bookingId: string;
  bookingRef: number;
  petId: number;
  petName: string;
  ownerId: number;
  ownerName: string;
  ownerPhone: string | null;
  ownerEmail: string | null;
  seriesId: string;
  seriesName: string;
  courseName: string;
  sessionId: string;
  sessionNumber: number;
  sessionStartAt: string;
  enrollmentStatus: string | null;
  makeup: TrainingMakeup | null;
}

const STATUSES: readonly MakeupStatus[] = [
  "requested",
  "offered",
  "declined",
  "skipped",
  "ineligible",
];

export function rowToMissedSession(
  row: TrainingMissedSessionRow,
): TrainingMissedSession {
  const status = STATUSES.find((s) => s === row.makeup_status);
  return {
    bookingId: row.booking_id,
    bookingRef: Number(row.booking_ref),
    petId: Number(row.pet_ref),
    petName: row.pet_name,
    ownerId: Number(row.client_ref),
    ownerName: row.client_name,
    ownerPhone: row.client_phone,
    ownerEmail: row.client_email,
    seriesId: row.series_id,
    seriesName: row.series_name,
    courseName: row.course_name,
    sessionId: row.session_id,
    sessionNumber: row.session_number,
    sessionStartAt: row.session_start_at,
    enrollmentStatus: row.enrollment_status,
    makeup:
      row.makeup_id && status
        ? {
            id: row.makeup_id,
            status,
            ownerNote: row.owner_note,
            ineligibleReason: row.ineligible_reason,
            requestedAt: row.requested_at,
            offeredAt: row.offered_at,
            offeredByName: row.offered_by_name,
            answeredAt: row.answered_at,
            decidedAt: row.decided_at,
            decidedByName: row.decided_by_name,
            seat: row.host_session_id
              ? {
                  sessionId: row.host_session_id,
                  sessionNumber: row.host_session_number,
                  startAt: row.host_start_at,
                  seriesId: row.host_series_id,
                  seriesName: row.host_series_name,
                  bookingRef:
                    row.host_booking_ref === null
                      ? null
                      : Number(row.host_booking_ref),
                  bookingStatus: row.host_booking_status,
                }
              : null,
          }
        : null,
  };
}

export interface MakeupHostSessionRow {
  session_id: string;
  series_id: string;
  series_name: string;
  session_number: number;
  start_at: string;
  end_at: string;
  location_name: string | null;
  trainer_name: string | null;
  seats_left: number;
}

/** A seat a make-up could take — a future session of the same course. */
export interface MakeupHostSession {
  sessionId: string;
  seriesId: string;
  seriesName: string;
  sessionNumber: number;
  startAt: string;
  endAt: string;
  locationName: string | null;
  trainerName: string | null;
  seatsLeft: number;
}

export function rowToHostSession(row: MakeupHostSessionRow): MakeupHostSession {
  return {
    sessionId: row.session_id,
    seriesId: row.series_id,
    seriesName: row.series_name,
    sessionNumber: row.session_number,
    startAt: row.start_at,
    endAt: row.end_at,
    locationName: row.location_name,
    trainerName: row.trainer_name,
    seatsLeft: row.seats_left,
  };
}

/** What can be done to one missed session. The database decides who may. */
export const makeupActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("request"),
      note: z.string().trim().max(1000).optional(),
    })
    .strict(),
  z.object({ action: z.literal("skip") }).strict(),
  z
    .object({ action: z.literal("offer"), hostSessionId: z.string().uuid() })
    .strict(),
  z
    .object({ action: z.literal("decline"), makeupId: z.string().uuid() })
    .strict(),
  z
    .object({
      action: z.literal("ineligible"),
      reason: z.string().trim().min(1).max(1000),
    })
    .strict(),
]);
export type MakeupAction = z.infer<typeof makeupActionSchema>;
