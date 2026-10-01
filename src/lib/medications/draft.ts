import type { AppLocale } from "@/lib/language-settings";
import {
  doseWords,
  isFractional,
  parseAmount,
  round2,
  type Translate,
} from "@/lib/medications/dose";
import { controlledSubstance } from "@/lib/medications/controlled";
import {
  activeDays,
  doseTimes,
  hasCheckoutDay,
  supplyCheck,
  type MedStay,
  type SupplyCheck,
} from "@/lib/medications/schedule";
import {
  asksForSide,
  CUSTOM_TIME_DEFAULT,
  DAY_RULES,
  DOSE,
  isMedUnit,
  MED_METHODS,
  methodImpliedBy,
  pageFormOf,
  type MedPageForm,
  type MedUnit,
} from "@/lib/medications/vocabulary";
import {
  isCustomMethod,
  methodRow,
  offeredSlots,
  providedFor,
  type MedicationInstructions,
} from "@/lib/settings/medication-instructions";
import type { MedDayRule, MedFood, MedSide, MedSplitBy } from "@/types/base";
import type { MedicationItem, SavedMedication } from "@/types/booking";

// ============================================================================
// One medication while it is being written — the Medications step's editor —
// and the booking record it becomes.
//
// The record keeps the fields every older screen reads (`amount` in words,
// `frequency`, `times`, `adminInstructions`, `givenWith`…) beside the step's
// own (`doseAmount`, `dayRule`, `food`…), so the booking page, the daily care
// board and a kennel card read a new medication as they read an old one.
// ============================================================================

export interface MedicationDraft {
  /** The id the medication is saved under; kept across edits. */
  id: string;
  profileId?: string;
  petId?: number;
  name: string;
  strength: string;
  form: MedPageForm;
  amount: number;
  unit: MedUnit;
  customUnit: string;
  splitBy: MedSplitBy;
  side: MedSide;
  dayRule: MedDayRule;
  certainDays: string[];
  /** The facility's dose times picked with one tap — the vocabulary's or its own. */
  slots: string[];
  /** Any other times, `HH:MM`, in the order they were added. */
  custom: string[];
  food: MedFood;
  /** A way of giving: the vocabulary's, or one the facility added (`method-…`). */
  method: string;
  /** The facility's name for its own way of giving, as a booking stored it. */
  methodLabel: string;
  source: "own" | "facility";
  waived: boolean;
  /** As typed. */
  supply: string;
  notes: string;
  allergies: string[];
  saveToProfile: boolean;
  /** The owner confirmed the original pharmacy label. */
  labelConfirmed: boolean;
  /** What an older record says that the step does not ask, kept as it was. */
  carry: Partial<MedicationItem>;
}

export interface DraftContext {
  settings: MedicationInstructions;
  stay: MedStay;
}

export function newMedicationId(): string {
  return `med-${crypto.randomUUID()}`;
}

/**
 * The day choices this stay offers. An overnight stay offers what the facility
 * chose; a daycare booking has no checkout day, so it offers every booked day
 * and, if the facility allows it, certain dates.
 */
export function offeredDayRules(
  settings: Pick<MedicationInstructions, "dayRules">,
  stay: MedStay,
): MedDayRule[] {
  if (!hasCheckoutDay(stay)) {
    return settings.dayRules.includes("certain_dates")
      ? ["every_day", "certain_dates"]
      : ["every_day"];
  }
  return DAY_RULES.filter((rule) => settings.dayRules.includes(rule));
}

/** Certain dates start as every day but checkout, as the design has it. */
function startingDays(stay: MedStay): string[] {
  return hasCheckoutDay(stay) ? stay.days.slice(0, -1) : [...stay.days];
}

/**
 * A new, empty medication for `petId`, at the dose times the facility
 * pre-selects (else the first it offers, else a custom time).
 */
export function blankDraft(
  petId: number | undefined,
  { settings, stay }: DraftContext,
): MedicationDraft {
  const form = settings.forms[0] ?? "tablet";
  const offered = offeredSlots(settings);
  const picked = offered.filter((row) => row.preselected);
  const slots = (picked.length > 0 ? picked : offered.slice(0, 1)).map(
    (row) => row.id,
  );
  return {
    id: newMedicationId(),
    petId,
    name: "",
    strength: "",
    form,
    amount: 1,
    unit: DOSE[form].units[0],
    customUnit: "",
    splitBy: "owner",
    side: "both",
    dayRule: offeredDayRules(settings, stay)[0] ?? "every_day",
    certainDays: startingDays(stay),
    slots,
    custom:
      slots.length > 0 || !settings.customTimes ? [] : [CUSTOM_TIME_DEFAULT],
    food: "with",
    method: "",
    methodLabel: "",
    source: "own",
    waived: false,
    supply: "",
    notes: "",
    allergies: [],
    saveToProfile: settings.show.saveToProfile,
    labelConfirmed: false,
    carry: {},
  };
}

/**
 * A saved medication — the step's own, or an older one — back in the editor.
 * An older row's words are read as well as they can be: "pill" is a tablet,
 * eye drops are drops given in an eye, "1/2" is a half.
 */
export function draftFromItem(
  item: MedicationItem,
  { settings, stay }: DraftContext,
): MedicationDraft {
  const form = pageFormOf(item.form);
  const spec = DOSE[form];
  const unit =
    isMedUnit(item.doseUnit) && spec.units.includes(item.doseUnit)
      ? item.doseUnit
      : spec.units[0];
  const slots = offeredSlots(settings);
  const times = doseTimes(item);
  const givenWith = item.givenWith as string | undefined;
  const method: string =
    givenWith &&
    ((MED_METHODS as readonly string[]).includes(givenWith) ||
      isCustomMethod(givenWith))
      ? givenWith
      : (methodImpliedBy(item.form) ?? "");
  const food: MedFood =
    item.food ??
    (item.adminInstructions?.includes("with_food")
      ? "with"
      : item.adminInstructions?.includes("empty_stomach")
        ? "empty"
        : "either");
  const certain =
    item.dayRule === "certain_dates"
      ? (item.specificDays ?? []).filter((day) => stay.days.includes(day))
      : startingDays(stay);
  return {
    id: item.id,
    profileId: item.profileId,
    petId: item.petId,
    name: item.name ?? "",
    strength: item.strength ?? "",
    form,
    amount: item.doseAmount ?? parseAmount(item.amount) ?? 1,
    unit,
    customUnit: item.customUnit ?? "",
    splitBy: item.splitBy ?? "owner",
    side: item.side ?? "both",
    // A row written before the rule existed was given every day.
    dayRule: item.dayRule ?? "every_day",
    certainDays: certain,
    slots: slots.filter((slot) => times.includes(slot.time)).map((s) => s.id),
    custom: times.filter((time) => !slots.some((slot) => slot.time === time)),
    food,
    method,
    methodLabel: item.methodLabel ?? "",
    source: item.facilityProvidesMedAid ? "facility" : "own",
    waived: item.aidWaived === true,
    supply: item.supplyCount != null ? String(item.supplyCount) : "",
    notes: item.notes ?? "",
    allergies: item.drugAllergies ?? [],
    saveToProfile: item.saveToProfile === true,
    labelConfirmed: item.labelConfirmed === true,
    carry: {
      purpose: item.purpose,
      frequencyNotes: item.frequencyNotes,
      prnMaxPerDay: item.prnMaxPerDay,
      prnTrigger: item.prnTrigger,
      adminNotes: item.adminNotes,
      givenWithNotes: item.givenWithNotes,
      ifMissed: item.ifMissed,
      isHighRisk: item.isHighRisk,
      parentConfirmed: item.parentConfirmed,
    },
  };
}

/** The draft's times of day, each once, in the order of the day. */
export function draftTimes(
  draft: Pick<MedicationDraft, "slots" | "custom">,
  settings: Pick<MedicationInstructions, "times">,
): string[] {
  const slotTimes = settings.times
    .filter((slot) => draft.slots.includes(slot.id))
    .map((slot) => slot.time);
  return doseTimes({ times: [...slotTimes, ...draft.custom] });
}

/** The days a draft gives its medication on, over `stay`. */
export function draftDays(draft: MedicationDraft, stay: MedStay): string[] {
  return activeDays(
    { dayRule: draft.dayRule, specificDays: draft.certainDays },
    stay,
  );
}

/**
 * How much the stay takes against what is being brought — the supply check
 * the step shows, and stops on when the facility requires enough.
 */
export function draftSupply(
  draft: MedicationDraft,
  { settings, stay }: DraftContext,
): SupplyCheck {
  const doses =
    draftTimes(draft, settings).length * draftDays(draft, stay).length;
  const typed = draft.supply.trim();
  const brought = typed === "" ? null : Number(typed.replace(",", "."));
  return supplyCheck({
    doses,
    amount: draft.amount,
    wholeUnits: DOSE[draft.form].fraction,
    brought: brought !== null && Number.isFinite(brought) ? brought : null,
  });
}

/** What stops a draft being saved, or `null`. */
export type DraftProblem =
  | "name"
  | "controlled"
  | "amount"
  | "schedule"
  | "supply"
  | "label";

export function draftProblem(
  draft: MedicationDraft,
  context: DraftContext,
): DraftProblem | null {
  const { settings, stay } = context;
  if (!draft.name.trim()) return "name";
  // The facility does not accept it: no amount of detail makes it bookable.
  if (!settings.rules.controlled && controlledSubstance(draft.name)) {
    return "controlled";
  }
  if (!(draft.amount > 0)) return "amount";
  if (
    draftTimes(draft, settings).length === 0 ||
    draftDays(draft, stay).length === 0
  ) {
    return "schedule";
  }
  if (
    settings.supply === "block" &&
    settings.show.supply &&
    draftSupply(draft, context).kind === "short"
  ) {
    return "supply";
  }
  if (settings.rules.label && !draft.labelConfirmed) return "label";
  return null;
}

/** A draft with a name is a medication being written, not an empty form. */
export function isNamed(draft: MedicationDraft | null | undefined): boolean {
  return Boolean(draft && draft.name.trim());
}

/** The booking record a draft becomes. */
export function itemFromDraft(
  draft: MedicationDraft,
  context: DraftContext & { t: Translate; locale: AppLocale },
): MedicationItem {
  const { settings, t, locale } = context;
  const spec = DOSE[draft.form];
  const times = draftTimes(draft, settings);
  const show = settings.show;
  const supplied =
    draft.source === "facility" &&
    providedFor(settings, draft.method) !== undefined;
  const custom = isCustomMethod(draft.method);
  const supply = Number(draft.supply.replace(",", "."));
  const food = show.food ? draft.food : undefined;
  const amount = round2(draft.amount);

  return {
    ...stripUndefined(draft.carry),
    id: draft.id,
    petId: draft.petId,
    profileId: draft.profileId,
    name: draft.name.trim(),
    strength: show.strength ? draft.strength.trim() || undefined : undefined,
    form: draft.form,
    amount: doseWords(
      t,
      {
        form: draft.form,
        amount,
        unit: draft.unit,
        customUnit: draft.customUnit,
      },
      locale,
    ),
    doseAmount: amount,
    doseUnit: draft.unit,
    customUnit:
      draft.unit === "custom"
        ? draft.customUnit.trim() || undefined
        : undefined,
    // Staff split tablets only where the facility says they do.
    splitBy:
      spec.splittable && isFractional(amount)
        ? settings.split
          ? draft.splitBy
          : "owner"
        : undefined,
    side: asksForSide(draft.method) ? draft.side : undefined,
    dayRule: draft.dayRule,
    specificDays:
      draft.dayRule === "certain_dates"
        ? [...draft.certainDays].sort()
        : undefined,
    times,
    frequency:
      draft.dayRule === "certain_dates"
        ? "specific_days"
        : times.length === 1
          ? "once_daily"
          : times.length === 2
            ? "twice_daily"
            : "other",
    food,
    adminInstructions:
      food === "with"
        ? ["with_food"]
        : food === "empty"
          ? ["empty_stomach"]
          : [],
    givenWith: (draft.method || undefined) as MedicationItem["givenWith"],
    methodLabel: custom
      ? methodRow(settings, draft.method)?.label?.trim() ||
        draft.methodLabel.trim() ||
        undefined
      : undefined,
    facilityProvidesMedAid: supplied ? true : undefined,
    facilityMedAidItem: supplied ? draft.method : undefined,
    aidWaived: supplied && draft.waived ? true : undefined,
    supplyCount:
      show.supply && draft.supply.trim() !== "" && Number.isFinite(supply)
        ? supply
        : undefined,
    drugAllergies:
      show.allergies && draft.allergies.length > 0
        ? draft.allergies
        : undefined,
    notes: show.notes ? draft.notes.trim() : "",
    saveToProfile: show.saveToProfile ? draft.saveToProfile : undefined,
    labelConfirmed:
      settings.rules.label && draft.labelConfirmed ? true : undefined,
    controlled: controlledSubstance(draft.name) ? true : undefined,
  };
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

// ── THE PET'S PROFILE ──────────────────────────────────────────────────────

/** What is kept on the pet's profile from a booked medication. */
export function profileEntryOf(
  item: MedicationItem,
  profileId: string,
): SavedMedication {
  const {
    id: _id,
    petId: _petId,
    dayRule: _dayRule,
    specificDays: _specificDays,
    aidWaived: _aidWaived,
    supplyCount: _supplyCount,
    saveToProfile: _saveToProfile,
    profileId: _profileId,
    ...kept
  } = item;
  return { ...stripUndefined(kept), profileId } as SavedMedication;
}

/**
 * A profile medication as a new booking's, on this stay. The id defaults to
 * one derived from the profile entry, so the same medication keeps one id
 * while the booking form shows it, before anybody has touched it.
 */
export function itemFromProfile(
  saved: SavedMedication,
  petId: number,
  { settings, stay }: DraftContext,
  id = `med-${saved.profileId}`,
): MedicationItem {
  const rule = offeredDayRules(settings, stay)[0] ?? "every_day";
  return {
    ...saved,
    id,
    petId,
    profileId: saved.profileId,
    dayRule: rule,
    specificDays: rule === "certain_dates" ? startingDays(stay) : undefined,
    saveToProfile: true,
  };
}

/**
 * The pet's profile list after a booking: a medication saved "for future
 * visits" is added or updated, one that came from the profile and was
 * unticked is taken off, and everything else stays as it was. `null` when
 * nothing changed, so nothing is written.
 */
export function profileAfterBooking(
  current: SavedMedication[],
  booked: MedicationItem[],
  newProfileId: () => string = () => `pmed-${crypto.randomUUID()}`,
): SavedMedication[] | null {
  let next = [...current];
  let changed = false;
  for (const item of booked) {
    if (item.saveToProfile) {
      const profileId = item.profileId ?? newProfileId();
      const entry = profileEntryOf(item, profileId);
      const at = next.findIndex((saved) => saved.profileId === profileId);
      if (at === -1) {
        next.push(entry);
        changed = true;
      } else if (JSON.stringify(next[at]) !== JSON.stringify(entry)) {
        next[at] = entry;
        changed = true;
      }
    } else if (item.profileId) {
      const before = next.length;
      next = next.filter((saved) => saved.profileId !== item.profileId);
      changed ||= next.length !== before;
    }
  }
  return changed ? next : null;
}
