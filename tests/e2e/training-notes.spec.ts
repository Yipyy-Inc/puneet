import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A trainer's note is a row (training_notes, 2026-09-12).
//
// Every trainer note — the profile's Notes tab, the quick actions' "Add
// note", a completed session's per-dog note, the active alert the calendar
// card and the briefing show — was the `trainerNotes` fixture written with
// setQueryData, and was gone on reload. This pins:
//
//   1. A note is stored and read back; pinning a second unpins the first.
//   2. An alert is lifted with a reason or not at all.
//   3. The pet's owner reads a SHARED note and never a private one.
//   4. A groomer, who does not log training progress, cannot write one.
//   5. Through the screen: a note added on the Notes tab is there after a
//      reload.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
// Every note carries MARKER and is deleted in afterAll.
// ============================================================================

const MARKER = "[e2e training-notes]";
const API = "/api/training/notes";
const BUDDY = 1; // Alice's dog — Alice is ACCOUNTS.customer.

interface Note {
  id: string;
  petId: number;
  note: string;
  isPrivate: boolean;
  isActiveAlert?: boolean;
  deactivatedAt?: string;
  deactivationReason?: string;
  isPinnedToProfile?: boolean;
}

async function listNotes(page: Page): Promise<Note[]> {
  const res = await page.request.get(`${API}?petRef=${BUDDY}`);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Note[];
}

async function addNote(page: Page, data: Record<string, unknown>) {
  const res = await page.request.post(API, {
    data: { petRef: BUDDY, category: "general", ...data },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as Note;
}

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    for (const n of await listNotes(page)) {
      if (n.note.includes(MARKER)) {
        await page.request.delete(`${API}/${n.id}`);
      }
    }
  } finally {
    await page.close();
  }
});

test.describe("training notes are rows", () => {
  test("a note is stored, and pinning a second unpins the first", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const first = await addNote(page, {
      note: `${MARKER} first`,
      isPinnedToProfile: true,
    });
    expect(first.isPinnedToProfile).toBe(true);
    const second = await addNote(page, { note: `${MARKER} second` });

    const pinned = await page.request.patch(`${API}/${second.id}`, {
      data: { isPinnedToProfile: true },
    });
    expect(pinned.ok(), await pinned.text()).toBe(true);

    const notes = await listNotes(page);
    const byId = new Map(notes.map((n) => [n.id, n]));
    expect(byId.get(second.id)?.isPinnedToProfile).toBe(true);
    expect(byId.get(first.id)?.isPinnedToProfile).toBe(false);
  });

  test("an alert is lifted with a reason, or not at all", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const alert = await addNote(page, {
      note: `${MARKER} reactive to bikes`,
      category: "concern",
      isActiveAlert: true,
    });

    const blank = await page.request.patch(`${API}/${alert.id}`, {
      data: { deactivate: { reason: "   " } },
    });
    expect(blank.status()).toBe(422);

    const lifted = await page.request.patch(`${API}/${alert.id}`, {
      data: { deactivate: { reason: "Calm for three weeks" } },
    });
    expect(lifted.ok(), await lifted.text()).toBe(true);
    const after = (await listNotes(page)).find((n) => n.id === alert.id);
    expect(after?.deactivatedAt).toBeTruthy();
    expect(after?.deactivationReason).toBe("Calm for three weeks");
  });

  test("the owner reads a shared note and never a private one", async ({
    browser,
  }) => {
    const staff = await browser.newPage();
    await signIn(staff, ACCOUNTS.owner);
    const shared = await addNote(staff, {
      note: `${MARKER} shared with Alice`,
      isPrivate: false,
    });
    const hidden = await addNote(staff, {
      note: `${MARKER} for staff only`,
      isPrivate: true,
    });
    await staff.close();

    const owner = await browser.newPage();
    try {
      await signIn(owner, ACCOUNTS.customer);
      const res = await owner.request.get(API);
      expect(res.ok(), await res.text()).toBe(true);
      const ids = new Set(((await res.json()) as Note[]).map((n) => n.id));
      expect(ids.has(shared.id)).toBe(true);
      expect(ids.has(hidden.id)).toBe(false);
    } finally {
      await owner.close();
    }
  });

  test("a groomer cannot write a training note", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    const res = await page.request.post(API, {
      data: { petRef: BUDDY, category: "general", note: `${MARKER} groomer` },
    });
    expect([403, 404]).toContain(res.status());
  });

  test("through the Notes tab: an added note is there after a reload", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);
    const text = `${MARKER} from the tab ${Date.now()}`;
    await page.goto(
      `/facility/dashboard/services/training/students/${BUDDY}?tab=notes`,
    );
    await page
      .getByRole("button", { name: /add note|new note/i })
      .first()
      .click({ timeout: 30_000 });
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").first().fill(text);
    await dialog.getByRole("button", { name: /^add note$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    await page.reload();
    await expect(page.getByText(text).first()).toBeVisible({
      timeout: 30_000,
    });
  });
});
