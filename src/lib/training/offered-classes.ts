import { formatTimeOfDay, formatWeekday } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { fill } from "@/lib/medications/dose";

// A training class as the booking wizard's "Pick a class" lists it (the
// client's mock, 2026-10-01) — what `offered_training_classes()` answers
// (20261002122924), read through `/api/training/classes` (staff) and
// `/api/customer/training/classes`.

export interface OfferedClass {
  id: string;
  name: string;
  courseTypeName: string;
  /** The facility program it runs; null for a class made before the link. */
  programId: string | null;
  dayOfWeek: number;
  /** "HH:MM". */
  startTime: string;
  durationMinutes: number;
  startDate: string;
  numberOfSessions: number;
  sessionsLeft: number;
  nextSessionAt: string | null;
  capacity: number;
  /** Places left — capacity minus every enrolled dog. */
  spotsLeft: number;
  totalPrice: number;
  taxable: boolean;
  locationId: string | null;
  /** Staff: the full name. A customer: "Alex M.", or null. */
  trainerName: string | null;
}

/** The projection's rows, tolerant of numbers sent as strings. */
export function parseOfferedClasses(value: unknown): OfferedClass[] {
  if (!Array.isArray(value)) return [];
  const num = (v: unknown) => {
    const n = typeof v === "string" ? Number(v) : (v as number);
    return Number.isFinite(n) ? n : 0;
  };
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || typeof r.name !== "string") return [];
    return [
      {
        id: r.id,
        name: r.name,
        courseTypeName:
          typeof r.courseTypeName === "string" ? r.courseTypeName : "",
        programId: typeof r.programId === "string" ? r.programId : null,
        dayOfWeek: num(r.dayOfWeek),
        startTime: typeof r.startTime === "string" ? r.startTime : "00:00",
        durationMinutes: num(r.durationMinutes),
        startDate: typeof r.startDate === "string" ? r.startDate : "",
        numberOfSessions: num(r.numberOfSessions),
        sessionsLeft: num(r.sessionsLeft),
        nextSessionAt:
          typeof r.nextSessionAt === "string" ? r.nextSessionAt : null,
        capacity: num(r.capacity),
        spotsLeft: num(r.spotsLeft),
        totalPrice: num(r.totalPrice),
        taxable: r.taxable !== false,
        locationId: typeof r.locationId === "string" ? r.locationId : null,
        trainerName: typeof r.trainerName === "string" ? r.trainerName : null,
      },
    ];
  });
}

/**
 * A program's classes: the ones linked to it; else, for a class made before
 * the link, one whose name or course overlaps the program's (the catalogue's
 * old rule); and when the facility runs ONE group program, every class — the
 * mock's single "Group class" with Puppy Foundations and Adult Obedience
 * under it.
 */
export function classesForProgram(
  classes: readonly OfferedClass[],
  program: { id: string; name: string },
  groupProgramCount: number,
): OfferedClass[] {
  const normalize = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(package|pack|class|course|training)\b/g, "")
      .trim();
  const target = normalize(program.name);
  return classes.filter((c) => {
    if (c.programId) return c.programId === program.id;
    if (groupProgramCount <= 1) return true;
    const candidate = normalize(c.courseTypeName || c.name);
    return (
      !!target &&
      !!candidate &&
      (candidate.includes(target) || target.includes(candidate))
    );
  });
}

/** "Saturdays · 10:00 AM" — the day and hour the class meets. */
export function classWhen(
  c: Pick<OfferedClass, "dayOfWeek" | "startTime">,
  t: (key: string) => string,
  locale: AppLocale,
): string {
  return fill(t("wizClassWhen"), {
    weekday: formatWeekday(c.dayOfWeek, locale, "long"),
    time: formatTimeOfDay(c.startTime, locale),
  });
}

/**
 * What one dog's place costs: the sessions still ahead, as
 * `enroll_in_training_series` books them (20261002123000) — each at the
 * series' price over its sessions, rounded, and the series' last session at
 * what is left of the price. A whole series is its price to the cent.
 */
export function classPrice(
  c: Pick<OfferedClass, "totalPrice" | "numberOfSessions" | "sessionsLeft">,
): number {
  const cents = (n: number) => Math.round(n * 100) / 100;
  const sessions = c.numberOfSessions;
  const left = Math.min(c.sessionsLeft, sessions);
  if (sessions <= 0 || left <= 0) return 0;
  const each = cents(c.totalPrice / sessions);
  const last = cents(c.totalPrice - each * (sessions - 1));
  // The sessions still ahead are the series' last ones.
  return cents(each * (left - 1) + last);
}

/** The days the dog is in class: the next session, then a week apart. */
export function classSessionDates(
  c: Pick<OfferedClass, "startDate" | "nextSessionAt" | "sessionsLeft">,
): string[] {
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const next = c.nextSessionAt ? new Date(c.nextSessionAt) : null;
  const first = next && !Number.isNaN(next.getTime()) ? ymd(next) : c.startDate;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(first);
  if (!match) return [];
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  return Array.from({ length: Math.max(0, c.sessionsLeft) }, (_, i) =>
    ymd(new Date(y, m - 1, d + 7 * i)),
  );
}
