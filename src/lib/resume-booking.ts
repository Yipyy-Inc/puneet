import type { UnfinishedBooking } from "@/types/unfinished-booking";

/**
 * Fields extracted from an unfinished booking that feed into the
 * `preSelected*` props on BookingModal / openBookingModal.
 */
export interface ResumeBookingPreselection {
  preSelectedClientId?: number;
  preSelectedPetId?: number;
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
}

export function buildResumePreselection(
  ub: UnfinishedBooking,
): ResumeBookingPreselection {
  return {
    preSelectedClientId: ub.clientId,
    preSelectedPetId: ub.petId,
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
  };
}
