import type { CallLog, FollowUpStatus } from "@/types/communications";

/** Label + pill colour for each follow-up status. */
export const FOLLOW_UP_META: Record<
  FollowUpStatus,
  { label: string; pill: string }
> = {
  pending: {
    label: "Pending",
    pill: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  scheduled: {
    label: "Scheduled",
    pill: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  },
  completed: {
    label: "Completed",
    pill: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  },
  no_action: {
    label: "No action",
    pill: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:border-gray-700",
  },
};

/** Order shown in the side-panel dropdown. */
export const FOLLOW_UP_OPTIONS: FollowUpStatus[] = [
  "pending",
  "scheduled",
  "completed",
  "no_action",
];

/**
 * Default follow-up state for a call: missed calls and voicemails start
 * `pending` (they need attention); completed inbound/outbound calls get `null`
 * (no follow-up to track).
 */
export function defaultFollowUpStatus(
  status: CallLog["status"],
): FollowUpStatus | null {
  return status === "missed" || status === "voicemail" ? "pending" : null;
}
