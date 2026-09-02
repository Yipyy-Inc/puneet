import type { CallLog } from "@/types/communications";

// ============================================================================
// The calls a facility has, as the Calling screens expect them.
//
// ── WHY AN ADAPTER RATHER THAN CHANGING THE SCREENS ───────────────────────
//
// `CallingWorkspace` is 1,839 lines and thirteen places read its `logs`. The
// roadmap's own warning about this component is to strangle it tab by tab and
// never rewrite it wholesale, so the swap happens at the ONE point the data
// enters and every consumer keeps working.
//
// ── WHAT THE DATABASE DOES NOT HAVE, AND WHY IT IS UNDEFINED ──────────────
//
// The fixture carried fields no call record has yet. They are left undefined
// rather than defaulted, because every one of them is something the screen can
// already handle being absent, and a plausible-looking default is how a fixture
// becomes indistinguishable from a fact:
//
//   recordingUrl, transcription  `call_recording` is a SEPARATE table behind
//                                `calling_view_recordings`. Joining it here
//                                would hand a recording to anyone holding
//                                `calling_view`.
//   clientId, clientName         ANI matching is Phase 3's screen-pop work.
//                                `call_record.client_match` already records
//                                how confident that lookup was, so the number
//                                will arrive with its own denominator.
//   aiSummary, sentiment         Phase 6.
//   queueWaitSeconds             Nothing measures it yet. Zero would be a
//                                claim that callers wait no time at all.
//
// ── AND A RINGING CALL IS NOT A LOG ENTRY ─────────────────────────────────
//
// `call_record.status` has six values; `CallLog` has four. `ringing` and
// `in_progress` are calls in flight, not history, and they are dropped here
// rather than mapped to something that reads as finished. The Live tab is what
// shows a call in progress.
// ============================================================================

/** One row of `call_record`, as the route returns it. */
export interface CallRecordRow {
  id: string;
  provider_call_sid: string;
  direction: "inbound" | "outbound";
  from_number: string | null;
  to_number: string | null;
  status: string;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_s: number | null;
  client_id: string | null;
  client_match: string;
  handled_by: string | null;
  location_id: string | null;
  notes: string | null;
  tags: string[] | null;
  follow_up_status: string | null;
  qa_score: number | null;
  booking_id: string | null;
  attribution_source: string | null;
}

export interface CallsPayload {
  calls: CallRecordRow[];
  /** True when a filter was applied — so "none yet" and "none matching" differ. */
  filtered: boolean;
}

const FOLLOW_UP = new Set(["pending", "in_progress", "completed", "no_action"]);

/** A stored call as the screens read it, or null for one still in flight. */
export function toCallLog(row: CallRecordRow): CallLog | null {
  const status =
    row.status === "completed" ||
    row.status === "missed" ||
    row.status === "voicemail" ||
    row.status === "failed"
      ? row.status
      : null;
  if (!status) return null;

  return {
    id: row.id,
    type: row.direction,
    from: row.from_number ?? "",
    to: row.to_number ?? "",
    duration: row.duration_s ?? 0,
    status,
    timestamp: row.started_at ?? row.ended_at ?? new Date(0).toISOString(),
    notes: row.notes ?? undefined,
    tags: row.tags ?? undefined,
    followUpStatus: FOLLOW_UP.has(row.follow_up_status ?? "")
      ? (row.follow_up_status as CallLog["followUpStatus"])
      : undefined,
    handledBy: row.handled_by ?? undefined,
    qaScore: row.qa_score ?? undefined,
    // Nothing routes an AI handler yet. `false` is the measured answer, not a
    // placeholder: no call in this table was handled by one.
    aiHandled: false,
  };
}

export const callingQueries = {
  calls: (params?: { status?: string; followUp?: "open" }) => ({
    queryKey: ["calling", "calls", params ?? {}] as const,
    queryFn: async (): Promise<{ logs: CallLog[]; filtered: boolean }> => {
      const search = new URLSearchParams();
      if (params?.status && params.status !== "all") {
        search.set("status", params.status);
      }
      if (params?.followUp) search.set("followUp", params.followUp);

      const response = await fetch(
        `/api/facility/calling/calls${search.size ? `?${search}` : ""}`,
      );
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(detail?.error ?? `Failed (${response.status})`);
      }
      const payload = (await response.json()) as CallsPayload;
      return {
        logs: payload.calls
          .map(toCallLog)
          .filter((c): c is CallLog => c !== null),
        filtered: payload.filtered,
      };
    },
  }),
};
