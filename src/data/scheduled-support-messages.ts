import { adminUsers } from "@/data/admin-users";
import { facilities } from "@/data/facilities";
import type {
  ScheduledChannel,
  ScheduledSupportMessage,
} from "@/types/scheduled-support-message";

// Seed for the admin "Scheduled Messages" view. Offsets are relative to "now"
// so the list always has a realistic mix — a couple already due (rendered as
// "Sending now…") and the rest spread across today and the coming days — rather
// than a fixed wall-clock date that drifts into the past. Resolved against real
// facilities + real admin agents in buildScheduledSupportMessages().

interface ScheduledSeed {
  id: string;
  facilityId: number;
  channel: ScheduledChannel;
  body: string;
  /** adminUsers id of the scheduling agent. */
  agentId: number;
  /** scheduledFor = now + this many minutes (negative = already due). */
  offsetMinutes: number;
  /** createdAt = now - this many minutes. */
  createdAgoMinutes: number;
}

const SEED: ScheduledSeed[] = [
  {
    id: "ssm-001",
    facilityId: 1,
    channel: "chat",
    body: "Morning! Just confirming your team is all set for the new booking-widget rollout going live today. Ping us here if anything looks off.",
    agentId: 1,
    offsetMinutes: -6,
    createdAgoMinutes: 720,
  },
  {
    id: "ssm-002",
    facilityId: 3,
    channel: "email",
    body: "Following up on the duplicate charge on INV-0312 — the reversal has cleared and a corrected invoice is attached. Let us know if you need anything else.",
    agentId: 2,
    offsetMinutes: -1,
    createdAgoMinutes: 1440,
  },
  {
    id: "ssm-003",
    facilityId: 5,
    channel: "chat",
    body: "Here's the walkthrough for adding a second location to your account, as promised. Happy to hop on a quick call if that's easier.",
    agentId: 3,
    offsetMinutes: 40,
    createdAgoMinutes: 180,
  },
  {
    id: "ssm-004",
    facilityId: 2,
    channel: "email",
    body: "Reminder: your staff time-clock fix has shipped in this morning's release. Please have your groomers try clocking in and let us know it's resolved.",
    agentId: 1,
    offsetMinutes: 150,
    createdAgoMinutes: 320,
  },
  {
    id: "ssm-005",
    facilityId: 9,
    channel: "chat",
    body: "Checking in on how the new grooming-package setup is working out for you a week in. Anything we can fine-tune?",
    agentId: 4,
    offsetMinutes: 320,
    createdAgoMinutes: 60,
  },
  {
    id: "ssm-006",
    facilityId: 4,
    channel: "email",
    body: "Your annual plan renews next week. No action needed — this is just a heads-up with the upcoming invoice attached for your records.",
    agentId: 2,
    offsetMinutes: 1500,
    createdAgoMinutes: 200,
  },
  {
    id: "ssm-007",
    facilityId: 6,
    channel: "chat",
    body: "We've enabled the loyalty module on your account for the trial you requested. I'll share a short setup guide when it goes live tomorrow.",
    agentId: 5,
    offsetMinutes: 1680,
    createdAgoMinutes: 90,
  },
  {
    id: "ssm-008",
    facilityId: 7,
    channel: "email",
    body: "Scheduling your quarterly account review — proposing a 30-minute call later this week to go over usage, billing, and the upcoming roadmap.",
    agentId: 3,
    offsetMinutes: 2880,
    createdAgoMinutes: 30,
  },
];

/** Resolve the seed against real facilities + agents, anchored to `nowMs`. */
export function buildScheduledSupportMessages(
  nowMs: number,
): ScheduledSupportMessage[] {
  return SEED.map((s) => {
    const facility = facilities.find((f) => f.id === s.facilityId);
    const agent = adminUsers.find((u) => u.id === s.agentId);
    return {
      id: s.id,
      facilityId: s.facilityId,
      facilityName: facility?.name ?? `Facility #${s.facilityId}`,
      channel: s.channel,
      body: s.body,
      scheduledFor: new Date(nowMs + s.offsetMinutes * 60_000).toISOString(),
      createdAt: new Date(nowMs - s.createdAgoMinutes * 60_000).toISOString(),
      createdBy: agent?.name ?? "Yipyy Support",
    };
  }).sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : 1));
}
