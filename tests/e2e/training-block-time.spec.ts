import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Training's "Block this time" is a calendar event (2026-09-12).
//
// The block went into the query cache: "Time blocked on Marcus's schedule"
// was toasted, and the striped block was gone on reload and invisible to
// every other screen. It is a `calendar_events` row of kind `block-time`
// now, aimed at the trainer. This pins:
//
//   1. Through the route: a trainer's block is stored, read back aimed at
//      the trainer, and a delete is a soft delete.
//   2. Through the screen: a block made from the day view's slot menu is
//      still in the trainer's column after a reload.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// Nobody signed in can delete a calendar event (the calendar recovers them
// for 30 days), so afterAll removes this run's rows as service_role, matched
// by the MARKER in the block's note.
// ============================================================================

const MARKER = "[e2e training-block-time]";
const EVENTS = "/api/calendar/events";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type Trainer = { id: string; name: string; status: string };
type CalendarEvent = {
  id: string;
  kind: string;
  affects?: string;
  affectedStaff?: string;
  notes?: string;
  deletedAt?: string;
};

async function activeTrainer(page: Page): Promise<Trainer> {
  const res = await page.request.get("/api/training/trainers");
  expect(res.ok(), await res.text()).toBe(true);
  const trainers = (await res.json()) as Trainer[];
  const trainer = trainers.find((t) => t.status === "active");
  expect(trainer, "the test facility needs an active trainer").toBeTruthy();
  return trainer!;
}

async function events(page: Page): Promise<CalendarEvent[]> {
  const res = await page.request.get(EVENTS);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as CalendarEvent[];
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const { count } = await admin()
    .from("calendar_events")
    .delete({ count: "exact" })
    .like("event->>notes", `${MARKER}%`);
  console.log(`cleanup: ${count ?? 0} calendar event(s) deleted`);
});

test.describe("training block time is saved", () => {
  test("a trainer's block is stored, aimed at the trainer, and soft-deleted", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const trainer = await activeTrainer(page);
    const note = `${MARKER} route ${Date.now()}`;
    const created = await page.request.post(EVENTS, {
      data: {
        event: {
          id: "",
          title: "Trainer unavailable",
          subtype: "blocked-time",
          kind: "block-time",
          start: `${today()}T13:00`,
          end: `${today()}T14:00`,
          allDay: false,
          location: "",
          staff: trainer.name,
          status: "Scheduled",
          notes: note,
          affects: "staff",
          affectedStaff: trainer.id,
          visibility: "all-staff",
        },
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const { id } = (await created.json()) as CalendarEvent;

    const stored = (await events(page)).find((e) => e.id === id);
    expect(stored?.kind).toBe("block-time");
    expect(stored?.affects).toBe("staff");
    expect(stored?.affectedStaff).toBe(trainer.id);
    expect(stored?.notes).toBe(note);

    const removed = await page.request.patch(`${EVENTS}/${id}`, {
      data: { deleted: true },
    });
    expect(removed.ok(), await removed.text()).toBe(true);
    expect(
      (await events(page)).find((e) => e.id === id)?.deletedAt,
    ).toBeTruthy();
  });

  test("through the day view: a block made from the slot menu survives a reload", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const trainer = await activeTrainer(page);
    const note = `${MARKER} screen ${Date.now()}`;

    await page.goto("/facility/dashboard/services/training");
    const column = page.getByRole("button", {
      name: `Schedule slot for ${trainer.name}`,
    });
    await column.click({
      button: "right",
      position: { x: 40, y: 200 },
      timeout: 30_000,
    });
    await page.getByRole("menuitem", { name: /block this time/i }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").last().fill(note);
    await dialog.getByRole("button", { name: /^block time$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(note).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
