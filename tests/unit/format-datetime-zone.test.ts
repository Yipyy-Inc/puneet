import { describe, expect, test } from "bun:test";

import { formatDateTimeInZone } from "@/lib/i18n/format";

// A receipt is composed on the server and handed to a customer, so its time
// must be the facility's, not the machine's.

describe("formatDateTimeInZone", () => {
  // 2026-09-10 18:30 UTC is 14:30 in Montreal and 11:30 in Vancouver.
  const instant = "2026-09-10T18:30:00Z";

  test("reads the instant on the named zone's clock", () => {
    const montreal = formatDateTimeInZone(instant, "en", "America/Toronto");
    const vancouver = formatDateTimeInZone(instant, "en", "America/Vancouver");
    expect(montreal).toContain("2:30");
    expect(vancouver).toContain("11:30");
  });

  test("French uses the 14 h 30 clock", () => {
    const out = formatDateTimeInZone(instant, "fr", "America/Toronto");
    expect(out.replace(/\s/g, " ")).toContain("14 h 30");
  });

  test("the day rolls over in the zone, not in UTC", () => {
    // 03:30 UTC on the 11th is still the evening of the 10th in Vancouver.
    const late = formatDateTimeInZone(
      "2026-09-11T03:30:00Z",
      "en",
      "America/Vancouver",
    );
    expect(late).toContain("10");
    expect(late).not.toContain("11,");
  });

  test("an unparseable value renders the dash, not a throw", () => {
    expect(formatDateTimeInZone("", "en", "America/Toronto")).toBe("—");
  });
});
