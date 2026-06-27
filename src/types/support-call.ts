// Types for the admin "Yipyy Support Calls" module (facilities phoning Yipyy
// support). Distinct from the facility-side calling module.

import type { FollowUpStatus } from "@/types/communications";

export type MissedCallStatus = "unresolved" | "called_back" | "pending";

export interface SupportQueuedCall {
  id: string;
  callerNumber: string;
  /** Seconds already spent waiting when the page loaded (ticks up live). */
  waitSeconds: number;
}

export interface SupportMissedCall {
  id: string;
  callerNumber: string;
  minutesAgo: number;
  autoSmsSent: boolean;
  status: MissedCallStatus;
}

export interface SupportCallStats {
  online: boolean;
  voicemails: number;
  todayInbound: number;
  todayOutbound: number;
}

/** A caller resolved against the facility phone-number directory. */
export interface ResolvedCaller {
  facilityId: number;
  facilityName: string;
}

// --- Call Log -------------------------------------------------------------

export type SupportCallDirection = "inbound" | "outbound";
export type SupportCallLogStatus = "completed" | "missed" | "voicemail";
/** Which support desk took the call (shown as the row's department tag and the
 *  detail panel's "Inquiry department"). */
export type SupportDepartment = "billing" | "technical" | "general";

/** Who handled the call — a support agent or the AI Assistant. */
export interface SupportCallHandler {
  kind: "agent" | "ai";
  name: string;
}

export interface SupportCallLogEntry {
  id: string;
  direction: SupportCallDirection;
  /** The facility/caller number (the non-Yipyy side of the call). */
  callerNumber: string;
  status: SupportCallLogStatus;
  department: SupportDepartment;
  /** Call duration in seconds (0 for a missed call). */
  durationSeconds: number;
  /** Who handled the call; null for a missed call. */
  handledBy: SupportCallHandler | null;
  /** Which support team/line took the call (the "Location" filter dimension). */
  team: string;
  /** ISO timestamp of the call. */
  at: string;
  followUpStatus: FollowUpStatus;
  /** Assigned agent name, or null when unassigned. */
  assignedTo: string | null;
  /** CallTag ids (the manager-defined taxonomy). */
  tags: string[];
  notes: string;
}

// --- Voicemail ------------------------------------------------------------

export type SupportVoicemailStatus = "pending" | "resolved";

export interface SupportVoicemail {
  id: string;
  /** The caller's number (resolved to a facility via lookupFacilityByPhone). */
  callerNumber: string;
  /** ISO timestamp the voicemail was left. */
  receivedAt: string;
  durationSeconds: number;
  /** AI/STT transcript of the message (arrives via the Twilio recording
   *  webhook in production; seeded here). */
  transcription: string;
  /** Unplayed — drives the NEW badge. */
  isNew: boolean;
  status: SupportVoicemailStatus;
}

// --- Recordings -----------------------------------------------------------

/** Why the AI flagged a recording for review. */
export type RecordingFlagReason = "low_sentiment" | "complaint_keyword";

export interface SupportRecording {
  id: string;
  /** The facility/caller number (resolved via lookupFacilityByPhone). */
  callerNumber: string;
  agentId: number;
  agentName: string;
  /** ISO timestamp of the call. */
  at: string;
  durationSeconds: number;
  /** Manager QA score 0–5 (decimals allowed), or null when not yet scored. */
  qaScore: number | null;
  flagged: boolean;
  flagReason: RecordingFlagReason | null;
  /** AI sentiment 0–10 (feeds the low-sentiment flag). */
  sentimentScore: number;
  transcript: string;
}
