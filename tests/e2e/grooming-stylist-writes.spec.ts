import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Saving a grooming profile.
//
// The read suite proves the roster loads. This proves the Save buttons do
// something — which they did not, for either the fixture or the first version
// of this migration: `handleSave` closed the modal and fired a success toast.
//
// ── THIS ONE WRITES, SO IT PUTS EVERYTHING BACK ───────────────────────────
//
// Unlike the package spec, a grooming profile CAN be restored: the route
// upserts and every field is a plain column, so each test reads the current
// value, changes it, asserts, and writes the original back in a `finally`.
// A profile is configuration, not a ledger — there is no append-only rule to
// work around here.
// ============================================================================

const API = "/api/grooming/stylists";

interface Roster {
  stylists: {
    id: string;
    staffId?: string;
    name: string;
    bio: string;
    yearsExperience: number;
    visibleOnline: boolean;
    specializations: string[];
    capacity: { skillLevel: string; maxDailyAppointments: number };
  }[];
  availability: {
    stylistId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }[];
}

test.describe("saving a grooming profile", () => {
  test("an edit survives a reload", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const before = (await (await page.request.get(API)).json()) as Roster;
    const target = before.stylists.find((s) => s.staffId)!;
    expect(target, "a groomer with a staff link").toBeTruthy();
    const original = {
      bio: target.bio,
      yearsExperience: target.yearsExperience,
      skillLevel: target.capacity.skillLevel,
      specializations: target.specializations,
    };

    try {
      const saved = await page.request.put(`${API}/${target.staffId}`, {
        data: {
          bio: "Edited by the write-path test.",
          yearsExperience: 42,
          specializations: ["Test specialisation"],
          capacity: { skillLevel: "platinum" },
        },
      });
      expect(saved.status()).toBeLessThan(300);

      // Read it back from the server, not from the response.
      const after = (await (await page.request.get(API)).json()) as Roster;
      const updated = after.stylists.find((s) => s.staffId === target.staffId)!;
      expect(updated.bio).toBe("Edited by the write-path test.");
      expect(updated.yearsExperience).toBe(42);
      expect(updated.capacity.skillLevel).toBe("platinum");
      expect(updated.specializations).toEqual(["Test specialisation"]);

      // Untouched fields survive a partial write: the whole point of "absent
      // means unchanged". A patch of one field must not blank the rest.
      expect(updated.name).toBe(target.name);
      expect(updated.capacity.maxDailyAppointments).toBe(
        target.capacity.maxDailyAppointments,
      );
    } finally {
      await page.request.put(`${API}/${target.staffId}`, {
        data: {
          bio: original.bio,
          yearsExperience: original.yearsExperience,
          specializations: original.specializations,
          capacity: { skillLevel: original.skillLevel },
        },
      });
    }

    const restored = (await (await page.request.get(API)).json()) as Roster;
    const back = restored.stylists.find((s) => s.staffId === target.staffId)!;
    expect(back.bio, "the fixture profile is restored").toBe(original.bio);
    expect(back.capacity.skillLevel).toBe(original.skillLevel);
  });

  test("a bad edit is refused with a sentence, and changes nothing", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const before = (await (await page.request.get(API)).json()) as Roster;
    const target = before.stylists.find((s) => s.staffId)!;

    // A weekly ceiling below the daily one is a typo the database also
    // refuses; the route names the field so the editor can point at it.
    const refused = await page.request.put(`${API}/${target.staffId}`, {
      data: {
        capacity: { maxDailyAppointments: 8, maxWeeklyAppointments: 3 },
      },
    });
    expect(refused.status()).toBe(422);
    expect((await refused.json()).error).toContain("weekly");

    const notAGroomer = await page.request.put(`${API}/fs-does-not-exist`, {
      data: { bio: "x" },
    });
    expect(notAGroomer.status()).toBe(404);

    const after = (await (await page.request.get(API)).json()) as Roster;
    const same = after.stylists.find((s) => s.staffId === target.staffId)!;
    expect(same.capacity.maxDailyAppointments).toBe(
      target.capacity.maxDailyAppointments,
    );
  });

  test("a groomer can read the roster and cannot edit it", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const before = (await (await page.request.get(API)).json()) as Roster;
    const target = before.stylists.find((s) => s.staffId)!;

    // RLS decides, not the route. `manage_staff` is a permission a groomer
    // does not hold, so promoting themselves is refused at the table.
    //
    // THE STATUS MATTERS AS MUCH AS THE DATA. A denied UPDATE matches zero
    // rows instead of raising, so the first version of this route answered
    // **204** here: nothing was written, and the caller was told it had been.
    // Asserting only "the tier did not change" would have passed on that.
    const refused = await page.request.put(`${API}/${target.staffId}`, {
      data: { capacity: { skillLevel: "platinum" } },
    });
    expect(refused.status(), "a refusal is reported as one").toBe(403);

    const alsoRefused = await page.request.patch(`${API}/${target.staffId}`, {
      data: {
        availability: [
          {
            dayOfWeek: 4,
            startTime: "09:00",
            endTime: "17:00",
            isAvailable: true,
          },
        ],
      },
    });
    expect(alsoRefused.status(), "and so are working hours").toBe(403);

    const after = (await (await page.request.get(API)).json()) as Roster;
    const same = after.stylists.find((s) => s.staffId === target.staffId)!;
    expect(same.capacity.skillLevel).toBe(target.capacity.skillLevel);
  });

  test("working hours are replaced whole, and only working days are stored", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const before = (await (await page.request.get(API)).json()) as Roster;
    const target = before.stylists.find((s) => s.staffId)!;
    const originalHours = before.availability.filter(
      (a) => a.stylistId === target.id,
    );

    try {
      const saved = await page.request.patch(`${API}/${target.staffId}`, {
        data: {
          availability: [
            {
              dayOfWeek: 0,
              startTime: "10:00",
              endTime: "14:00",
              isAvailable: true,
            },
            // Marked off: must NOT be stored, so "never set up" and
            // "explicitly off" stay indistinguishable by absence.
            {
              dayOfWeek: 1,
              startTime: "08:00",
              endTime: "17:00",
              isAvailable: false,
            },
            {
              dayOfWeek: 2,
              startTime: "11:00",
              endTime: "19:00",
              isAvailable: true,
            },
          ],
        },
      });
      expect(saved.status()).toBeLessThan(300);

      const after = (await (await page.request.get(API)).json()) as Roster;
      const hours = after.availability
        .filter((a) => a.stylistId === target.id)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
      expect(hours.length, "only the two working days").toBe(2);
      expect(hours.map((h) => h.dayOfWeek)).toEqual([0, 2]);
      expect(hours[0]!.startTime).toBe("10:00");
      expect(hours[1]!.endTime).toBe("19:00");
    } finally {
      await page.request.patch(`${API}/${target.staffId}`, {
        data: {
          availability: originalHours.map((h) => ({
            dayOfWeek: h.dayOfWeek,
            startTime: h.startTime,
            endTime: h.endTime,
            isAvailable: true,
          })),
        },
      });
    }

    const restored = (await (await page.request.get(API)).json()) as Roster;
    const back = restored.availability.filter((a) => a.stylistId === target.id);
    expect(back.length, "the seeded week is restored").toBe(
      originalHours.length,
    );
  });

  test("a shift that ends before it starts is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const before = (await (await page.request.get(API)).json()) as Roster;
    const target = before.stylists.find((s) => s.staffId)!;
    const originalCount = before.availability.filter(
      (a) => a.stylistId === target.id,
    ).length;

    const refused = await page.request.patch(`${API}/${target.staffId}`, {
      data: {
        availability: [
          {
            dayOfWeek: 3,
            startTime: "17:00",
            endTime: "09:00",
            isAvailable: true,
          },
        ],
      },
    });
    expect(refused.status()).toBe(422);

    // Refused BEFORE the delete: the existing week must still be there.
    const after = (await (await page.request.get(API)).json()) as Roster;
    expect(
      after.availability.filter((a) => a.stylistId === target.id).length,
      "the existing week survived a rejected save",
    ).toBe(originalCount);
  });
});
