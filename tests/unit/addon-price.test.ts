import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { formatPrice } from "@/components/facility/add-ons/AddOnsManager";
import type { AppLocale } from "@/lib/language-settings";
import type { ServiceAddOn } from "@/types/facility";

// ============================================================================
// AN ADD-ON'S PRICE, IN BOTH LANGUAGES.
//
// The six shapes were built by hand:
//
//   case "per_day":  return `$${addon.price}/day`;
//   case "per_hour": return `$${addon.price}/${addon.unitLabel || "hr"}`;
//   case "percentage_of_booking": return `${addon.price}% of booking`;
//
// which is three §5q defects in one function. The dollar sign LEADS, and
// fr-CA trails it. The `/` is an English joint — French says `par jour`. And
// the percentage never reached Intl at all, so it could not take the
// non-breaking space French puts before `%`.
//
// This is a unit test rather than a Playwright one for exactly the reason the
// second tier exists: the assertion is three layers below the screen, and
// proving it end-to-end would mean seeding an add-on of a particular shape
// into the shared production database.
//
// ── THE SPACE IS THE POINT, SO IT IS ASSERTED AS A CODE POINT ─────────────
//
// MEASURED, not assumed: `Intl.NumberFormat("fr-CA")` emits U+00A0 — the
// ordinary no-break space — before both `$` and `%`, NOT the narrow U+202F
// that French typography guides call for and that fr-FR uses in some
// runtimes. Asserting the narrow one failed against output that looked
// character-for-character identical in the terminal, which is the same class
// of bug as the invisible backspace that `no-control-characters.test.ts`
// exists to catch.
// ============================================================================

const NBSP = " ";

/** Only the fields `formatPrice` reads. */
function addon(patch: Partial<ServiceAddOn>): ServiceAddOn {
  return {
    pricingType: "flat",
    price: 0,
    unitLabel: "",
    ...patch,
  } as ServiceAddOn;
}

/** The real catalogue, so a renamed key fails here instead of on screen. */
function translator(locale: AppLocale): (key: string) => string {
  const json = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));
  const section = json.settings.sections.addons;
  return (key: string) => {
    const value = section?.[key];
    if (typeof value !== "string")
      throw new Error(`missing ${locale} key: settings.sections.addons.${key}`);
    return value;
  };
}

const en = translator("en");
const fr = translator("fr");

describe("an add-on's price", () => {
  test("in English, leads with the dollar sign", () => {
    expect(
      formatPrice(addon({ pricingType: "flat", price: 42.5 }), "en", en),
    ).toBe("$42.50");
  });

  test("in French, trails it behind a no-break space", () => {
    const out = formatPrice(
      addon({ pricingType: "flat", price: 42.5 }),
      "fr",
      fr,
    );
    expect(out).toBe(`42,50${NBSP}$`);
    // The point of the whole change: the amount and the sign cannot be split
    // across a line break.
    expect(out).not.toContain(" $");
  });

  test("says 'par jour', not '/jour'", () => {
    expect(
      formatPrice(addon({ pricingType: "per_day", price: 12 }), "en", en),
    ).toBe("$12.00/day");
    expect(
      formatPrice(addon({ pricingType: "per_day", price: 12 }), "fr", fr),
    ).toBe(`12,00${NBSP}$${NBSP}par jour`);
  });

  test("falls back to a translated unit when the facility named none", () => {
    expect(
      formatPrice(addon({ pricingType: "per_session", price: 20 }), "fr", fr),
    ).toBe(`20,00${NBSP}$${NBSP}par séance`);
    expect(
      formatPrice(addon({ pricingType: "per_hour", price: 20 }), "fr", fr),
    ).toBe(`20,00${NBSP}$${NBSP}par heure`);
    expect(
      formatPrice(addon({ pricingType: "per_item", price: 20 }), "fr", fr),
    ).toBe(`20,00${NBSP}$${NBSP}par article`);
  });

  test("keeps the facility's own unit word untouched", () => {
    // A word the business typed is a name. It does not pass through the
    // locale layer in either direction.
    expect(
      formatPrice(
        addon({ pricingType: "per_item", price: 5, unitLabel: "sachet" }),
        "en",
        en,
      ),
    ).toBe("$5.00/sachet");
    expect(
      formatPrice(
        addon({ pricingType: "per_item", price: 5, unitLabel: "sachet" }),
        "fr",
        fr,
      ),
    ).toBe(`5,00${NBSP}$${NBSP}par sachet`);
  });

  test("puts a no-break space before the French percent sign", () => {
    expect(
      formatPrice(
        addon({ pricingType: "percentage_of_booking", price: 15 }),
        "en",
        en,
      ),
    ).toBe("15% of booking");
    const out = formatPrice(
      addon({ pricingType: "percentage_of_booking", price: 15 }),
      "fr",
      fr,
    );
    expect(out).toBe(`15${NBSP}% de la réservation`);
    expect(out).not.toContain(" %");
  });
});
