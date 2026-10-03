import { describe, expect, test } from "bun:test";

import {
  accentPalette,
  accentVariables,
  contrast,
  CUSTOMER_ACCENT,
  FACILITY_ACCENT,
} from "@/lib/look/accent-palette";

// The booking wizard's accent, from a facility's brand colour
// (src/lib/look/accent-palette.ts): the mock's own two palettes come back
// exactly as drawn, and every other colour comes out readable.

const HEX = /^#[0-9A-F]{6}$/;

describe("the mock's own palettes", () => {
  test("no brand colour is the customer yellow", () => {
    expect(accentPalette(null)).toEqual(CUSTOMER_ACCENT);
    expect(accentPalette(undefined)).toEqual(CUSTOMER_ACCENT);
    expect(accentPalette("")).toEqual(CUSTOMER_ACCENT);
    expect(accentPalette("not a colour")).toEqual(CUSTOMER_ACCENT);
  });

  test("the two named colours come back unchanged, in any case", () => {
    expect(accentPalette("#F5B532")).toEqual(CUSTOMER_ACCENT);
    expect(accentPalette("#f5b532")).toEqual(CUSTOMER_ACCENT);
    expect(accentPalette("1d6ae5")).toEqual(FACILITY_ACCENT);
  });

  test("they are the values the mock draws", () => {
    expect(CUSTOMER_ACCENT).toEqual({
      accent: "#F5B532",
      onAccent: "#1B2333",
      soft: "#FEF3D8",
      softInk: "#7A5200",
      deep: "#A86A00",
      glow: "rgba(245,181,50,.6)",
    });
    expect(FACILITY_ACCENT.accent).toBe("#1D6AE5");
    expect(FACILITY_ACCENT.onAccent).toBe("#FFFFFF");
  });
});

describe("any other brand colour", () => {
  const SAMPLES = [
    "#E11D48", // red
    "#0F766E", // teal
    "#7C3AED", // violet
    "#FACC15", // bright yellow
    "#F97316", // orange
    "#808080", // mid grey
    "#000000",
    "#FFFFFF",
    "#2DD4BF", // light teal
  ];

  for (const sample of SAMPLES) {
    test(`${sample} reads`, () => {
      const p = accentPalette(sample);
      for (const value of [p.accent, p.onAccent, p.soft, p.softInk, p.deep]) {
        expect(value).toMatch(HEX);
      }
      expect(["#1B2333", "#FFFFFF"]).toContain(p.onAccent);
      expect(contrast(p.accent, p.onAccent)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.softInk, p.soft)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.deep, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
      // The tint is a tint: nearly white, behind dark text.
      expect(contrast(p.soft, "#FFFFFF")).toBeLessThan(1.25);
      expect(p.glow).toMatch(/^rgba\(\d+,\d+,\d+,(0\.45|0\.6)\)$/);
    });
  }

  test("a light colour gets dark text, a dark one white", () => {
    expect(accentPalette("#FACC15").onAccent).toBe("#1B2333");
    expect(accentPalette("#0F766E").onAccent).toBe("#FFFFFF");
  });

  test("a colour that already reads on white is its own deep ink", () => {
    const p = accentPalette("#0F766E");
    expect(p.deep).toBe(p.accent);
  });
});

test("the CSS variables a booking look root reads", () => {
  expect(accentVariables(CUSTOMER_ACCENT)).toEqual({
    "--acc": "#F5B532",
    "--acc-text": "#1B2333",
    "--acc-soft": "#FEF3D8",
    "--acc-soft-text": "#7A5200",
    "--acc-deep": "#A86A00",
    "--acc-glow": "rgba(245,181,50,.6)",
  });
});
