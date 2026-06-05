import type { CallLog } from "@/types/communications";
import type { AICallSummary } from "@/types/calling";
import type { StandaloneTask } from "@/data/work-tasks";
import { INQUIRY_TAG_META } from "@/lib/calling/inquiry-tags";

// ============================================================
// Call → Task integration: builds the follow-up task that is
// auto-created in the Tasks module when a call needs a callback
// (missed / voicemail / followUpStatus = pending).
// ============================================================

/** Unassigned follow-ups default to the front desk (stands in for the logged-in user). */
export const DEFAULT_FOLLOWUP_ASSIGNEE = { id: "reception", name: "Reception" };

/**
 * Due target for a follow-up call-back task: same day 5pm if it's a weekday
 * before 5pm, otherwise the next business morning at 9am.
 */
export function followUpDue(now = new Date()): { dueDate: string; dueTime: string } {
  const isWeekend = (x: Date) => x.getDay() === 0 || x.getDay() === 6;
  const toISO = (x: Date) =>
    `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const d = new Date(now);
  if (!isWeekend(d) && d.getHours() < 17) {
    return { dueDate: toISO(d), dueTime: "17:00" };
  }
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  while (isWeekend(next)) next.setDate(next.getDate() + 1);
  return { dueDate: toISO(next), dueTime: "09:00" };
}

export interface FollowUpTaskOptions {
  assignedToId?: string;
  assignedToName?: string;
  summary?: AICallSummary;
  now?: Date;
}

/** Builds a deterministic-id follow-up task for a call. Id is keyed by the
 *  call so re-running never duplicates (callLogId is the dedup key). */
export function buildFollowUpTask(
  call: CallLog,
  opts: FollowUpTaskOptions = {},
): StandaloneTask {
  const callerName = call.clientName ?? call.from;
  const inquiry = call.inquiryTag
    ? INQUIRY_TAG_META[call.inquiryTag].label
    : "follow-up";
  const isVoicemail = call.status === "voicemail";
  const now = opts.now ?? new Date();
  const { dueDate, dueTime } = followUpDue(now);

  const title = isVoicemail
    ? `Listen to voicemail + call back ${callerName}`
    : `Call back ${callerName} re: ${inquiry}`;

  const description = isVoicemail
    ? `Listen to the voicemail from ${callerName} (${call.from}) and return the call.${opts.summary ? ` ${opts.summary.callReason}` : ""}`
    : `Return this ${call.status} ${call.type} call from ${callerName} (${call.from}).`;

  return {
    id: `task-cb-${call.id}`,
    title,
    description,
    category: "customer-service",
    priority: "high",
    status: "pending",
    assignedToId: opts.assignedToId ?? DEFAULT_FOLLOWUP_ASSIGNEE.id,
    assignedToName: opts.assignedToName ?? DEFAULT_FOLLOWUP_ASSIGNEE.name,
    dueDate,
    dueTime,
    estimatedMinutes: 10,
    requiresPhoto: false,
    requiresSignoff: false,
    callLogId: call.id,
    createdAt: now.toISOString(),
    metadata: {
      phone: call.from,
      aiSummary: opts.summary?.callReason,
      recordingUrl: call.recordingUrl,
    },
  };
}
