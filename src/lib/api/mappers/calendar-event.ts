import type { ManualFacilityEvent } from "@/lib/operations-calendar";
import type { TablesInsert } from "@/types/database";
import { instantFromWallClock, wallClockParts } from "@/lib/time/facility-time";

// ============================================================================
// public.calendar_events ⇄ the calendar's `ManualFacilityEvent`.
//
// The calendar speaks naive wall-clock strings ("2026-09-10T09:00:00") and
// the table stores instants, so both directions go through the facility's own
// time zone — the same rule every booking follows (lib/time/facility-time.ts).
// Everything the database does not reason about stays in `event` as the
// calendar wrote it.
// ============================================================================

export const CALENDAR_EVENT_SELECT =
  "id, kind, title, starts_at, ends_at, all_day, private_to, event, deleted_at, created_by_name, created_at";

export type CalendarEventRow = {
  id: string;
  kind: "custom-event" | "block-time";
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  private_to: string | null;
  event: Partial<ManualFacilityEvent> | null;
  deleted_at: string | null;
  created_by_name: string | null;
  created_at: string;
};

function wall(timestamp: string, timeZone: string): string {
  const { date, time } = wallClockParts(timestamp, timeZone);
  return `${date}T${time}:00`;
}

export function rowToManualEvent(
  row: CalendarEventRow,
  timeZone: string,
): ManualFacilityEvent {
  const stored = row.event ?? {};
  return {
    ...stored,
    id: row.id,
    title: row.title,
    kind: row.kind,
    subtype:
      stored.subtype ??
      (row.kind === "block-time" ? "blocked-time" : "custom-event"),
    start: wall(row.starts_at, timeZone),
    end: wall(row.ends_at, timeZone),
    allDay: row.all_day,
    location: stored.location ?? "",
    staff: stored.staff ?? "",
    status: stored.status ?? "Scheduled",
    createdAt: row.created_at,
    createdByName: row.created_by_name ?? stored.createdByName,
    deletedAt: row.deleted_at ?? undefined,
    // The database only returns a private event to its author, so the
    // calendar's own per-viewer filter has nothing left to hide.
    privateToUser: undefined,
  } as ManualFacilityEvent;
}

/** The columns an event writes. The facility is the caller's to supply. */
export function manualEventToColumns(
  event: ManualFacilityEvent,
  timeZone: string,
): Pick<
  TablesInsert<"calendar_events">,
  "kind" | "title" | "starts_at" | "ends_at" | "all_day" | "event"
> {
  const kind =
    event.kind ??
    (event.subtype === "blocked-time" ? "block-time" : "custom-event");
  const [startDate, startTime = "00:00"] = event.start.split("T");
  const [endDate, endTime = "23:59"] = event.end.split("T");
  // What the columns already say is not kept twice.
  const {
    id: _id,
    title: _title,
    start: _start,
    end: _end,
    allDay: _allDay,
    deletedAt: _deletedAt,
    createdAt: _createdAt,
    privateToUser: _private,
    ...rest
  } = event;
  return {
    kind,
    title: event.title.trim(),
    starts_at: instantFromWallClock(startDate, startTime.slice(0, 5), timeZone),
    ends_at: instantFromWallClock(endDate, endTime.slice(0, 5), timeZone),
    all_day: event.allDay,
    event: rest as TablesInsert<"calendar_events">["event"],
  };
}
