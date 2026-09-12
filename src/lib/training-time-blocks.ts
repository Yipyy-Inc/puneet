/**
 * Calendar time blocks — facility-curated "this slot is unavailable" markers
 * on the training calendar. Drives the striped overlay that keeps new
 * sessions out of a slot held for trainer downtime, equipment maintenance, a
 * room booking conflict and so on.
 *
 * ── A BLOCK IS A CALENDAR EVENT ─────────────────────────────────────────────
 *
 * This was a list in the query cache (`fanOutTimeBlockUpsert`): "Time
 * blocked" was toasted, and the block was gone on reload and invisible to
 * everybody else. It is a `calendar_events` row of kind `block-time` now —
 * the same row the facility calendar's "Block time" and the grooming
 * calendar's time blocks write (20260910223523). A trainer's block is aimed
 * at the trainer (`affects: "staff"`, `affectedStaff` = the trainer id); a
 * facility-wide one at the facility. So a closure blocked on the facility
 * calendar shows here too, and one blocked here shows there.
 */
import type { ManualFacilityEvent } from "@/lib/operations-calendar";

/** Common reasons surfaced as quick-pick chips on the Block Time dialog. */
export type BlockTimeReasonKind =
  | "trainer-unavailable"
  | "equipment-maintenance"
  | "facility-closed"
  | "private-event"
  | "other";

export const BLOCK_TIME_REASON_LABELS: Record<BlockTimeReasonKind, string> = {
  "trainer-unavailable": "Trainer unavailable",
  "equipment-maintenance": "Equipment maintenance",
  "facility-closed": "Facility closed",
  "private-event": "Private event / off-site",
  other: "Other",
};

export interface TrainingTimeBlock {
  id: string;
  /** YYYY-MM-DD — the day the block starts and the day it ends. */
  startDate: string;
  endDate: string;
  /** HH:MM (24-hour, the facility's wall clock). */
  startTime: string;
  endTime: string;
  /** Who the block is aimed at: a trainer id (this calendar, the grooming
   *  one) or a name (the facility calendar's "Block time" stores the name).
   *  Unset blocks the slot in every trainer column — a facility closure. */
  staff?: string;
  /** What the block says — the reason's label, or the facility calendar's
   *  own title for a block made there. */
  label: string;
  reasonNote?: string;
}

/** The block-time events this calendar draws: aimed at a person, or at the
 *  whole facility. One aimed at a room (`affects: "resource"`) does not stop
 *  a trainer, and a deleted one — recoverable for 30 days — stops nobody. */
export function trainingBlocksFromEvents(
  events: ManualFacilityEvent[],
): TrainingTimeBlock[] {
  const out: TrainingTimeBlock[] = [];
  for (const e of events) {
    if (e.kind !== "block-time" || e.deletedAt) continue;
    if (e.affects === "resource") continue;
    if (e.affects === "staff" && !e.affectedStaff) continue;
    const [startDate, startTime = "00:00"] = e.start.split("T");
    const [endDate, endTime = "23:59"] = e.end.split("T");
    out.push({
      id: e.id,
      startDate,
      endDate,
      startTime: e.allDay ? "00:00" : startTime.slice(0, 5),
      endTime: e.allDay ? "23:59" : endTime.slice(0, 5),
      staff: e.affects === "staff" ? e.affectedStaff : undefined,
      label: e.title,
      reasonNote: e.notes || undefined,
    });
  }
  return out;
}

/** The calendar event a block from this calendar is saved as. */
export function eventFromTrainingBlock(block: {
  date: string;
  startTime: string;
  endTime: string;
  trainerId?: string;
  trainerName?: string;
  reasonKind: BlockTimeReasonKind;
  reasonNote?: string;
}): ManualFacilityEvent {
  return {
    id: "",
    title: BLOCK_TIME_REASON_LABELS[block.reasonKind],
    subtype: "blocked-time",
    kind: "block-time",
    start: `${block.date}T${block.startTime}`,
    end: `${block.date}T${block.endTime}`,
    allDay: false,
    location: "",
    staff: block.trainerId ? (block.trainerName ?? "") : "",
    // french-ok: a stored status value, the one the facility calendar writes
    status: "Scheduled",
    notes: block.reasonNote,
    affects: block.trainerId ? "staff" : "facility",
    affectedStaff: block.trainerId,
    visibility: "all-staff",
  };
}

/** The blocks in one trainer's column on one day, clipped to that day. A
 *  block aimed at nobody in particular is in every column. */
export function blocksForTrainerOnDate(
  blocks: TrainingTimeBlock[],
  date: string,
  trainer: { id: string; name: string },
): TrainingTimeBlock[] {
  return blocks
    .filter(
      (b) =>
        b.startDate <= date &&
        b.endDate >= date &&
        (!b.staff || b.staff === trainer.id || b.staff === trainer.name),
    )
    .map((b) => ({
      ...b,
      startTime: b.startDate === date ? b.startTime : "00:00",
      endTime: b.endDate === date ? b.endTime : "23:59",
    }));
}

/** Convert HH:MM → minutes-since-midnight, used to position blocks on the
 *  day view's pixel grid. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Round a minutes-since-midnight value down to the nearest 30-minute slot.
 *  Used when generating a default endTime from a click position. */
export function snapToHalfHour(minutes: number): number {
  return Math.floor(minutes / 30) * 30;
}

export function minutesToTime(minutes: number): string {
  const m = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
