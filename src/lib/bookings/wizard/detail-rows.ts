import type { AppLocale } from "@/lib/language-settings";
import {
  formatDateShort,
  formatDuration,
  formatTimeOfDay,
  formatWeekdayDate,
} from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";

// ============================================================================
// The "{KIND} DETAILS" card on Confirm (the client's mock, 2026-10-01): one
// row per thing the Details screens asked, in their order, each knowing which
// screen to reopen. Pure: the wizard passes the facts, already in words where
// another module owns the words (a feeding plan, a medication).
// ============================================================================

type Translate = (key: string) => string;

/** Where Edit goes: a step, and a Details screen by its fixed id. */
export interface DetailEdit {
  step: "client-pet" | "service" | "details";
  subStepId?: number;
}

export interface DetailRowFacts {
  key: string;
  label: string;
  value: string;
  edit?: DetailEdit;
}

export interface DetailFacts {
  service: string;
  /** Boarding and the appointment services. */
  start?: Date | string | null;
  end?: Date | string | null;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  /** Boarding: each pet's room. */
  rooms?: Array<{ pet: string; room: string | null }>;
  sharing?: boolean;
  /** Daycare. */
  days?: Array<Date | string>;
  dayType?: string | null;
  /** Grooming: each pet's groom. */
  grooms?: Array<{ pet: string; groom: string | null }>;
  /** Minutes the appointment runs, add-ons included. */
  minutes?: number;
  staffName?: string | null;
  /** Training: the program, and a lesson pack's sessions ("· 3-pack"). */
  program?: string | null;
  pack?: number;
  /** A group program's class; undefined for a lesson or a consult. */
  trainingClass?: { name: string; when: string; start: Date | string } | null;
  /** A lesson's or a consult's slot. */
  trainingSlot?: {
    date: Date | string;
    start: string;
    staffName?: string | null;
  } | null;
  goals?: string[];
  /** Already in words; undefined hides the row. */
  experience?: string | null;
  addOnCount: number;
  /** Already in words; null hides the row (the facility turned the step off). */
  feeding: string | null;
  medication: string | null;
}

const ADD_ONS_SUB = {
  boarding: 2,
  daycare: 2,
  grooming: 1,
  evaluation: 1,
} as Record<string, number>;

export function detailRows(
  facts: DetailFacts,
  t: Translate,
  locale: AppLocale,
): DetailRowFacts[] {
  const day = (value: Date | string | null | undefined) =>
    value ? formatWeekdayDate(value, locale) : "—";
  const time = (value?: string) =>
    value ? formatTimeOfDay(value, locale) : "—";
  const dash = "—";
  const rows: DetailRowFacts[] = [];
  const addOns: DetailRowFacts = {
    key: "add-ons",
    label: t("addOnsLabel"),
    value:
      facts.addOnCount > 0
        ? fill(t("wizSelectedCount"), { count: facts.addOnCount })
        : t("wizNone"),
    edit: { step: "details", subStepId: ADD_ONS_SUB[facts.service] ?? 1 },
  };
  const care: DetailRowFacts[] = [];
  if (facts.feeding !== null) {
    care.push({
      key: "feeding",
      label: t("feeding"),
      value: facts.feeding || t("wizNone"),
      edit: { step: "details", subStepId: 3 },
    });
  }
  if (facts.medication !== null) {
    care.push({
      key: "medication",
      label: t("subMedication"),
      value: facts.medication || t("wizNone"),
      edit: { step: "details", subStepId: 4 },
    });
  }

  if (facts.service === "boarding") {
    rows.push(
      {
        key: "check-in",
        label: t("wizCheckIn"),
        value: facts.start
          ? `${day(facts.start)} · ${time(facts.checkIn)}`
          : dash,
        edit: { step: "details", subStepId: 0 },
      },
      {
        key: "check-out",
        label: t("wizCheckOut"),
        value: facts.end ? `${day(facts.end)} · ${time(facts.checkOut)}` : dash,
        edit: { step: "details", subStepId: 0 },
      },
      {
        key: "nights",
        label: t("wizNights"),
        value: String(facts.nights ?? 0),
        edit: { step: "details", subStepId: 0 },
      },
      {
        key: "rooms",
        label: t("wizRooms"),
        value:
          (facts.rooms ?? [])
            .map((r) => `${r.pet} → ${r.room ?? dash}`)
            .join(" · ") + (facts.sharing ? ` ${t("wizSharingNote")}` : ""),
        edit: { step: "details", subStepId: 1 },
      },
      addOns,
      ...care,
    );
    return rows;
  }

  if (facts.service === "daycare") {
    const days = facts.days ?? [];
    rows.push(
      {
        key: "dates",
        label: t("wizDates"),
        value:
          days.length > 0
            ? days.map((d) => formatDateShort(d, locale)).join(", ")
            : dash,
        edit: { step: "details", subStepId: 0 },
      },
      {
        key: "day-type",
        label: t("wizDayType"),
        value: facts.dayType || dash,
        edit: { step: "details", subStepId: 0 },
      },
      {
        key: "drop-off",
        label: t("wizDropOff"),
        value: time(facts.checkIn),
        edit: { step: "details", subStepId: 0 },
      },
      {
        key: "pick-up",
        label: t("wizPickUp"),
        value: time(facts.checkOut),
        edit: { step: "details", subStepId: 0 },
      },
      addOns,
      ...care,
    );
    return rows;
  }

  if (facts.service === "grooming") {
    const length =
      facts.minutes && facts.minutes > 0
        ? ` (${formatDuration(facts.minutes, locale)})`
        : "";
    rows.push(
      {
        key: "groom",
        label: t("wizGroom"),
        value:
          (facts.grooms ?? [])
            .map((g) => `${g.pet} → ${g.groom ?? dash}`)
            .join(" · ") || dash,
        edit: { step: "details", subStepId: 0 },
      },
      addOns,
      {
        key: "date",
        label: t("wizDate"),
        value: facts.start ? day(facts.start) : dash,
        edit: { step: "details", subStepId: 2 },
      },
      {
        key: "time",
        label: t("wizTime"),
        value: facts.checkIn
          ? `${time(facts.checkIn)}${facts.checkOut ? ` – ${time(facts.checkOut)}` : ""}${length}`
          : dash,
        edit: { step: "details", subStepId: 2 },
      },
      {
        key: "groomer",
        label: t("wizGroomer"),
        value: facts.staffName || dash,
        edit: { step: "details", subStepId: 2 },
      },
      ...care,
    );
    return rows;
  }

  if (facts.service === "training") {
    const pack = facts.pack ?? 1;
    rows.push({
      key: "program",
      label: t("wizProgram"),
      value: facts.program
        ? pack > 1
          ? fill(t("wizProgramPack"), { program: facts.program, count: pack })
          : facts.program
        : dash,
      edit: { step: "details", subStepId: 0 },
    });
    if (facts.trainingClass !== undefined) {
      // A group program: the class, "Puppy Foundations · Saturdays · 10:00
      // AM · starts Oct 17".
      const c = facts.trainingClass;
      rows.push({
        key: "class",
        label: t("wizClass"),
        value: c
          ? fill(t("wizClassStarts"), {
              name: c.name,
              when: c.when,
              date: formatDateShort(c.start, locale),
            })
          : dash,
        edit: { step: "details", subStepId: 1 },
      });
    } else {
      // A lesson or a consult: "Fri, Oct 2 · 11:00 AM with Alex M."
      const slot = facts.trainingSlot;
      rows.push({
        key: "session",
        label: t("wizSession"),
        value: slot
          ? slot.staffName
            ? fill(t("wizSessionWith"), {
                date: day(slot.date),
                time: time(slot.start),
                trainer: slot.staffName,
              })
            : `${day(slot.date)} · ${time(slot.start)}`
          : dash,
        edit: { step: "details", subStepId: 1 },
      });
    }
    if (facts.goals !== undefined) {
      rows.push({
        key: "goals",
        label: t("wizGoals"),
        value:
          facts.goals.length > 0 ? facts.goals.join(", ") : t("wizNonePicked"),
        edit: { step: "details", subStepId: 2 },
      });
    }
    if (facts.experience !== undefined) {
      rows.push({
        key: "experience",
        label: t("wizExperience"),
        value: facts.experience || dash,
        edit: { step: "details", subStepId: 2 },
      });
    }
    rows.push(...care);
    return rows;
  }

  // An evaluation, a custom service: when, and its extras.
  rows.push(
    {
      key: "date",
      label: t("wizDate"),
      value: facts.start ? day(facts.start) : dash,
      edit: { step: "details", subStepId: 0 },
    },
    {
      key: "time",
      label: t("wizTime"),
      value: facts.checkIn
        ? `${time(facts.checkIn)}${facts.checkOut ? ` – ${time(facts.checkOut)}` : ""}`
        : dash,
      edit: { step: "details", subStepId: 0 },
    },
  );
  if (facts.service === "evaluation") rows.push(addOns);
  return rows;
}
