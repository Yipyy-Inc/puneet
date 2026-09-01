import { describe, expect, test } from "bun:test";

import { formatNational, isDialable, toE164 } from "../../src/lib/phone/format";

// ============================================================================
// One normaliser, one formatter.
//
// Three of these existed and disagreed. The case that matters most is the last
// group: `toCallerId` in api/twilio/dial did `"+" + digits`, so a 10-digit North
// American number became `+5145550100` — country code 514 — and would have been
// presented as the caller ID on a real outbound call. Nothing failed loudly;
// the call would simply have gone out unroutable.
//
// This is the tier that catches that: pure logic, no browser, no database. An
// e2e spec could not have found it without placing a real call.
// ============================================================================

describe("toE164", () => {
  test("accepts a bare 10-digit North American number", () => {
    expect(toE164("5145550100")).toBe("+15145550100");
  });

  test("accepts the way a person actually types it", () => {
    expect(toE164("(514) 555-0100")).toBe("+15145550100");
    expect(toE164("514-555-0100")).toBe("+15145550100");
    expect(toE164("514.555.0100")).toBe("+15145550100");
    expect(toE164(" 514 555 0100 ")).toBe("+15145550100");
  });

  test("accepts 11 digits beginning with the country code", () => {
    expect(toE164("15145550100")).toBe("+15145550100");
    expect(toE164("1 (514) 555-0100")).toBe("+15145550100");
  });

  test("passes through what is already E.164", () => {
    expect(toE164("+15145550100")).toBe("+15145550100");
    expect(toE164("+442071838750")).toBe("+442071838750");
  });

  test("refuses what it cannot place, rather than guessing", () => {
    expect(toE164("")).toBeNull();
    expect(toE164("555-0100")).toBeNull(); // 7 digits, no area code
    expect(toE164("25145550100")).toBeNull(); // 11 digits, not country code 1
    expect(toE164("not a number")).toBeNull();
    expect(toE164("+0145550100")).toBeNull(); // E.164 cannot start +0
  });
});

describe("the caller-ID bug this replaced", () => {
  // The old toCallerId: `d.length >= 7 ? "+" + d : SUPPORT_CALLER_ID`.
  const oldToCallerId = (from: string) => {
    const d = from.replace(/\D/g, "");
    return d.length >= 7 ? `+${d}` : "+14155550100";
  };

  test("a 10-digit number used to become country code 514", () => {
    expect(oldToCallerId("514-555-0100")).toBe("+5145550100");
    expect(toE164("514-555-0100")).toBe("+15145550100");
  });

  test("and a 7-digit local number became a plausible-looking wrong number", () => {
    expect(oldToCallerId("555-0100")).toBe("+5550100");
    expect(toE164("555-0100")).toBeNull();
  });
});

describe("isDialable", () => {
  test("is true for anything toE164 can place", () => {
    expect(isDialable("5145550100")).toBe(true);
    expect(isDialable("+442071838750")).toBe(true);
  });

  test("is false for what it cannot", () => {
    expect(isDialable("555-0100")).toBe(false);
    expect(isDialable("")).toBe(false);
  });
});

describe("formatNational", () => {
  test("renders a North American number the way it is written", () => {
    expect(formatNational("+15145550100")).toBe("+1 (514) 555-0100");
    expect(formatNational("5145550100")).toBe("+1 (514) 555-0100");
  });

  test("is stable — formatting its own output changes nothing", () => {
    const once = formatNational("5145550100");
    expect(formatNational(once)).toBe(once);
  });

  test("leaves an international number in E.164", () => {
    expect(formatNational("+442071838750")).toBe("+442071838750");
  });

  test("returns unrecognised input untouched rather than mangling it", () => {
    expect(formatNational("extension 4021")).toBe("extension 4021");
    expect(formatNational("")).toBe("");
  });
});
