import { describe, expect, test } from "bun:test";

import {
  backToBack,
  earliestOpening,
  fittingStarts,
  nextDays,
  poolSlots,
  shortPersonName,
  stripDay,
  type StaffDay,
} from "@/lib/bookings/wizard/staff-slots";

// Groomer & time (the client's mock, 2026-10-01): a start fits when the whole
// appointment lies inside a working window and clears every busy interval.
const H = 60;
const maya: StaffDay = {
  staffId: "maya",
  working: [{ start: 9 * H, end: 17 * H }],
  busy: [{ start: 10 * H, end: 11 * H + 30 }],
};
const jordan: StaffDay = {
  staffId: "jordan",
  working: [{ start: 9 * H, end: 13 * H }],
  busy: [],
};

describe("staff slots", () => {
  test("a start fits the window and clears the busy hour", () => {
    // 60 minutes: 9:00 fits (ends 10:00, touching is fine); 9:30 runs into
    // 10:00; nothing until 11:30; the last start is 16:00.
    const starts = fittingStarts(maya, 60);
    expect(starts[0]).toBe(9 * H);
    expect(starts).not.toContain(9 * H + 30);
    expect(starts).not.toContain(11 * H);
    expect(starts).toContain(11 * H + 30);
    expect(starts.at(-1)).toBe(16 * H);
  });

  test("a long appointment fits nowhere it would overrun", () => {
    // 3h 45m back to back: only from 11:30 (ends 15:15) to 13:15 (ends 17:00).
    const starts = fittingStarts(maya, 225);
    expect(starts[0]).toBe(11 * H + 30);
    expect(starts.at(-1)).toBe(13 * H);
  });

  test("today drops the starts already past", () => {
    expect(fittingStarts(jordan, 60, 30, 12 * H)).toEqual([12 * H]);
  });

  test("a pool offers each start once, first person free", () => {
    const offers = poolSlots([maya, jordan], 60);
    const at = (t: number) => offers.find((o) => o.start === t)?.staffId;
    expect(at(9 * H)).toBe("maya");
    // Maya is busy at 10:00; Jordan takes it.
    expect(at(10 * H)).toBe("jordan");
    expect(new Set(offers.map((o) => o.start)).size).toBe(offers.length);
  });

  test("the strip: closed, full, or how many are open", () => {
    expect(stripDay("2026-10-04", [{ ...maya, working: [] }], 60).status).toBe(
      "closed",
    );
    expect(stripDay("2026-10-02", [jordan], 6 * H).status).toBe("full");
    const open = stripDay("2026-10-01", [jordan], 60);
    expect(open).toEqual({ date: "2026-10-01", status: "open", open: 7 });
  });

  test("the earliest opening is the first date with a start", () => {
    const slots: Record<string, ReturnType<typeof poolSlots>> = {
      "2026-10-01": [],
      "2026-10-02": [{ start: 11 * H, staffId: "maya" }],
    };
    expect(
      earliestOpening(["2026-10-01", "2026-10-02"], (d) => slots[d] ?? []),
    ).toEqual({
      date: "2026-10-02",
      offer: { start: 11 * H, staffId: "maya" },
    });
    expect(earliestOpening(["2026-10-01"], () => [])).toBeNull();
  });

  test("back to back, and fourteen days", () => {
    expect(backToBack([90, 75, 60])).toBe(225);
    const days = nextDays("2026-10-30", 14);
    expect(days[0]).toBe("2026-10-30");
    expect(days[2]).toBe("2026-11-01");
    expect(days).toHaveLength(14);
  });
});

describe("shortPersonName", () => {
  test("a first name and the last name's initial, as the mock names a groomer", () => {
    expect(shortPersonName("Marcus Bélanger")).toBe("Marcus B.");
    expect(shortPersonName("  Jessica   Anne Martinez ")).toBe("Jessica M.");
  });
  test("one word, or a name already short, stays as it is", () => {
    expect(shortPersonName("Sophie")).toBe("Sophie");
    expect(shortPersonName("Alex M.")).toBe("Alex M.");
  });
});
