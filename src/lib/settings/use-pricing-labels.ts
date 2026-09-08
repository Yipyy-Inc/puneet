"use client";

import { useMemo } from "react";

import { formatMoney, formatPercent } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// The pricing-rules screen's vocabulary, in the viewer's language.
//
// ── THE COUNTRY LIST IS NOT IN THE CATALOGUE, AND SHOULD NOT BE ──────────
//
// `HOLIDAY_COUNTRIES` was thirty-four hand-written English country names next
// to their ISO codes — "United States", "Czechia", "South Korea". Translating
// them would have put thirty-four more strings in `messages/*.json` for a list
// the platform already knows perfectly, in every locale, and keeps current
// when a country renames itself.
//
// `Intl.DisplayNames` is that list. Measured against all thirty-four codes in
// both en-CA and fr-CA: every one resolves, none falls back to the raw code.
// It also sorts correctly — `localeCompare` puts "Afrique du Sud" first in
// French where the English list had it last as "South Africa", which a
// hand-ordered array can never do.
//
// This is §5q's "always Intl, never a format string" one level up: never a
// hand-written table for something Intl already has.
//
// ── EVERYTHING ELSE IS THE PRODUCT'S OWN VOCABULARY ──────────────────────
//
// Services, room types and coat types are this business's words, so they live
// in the catalogue. The VALUE is what travels — it is stored on the rule and
// matched against a booking — so only the label moves.
// ============================================================================

export interface PricingOption {
  value: string;
  label: string;
}

const SERVICE_KEYS: Record<string, string> = {
  boarding: "svcBoarding",
  daycare: "svcDaycare",
  grooming: "svcGrooming",
  training: "svcTraining",
};

const ROOM_KEYS: Record<string, string> = {
  standard: "roomStandard",
  deluxe: "roomDeluxe",
  vip: "roomVip",
  "cat-suite": "roomCatSuite",
};

const COAT_KEYS: Record<string, string> = {
  short: "coatShort",
  medium: "coatMedium",
  long: "coatLong",
  double_coat: "coatDouble",
  curly: "coatCurly",
  wire: "coatWire",
  matted: "coatMatted",
};

/** The countries whose public holidays the surcharge editor can sync. */
export const HOLIDAY_COUNTRY_CODES = [
  "US",
  "CA",
  "GB",
  "AU",
  "NZ",
  "FR",
  "DE",
  "IT",
  "ES",
  "PT",
  "NL",
  "BE",
  "CH",
  "AT",
  "SE",
  "NO",
  "DK",
  "FI",
  "IE",
  "PL",
  "CZ",
  "HU",
  "RO",
  "GR",
  "TR",
  "MX",
  "BR",
  "AR",
  "CL",
  "JP",
  "KR",
  "IN",
  "SG",
  "ZA",
] as const;

/** The unit a range is measured in — the WORD is translated, the key is not. */
export type RangeUnit =
  | "units"
  | "nights"
  | "days"
  | "sessions"
  | "minutes"
  | "pets"
  | "years"
  | "lbs"
  | "kg";

const UNIT_KEYS: Record<RangeUnit, string> = {
  units: "unitUnits",
  nights: "unitNights",
  days: "unitDays",
  sessions: "unitSessions",
  minutes: "unitMinutes",
  pets: "unitPets",
  years: "unitYears",
  lbs: "unitLbs",
  kg: "unitKg",
};

export interface PricingLabels {
  locale: AppLocale;
  t: (key: string) => string;
  /** `n === 1` is not a plural rule — French counts 0 as singular. */
  plural: (n: number, one: string, other: string) => string;
  services: PricingOption[];
  rooms: PricingOption[];
  coats: PricingOption[];
  /** Every syncable country, named and ordered in the viewer's language. */
  countries: PricingOption[];
  country: (code: string) => string;
  /** `3–7 nights` · `3 à 7 nuits`. One whole sentence, never a fragment. */
  range: (
    min: number | null | undefined,
    max: number | null | undefined,
    unit: RangeUnit,
  ) => string;
  /** `-15%` · `+42,50 $` — the sign is the meaning, so it is never dropped. */
  adjustment: (
    kind: "discount" | "surcharge",
    type: "flat" | "percentage",
    amount: number,
  ) => string;
  money: (amount: number) => string;
  percent: (amount: number) => string;
}

export function usePricingLabels(): PricingLabels {
  const { locale, section } = useSettingsText();

  // ── MEMOISED, AND NOT AS AN OPTIMISATION ────────────────────────────────
  //
  // Without this the hook hands back a NEW `services` array on every render,
  // so a caller's `useMemo(…, [services])` can never hold — and the React
  // Compiler says so out loud: "Compilation Skipped: Existing memoization
  // could not be preserved", which this repo's lint config treats as an
  // error. The country list is the other reason: thirty-four
  // `Intl.DisplayNames` lookups and a `localeCompare` sort, rebuilt on every
  // keystroke in the search box otherwise.
  return useMemo(() => {
    const t = section("pricing-rules");
    const intlLocale = locale === "fr" ? "fr-CA" : "en-CA";

    const rules = new Intl.PluralRules(intlLocale);
    const plural = (n: number, one: string, other: string) =>
      t(rules.select(n) === "one" ? one : other).replace("{n}", String(n));

    const option = (keys: Record<string, string>) =>
      Object.entries(keys).map(([value, key]) => ({ value, label: t(key) }));

    const regionNames = new Intl.DisplayNames([intlLocale], { type: "region" });
    const country = (code: string) => regionNames.of(code) ?? code;

    const countries = HOLIDAY_COUNTRY_CODES.map((code) => ({
      value: code,
      label: country(code),
    })).sort((a, b) => a.label.localeCompare(b.label, intlLocale));

    const range: PricingLabels["range"] = (min, max, unit) => {
      const word = t(UNIT_KEYS[unit]);
      const hasMin = min != null;
      const hasMax = max != null;
      if (hasMin && hasMax)
        return t("rangeBetween")
          .replace("{min}", String(min))
          .replace("{max}", String(max))
          .replace("{unit}", word);
      if (hasMin)
        return t("rangeFrom")
          .replace("{min}", String(min))
          .replace("{unit}", word);
      if (hasMax)
        return t("rangeUpTo")
          .replace("{max}", String(max))
          .replace("{unit}", word);
      return t("rangeAny").replace("{unit}", word);
    };

    const money = (amount: number) => formatMoney(amount, locale);
    const percent = (amount: number) => formatPercent(amount, locale);

    return {
      locale,
      t,
      plural,
      services: option(SERVICE_KEYS),
      rooms: option(ROOM_KEYS),
      coats: option(COAT_KEYS),
      countries,
      country,
      range,
      adjustment: (kind, type, amount) => {
        // `-$${amount}` put the sign and the dollar together in an
        // English-only order. fr-CA writes `42,50 $`, so the sign leads and
        // Intl decides the rest.
        const value = type === "percentage" ? percent(amount) : money(amount);
        return kind === "discount" ? `−${value}` : `+${value}`;
      },
      money,
      percent,
    };
  }, [locale, section]);
}
