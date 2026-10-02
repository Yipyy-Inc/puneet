import { describe, expect, test } from "bun:test";

import en from "../../messages/en.json";
import {
  detailRows,
  type DetailFacts,
} from "@/lib/bookings/wizard/detail-rows";

// Confirm's "TRAINING DETAILS" card, read in the catalogue's own English so
// the rows print as the client's mock does (2026-10-01).
const words = en.shell.booking as Record<string, string>;
const t = (key: string) => words[key] ?? key;

const base: DetailFacts = {
  service: "training",
  addOnCount: 0,
  feeding: null,
  medication: null,
};
const row = (facts: DetailFacts, key: string) =>
  detailRows(facts, t, "en").find((r) => r.key === key);

describe("training details", () => {
  test("a lesson pack: the program says its pack, the session its trainer", () => {
    const facts: DetailFacts = {
      ...base,
      program: "Private lesson",
      pack: 3,
      trainingSlot: {
        date: "2026-10-02",
        start: "11:00",
        staffName: "Alex M.",
      },
      goals: ["Loose-leash walking", "Recall"],
      experience: "Some basics",
    };
    expect(row(facts, "program")?.value).toBe("Private lesson · 3-pack");
    expect(row(facts, "session")?.value).toBe(
      "Fri, Oct 2 · 11:00 AM with Alex M.",
    );
    // The mock lists them as picked: "Loose-leash walking, Recall".
    expect(row(facts, "goals")?.value).toBe("Loose-leash walking, Recall");
    expect(row(facts, "experience")?.value).toBe("Some basics");
    expect(row(facts, "class")).toBeUndefined();
  });

  test("a single session or a consult shows the program alone", () => {
    expect(
      row({ ...base, program: "Private lesson", pack: 1 }, "program")?.value,
    ).toBe("Private lesson");
    expect(
      row({ ...base, program: "Behaviour consult" }, "program")?.value,
    ).toBe("Behaviour consult");
  });

  test("a group class: the class row, not a session", () => {
    const facts: DetailFacts = {
      ...base,
      program: "Group class",
      trainingClass: {
        name: "Puppy Foundations",
        when: "Saturdays · 10:00 AM",
        start: "2026-10-17",
      },
    };
    expect(row(facts, "class")?.label).toBe("Class");
    expect(row(facts, "class")?.value).toBe(
      "Puppy Foundations · Saturdays · 10:00 AM · starts Oct 17",
    );
    expect(row(facts, "session")).toBeUndefined();
    // Every row reopens the screen that asked it.
    expect(row(facts, "program")?.edit).toEqual({
      step: "details",
      subStepId: 0,
    });
    expect(row(facts, "class")?.edit).toEqual({
      step: "details",
      subStepId: 1,
    });
  });

  test("nothing chosen yet reads as a dash; no goals, as none picked", () => {
    expect(row({ ...base, trainingClass: null }, "class")?.value).toBe("—");
    expect(row({ ...base, trainingSlot: null }, "session")?.value).toBe("—");
    expect(row({ ...base, goals: [] }, "goals")?.value).toBe("None picked");
    expect(row(base, "goals")).toBeUndefined();
  });
});
