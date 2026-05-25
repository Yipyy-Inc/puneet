/**
 * Training Makeup Session Workflow
 *
 * Handles makeup sessions for missed training classes
 */

import {
  type TrainingEnrollment,
  type SessionAttendance,
} from "./training-enrollment";
import { type TrainingSeries } from "./training-series";

export interface MakeupSession {
  id: string;
  enrollmentId: string;
  missedSessionId: string; // The session that was missed
  missedSessionNumber: number;
  missedSessionDate: string;
  /** Lifecycle:
   *   - `pending`    — customer requested from their portal, awaiting staff.
   *   - `offered`    — facility surfaced a host session as a booking offer;
   *                    customer hasn't accepted yet.
   *   - `scheduled`  — customer accepted (or staff directly scheduled).
   *   - `completed`  — make-up happened.
   *   - `cancelled`  — customer skipped/cancelled.
   *   - `ineligible` — facility marked the absence as not getting a make-up
   *                    (past window, no-call no-show, etc.).
   */
  status:
    | "pending"
    | "offered"
    | "scheduled"
    | "completed"
    | "cancelled"
    | "ineligible";
  scheduledDate: string | null;
  scheduledTime: string | null;
  price: number; // e.g., $40
  trainerId: string | null;
  trainerName: string | null;
  notes: string;
  /** Host series this make-up is attached to (when offered/scheduled). The
   *  trainer running that series sees a Make-up badge on the appointment
   *  block on their calendar. */
  targetSeriesId?: string;
  targetSeriesName?: string;
  targetSessionId?: string;
  /** Reason the facility marked the absence ineligible. Required by the
   *  workflow so the audit trail explains the call. */
  ineligibleReason?: string;
  ineligibleByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MakeupCredit {
  id: string;
  enrollmentId: string;
  seriesId: string;
  creditsAvailable: number; // Number of makeup sessions available
  creditsUsed: number; // Number of makeup sessions used
  expiresAt: string | null; // If credits expire
}

/**
 * Check if a session was missed (absent)
 */
export function isSessionMissed(attendance: SessionAttendance | null): boolean {
  if (!attendance) return false;
  return attendance.status === "absent" || attendance.status === "excused";
}

/**
 * Get missed sessions for an enrollment
 */
export function getMissedSessions(
  enrollment: TrainingEnrollment,
  attendances: SessionAttendance[],
): SessionAttendance[] {
  return attendances.filter(
    (attendance) =>
      attendance.enrollmentId === enrollment.id && isSessionMissed(attendance),
  );
}

/**
 * Check if makeup is available for a missed session
 */
export function canScheduleMakeup(
  missedSession: SessionAttendance,
  makeupSessions: MakeupSession[],
): boolean {
  // Check if makeup already scheduled or completed
  const existingMakeup = makeupSessions.find(
    (makeup) => makeup.missedSessionId === missedSession.sessionId,
  );

  if (existingMakeup) {
    return (
      existingMakeup.status === "pending" ||
      existingMakeup.status === "scheduled"
    );
  }

  return true;
}

/**
 * Calculate makeup price based on facility configuration
 */
export function calculateMakeupPrice(
  series: TrainingSeries,
  sessionNumber: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  facilityConfig?: Record<string, any>,
): number {
  // Get makeup pricing rules from facility config
  const makeupConfig = facilityConfig?.training?.makeupSessions;

  if (!makeupConfig?.pricingRules) {
    // Default price if no config
    return 40;
  }

  const pricingRules = makeupConfig.pricingRules;

  switch (pricingRules.type) {
    case "fixed":
      return pricingRules.fixedPrice || 40;
    case "percentage":
      // Calculate percentage of series price
      const seriesPrice = series.enrollmentRules.fullPaymentAmount;
      return Math.round(
        seriesPrice * (pricingRules.percentageOfSeries || 0.15),
      );
    case "per_session":
      return pricingRules.perSessionPrice || 40;
    default:
      return 40;
  }
}

/**
 * Get available makeup credits for an enrollment
 */
export function getAvailableMakeupCredits(
  enrollmentId: string,
  makeupCredits: MakeupCredit[],
): number {
  const credit = makeupCredits.find((c) => c.enrollmentId === enrollmentId);
  if (!credit) return 0;

  return Math.max(0, credit.creditsAvailable - credit.creditsUsed);
}
