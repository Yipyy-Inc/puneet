import { getTemplatesForModule } from "@/data/task-templates";
import type { TaskTemplate } from "@/types/task";

export type TodayTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "missed";

export type TodayTask = {
  id: string;
  templateId: string;
  name: string;
  category: TaskTemplate["category"];
  assignedTo: string;
  scheduledAt: string;
  status: TodayTaskStatus;
  isRequired: boolean;
  /** Synthesised label so the Today's Tasks board can filter by booking. */
  bookingLabel?: string;
};

const BOOKING_LABEL_POOL = [
  "Booking #1042 — Luna",
  "Booking #1043 — Max",
  "Booking #1044 — Mochi",
  "Booking #1045 — Biscuit",
];

/**
 * Build a per-day task list from the module's auto-create templates. The
 * mock shape keeps a stand-in `bookingLabel` so the UI's "filter by booking"
 * has options to work with until real generated tasks are wired in.
 */
export function buildTodayTasks(templates: TaskTemplate[]): TodayTask[] {
  return templates
    .filter((t) => t.autoCreate)
    .map((t, i) => ({
      id: `today-${t.id}-${i}`,
      templateId: t.id,
      name: t.name,
      category: t.category,
      assignedTo: t.assignTo === "booking_staff" ? "Alex R." : "Any Staff",
      scheduledAt:
        t.timing.type === "custom_time" && t.timing.customTime
          ? t.timing.customTime
          : t.timing.type === "before_start"
            ? "08:45 AM"
            : t.timing.type === "at_start"
              ? "09:00 AM"
              : t.timing.type === "at_end"
                ? "05:00 PM"
                : t.timing.type === "after_end"
                  ? "05:30 PM"
                  : "All day",
      status: (
        ["pending", "in_progress", "completed"] as const
      )[i % 3],
      isRequired: t.isRequired,
      bookingLabel: BOOKING_LABEL_POOL[i % BOOKING_LABEL_POOL.length],
    }));
}

/**
 * Parse a `scheduledAt` label like "08:45 AM" / "5:00 PM" / "All day".
 * Returns minutes-since-midnight or null when the value isn't a clock time.
 */
export function parseScheduledTime(scheduledAt: string): number | null {
  const match = scheduledAt.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * True when the scheduled time is in the past relative to `now`. "All day"
 * (and any unparseable value) returns false — those never auto-miss.
 */
export function isTaskPastDue(scheduledAt: string, now: Date = new Date()): boolean {
  const target = parseScheduledTime(scheduledAt);
  if (target === null) return false;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin > target;
}

/**
 * Lightweight derivation used by the Calendar sidebar to surface a "X missed"
 * tile without needing a shared store with the Tasks tab. A task counts as
 * missed when it was auto-created, has not been completed/started, and its
 * scheduled time is in the past.
 */
export function getMissedTaskCountForModule(
  moduleId: string,
  now: Date = new Date(),
): number {
  const tasks = buildTodayTasks(getTemplatesForModule(moduleId));
  return tasks.filter(
    (t) => t.status === "pending" && isTaskPastDue(t.scheduledAt, now),
  ).length;
}
