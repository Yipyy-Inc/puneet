import type { ShiftRecurrence } from "@/types/scheduling";

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateLocal(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

// ─── Day-of-week labels and JS values ────────────────────────────────────────

/** Display labels Mon → Sun */
export const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
/** Corresponding JS Date.getDay() values */
export const DOW_VALUES = [1, 2, 3, 4, 5, 6, 0];

// ─── Recurring date generator ─────────────────────────────────────────────────

/**
 * Expands a recurrence rule into an array of YYYY-MM-DD date strings.
 * All dates are ≥ startDate and satisfy the recurrence rule.
 */
export function generateRecurringDates(
  startDate: string,
  recurrence: ShiftRecurrence,
): string[] {
  const dates: string[] = [];
  const start = parseLocalDate(startDate);

  let maxCount = 365;
  let endBoundary: Date | null = null;

  if (recurrence.endsOn === "count") {
    maxCount = Math.min(recurrence.count ?? 1, 365);
  } else if (recurrence.endsOn === "date" && recurrence.endDate) {
    endBoundary = parseLocalDate(recurrence.endDate);
  } else {
    // "never" → cap at 1 year
    endBoundary = new Date(
      start.getFullYear() + 1,
      start.getMonth(),
      start.getDate(),
    );
  }

  const inBounds = (d: Date): boolean =>
    endBoundary ? d <= endBoundary : true;

  if (recurrence.frequency === "daily") {
    let cur = new Date(start);
    while (dates.length < maxCount && inBounds(cur)) {
      dates.push(formatDateLocal(cur));
      cur.setDate(cur.getDate() + 1);
    }
  } else if (
    recurrence.frequency === "weekly" ||
    recurrence.frequency === "biweekly"
  ) {
    const weekInterval = recurrence.frequency === "biweekly" ? 2 : 1;
    const targetDays = (
      recurrence.daysOfWeek?.length
        ? [...recurrence.daysOfWeek]
        : [start.getDay()]
    ).sort((a, b) => a - b);

    // Monday of the start-date's week
    const dow = start.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const weekMonday = new Date(start);
    weekMonday.setDate(start.getDate() + mondayOffset);

    while (dates.length < maxCount && inBounds(weekMonday)) {
      for (const td of targetDays) {
        // Offset from Monday: Mon=0, Tue=1, …, Sun=6
        const offset = td === 0 ? 6 : td - 1;
        const candidate = new Date(weekMonday);
        candidate.setDate(weekMonday.getDate() + offset);
        if (candidate >= start && inBounds(candidate)) {
          dates.push(formatDateLocal(candidate));
          if (dates.length >= maxCount) break;
        }
      }
      weekMonday.setDate(weekMonday.getDate() + 7 * weekInterval);
    }
  } else if (recurrence.frequency === "monthly") {
    let cur = new Date(start);
    while (dates.length < maxCount && inBounds(cur)) {
      dates.push(formatDateLocal(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  return dates;
}

/** Human-readable summary of a recurrence rule. */
export function getRecurrenceSummary(
  frequency: ShiftRecurrence["frequency"],
  daysOfWeek: number[],
  endsOn: "never" | "date" | "count",
  endDate: string,
  occurrences: string,
): string {
  const freqLabels: Record<ShiftRecurrence["frequency"], string> = {
    daily: "Every day",
    weekly: "Every week",
    biweekly: "Every 2 weeks",
    monthly: "Every month",
  };
  let summary = freqLabels[frequency];
  if ((frequency === "weekly" || frequency === "biweekly") && daysOfWeek.length) {
    const dayNames = DOW_VALUES.map((v, i) =>
      daysOfWeek.includes(v) ? DOW_LABELS[i] : null,
    ).filter(Boolean);
    summary += ` · ${dayNames.join(", ")}`;
  }
  if (endsOn === "date" && endDate) summary += ` until ${endDate}`;
  else if (endsOn === "count") summary += ` · ${occurrences}×`;
  return summary;
}
