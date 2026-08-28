/**
 * ============================================================================
 * Quiet hours, the lateness cut-off, and the pacing jitter.
 *
 *   bun run test:unit
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 *
 * The audit of the shipped Reputation Booster found an SMS logged at 4:00 a.m.
 * Two things were true at once: timestamps were rendered in UTC, AND nothing
 * anywhere checked the hour before sending. The first is a display bug; the
 * second is a facility texting its customers in the middle of the night, in
 * their own name, and the TCPA restricting marketing contact to 8 a.m.-9 p.m.
 * in the RECIPIENT's local time.
 *
 * ── AND WHY IT IS NOT A PLAYWRIGHT SPEC ───────────────────────────────────
 *
 * This is date arithmetic across a timezone. Proving it through the app would
 * mean seeding a facility in a non-Toronto zone, queueing a message at a
 * particular wall-clock minute, and running a cron endpoint against the one
 * shared Postgres — to assert something two layers below anything visible. The
 * cases that actually break it are the boundary minute, a window that crosses
 * midnight, and a DST transition; all three are cheap here and expensive there.
 *
 * The one thing this CANNOT prove is that `deliver()` and `sendDueMessages()`
 * actually call it. That is what supabase/tests/messaging-quiet-hours.sql and
 * the e2e spec are for.
 * ============================================================================
 */

import { describe, expect, test } from "bun:test";
import {
  isTooLate,
  jitterMinutes,
  nextSendableInstant,
  businessDay,
  sendingZone,
} from "@/lib/messaging/quiet-hours";
import {
  isQuietAt,
  minutesOfDay,
  NO_MESSAGING_POLICY,
  type QuietHours,
} from "@/lib/settings/messaging-policy";

const TORONTO = "America/Toronto";
const VANCOUVER = "America/Vancouver";

/** The default window a facility would configure: 09:00-20:00 local. */
const DAYTIME: QuietHours = { enabled: true, start: "09:00", end: "20:00" };

describe("the window itself", () => {
  test("inside the allowed period is not quiet", () => {
    expect(isQuietAt(DAYTIME, minutesOfDay("09:00"))).toBe(false);
    expect(isQuietAt(DAYTIME, minutesOfDay("14:30"))).toBe(false);
    expect(isQuietAt(DAYTIME, minutesOfDay("19:59"))).toBe(false);
  });

  // The boundary minutes, because "start inclusive, end exclusive" is the kind
  // of thing that gets flipped in a refactor and never noticed: being one
  // minute wrong at 20:00 is invisible, and being wrong at 08:59 is a call to
  // a customer's phone before they are up.
  test("the boundaries", () => {
    expect(isQuietAt(DAYTIME, minutesOfDay("08:59"))).toBe(true);
    expect(isQuietAt(DAYTIME, minutesOfDay("20:00"))).toBe(true);
  });

  test("disabled is never quiet", () => {
    expect(
      isQuietAt({ ...DAYTIME, enabled: false }, minutesOfDay("03:00")),
    ).toBe(false);
  });

  // A facility thinking "do not disturb 22:00-08:00" writes an allowed period
  // that wraps midnight. Getting this wrong inverts the whole rule and sends
  // ONLY at night.
  test("a window that crosses midnight", () => {
    const overnight: QuietHours = {
      enabled: true,
      start: "20:00",
      end: "08:00",
    };
    expect(isQuietAt(overnight, minutesOfDay("22:00"))).toBe(false);
    expect(isQuietAt(overnight, minutesOfDay("03:00"))).toBe(false);
    expect(isQuietAt(overnight, minutesOfDay("12:00"))).toBe(true);
  });

  test("a zero-width window blocks nothing rather than everything", () => {
    const degenerate: QuietHours = {
      enabled: true,
      start: "09:00",
      end: "09:00",
    };
    expect(isQuietAt(degenerate, minutesOfDay("03:00"))).toBe(false);
  });
});

describe("deferring, never dropping", () => {
  test("a message due in the afternoon is left alone", () => {
    const due = new Date("2026-06-15T18:00:00Z"); // 14:00 Toronto
    expect(nextSendableInstant(due, TORONTO, DAYTIME)).toEqual(due);
  });

  // The scenario the spec names: a visit closes at 20:40 with a one-hour delay.
  test("a 21:40 send lands at 09:00 the next morning", () => {
    const due = new Date("2026-06-16T01:40:00Z"); // 21:40 on the 15th, Toronto
    const moved = nextSendableInstant(due, TORONTO, DAYTIME);

    expect(businessDay(moved, TORONTO)).toBe("2026-06-16");
    expect(moved.toISOString()).toBe("2026-06-16T13:00:00.000Z"); // 09:00 EDT
    expect(moved.getTime()).toBeGreaterThan(due.getTime());
  });

  // The other side of midnight. 03:00 is still "tonight" to a person, but it is
  // already the next calendar day, so the window opens LATER TODAY rather than
  // tomorrow — an off-by-one-day here delays every overnight message by 24h.
  test("a 03:00 send waits only until 09:00 the same day", () => {
    const due = new Date("2026-06-16T07:00:00Z"); // 03:00 Toronto
    const moved = nextSendableInstant(due, TORONTO, DAYTIME);

    expect(businessDay(moved, TORONTO)).toBe("2026-06-16");
    expect(moved.toISOString()).toBe("2026-06-16T13:00:00.000Z");
  });

  test("the result is never quiet itself", () => {
    for (const iso of [
      "2026-06-16T01:40:00Z",
      "2026-06-16T07:00:00Z",
      "2026-01-05T04:15:00Z",
      "2026-11-02T05:30:00Z",
    ]) {
      const moved = nextSendableInstant(new Date(iso), TORONTO, DAYTIME);
      const parts = businessDay(moved, TORONTO);
      expect(parts).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(moved.getTime()).toBeGreaterThanOrEqual(new Date(iso).getTime());
    }
  });

  // The whole reason the zone is the LOCATION's. The same instant is inside the
  // window in Toronto and outside it in Vancouver; a server-zone implementation
  // gets one of them wrong and it is never the one you are looking at.
  test("the same instant is quiet in one zone and not the other", () => {
    const due = new Date("2026-06-16T04:00:00Z"); // 00:00 Toronto, 21:00 Vancouver

    const toronto = nextSendableInstant(due, TORONTO, DAYTIME);
    const vancouver = nextSendableInstant(due, VANCOUVER, DAYTIME);

    expect(toronto.getTime()).toBeGreaterThan(due.getTime());
    expect(vancouver.getTime()).toBeGreaterThan(due.getTime());
    expect(businessDay(toronto, TORONTO)).toBe("2026-06-16");
    expect(businessDay(vancouver, VANCOUVER)).toBe("2026-06-16");
  });

  // Spring forward. 09:00 local exists on both sides of the transition, but it
  // is a different number of UTC hours away, which is exactly what a naive
  // "+9 hours" implementation gets wrong twice a year.
  test("across a DST transition the window still opens at 09:00 local", () => {
    // 2026-03-08 is the US/Canada spring-forward date.
    const due = new Date("2026-03-08T06:00:00Z"); // 01:00 EST, before the jump
    const moved = nextSendableInstant(due, TORONTO, DAYTIME);

    expect(moved.toISOString()).toBe("2026-03-08T13:00:00.000Z"); // 09:00 EDT
  });

  test("quiet hours off returns the instant untouched", () => {
    const due = new Date("2026-06-16T07:00:00Z");
    expect(
      nextSendableInstant(due, TORONTO, NO_MESSAGING_POLICY.quietHours),
    ).toEqual(due);
  });
});

describe("the lateness cut-off", () => {
  const due = new Date("2026-06-15T12:00:00Z");

  test("a message a few minutes late is still sent", () => {
    expect(isTooLate(due, new Date("2026-06-15T12:04:00Z"), 24)).toBe(false);
  });

  test("a message inside the window is still sent", () => {
    expect(isTooLate(due, new Date("2026-06-16T11:00:00Z"), 24)).toBe(false);
  });

  // The 49-day reminder, which is the reason this exists.
  test("a message from a worker outage is dropped", () => {
    expect(isTooLate(due, new Date("2026-08-03T12:00:00Z"), 24)).toBe(true);
  });

  test("the boundary is exclusive, so exactly on time is on time", () => {
    expect(isTooLate(due, new Date("2026-06-16T12:00:00Z"), 24)).toBe(false);
  });
});

describe("pacing jitter", () => {
  // Stability is the point. A retry that lands in a different slot could be
  // deferred repeatedly and never sent at all.
  test("the same id always gets the same slot", () => {
    const id = "0f8a1c22-9a3e-4d51-8b2c-77c0e1b4a911";
    expect(jitterMinutes(id, 120)).toBe(jitterMinutes(id, 120));
  });

  test("it stays inside the spread", () => {
    for (let i = 0; i < 200; i++) {
      const slot = jitterMinutes(`id-${i}`, 120);
      expect(slot).toBeGreaterThanOrEqual(0);
      expect(slot).toBeLessThan(120);
    }
  });

  test("different ids do not all land on the same minute", () => {
    const slots = new Set(
      Array.from({ length: 200 }, (_, i) => jitterMinutes(`id-${i}`, 120)),
    );
    expect(slots.size).toBeGreaterThan(50);
  });

  test("a zero spread is no jitter, not a divide by zero", () => {
    expect(jitterMinutes("anything", 0)).toBe(0);
  });
});

describe("which clock", () => {
  test("the location wins, then the facility, then the default", () => {
    expect(sendingZone(VANCOUVER, TORONTO)).toBe(VANCOUVER);
    expect(sendingZone(null, TORONTO)).toBe(TORONTO);
    expect(sendingZone(null, null)).toBe("America/Toronto");
    // A blank string in the column is not a zone.
    expect(sendingZone("   ", TORONTO)).toBe(TORONTO);
  });
});
