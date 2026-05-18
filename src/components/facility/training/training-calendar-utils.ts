import type { TrainingClassStatus } from "@/types/training";

export const HOUR_HEIGHT = 64;
export const START_HOUR = 8;
export const END_HOUR = 21;
export const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);

export type TrainingViewMode = "day" | "week" | "month";

export const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];
export const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const STATUS_META: Record<
  TrainingClassStatus,
  { bg: string; text: string; dot: string; pill: string; label: string }
> = {
  scheduled: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    text: "text-blue-900 dark:text-blue-100",
    dot: "bg-blue-500",
    pill: "bg-blue-500",
    label: "Scheduled",
  },
  "in-progress": {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-900 dark:text-amber-100",
    dot: "bg-amber-500",
    pill: "bg-amber-500",
    label: "In Progress",
  },
  completed: {
    bg: "bg-gray-100 dark:bg-gray-700/40",
    text: "text-gray-600 dark:text-gray-300",
    dot: "bg-gray-400",
    pill: "bg-gray-400",
    label: "Completed",
  },
  cancelled: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-500 dark:text-red-400",
    dot: "bg-red-400",
    pill: "bg-red-400",
    label: "Cancelled",
  },
};

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

export function getWeekStart(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-first
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWeekDays(dateStr: string): Date[] {
  const start = getWeekStart(dateStr);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function getMonthDays(dateStr: string): (Date | null)[] {
  const ref = new Date(dateStr + "T00:00:00");
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = firstDay === 0 ? 6 : firstDay - 1;
  const cells: (Date | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

const TRAINER_PALETTE = [
  "#6366f1", // indigo — matches the module's brand gradient
  "#10b981", // emerald
  "#f97316", // orange
  "#a855f7", // purple
  "#0ea5e9", // sky
  "#ec4899", // pink
  "#14b8a6", // teal
  "#eab308", // yellow
];

export function colorForTrainer(trainerId: string): string {
  let hash = 0;
  for (let i = 0; i < trainerId.length; i++) {
    hash = (hash * 31 + trainerId.charCodeAt(i)) | 0;
  }
  return TRAINER_PALETTE[Math.abs(hash) % TRAINER_PALETTE.length];
}
