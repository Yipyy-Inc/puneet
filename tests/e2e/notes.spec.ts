import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A note outlives the page it was written on.
//
// ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
//
// Until 20260910201745 every note lived in React state seeded from a fixture:
// "Note added" was true until the reload, and the booking page's Notes card
// was the same two notes about a dog called Buddy on every booking. The SQL
// file (supabase/tests/notes.sql) asserts the POLICY inside a rolled-back
// transaction; this asserts the ROUTE and the SCREEN, which SQL cannot see —
// that a note written through /api/notes comes back after a reload, that an
// edit keeps what the note used to say, and that a customer is not handed an
// internal note about their own pet.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// Staging and local dev share the production database. Every note written
// here carries MARKER, and afterAll deletes every note that does.
// ============================================================================

const MARKER = "[e2e notes]";
const PET_REF = 1;

interface NotePayload {
  id: string;
  entityId: number;
  content: string;
  createdBy: string;
  isPinned: boolean;
  visibility: string;
  editHistory: { previousContent: string; newContent: string }[];
}

interface BookingPayload {
  id: number;
  clientId: number;
  status?: string;
}

async function notesFor(page: Page, category: string, ref: number) {
  const response = await page.request.get(
    `/api/notes?category=${category}&ref=${ref}`,
  );
  expect(response.status(), `read of ${category} ${ref} notes`).toBe(200);
  return (await response.json()) as NotePayload[];
}

/** The refs this run wrote notes on, so cleanup knows where to look. */
const touched: { category: string; ref: number }[] = [
  { category: "pet", ref: PET_REF },
];

test.describe.configure({ mode: "serial" });

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    let deleted = 0;
    for (const { category, ref } of touched) {
      for (const note of await notesFor(page, category, ref)) {
        if (!note.content.includes(MARKER)) continue;
        const res = await page.request.delete(`/api/notes/${note.id}`);
        if (res.ok()) deleted++;
      }
    }
    console.log(`cleanup: ${deleted} note(s) deleted`);
  } finally {
    await page.close();
  }
});

test.describe("notes", () => {
  test("signed out gets 401 for a read and a write", async ({ request }) => {
    const read = await request.get(`/api/notes?category=pet&ref=${PET_REF}`, {
      failOnStatusCode: false,
    });
    expect(read.status()).toBe(401);
    const write = await request.post("/api/notes", {
      failOnStatusCode: false,
      data: { category: "pet", entityRef: PET_REF, content: MARKER },
    });
    expect(write.status()).toBe(401);
  });

  test("a note written, edited and pinned is still there when read back", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await page.request.post("/api/notes", {
      failOnStatusCode: false,
      data: {
        category: "pet",
        entityRef: PET_REF,
        content: `${MARKER} first words`,
        subType: "behavior",
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const note = (await created.json()) as NotePayload;
    expect(note.entityId, "a note must carry the ref, not a uuid").toBe(
      PET_REF,
    );
    expect(note.createdBy, "the author's name was not stamped").not.toBe("");

    const edited = await page.request.patch(`/api/notes/${note.id}`, {
      data: { content: `${MARKER} second words` },
    });
    expect(edited.status()).toBe(200);
    const pinned = await page.request.patch(`/api/notes/${note.id}`, {
      data: { isPinned: true },
    });
    expect(pinned.status()).toBe(200);

    const back = (await notesFor(page, "pet", PET_REF)).find(
      (n) => n.id === note.id,
    );
    expect(back, "the note did not come back").toBeTruthy();
    expect(back!.content).toBe(`${MARKER} second words`);
    expect(back!.isPinned).toBe(true);
    // One edit to the words; the pin is not an edit.
    expect(back!.editHistory).toHaveLength(1);
    expect(back!.editHistory[0].previousContent).toBe(`${MARKER} first words`);
  });

  test("a note added on the booking page survives a reload", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);

    const bookings = (await (
      await page.request.get("/api/bookings")
    ).json()) as BookingPayload[];
    const booking = bookings.find((b) => b.status !== "cancelled");
    test.skip(!booking, "the owner's facility has no booking to open");
    touched.push({ category: "booking", ref: booking!.id });

    await page.goto(
      `/facility/dashboard/clients/${booking!.clientId}/bookings/${booking!.id}`,
    );
    const text = `${MARKER} typed on booking ${booking!.id}`;
    // The card's own button, not the header's notes sheet.
    await page
      .getByRole("button", { name: "Add a note", exact: true })
      .last()
      .click();
    await page.getByRole("dialog").getByRole("textbox").first().fill(text);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add a note", exact: true })
      .click();
    await expect(page.getByText(text).first()).toBeVisible();

    await page.reload();
    await expect(
      page.getByText(text).first(),
      "the note was gone after a reload — it never reached the database",
    ).toBeVisible({ timeout: 30_000 });
  });

  test("a customer is not handed an internal note, and cannot write one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    for (const note of await notesFor(page, "pet", PET_REF)) {
      expect(
        note.visibility,
        `an internal note reached a customer: ${note.content}`,
      ).toBe("shared_with_customer");
    }

    const write = await page.request.post("/api/notes", {
      failOnStatusCode: false,
      data: {
        category: "pet",
        entityRef: PET_REF,
        content: `${MARKER} from a customer`,
      },
    });
    expect(write.status(), "a customer wrote a staff note").not.toBe(201);
  });
});
