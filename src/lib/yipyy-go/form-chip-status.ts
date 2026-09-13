import type {
  YipyyGoBookingStatus,
  YipyyGoSubmission,
} from "@/lib/api/mappers/yipyy-go";

// Where one pet’s pre-arrival form stands, as the §3 form chip shows it on the
// bookings list, the booking page, the check-in desk and the grooming briefing.

export type FormChipStatus = YipyyGoBookingStatus | "completed_by_staff";

/**
 * One pet’s form, as a chip status. `required` is null where the facility asks
 * no form for the service. An asked form nobody has sent is not started,
 * optional or mandatory, as booking_yipyy_go says; the chip keeps the alarm
 * for a mandatory one.
 */
export function formChipStatusOf(
  submission: Pick<YipyyGoSubmission, "status"> | null,
  required: boolean | null,
): FormChipStatus {
  switch (submission?.status) {
    case "draft":
      return "in_progress";
    case "submitted":
    case "changes_requested":
    case "approved":
    case "completed_by_staff":
      return submission.status;
    default:
      return required === null ? "not_required" : "not_started";
  }
}
