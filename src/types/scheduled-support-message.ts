// A support message an agent has queued to send to a facility account at a
// future time (the admin counterpart to the facility Messaging "Scheduled" tab).

export type ScheduledChannel = "chat" | "email";

export interface ScheduledSupportMessage {
  id: string;
  facilityId: number;
  facilityName: string;
  channel: ScheduledChannel;
  body: string;
  /** When the message is queued to send (ISO). */
  scheduledFor: string;
  /** When the agent scheduled it (ISO). */
  createdAt: string;
  /** Name of the support agent who scheduled it. */
  createdBy: string;
}
