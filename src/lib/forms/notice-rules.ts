import type { FormNotifications } from "@/lib/settings/form-settings";

// ============================================================================
// Whether a facility asked to hear about a submission.
//
// Its own module, apart from notify.ts, because it is pure: notify.ts reaches
// the service-role client, which refuses to load outside the server, so a rule
// kept there could not be unit-tested.
// ============================================================================

export function staffNoticeWanted(
  notifications: FormNotifications,
  submission: { flagged: boolean; hasFiles: boolean },
): boolean {
  return (
    notifications.staff.newSubmission ||
    (submission.flagged && notifications.staff.redFlagAnswers) ||
    (submission.hasFiles && notifications.staff.hasFileUpload)
  );
}
