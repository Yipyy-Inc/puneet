import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A daycare yard is a room, not a browser tab.
//
// ── WHAT THIS EXISTS TO CATCH ─────────────────────────────────────────────
//
// Play areas and their sections lived in localStorage. That would be poor for
// configuration; it was worse, because the BOOKING FLOW read them —
// `getDaycareAvailabilitySummary` decides whether a day has room from a
// section's capacity. So the number that gates a booking lived in one browser,
// and two terminals could disagree about the same yard.
//
// They are `room_categories` (service='daycare') and `facility_rooms` now
// (20260822800000), which is the same pair boarding uses. That sharing is the
// risk this file watches: a daycare row must never appear on the kennel board,
// and a boarding row must never appear as a play area.
//
// ── WHAT IT LEAVES BEHIND ─────────────────────────────────────────────────
//
// Nothing. Sections and areas it creates are deleted in afterEach. It never
// edits or deletes a SEEDED yard: those are the demo facility's real capacity,
// and a spec that rewrote them would be changing what the facility can book.
// ============================================================================

const CATEGORIES = "/api/rooms/categories";
const UNITS = "/api/rooms/units";

type Page = import("@playwright/test").Page;

interface Category {
  id: string;
  service: string;
  name: string;
  active: boolean;
}
interface Room {
  id: string;
  categoryId: string;
  name: string;
  capacity?: number;
  color?: string;
  description?: string;
  rules: { id: string; type: string; enabled: boolean }[];
}
interface Catalogue {
  categories: Category[];
  rooms: Room[];
}

const createdCategories: string[] = [];
const createdRooms: string[] = [];

async function catalogue(page: Page): Promise<Catalogue> {
  const res = await page.request.get("/api/rooms");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Catalogue;
}

test.describe("a facility's daycare yards", () => {
  test.afterEach(async ({ browser }) => {
    if (createdRooms.length === 0 && createdCategories.length === 0) return;
    const rooms = createdRooms.splice(0, createdRooms.length);
    const cats = createdCategories.splice(0, createdCategories.length);
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      // Sections first: a category that still holds rooms refuses to go.
      for (const id of rooms)
        await page.request.delete(`${UNITS}/${encodeURIComponent(id)}`);
      for (const id of cats)
        await page.request.delete(`${CATEGORIES}/${encodeURIComponent(id)}`);
    } catch {
      // Teardown must not turn a green run red.
    } finally {
      await context.close();
    }
  });

  test("ships the yards the fixture used to describe", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const { categories, rooms } = await catalogue(page);

    const daycare = categories.filter((c) => c.service === "daycare");
    expect(
      daycare.length,
      "no daycare play areas — the migration's seed did not run",
    ).toBeGreaterThan(0);

    const areaIds = new Set(daycare.map((a) => a.id));
    const sections = rooms.filter((r) => areaIds.has(r.categoryId));
    expect(sections.length, "areas with no sections").toBeGreaterThan(0);

    // Capacity is the number that gates a booking. A section that arrives
    // without one reads as "no room" downstream, which is safe but wrong.
    for (const s of sections) {
      expect(s.capacity, `${s.name} has no capacity`).toBeGreaterThan(0);
    }
  });

  test("a section carries its own rules, not its area's", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const { categories, rooms } = await catalogue(page);

    const areaIds = new Set(
      categories.filter((c) => c.service === "daycare").map((a) => a.id),
    );
    const sections = rooms.filter((r) => areaIds.has(r.categoryId));

    // Two sections of one yard admit different dogs — that is the whole reason
    // `rules` had to move onto the room. If they were empty here, every dog
    // would be eligible for every section.
    const withRules = sections.filter((s) => (s.rules ?? []).length > 0);
    expect(
      withRules.length,
      "no section carries eligibility rules",
    ).toBeGreaterThan(0);
  });

  test("a daycare yard never appears on the kennel board", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const { categories } = await catalogue(page);
    const daycareIds = new Set(
      categories.filter((c) => c.service === "daycare").map((c) => c.id),
    );
    expect(daycareIds.size, "nothing daycare to check against").toBeGreaterThan(
      0,
    );

    // The board's own read. It used to take every row regardless of service —
    // correct only while the table held boarding alone, which stopped being
    // true the moment the yards above existed.
    const res = await page.request.get("/api/boarding/rooms");
    expect(res.ok(), await res.text()).toBe(true);
    const board = (await res.json()) as Catalogue;

    for (const c of board.categories) expect(c.service).toBe("boarding");
    for (const c of board.categories) expect(daycareIds.has(c.id)).toBe(false);

    const boardCategoryIds = new Set(board.categories.map((c) => c.id));
    for (const r of board.rooms) {
      expect(
        boardCategoryIds.has(r.categoryId),
        `${r.name} belongs to no boarding category`,
      ).toBe(true);
    }
  });

  test("a new section persists with its capacity and rules", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const { categories } = await catalogue(page);
    const area = categories.find((c) => c.service === "daycare");
    expect(area, "no daycare area to add a section to").toBeTruthy();

    const name = `E2E Section ${Date.now()}`;
    const res = await page.request.post(UNITS, {
      data: {
        categoryId: area!.id,
        name,
        active: true,
        capacity: 7,
        description: "Created by daycare-areas.spec.ts",
        color: "rose",
        rules: [
          {
            id: "e2e-rule-1",
            type: "max_weight",
            value: 15,
            clientMessage: "E2E probe rule.",
            enabled: true,
          },
        ],
      },
    });
    expect(res.status(), await res.text()).toBeLessThan(300);

    const after = await catalogue(page);
    const made = after.rooms.find((r) => r.name === name);
    expect(made, "the section did not survive the request").toBeTruthy();
    createdRooms.push(made!.id);

    // The three columns the section needed that a boarding room never did.
    expect(made!.capacity).toBe(7);
    expect(made!.color).toBe("rose");
    expect(made!.rules).toHaveLength(1);
  });

  test("a caretaker cannot redraw the yards", async ({ page }) => {
    await signIn(page, ACCOUNTS.caretaker);

    // Reading is membership: staff have to see the sections to work them.
    const { categories } = await catalogue(page);
    const area = categories.find((c) => c.service === "daycare");
    expect(area).toBeTruthy();

    const res = await page.request.post(UNITS, {
      data: {
        categoryId: area!.id,
        name: "E2E caretaker should not be able to add this",
        active: true,
        capacity: 5,
      },
    });
    expect(res.status(), await res.text()).toBe(403);
  });
});
