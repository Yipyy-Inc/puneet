import { describe, expect, test } from "bun:test";

import {
  COUNTRIES,
  countryOptionFor,
} from "@/components/admin/facility-onboarding/wizard-config";

// The country prefilled when a facility application is approved decides the
// currency and the tax regime of the facility that gets provisioned. It used to
// be `country.toUpperCase().includes("US") ? "US" : "CA"`, which is wrong in
// both directions — and both directions are asserted here, because a substring
// test that happens to pass on "USA" is exactly how this survived.

describe("countryOptionFor", () => {
  test("the spelling the old substring test got backwards", () => {
    // "UNITED STATES" contains no "US" — it was prefilled as Canada.
    expect(countryOptionFor("United States")).toBe("US");
    expect(countryOptionFor("United States of America")).toBe("US");
    // "AUSTRALIA" does contain "US" — it was prefilled as the United States.
    expect(countryOptionFor("Australia")).toBe("AU");
  });

  test("the plain codes and names", () => {
    expect(countryOptionFor("US")).toBe("US");
    expect(countryOptionFor("USA")).toBe("US");
    expect(countryOptionFor("CA")).toBe("CA");
    expect(countryOptionFor("Canada")).toBe("CA");
    expect(countryOptionFor("United Kingdom")).toBe("GB");
    expect(countryOptionFor("UK")).toBe("GB");
    expect(countryOptionFor("AU")).toBe("AU");
  });

  test("punctuation, spacing and case are not identity", () => {
    expect(countryOptionFor("U.S.A.")).toBe("US");
    expect(countryOptionFor("u s a")).toBe("US");
    expect(countryOptionFor("  canada  ")).toBe("CA");
    expect(countryOptionFor("cAnAdA")).toBe("CA");
  });

  test("anything unrecognised falls back to CA, as it always did", () => {
    expect(countryOptionFor("")).toBe("CA");
    expect(countryOptionFor(null)).toBe("CA");
    expect(countryOptionFor(undefined)).toBe("CA");
    expect(countryOptionFor("Freedonia")).toBe("CA");
  });

  test("every answer is an option the wizard actually offers", () => {
    const offered = new Set(COUNTRIES.map((c) => c.value));
    for (const input of [
      "United States",
      "Australia",
      "Canada",
      "UK",
      "Freedonia",
      "",
    ]) {
      expect(offered.has(countryOptionFor(input))).toBe(true);
    }
  });
});
