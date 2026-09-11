import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A client's file holds real records: vaccinations and documents.
//
// ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
//
// The vaccination pages read `vaccinationRecords` from `@/data/pet-data` and
// "approved" them by editing a module array as "Sarah (Staff)"; the Documents
// tab read `@/data/documents`, and its Upload had no handler. Both are rows
// now (pet_vaccinations, client_documents + a private bucket). The SQL files
// hold the POLICIES; this holds the ROUTES:
//
//   - a vaccination added comes back, and a review is stamped from the session
//   - a caretaker, without edit_pet_medical, cannot add one
//   - a document filed comes back with a signed link that serves its bytes,
//     a file that is not a PDF or an image is refused on its bytes, and a
//     removal removes it
//   - a caretaker, without view_client_documents, sees no documents
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// Both tables allow a delete to the people who wrote here, so the tests remove
// their own rows; afterAll sweeps anything a failure left, as service_role.
// ============================================================================

const MARKER = "[e2e client-file]";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface ClientPayload {
  id: number;
  pets: { id: number; name: string }[];
}

async function aClientWithAPet(page: Page): Promise<ClientPayload> {
  const res = await page.request.get("/api/clients");
  expect(res.ok()).toBe(true);
  const client = ((await res.json()) as ClientPayload[]).find(
    (c) => c.pets.length > 0,
  );
  expect(client, "a client with a pet").toBeTruthy();
  return client!;
}

const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const db = admin();
  const vax = await db
    .from("pet_vaccinations")
    .delete({ count: "exact" })
    .eq("notes", MARKER);
  const { data: docs } = await db
    .from("client_documents")
    .select("id, storage_path")
    .eq("notes", MARKER);
  if (docs?.length) {
    await db.storage
      .from("client-documents")
      .remove(docs.map((d) => d.storage_path));
    await db
      .from("client_documents")
      .delete()
      .in(
        "id",
        docs.map((d) => d.id),
      );
  }
  console.log(
    `cleanup: ${vax.count ?? 0} vaccination(s), ${docs?.length ?? 0} document(s)`,
  );
});

test.describe("vaccination records", () => {
  test("signed out gets 401", async ({ request }) => {
    const res = await request.get("/api/vaccinations", {
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(401);
  });

  test("one added comes back, and a review is stamped from the session", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const client = await aClientWithAPet(page);
    const pet = client.pets[0];

    const added = await page.request.post("/api/vaccinations", {
      data: {
        petRef: pet.id,
        vaccineName: "Rabies",
        expiryDate: "2027-08-01",
        notes: MARKER,
        status: "pending_review",
      },
    });
    expect(added.status(), await added.text()).toBe(201);
    const record = (await added.json()) as { id: string; status: string };
    expect(record.status).toBe("pending_review");

    const listed = (await (
      await page.request.get(`/api/vaccinations?petRef=${pet.id}`)
    ).json()) as { id: string }[];
    expect(listed.some((v) => v.id === record.id)).toBe(true);

    const reviewed = await page.request.patch(
      `/api/vaccinations/${record.id}`,
      { data: { status: "rejected", reviewReason: "Unreadable" } },
    );
    expect(reviewed.status(), await reviewed.text()).toBe(200);
    const body = (await reviewed.json()) as {
      status: string;
      reviewedBy?: string;
      rejectionReason?: string;
    };
    expect(body.status).toBe("rejected");
    expect(body.reviewedBy, "stamped from the session").toBeTruthy();
    expect(body.rejectionReason).toBe("Unreadable");

    const gone = await page.request.delete(`/api/vaccinations/${record.id}`);
    expect(gone.status()).toBe(204);
  });

  test("a caretaker, without edit_pet_medical, cannot add one", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.caretaker);
    const clients = (await (
      await page.request.get("/api/clients")
    ).json()) as ClientPayload[];
    const pet = clients.find((c) => c.pets.length > 0)?.pets[0];
    test.skip(!pet, "the caretaker sees no pets");
    const res = await page.request.post("/api/vaccinations", {
      failOnStatusCode: false,
      data: { petRef: pet!.id, vaccineName: "Rabies", notes: MARKER },
    });
    expect(res.status(), "a caretaker recorded a vaccination").not.toBe(201);
  });
});

test.describe("client documents", () => {
  test("a filed document comes back with a working link, and can be removed", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const client = await aClientWithAPet(page);

    const filed = await page.request.post("/api/client-documents", {
      multipart: {
        file: { name: "e2e.pdf", mimeType: "application/pdf", buffer: PDF },
        clientRef: String(client.id),
        docType: "insurance",
        notes: MARKER,
      },
    });
    expect(filed.status(), await filed.text()).toBe(201);
    const doc = (await filed.json()) as { id: string; type: string };
    expect(doc.type).toBe("insurance");

    const list = (await (
      await page.request.get(`/api/client-documents?clientRef=${client.id}`)
    ).json()) as { id: string; fileUrl: string | null }[];
    const mine = list.find((d) => d.id === doc.id);
    expect(mine?.fileUrl, "a signed link").toBeTruthy();
    const bytes = await page.request.get(mine!.fileUrl!);
    expect(bytes.status(), "the link serves the file").toBe(200);

    const gone = await page.request.delete(`/api/client-documents/${doc.id}`);
    expect(gone.status()).toBe(204);
    const after = (await (
      await page.request.get(`/api/client-documents?clientRef=${client.id}`)
    ).json()) as { id: string }[];
    expect(after.some((d) => d.id === doc.id)).toBe(false);
  });

  test("a file that is not a PDF or an image is refused on its bytes", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const client = await aClientWithAPet(page);
    const res = await page.request.post("/api/client-documents", {
      failOnStatusCode: false,
      multipart: {
        // Declared a PDF; the bytes say otherwise.
        file: {
          name: "fake.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("MZ not really a pdf"),
        },
        clientRef: String(client.id),
        notes: MARKER,
      },
    });
    expect(res.status()).toBe(415);
  });

  test("a caretaker, without view_client_documents, sees none", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const client = await aClientWithAPet(page);
    const filed = await page.request.post("/api/client-documents", {
      multipart: {
        file: {
          name: "e2e-hidden.pdf",
          mimeType: "application/pdf",
          buffer: PDF,
        },
        clientRef: String(client.id),
        notes: MARKER,
      },
    });
    expect(filed.status()).toBe(201);

    await signIn(page, ACCOUNTS.caretaker);
    const res = await page.request.get(
      `/api/client-documents?clientRef=${client.id}`,
    );
    expect(res.status()).toBe(200);
    expect((await res.json()) as unknown[]).toHaveLength(0);
  });
});
