import { describe, expect, test } from "bun:test";

import {
  cleanNote,
  fallbackNote,
  noteFacts,
  noteSystemPrompt,
  type NoteInput,
} from "@/lib/evaluations/ai-note";
import {
  bookedServiceSince,
  latestPerPet,
  passRateOf,
  sortAllRows,
  viewerMayReview,
  visitReason,
} from "@/lib/evaluations/board";
import type { AllRow } from "@/lib/evaluations/board-types";
import { evaluationCardMessage } from "@/lib/evaluations/card-message";

// ============================================================================
// Operations › Evaluations (the client's mock, 2026-10-02): what the page
// says about the rows it is given, what reaches the AI note writer, and what
// an owner is sent when their card goes out.
// ============================================================================

describe("the board", () => {
  test("pass rate counts approvals with notes as passes, and nothing as no rate", () => {
    expect(
      passRateOf([
        "approved",
        "approved_with_restrictions",
        "needs_re_evaluation",
        "not_approved",
        null,
      ]),
    ).toBe(50);
    expect(passRateOf([])).toBeNull();
    expect(passRateOf([null])).toBeNull();
  });

  test("a pet evaluated before comes back as a re-evaluation", () => {
    expect(visitReason(0)).toBe("first_visit");
    expect(visitReason(2)).toBe("re_evaluation");
  });

  test("'booked since' is the first unlocked service booked after the card went out", () => {
    const sentAt = "2026-10-01T15:00:00Z";
    expect(
      bookedServiceSince({
        sentAt,
        approvedServices: ["daycare", "boarding"],
        bookings: [
          { service: "boarding", createdAt: "2026-10-03T12:00:00Z" },
          { service: "grooming", createdAt: "2026-10-02T12:00:00Z" },
          { service: "daycare", createdAt: "2026-09-30T12:00:00Z" },
          { service: "daycare", createdAt: "2026-10-02T09:00:00Z" },
        ],
      }),
    ).toBe("daycare");
    expect(
      bookedServiceSince({ sentAt, approvedServices: [], bookings: [] }),
    ).toBeNull();
  });

  test("a reviewer reviews any card; a self-sender only their own", () => {
    const reviewer = {
      mayRun: false,
      mayReview: true,
      maySelfSend: false,
      staffId: null,
    };
    const selfSender = {
      mayRun: true,
      mayReview: false,
      maySelfSend: true,
      staffId: "s-1",
    };
    expect(viewerMayReview(reviewer, "s-9")).toBe(true);
    expect(viewerMayReview(selfSender, "s-1")).toBe(true);
    expect(viewerMayReview(selfSender, "s-2")).toBe(false);
    expect(viewerMayReview({ ...selfSender, maySelfSend: false }, "s-1")).toBe(
      false,
    );
  });

  test("all evaluations: finished newest first, then in progress, then booked soonest first", () => {
    const row = (key: string, patch: Partial<AllRow>): AllRow => ({
      key,
      evaluationId: key,
      pet: {
        id: key,
        ref: 1,
        name: key,
        breed: null,
        species: null,
        imageUrl: null,
      },
      client: { id: "c", ref: 1, name: "C" },
      state: "sent",
      result: "approved",
      completedAt: null,
      scheduledAt: null,
      nextVisitAt: null,
      evaluatorName: null,
      approvedServices: [],
      ...patch,
    });
    const sorted = sortAllRows([
      row("later", { state: "scheduled", scheduledAt: "2026-10-09T13:00:00Z" }),
      row("old", { completedAt: "2026-01-08T13:00:00Z" }),
      row("doing", { state: "in_progress", result: null }),
      row("soon", { state: "scheduled", scheduledAt: "2026-10-05T13:00:00Z" }),
      row("new", { state: "in_review", completedAt: "2026-10-01T13:00:00Z" }),
    ]);
    expect(sorted.map((r) => r.key)).toEqual([
      "new",
      "old",
      "doing",
      "soon",
      "later",
    ]);
  });

  test("all evaluations: each pet once, where it stands, its next visit beside it", () => {
    const row = (key: string, pet: string, patch: Partial<AllRow>): AllRow => ({
      key,
      evaluationId: key,
      pet: {
        id: pet,
        ref: 1,
        name: pet,
        breed: null,
        species: null,
        imageUrl: null,
      },
      client: { id: "c", ref: 1, name: "C" },
      state: "sent",
      result: "approved",
      completedAt: null,
      scheduledAt: null,
      nextVisitAt: null,
      evaluatorName: null,
      approvedServices: [],
      ...patch,
    });
    const booked = (key: string, pet: string, at: string) =>
      row(key, pet, {
        state: "scheduled",
        result: null,
        evaluationId: null,
        scheduledAt: at,
      });
    const rows = latestPerPet([
      // Max did not pass in January, passed in March, and is booked again.
      row("max-jan", "max", {
        result: "not_approved",
        completedAt: "2026-01-08T13:00:00Z",
      }),
      row("max-mar", "max", { completedAt: "2026-03-08T13:00:00Z" }),
      booked("max-oct", "max", "2026-10-09T13:00:00Z"),
      // Luna is only booked, twice: the sooner visit is her row.
      booked("luna-late", "luna", "2026-10-12T13:00:00Z"),
      booked("luna-soon", "luna", "2026-10-05T13:00:00Z"),
      // Coco is being answered, with nothing finished before.
      row("coco", "coco", { state: "in_progress", result: null }),
      // Rex's result is in review while a re-evaluation is underway: the
      // finished one is where he stands.
      row("rex-review", "rex", {
        state: "in_review",
        result: "needs_re_evaluation",
        completedAt: "2026-09-30T13:00:00Z",
      }),
      row("rex-now", "rex", { state: "in_progress", result: null }),
    ]);
    const byPet = new Map(rows.map((r) => [r.pet.id, r]));
    expect(rows).toHaveLength(4);
    expect(byPet.get("max")?.key).toBe("max-mar");
    expect(byPet.get("max")?.nextVisitAt).toBe("2026-10-09T13:00:00Z");
    expect(byPet.get("luna")?.key).toBe("luna-soon");
    expect(byPet.get("luna")?.nextVisitAt).toBeNull();
    expect(byPet.get("coco")?.key).toBe("coco");
    expect(byPet.get("coco")?.nextVisitAt).toBeNull();
    expect(byPet.get("rex")?.key).toBe("rex-review");
  });
});

describe("the AI note", () => {
  const input: NoteInput = {
    locale: "en",
    petName: "Kiwi",
    petSex: "female",
    breed: "Beagle",
    ownerName: "Cleo Client",
    result: "approved",
    answers: { dog: "y", human: "y", energy: "h", guard: "y", "c-vet": "hip" },
    strengths: ["toy"],
    watchFor: ["jumper", "guarder"],
    points: "shy first 10 min, loved the ball",
    tone: "warm",
  };

  test("the facts never carry guarding, or a staff-only answer", () => {
    const facts = noteFacts(input).join("\n").toLowerCase();
    expect(facts).toContain("kiwi");
    expect(facts).toContain("toy motivated");
    expect(facts).toContain("four paws on the floor");
    expect(facts).not.toContain("guard");
    expect(facts).not.toContain("hip");
    expect(facts).toContain("female (she)");
  });

  test("the rules ask for the owner's language and forbid the hard words", () => {
    const fr = noteSystemPrompt({ locale: "fr", tone: "short" });
    expect(fr).toContain("Canadian French");
    expect(fr).toContain("two sentences");
    expect(noteSystemPrompt({ locale: "en", tone: "warm" })).toMatch(
      /Never mention aggression, biting/,
    );
  });

  test("without AI, a plain note from the same facts — never 'it'", () => {
    expect(fallbackNote(input)).toBe(
      "Kiwi did a lovely job today, and we enjoyed getting to know her. We can't wait to welcome Kiwi back for lots more fun.",
    );
    expect(
      fallbackNote({ ...input, petSex: null, result: "not_approved" }),
    ).toContain("getting to know them");
    expect(fallbackNote({ ...input, locale: "fr" })).toContain(
      "Kiwi a fait une très belle visite",
    );
  });

  test("the model's reply is one paragraph without wrapping quotes", () => {
    expect(cleanNote('  "Kiwi was a star.\n\nWe loved her."  ')).toBe(
      "Kiwi was a star. We loved her.",
    );
  });
});

describe("the owner's message", () => {
  const base = {
    facilityName: "Evaluated Pets",
    facilityOrigin: "https://ev.example.invalid",
    clientName: "Cleo Client",
    petName: "Kiwi",
    petSex: "female" as const,
    link: "https://ev.example.invalid/customer/evaluations/abc",
  };

  test("a pass says so, by name, with the link and how to open it", () => {
    const message = evaluationCardMessage({
      ...base,
      locale: "en",
      result: "approved",
    });
    expect(message.subject).toBe(
      "Kiwi's evaluation report card from Evaluated Pets",
    );
    expect(message.text).toContain("Hi Cleo,");
    expect(message.text).toContain("Kiwi passed her evaluation");
    expect(message.text).toContain(base.link);
    expect(message.sms).toContain(base.link);
  });

  test("a text never carries the verdict", () => {
    for (const result of [
      "approved",
      "approved_with_restrictions",
      "needs_re_evaluation",
      "not_approved",
    ] as const) {
      const sms = evaluationCardMessage({ ...base, locale: "en", result }).sms;
      expect(sms).not.toMatch(/approved|passed|not /i);
    }
  });

  test("in French, the colon takes its no-break space", () => {
    const message = evaluationCardMessage({
      ...base,
      locale: "fr",
      result: "not_approved",
    });
    expect(message.text).toContain("Bonjour Cleo,");
    expect(message.sms).toContain("Evaluated Pets : le bulletin");
  });
});
