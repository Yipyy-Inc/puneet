import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A staff notification reaches the people it should, and stays read.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// The bell and the notification centre read a seeded localStorage array every
// member of staff shared; role defaults and personal preferences were
// localStorage maps nothing read. Notifications are rows now, addressed to one
// person by `notify_staff`: permission first, then the person's own switch,
// then their role's default.
//
// ── WHAT IT ASSERTS ───────────────────────────────────────────────────────
//
//   - an incident a caretaker reports reaches the owner (mandatory), and not the
//     caretaker who reported it; read and archive are saved on the row
//   - a manager who switches schedule notices off hears nothing about the next
//     time-off request, and hears again once they follow their role
//   - the person who asked for time off hears the decision, although their
//     role does not follow schedule notices
//   - the centre shows the notice after a reload
//
// The fan-out's rules in full (permission, defaults, dedupe, email, RLS) are in
// supabase/tests/staff-notifications.sql; this is the routes and the screen.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// As service_role: this run's incidents (by MARKER) with their tasks, the
// time-off requests it filed, every notification those produced, and the
// manager's preference row.
// ============================================================================

const MARKER = "[e2e notifications]";
const PET_REF = 1;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface Notice {
  id: string;
  kind: string;
  read: boolean;
  archived: boolean;
  params: Record<string, string>;
}

interface Feed {
  items: Notice[];
  unread: number;
}

async function feed(page: Page, view: "active" | "archive" = "active") {
  const res = await page.request.get(
    `/api/notifications?view=${view}&limit=200`,
  );
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()) as Feed;
}

/** The notice is written after the response, so wait for it. */
async function waitForNotice(
  page: Page,
  match: (n: Notice) => boolean,
): Promise<Notice> {
  let found: Notice | undefined;
  await expect
    .poll(
      async () => {
        found = (await feed(page)).items.find(match);
        return Boolean(found);
      },
      { timeout: 20_000, intervals: [500, 1000, 2000] },
    )
    .toBe(true);
  return found!;
}

const incidentIds: string[] = [];
const timeOffIds: string[] = [];

// Far-future, and different per run, so no approved leave overlaps.
const year = 2031 + (Date.now() % 7);
const day = (month: number, date: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const db = admin();
  const sources = [...incidentIds, ...timeOffIds];
  if (sources.length > 0) {
    await db.from("staff_notifications").delete().in("source_id", sources);
  }
  if (timeOffIds.length > 0) {
    await db.from("staff_time_off_requests").delete().in("id", timeOffIds);
  }
  const { data: incidents } = await db
    .from("incidents")
    .select("id, ref")
    .like("title", `${MARKER}%`);
  for (const row of incidents ?? []) {
    await db
      .from("facility_tasks")
      .delete()
      .like("source_ref", `incident:${row.ref}:%`);
    await db.from("staff_notifications").delete().eq("source_id", row.id);
  }
  await db.from("incidents").delete().like("title", `${MARKER}%`);

  const { data: manager } = await db
    .from("profiles")
    .select("id")
    .eq("email", ACCOUNTS.manager)
    .maybeSingle();
  if (manager) {
    await db
      .from("staff_notification_preferences")
      .delete()
      .eq("profile_id", (manager as { id: string }).id);
  }
  console.log(
    `cleanup: ${incidentIds.length} incident(s), ${timeOffIds.length} time-off request(s) and their notifications`,
  );
});

test.describe("staff notifications", () => {
  test("signed out gets 401", async ({ request }) => {
    const res = await request.get("/api/notifications", {
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
  });

  test("an incident reaches the owner, not its reporter, and read and archive stick", async ({
    browser,
  }) => {
    test.slow();
    const caretaker = await browser.newPage();
    const owner = await browser.newPage();
    try {
      await signIn(caretaker, ACCOUNTS.caretaker);
      const title = `${MARKER} gate left open ${Date.now()}`;
      const created = await caretaker.request.post("/api/incidents", {
        data: {
          type: "injury",
          severity: "low",
          title,
          description: "Found during the evening round.",
          internalNotes: "",
          clientFacingNotes: "",
          petRefs: [PET_REF],
          incidentDate: new Date().toISOString(),
        },
      });
      expect(created.status(), await created.text()).toBe(201);
      incidentIds.push(((await created.json()) as { id: string }).id);

      await signIn(owner, ACCOUNTS.owner);
      const notice = await waitForNotice(
        owner,
        (n) => n.kind === "incident_reported" && n.params.title === title,
      );
      expect(notice.read).toBe(false);

      // Not the person who reported it.
      const mine = await feed(caretaker);
      expect(mine.items.some((n) => n.params.title === title)).toBe(false);

      // Read is saved, and counted.
      const before = (await feed(owner)).unread;
      const read = await owner.request.patch(
        `/api/notifications/${notice.id}`,
        {
          data: { read: true },
        },
      );
      expect(read.status(), await read.text()).toBe(200);
      const after = await feed(owner);
      expect(after.unread).toBe(before - 1);
      expect(after.items.find((n) => n.id === notice.id)?.read).toBe(true);

      // Somebody else's notification is not theirs to change.
      const refused = await caretaker.request.patch(
        `/api/notifications/${notice.id}`,
        { data: { read: false }, failOnStatusCode: false },
      );
      expect(refused.status()).toBe(404);

      // The centre shows it after a reload.
      await owner.goto("/facility/notifications");
      await owner.reload();
      await expect(
        owner.getByText(`Incident reported: ${title}`).first(),
      ).toBeVisible({ timeout: 30_000 });

      // Archived, it moves to the archive.
      const archived = await owner.request.patch(
        `/api/notifications/${notice.id}`,
        { data: { archived: true } },
      );
      expect(archived.status()).toBe(200);
      expect((await feed(owner)).items.some((n) => n.id === notice.id)).toBe(
        false,
      );
      expect(
        (await feed(owner, "archive")).items.some((n) => n.id === notice.id),
      ).toBe(true);
    } finally {
      await caretaker.close();
      await owner.close();
    }
  });

  test("a switched-off category stops notices, and a decision reaches whoever asked", async ({
    browser,
  }) => {
    test.slow();
    const caretaker = await browser.newPage();
    const manager = await browser.newPage();
    try {
      await signIn(caretaker, ACCOUNTS.caretaker);
      await signIn(manager, ACCOUNTS.manager);

      const fileLeave = async (start: string, end: string) => {
        const res = await caretaker.request.post("/api/scheduling/time-off", {
          data: {
            type: "vacation",
            startDate: start,
            endDate: end,
            reason: MARKER,
          },
        });
        expect(res.status(), await res.text()).toBe(201);
        const id = ((await res.json()) as { id: string }).id;
        timeOffIds.push(id);
        return id;
      };

      // On by the manager's role: the first request reaches them.
      await fileLeave(day(3, 2), day(3, 3));
      await waitForNotice(
        manager,
        (n) => n.kind === "time_off_requested" && n.params.from === day(3, 2),
      );

      // Switched off for themselves: the next one does not.
      const off = await manager.request.put("/api/notifications/preferences", {
        data: { inApp: { schedule: false }, email: {} },
      });
      expect(off.status(), await off.text()).toBe(200);
      const quiet = await fileLeave(day(4, 6), day(4, 7));
      // Give the after-response write the same time a delivered one gets.
      await manager.waitForTimeout(6_000);
      expect(
        (await feed(manager)).items.some(
          (n) => n.kind === "time_off_requested" && n.params.from === day(4, 6),
        ),
      ).toBe(false);

      // The manager declines it; the caretaker, whose role does not follow
      // schedule notices, hears the decision about their own request.
      const decided = await manager.request.patch("/api/scheduling/time-off", {
        data: { id: quiet, status: "denied", notes: MARKER },
      });
      expect(decided.status(), await decided.text()).toBe(200);
      await waitForNotice(
        caretaker,
        (n) =>
          n.kind === "time_off_decided" &&
          n.params.decision === "denied" &&
          n.params.from === day(4, 6),
      );

      // Following their role again, the manager hears the next request.
      const back = await manager.request.put("/api/notifications/preferences", {
        data: { inApp: {}, email: {} },
      });
      expect(back.status()).toBe(200);
      await fileLeave(day(5, 11), day(5, 12));
      await waitForNotice(
        manager,
        (n) => n.kind === "time_off_requested" && n.params.from === day(5, 11),
      );
    } finally {
      await caretaker.close();
      await manager.close();
    }
  });
});
