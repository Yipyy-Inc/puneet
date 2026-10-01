import {
  formatList,
  formatMoney,
  formatTimeOfDay,
  isPluralOne,
} from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { providedCharge } from "@/lib/medications/charges";
import {
  doseWords,
  fill,
  isFractional,
  type Translate,
} from "@/lib/medications/dose";
import {
  activeDays,
  doseTimes,
  type MedStay,
} from "@/lib/medications/schedule";
import {
  asksForSide,
  DOSE,
  isMedUnit,
  pageFormOf,
  TIME_SLOT_IDS,
  type MedPageForm,
} from "@/lib/medications/vocabulary";
import {
  isCustomMethod,
  type MedicationInstructions,
} from "@/lib/settings/medication-instructions";
import type { MedicationItem } from "@/types/booking";

// ============================================================================
// A medication in words, in the reader's language: the three lines the
// Medications step's card shows — dose, schedule, method — and the details a
// person giving it needs. The booking form, its confirm step and the booking
// page all say it this way, so staff read what the owner wrote.
// ============================================================================

const pascal = (id: string) =>
  id
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

/** "Tablet", "Eye drops" — including the forms older rows carry. */
export function formLabel(t: Translate, form: string): string {
  return t(`medsForm${pascal(form)}`);
}

/** "Pill pocket", "Syringe / dropper". */
export function methodLabel(t: Translate, method: string): string {
  return t(`medsMethod${pascal(method)}`);
}

/**
 * A way of giving's name: the vocabulary's in the reader's words, or one the
 * facility added, as it wrote it (`label` — its row's, or what a booking stored).
 */
export function methodName(
  t: Translate,
  method: string,
  label?: string,
): string {
  return isCustomMethod(method)
    ? label?.trim() || t("medsMethodOther")
    : methodLabel(t, method);
}

/** "Pill pockets" — what a supplied item's line on the bill is called. */
export function providedLineName(
  t: Translate,
  method: string,
  label?: string,
): string {
  return isCustomMethod(method)
    ? label?.trim() || t("medsMethodOther")
    : t(`medsLine${pascal(method)}`);
}

/** "Morning", "Bedtime". */
export function slotLabel(t: Translate, slot: string): string {
  return t(`medsSlot${pascal(slot)}`);
}

/** A dose time's name: the facility's words, else the vocabulary's. */
export function doseTimeName(
  t: Translate,
  row: { id: string; label?: string },
): string {
  return (
    row.label?.trim() ||
    ((TIME_SLOT_IDS as readonly string[]).includes(row.id)
      ? slotLabel(t, row.id)
      : "")
  );
}

/** The line of guidance a form carries — capsules, liquids, injections. */
export function formNote(t: Translate, note: string): string {
  return t(`medsNote${pascal(note)}`);
}

/** "pill pocket" / "pill pockets" — what is supplied, as a count reads it. */
export function itemWord(
  t: Translate,
  method: string,
  count: number,
  locale: AppLocale,
  label?: string,
): string {
  // The facility's own way of giving has one name, as it wrote it.
  if (isCustomMethod(method)) return methodName(t, method, label);
  const one = isPluralOne(count, locale);
  return t(`medsItem${pascal(method)}${one ? "One" : "Other"}`);
}

/** "4 days" · "4 jours". */
export function dayCount(
  t: Translate,
  count: number,
  locale: AppLocale,
): string {
  const one = isPluralOne(count, locale);
  return fill(t(one ? "medsDaysOne" : "medsDaysOther"), { count });
}

/** "8 doses" · "8 doses". */
export function doseCountWords(
  t: Translate,
  count: number,
  locale: AppLocale,
): string {
  const one = isPluralOne(count, locale);
  return fill(t(one ? "medsDosesOne" : "medsDosesOther"), { count });
}

/** The dose in words, from the step's own fields or, failing them, `amount`. */
export function doseLine(
  t: Translate,
  item: MedicationItem,
  locale: AppLocale,
): string {
  const form: MedPageForm = pageFormOf(item.form);
  const words =
    item.doseAmount && item.doseAmount > 0
      ? doseWords(
          t,
          {
            form,
            amount: item.doseAmount,
            unit: isMedUnit(item.doseUnit)
              ? item.doseUnit
              : DOSE[form].units[0],
            customUnit: item.customUnit,
          },
          locale,
        )
      : item.amount?.trim() || "";
  const split =
    item.splitBy === "staff" &&
    item.doseAmount !== undefined &&
    isFractional(item.doseAmount)
      ? ` ${t("medsStaffToSplit")}`
      : "";
  return [item.strength?.trim(), words ? `${words}${split}` : ""]
    .filter(Boolean)
    .join(" · ");
}

export interface MedicationLines {
  /** "16 mg · ½ tablet (staff to split)" */
  dose: string;
  /** "2× daily · 8:00 AM, 6:00 PM · 4 days" */
  schedule: string;
  /** "Pill pocket · facility provides 8 pill pockets ($6.00)" */
  method: string;
  /** Side, food, allergies, a waiver, notes — each a short line. */
  extras: string[];
}

export function describeMedication(
  item: MedicationItem,
  options: {
    t: Translate;
    locale: AppLocale;
    stay?: MedStay;
    settings?: Pick<MedicationInstructions, "methods">;
    /**
     * Say what the supplied item costs. The booking form does; the booking
     * page does not — the bill has the line, and a price changed since would
     * make the two disagree.
     */
    priced?: boolean;
  },
): MedicationLines {
  const { t, locale, stay, settings, priced = true } = options;
  const times = doseTimes(item);
  // "8:00 AM, 6:00 PM", as the design lists them — a list of times, not a
  // sentence, so no "and".
  const clock = times.map((time) => formatTimeOfDay(time, locale)).join(", ");
  const scheduleParts = [
    fill(t("medsTimesDaily"), { count: times.length }),
    clock,
  ];
  if (stay && stay.days.length > 0) {
    scheduleParts.push(dayCount(t, activeDays(item, stay).length, locale));
  }

  const ownLabel = (method: string) =>
    settings?.methods.find((row) => row.id === method)?.label ??
    item.methodLabel;
  let method = item.givenWith
    ? methodName(t, item.givenWith, ownLabel(item.givenWith))
    : t("medsMethodNotSet");
  const charge = stay && settings ? providedCharge(item, stay, settings) : null;
  if (charge && charge.quantity > 0) {
    const items = itemWord(
      t,
      charge.method,
      charge.quantity,
      locale,
      charge.label,
    );
    method += ` · ${
      priced || charge.waived
        ? fill(t("medsFacilityProvidesLine"), {
            quantity: charge.quantity,
            items,
            amount: charge.waived
              ? t("medsWaived")
              : formatMoney(charge.amount, locale),
          })
        : fill(t("medsFacilityProvidesCount"), {
            quantity: charge.quantity,
            items,
          })
    }`;
  } else if (item.facilityProvidesMedAid && item.facilityMedAidItem) {
    // Supplied, with no count to give: no days left in the stay, or the
    // facility no longer lists it. Whoever gives the dose still has to know
    // the pill pocket is theirs to find.
    method += ` · ${fill(t("medsFacilityProvidesItems"), {
      items: itemWord(
        t,
        item.facilityMedAidItem,
        2,
        locale,
        ownLabel(item.facilityMedAidItem),
      ),
    })}`;
  }

  const extras: string[] = [];
  if (asksForSide(item.givenWith) && item.side) {
    extras.push(
      fill(t("medsSideLine"), {
        side: t(`medsSide${pascal(item.side)}`),
      }),
    );
  }
  if (item.food) {
    extras.push(t(`medsFood${pascal(item.food)}`));
  }
  if (item.drugAllergies && item.drugAllergies.length > 0) {
    extras.push(
      fill(t("medsAllergiesLine"), {
        allergies: formatList(item.drugAllergies, locale),
      }),
    );
  }
  if (item.controlled) extras.push(t("medsControlledLine"));
  if (item.labelConfirmed) extras.push(t("medsLabelConfirmedLine"));
  if (item.notes?.trim()) extras.push(item.notes.trim());

  return {
    dose: doseLine(t, item, locale),
    schedule: times.length > 0 ? scheduleParts.join(" · ") : "",
    method,
    extras,
  };
}
