import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Overtime and holidays, in the wage bill.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// `payroll_summary()` computed gross as hours x rate and nothing else. Someone
// working 48 hours in a week was paid 48 x rate, and someone working a
// statutory holiday was paid an ordinary day.
//
// The holiday half already existed on the OTHER side of the module: the
// calendar drew "x1.5 pay rate" on a holiday, off three hardcoded 2026 dates,
// and payroll had never heard of the list. The roster said a day cost time and
// a half; the wage bill for that day was flat.
//
// ── THE ARITHMETIC IS HAND-CHECKABLE, ON PURPOSE ──────────────────────────
//
// Six 8-hour days at $10 = 48 hours. Every figure below can be worked out on
// paper, which is the only way to tell a correct total from a plausible one:
//
//   unconfigured      48h x $10                        = $480
//   overtime 40 @1.5  40h x $10  +  8h x $15           = $520
//   + holiday @2 on   8h x $20   +  32h x $10          = $600
//   one of the days                +  8h x $15
//
// The third is the one worth having. The holiday day pays double AND still
// counts toward the weekly threshold, so 8 hours are still over it — but the
// overtime premium is taken from the ORDINARY tail, not from the day already
// carrying a premium. No minute is paid twice.
//
// ── AND "NOT CONFIGURED" IS ASSERTED AS LOUDLY AS THE NUMBERS ─────────────
//
// An absent overtime rule is not a statement that no overtime is owed — it is
// nobody having said. Unlike an unset tax rate, which under-collects against
// the facility's own liability, this one underpays a PERSON. So the payload
// carries `overtimeConfigured` and the screen says so, and both are tested.
//
// ── IT CLEANS UP, WITH ONE DELIBERATE EXCEPTION ───────────────────────────
//
// Entries, shifts, the position and the department all go. The
// `payroll_config` row does NOT: there is no DELETE on the settings route, so
// the closest available is restoring the disabled, empty default — which is
// what an unconfigured facility computes anyway, and `overtimeConfigured` comes
// back false either way. One row is left where there were none. Recorded here
// rather than pretended away.
// ============================================================================

const DEPARTMENT = "E2E OT Dept";
const POSITION = "E2E OT Position";
const RATE = 10;

type Page = import("@playwright/test").Page;

interface Line {
  employeeId: string;
  hourlyMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  holidayMinutes: number;
  gross: number;
  overtimePay: number;
  holidayPremium: number;
}

interface Payload {
  lines: Line[];
  overtimeConfigured: boolean;
  totals: { gross: number; overtimeMinutes: number; holidayMinutes: number };
}

/** The facility's own day, offset by `days`. Every seeded facility is Toronto. */
function facilityDay(days: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + days * 86_400_000));
}

const DISABLED = {
  overtime: { enabled: false, weeklyThresholdHours: 40, multiplier: 1.5 },
  holidays: [],
  weekStartsOn: 0,
};

async function setRules(page: Page, value: unknown): Promise<void> {
  const res = await page.request.patch("/api/facility/settings", {
    data: { domain: "payroll_config", value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

test.describe("payroll: overtime and holidays", () => {
  // A Sunday far out, so the six days sit in ONE week whatever today is and on
  // days no other spec touches.
  const sunday = (() => {
    for (let offset = 350; offset < 380; offset += 1) {
      const day = facilityDay(offset);
      if (new Date(`${day}T12:00:00Z`).getUTCDay() === 0) return day;
    }
    throw new Error("no Sunday found");
  })();

  const dayAt = (index: number) => {
    const d = new Date(`${sunday}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + index);
    return d.toISOString().slice(0, 10);
  };

  let departmentId = "";
  let positionId = "";
  let staffId = "";
  const entryIds: string[] = [];
  const shiftIds: string[] = [];

  async function payroll(page: Page): Promise<Payload> {
    const res = await page.request.get(
      `/api/payroll?from=${sunday}&to=${dayAt(5)}`,
    );
    expect(res.ok(), await res.text()).toBe(true);
    return (await res.json()) as Payload;
  }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      const structure = (await (
        await page.request.get("/api/scheduling/structure")
      ).json()) as {
        departments: { id: string; name: string }[];
        positions: { id: string; name: string }[];
      };

      departmentId =
        structure.departments.find((d) => d.name === DEPARTMENT)?.id ?? "";
      if (!departmentId) {
        const res = await page.request.post("/api/scheduling/structure", {
          data: { kind: "department", name: DEPARTMENT, color: "#0f766e" },
        });
        expect(res.status(), await res.text()).toBe(201);
        departmentId = ((await res.json()) as { id: string }).id;
      }

      positionId =
        structure.positions.find((p) => p.name === POSITION)?.id ?? "";
      if (!positionId) {
        const res = await page.request.post("/api/scheduling/structure", {
          data: {
            kind: "position",
            name: POSITION,
            departmentId,
            payType: "hourly",
            hourlyRate: RATE,
          },
        });
        expect(res.status(), await res.text()).toBe(201);
        positionId = ((await res.json()) as { id: string }).id;
      }

      const staff = (await (await page.request.get("/api/staff")).json()) as {
        rowId?: string;
        email: string;
      }[];
      staffId = staff.find((m) => m.email === ACCOUNTS.groomer)?.rowId ?? "";
      expect(staffId, "the groomer has a staff row").not.toBe("");

      // Six 8-hour days, Sunday to Friday, on ONE position at a round rate.
      // Seeded oldest-first and each closed before the next opens: an OPEN
      // entry claims [t, infinity) and would overlap every later session.
      for (let i = 0; i < 6; i += 1) {
        const date = dayAt(i);

        const made = await page.request.post("/api/scheduling/shifts", {
          data: {
            employeeId: staffId,
            departmentId,
            positionId,
            date,
            startTime: "09:00",
            endTime: "17:00",
            status: "published",
          },
        });
        expect(made.status(), await made.text()).toBe(201);
        const shiftId = ((await made.json()) as { id: string }).id;
        shiftIds.push(shiftId);

        const clocked = await page.request.post("/api/scheduling/clock", {
          data: {
            employeeId: staffId,
            shiftId,
            at: `${date}T13:00:00.000Z`,
          },
        });
        expect(clocked.status(), await clocked.text()).toBe(201);
        const entryId = ((await clocked.json()) as { id: string }).id;
        entryIds.push(entryId);

        const closed = await page.request.patch("/api/scheduling/clock", {
          data: { id: entryId, at: `${date}T21:00:00.000Z` },
        });
        expect(closed.status(), await closed.text()).toBe(200);
      }
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      const failures: string[] = [];

      // The rules first — leaving overtime ENABLED facility-wide would change
      // what every later run computes.
      const reset = await page.request.patch("/api/facility/settings", {
        data: { domain: "payroll_config", value: DISABLED },
      });
      if (!reset.ok()) failures.push(`rules: ${reset.status()}`);

      // Clock entries BY ID, never a sweep — attendance is payroll.
      let removed = 0;
      for (const id of entryIds) {
        const gone = await page.request.delete(
          `/api/scheduling/clock?id=${id}`,
        );
        if (gone.ok()) removed++;
        else failures.push(`entry ${id}: ${gone.status()}`);
      }
      if (removed !== entryIds.length) {
        failures.push(`entries: saw ${entryIds.length}, removed ${removed}`);
      }

      for (const id of shiftIds) {
        const gone = await page.request.delete(
          `/api/scheduling/shifts?id=${id}`,
        );
        if (!gone.ok()) failures.push(`shift ${id}: ${gone.status()}`);
      }

      if (positionId) {
        const gone = await page.request.delete(
          `/api/scheduling/structure?position=${positionId}`,
        );
        if (!gone.ok()) failures.push(`position: ${gone.status()}`);
      }
      const dept = departmentId
        ? await page.request.delete(
            `/api/scheduling/structure?department=${departmentId}`,
          )
        : null;
      if (dept && !dept.ok()) failures.push(`department: ${dept.status()}`);

      for (const problem of failures)
        console.log(`cleanup PROBLEM: ${problem}`);
      console.log(
        `cleanup: ${removed} entry(ies), ${shiftIds.length} shift(s), ` +
          `rules reset, department ${dept?.ok() ? "removed" : `NOT REMOVED (${dept?.status() ?? "no id"})`}`,
      );
    } finally {
      await page.close();
    }
  });

  test("with no rule set, 48 hours pay flat — and payroll says so", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await setRules(page, DISABLED);

    const data = await payroll(page);
    const line = data.lines.find((l) => l.employeeId === staffId);
    expect(line, "the groomer worked this period").toBeTruthy();

    expect(line!.hourlyMinutes, "48 hours").toBe(2880);
    expect(line!.gross, "48h x $10, flat").toBe(480);
    expect(line!.overtimeMinutes, "no overtime computed").toBe(0);

    // ── THE ONE THAT MATTERS AS MUCH AS THE NUMBER ──────────────────────
    //
    // Flat is the right arithmetic for an unconfigured facility and the WRONG
    // conclusion to draw from it. A screen that presents this as a finished run
    // is how somebody gets underpaid without anyone noticing.
    expect(
      data.overtimeConfigured,
      "and the payload admits nobody has set a rule",
    ).toBe(false);
  });

  test("40 hours at $10 and 8 at time and a half", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await setRules(page, {
      overtime: { enabled: true, weeklyThresholdHours: 40, multiplier: 1.5 },
      holidays: [],
      weekStartsOn: 0,
    });

    const data = await payroll(page);
    const line = data.lines.find((l) => l.employeeId === staffId)!;

    expect(data.overtimeConfigured).toBe(true);
    expect(line.overtimeMinutes, "eight hours over the threshold").toBe(480);
    expect(line.regularMinutes, "and forty at the ordinary rate").toBe(2400);
    expect(line.gross, "$400 + $120").toBe(520);
    // The PREMIUM alone: what those hours cost ABOVE the ordinary rate, which
    // is the number a facility is deciding about when it looks at a rota.
    expect(line.overtimePay, "8h x $10 x 0.5").toBe(40);
  });

  test("a holiday pays its multiplier and is not also given overtime", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await setRules(page, {
      overtime: { enabled: true, weeklyThresholdHours: 40, multiplier: 1.5 },
      holidays: [{ date: dayAt(2), name: "E2E Holiday", multiplier: 2 }],
      weekStartsOn: 0,
    });

    const data = await payroll(page);
    const line = data.lines.find((l) => l.employeeId === staffId)!;

    expect(line.holidayMinutes, "the eight hours worked that day").toBe(480);
    expect(line.holidayPremium, "8h x $10 x 1 extra").toBe(80);

    // Still 48 hours in the week, so 8 are still over the threshold — but they
    // are taken from the ORDINARY tail, not from the day already at double.
    expect(line.overtimeMinutes, "eight, from the non-holiday hours").toBe(480);
    expect(line.regularMinutes, "the remaining thirty-two").toBe(1920);

    // 8 x $20 + 32 x $10 + 8 x $15 = 160 + 320 + 120
    expect(line.gross, "no minute paid twice").toBe(600);

    // The arithmetic identity that makes the above trustworthy rather than
    // three numbers that happen to be right.
    expect(
      line.regularMinutes + line.overtimeMinutes + line.holidayMinutes,
      "every billable minute is in exactly one bucket",
    ).toBe(line.hourlyMinutes);
  });

  test("a quiet period does not look like a missing rule", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await setRules(page, {
      overtime: { enabled: true, weeklyThresholdHours: 40, multiplier: 1.5 },
      holidays: [],
      weekStartsOn: 0,
    });

    // A period with NOBODY on the clock. The flag used to be read off the first
    // returned row, so no rows meant `false` — and a facility that HAD set a
    // rule was told it had not, on any fortnight where nothing was worked.
    // Which is most of them, on this screen's default period.
    const quiet = await page.request.get(
      "/api/payroll?from=2019-01-01&to=2019-01-07",
    );
    expect(quiet.ok(), await quiet.text()).toBe(true);
    const data = (await quiet.json()) as Payload;

    expect(data.lines, "nobody worked in 2019").toHaveLength(0);
    expect(
      data.overtimeConfigured,
      "and the rule is still set, rows or no rows",
    ).toBe(true);
  });

  test("a threshold of zero is treated as unset, not as all-overtime", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await setRules(page, {
      overtime: { enabled: true, weeklyThresholdHours: 0, multiplier: 1.5 },
      holidays: [],
      weekStartsOn: 0,
    });

    const data = await payroll(page);
    const line = data.lines.find((l) => l.employeeId === staffId)!;

    // Taking it literally would make every minute of every week overtime and
    // inflate the wage bill by half. It is far likelier to be a half-finished
    // form than a rule somebody meant.
    expect(data.overtimeConfigured, "reported as unconfigured").toBe(false);
    expect(line.overtimeMinutes).toBe(0);
    expect(line.gross, "flat, not 1.5x everything").toBe(480);
  });
});
