import { expect, test } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The Occupancy Calendar — the nav's "Occupancy Calendar", /kennel-view.
//
// Its boarding half was drawn from `src/data/rooms.ts` (ten rooms) merged with
// `mockBookingOverlays`, a hand-written map of twelve kennels to invented
// guests — pet names, owner names, and phone numbers like "Nancy Taylor /
// 555-444-6666". Built at MODULE SCOPE, so it was computed once at import and
// was identical for every facility that ever opened the page.
//
// The demo facility has 26 active rooms in Postgres. Nobody is boarding right
// now, so the honest board is 26 empty kennels — which is why the assertions
// below are about WHICH KENNELS EXIST and WHO IS NOT IN THEM, rather than about
// an occupant that would have to be manufactured to test for.
// ============================================================================

const CALENDAR = "/facility/dashboard/kennel-view";

// Names that appear in no database, only in the deleted overlay map. Asserting
// their absence is what tells the fixture apart from the real read — several of
// the map's other names ("Alice Johnson", "John Doe") ARE real clients, because
// the fixtures and the seed share ancestry.
const INVENTED_PEOPLE = [
  "Nancy Taylor",
  "Lisa Garcia",
  "Sarah Wilson",
  "Tom Harris",
];

interface RoomsPayload {
  rooms: { id: string; name: string; active: boolean }[];
  occupied: { roomId: string }[];
}

test.describe("the occupancy calendar", () => {
  test("draws the active kennels the API reports, and not the retired ones", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const payload = (await (
      await page.request.get("/api/boarding/rooms")
    ).json()) as RoomsPayload;

    // HONEST SCOPE: this does NOT distinguish the fixture from the database.
    // The rooms table was seeded from `src/data/rooms.ts` and the two agree
    // exactly today — same 29 names, same active flags — so the room half of
    // this screen's conversion has no visible effect on the demo facility. It
    // matters for a facility whose rooms are its own (Doggieville Mtl has 22
    // rooms of its own naming), which no account can currently sign in to.
    //
    // What it does do is pin the board to the API, so a future divergence shows
    // up here rather than on an operator's screen. The assertion that carries
    // the conversion is the invented occupants, below.
    const retired = payload.rooms.filter((r) => !r.active).map((r) => r.name);
    expect(retired.length, "some rooms are retired").toBeGreaterThan(0);

    await page.goto(CALENDAR, { waitUntil: "commit" });

    // Positive control first: without it "the retired kennel is absent" would
    // pass against a board that drew nothing at all.
    const live = payload.rooms.find((r) => r.active)!;
    await expect(
      page.getByText(live.name, { exact: true }).first(),
    ).toBeVisible({ timeout: 90_000 });

    for (const name of retired) {
      await expect(
        page.getByText(name, { exact: true }),
        `${name} is retired and must not be on the board`,
      ).toHaveCount(0);
    }
  });

  test("counts the kennels from the occupancy read, not the overlay", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const payload = (await (
      await page.request.get("/api/boarding/rooms")
    ).json()) as RoomsPayload;

    const active = payload.rooms.filter((r) => r.active).length;
    const held = payload.occupied.length;

    await page.goto(CALENDAR, { waitUntil: "commit" });

    const tile = (label: string) =>
      page
        .locator("div")
        .filter({ hasText: new RegExp(`^${label}`) })
        .first();

    // Vacant is every active kennel nobody is in. The overlay put twelve
    // invented guests on this board, so this number was wrong by exactly the
    // number of people who did not exist.
    await expect(tile("Vacant")).toBeVisible({ timeout: 90_000 });
    await expect(tile("Vacant")).toContainText(String(active - held));

    // MAINTENANCE IS STRUCTURALLY ZERO and that is the sharpest assertion here.
    // The old map could mark a kennel out of service; nothing in the database
    // records that, so the only way this tile can be non-zero again is if
    // somebody invents the state a second time rather than adding a column.
    await expect(tile("Maintenance")).toContainText("0");

    // And the fabricated people are not in the DOM in any state.
    for (const person of INVENTED_PEOPLE) {
      await expect(
        page.getByText(person, { exact: false }),
        `${person} exists in no database`,
      ).toHaveCount(0);
    }
  });

  test("names the facility from the session", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const profile = (await (
      await page.request.get("/api/facility/profile")
    ).json()) as { businessName: string };

    await page.goto(CALENDAR, { waitUntil: "commit" });
    // "Pawradise Resort" was hardcoded into this page four times, and shown to
    // every facility regardless of who signed in.
    await expect(page.getByText("Pawradise Resort")).toHaveCount(0);
    expect(profile.businessName).not.toBe("Pawradise Resort");
  });
});
