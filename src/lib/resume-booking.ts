import type {
  AbandonmentStep,
  UnfinishedBooking,
} from "@/types/unfinished-booking";

/** The wizard step ids, which are what BookingModal filters and indexes. */
export type ResumeStepId = "client-pet" | "service" | "details" | "confirm";

/**
 * Where the customer actually was, as a step the wizard can open on.
 *
 * The saved step was written and never read back until 2026-09-20: resume
 * restored every FIELD and then let the wizard guess a step from what happened
 * to be preselected, so somebody who left on Review came back to Details and
 * clicked forward again. The four steps the customer form writes map one to
 * one onto the wizard's own, so nothing had to change in the database.
 *
 * The three steps only a longer flow reaches — add_ons, forms, payment — are
 * not written by this form today. They are mapped anyway rather than left to
 * fall through: an unknown value should land somewhere sensible, not at the
 * beginning.
 */
export function resumeStepFor(step: AbandonmentStep): ResumeStepId {
  switch (step) {
    case "pet_selection":
      return "client-pet";
    case "service_selection":
      return "service";
    case "review":
    case "payment":
      return "confirm";
    case "date_and_details":
    case "add_ons":
    case "forms":
    default:
      return "details";
  }
}

/**
 * Fields extracted from an unfinished booking that feed into the
 * `preSelected*` props on BookingModal / openBookingModal.
 */
export interface ResumeBookingPreselection {
  preSelectedClientId?: number;
  preSelectedPetId?: number;
  /** Every pet the draft held; restores a multi-pet booking whole. */
  preSelectedPetIds?: number[];
  preSelectedService?: string;
  preSelectedStartDate?: string;
  preSelectedEndDate?: string;
  preSelectedCheckInTime?: string;
  preSelectedCheckOutTime?: string;
  preSelectedDaycareDates?: string[];
  preSelectedRoomId?: string;
  preSelectedDaycareSectionId?: string;
  preSelectedExtraServices?: UnfinishedBooking["extraServices"];
  preSelectedFeedingSchedule?: UnfinishedBooking["feedingSchedule"];
  preSelectedMedications?: UnfinishedBooking["medications"];
  preSelectedSpecialRequests?: string;
  preSelectedNotificationEmail?: boolean;
  preSelectedNotificationSMS?: boolean;
  /** The step they left on, so the wizard opens THERE and not at the start. */
  preSelectedStep?: ResumeStepId;
  /** The sub-step within it, where there is one. */
  preSelectedSubStep?: number;
}

export function buildResumePreselection(
  ub: UnfinishedBooking,
): ResumeBookingPreselection {
  return {
    preSelectedClientId: ub.clientId,
    preSelectedPetId: ub.petId,
    preSelectedPetIds: ub.petIds,
    preSelectedService: ub.service,
    preSelectedStartDate: ub.requestedStartDate,
    preSelectedEndDate: ub.requestedEndDate ?? ub.requestedStartDate,
    preSelectedCheckInTime: ub.checkInTime,
    preSelectedCheckOutTime: ub.checkOutTime,
    preSelectedDaycareDates: ub.daycareDates,
    preSelectedRoomId: ub.roomPreference,
    preSelectedDaycareSectionId: ub.daycareSectionId,
    preSelectedExtraServices: ub.extraServices,
    preSelectedFeedingSchedule: ub.feedingSchedule,
    preSelectedMedications: ub.medications,
    preSelectedSpecialRequests: ub.specialRequests,
    preSelectedNotificationEmail: ub.notificationEmail,
    preSelectedNotificationSMS: ub.notificationSMS,
    preSelectedStep: resumeStepFor(ub.abandonmentStep),
    preSelectedSubStep: ub.subStep,
  };
}
