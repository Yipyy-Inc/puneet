// ============================================================================
// A real training class -- see supabase/migrations/20260826110000. Distinct
// from the mock `TrainingSeries` in src/lib/training-series.ts: that type
// still backs the calendar/curriculum/homework screens, which read a separate
// fixture universe this schema does not touch.
// ============================================================================

export type TrainingSeriesStatus =
  | "draft"
  | "active"
  | "completed"
  | "cancelled";
export type TrainingSeriesSessionStatus =
  | "scheduled"
  | "completed"
  | "cancelled";
export type TrainingSeriesEnrollmentStatus =
  | "enrolled"
  | "waitlisted"
  | "cancelled"
  | "completed";

export interface RealTrainingSeries {
  id: string;
  facilityId: string;
  locationId: string | null;
  locationName: string | null;
  staffId: string | null;
  staffName: string | null;
  name: string;
  courseTypeName: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  startDate: string;
  numberOfSessions: number;
  capacity: number;
  totalPrice: number;
  /**
   * Whether enrolment in this series is charged the facility's tax.
   *
   * On the SERIES rather than only the program: total_price here is what
   * actually prices a training booking, and a series carries no reference to
   * the program it was modelled on. See lib/payments/service-tax.ts.
   */
  taxable: boolean;
  status: TrainingSeriesStatus;
  enrolledCount: number;
  waitlistedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RealTrainingSeriesSession {
  id: string;
  seriesId: string;
  sessionNumber: number;
  startAt: string;
  endAt: string;
  /** `start_at`, read on the facility's own clock — display this, not `startAt`. */
  startDate: string;
  startTime: string;
  status: TrainingSeriesSessionStatus;
}

export interface RealTrainingSeriesEnrollment {
  id: string;
  seriesId: string;
  petId: string;
  petRef: number | null;
  petName: string | null;
  clientId: string;
  clientRef: number | null;
  clientName: string | null;
  status: TrainingSeriesEnrollmentStatus;
  enrolledAt: string;
}

export interface CreateTrainingSeriesInput {
  /** Absent means taxed — see lib/payments/service-tax.ts. */
  taxable?: boolean;
  name: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: number;
  startDate: string;
  numberOfSessions: number;
  capacity: number;
  totalPrice: number;
  locationId?: string | null;
  staffId?: string | null;
  courseTypeName?: string;
}
