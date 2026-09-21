import { describe, expect, test } from "bun:test";

import {
  describeCandidates,
  foldName,
  foldPhone,
  possibleDuplicates,
} from "@/lib/clients/possible-duplicate";

// ============================================================================
// The duplicate-client rule, measured against the duplicate that happened.
//
// 2026-09-21, doggieville-mtl: refs 855 and 92037410, both "Parminder Singh",
// each with a dog called Bubu. **The phones did not match** — 855 carries one
// and 92037410 is null — so the NAME is the only signal there was. The first
// test is that exact pair, because a rule that does not catch the case that
// caused it is decoration.
// ============================================================================

const existing = [
  {
    ref: 855,
    name: "Parminder Singh",
    email: "singhparminder360@gmail.com",
    phone: "5146908911",
  },
  {
    ref: 900,
    name: "Alice Johnson",
    email: "alice@example.com",
    phone: "5145550000",
  },
];

describe("is this person already a client here", () => {
  test("the duplicate that actually happened is caught, by name alone", () => {
    const hits = possibleDuplicates(
      { name: "Parminder Singh", email: "admin@yipyy.com", phone: null },
      existing,
    );
    expect(hits.map((h) => h.ref)).toEqual([855]);
  });

  test("the same email is NOT reported here", () => {
    // It is a unique-index refusal with its own clearer sentence. Reporting it
    // twice gives one mistake two different answers.
    const hits = possibleDuplicates(
      {
        name: "Parminder Singh",
        email: "singhparminder360@gmail.com",
        phone: null,
      },
      existing,
    );
    expect(hits).toEqual([]);
  });

  test("case and accents are folded", () => {
    const hits = possibleDuplicates(
      { name: "  parminder   SINGH ", email: "new@example.com" },
      existing,
    );
    expect(hits.map((h) => h.ref)).toEqual([855]);

    // Geneviève / Genevieve is one person to everybody except a byte compare.
    expect(foldName("Geneviève Fortin")).toBe(foldName("Genevieve Fortin"));
  });

  test("a shared phone catches it when the names differ", () => {
    const hits = possibleDuplicates(
      { name: "P. Singh", email: "other@example.com", phone: "(514) 690-8911" },
      existing,
    );
    expect(hits.map((h) => h.ref)).toEqual([855]);
  });

  test("two empty phones are not a match", () => {
    // The trap in a digits-only fold: "" === "" would make every client with
    // no phone a duplicate of every other.
    const hits = possibleDuplicates(
      { name: "Someone Else", email: "else@example.com", phone: "" },
      [{ ref: 901, name: "Nobody", email: "n@example.com", phone: null }],
    );
    expect(hits).toEqual([]);
    expect(foldPhone(null)).toBe("");
    expect(foldPhone("(514) 690-8911")).toBe("5146908911");
  });

  test("a genuinely different person is not flagged", () => {
    const hits = possibleDuplicates(
      { name: "Bob Smith", email: "bob@example.com", phone: "5149999999" },
      existing,
    );
    expect(hits).toEqual([]);
  });

  test("two people who really do share a name are both offered", () => {
    // Not a block — the caller decides. Both candidates come back so the
    // person choosing can see there is more than one.
    const twins = [
      { ref: 10, name: "John Smith", email: "j1@example.com", phone: null },
      { ref: 11, name: "John Smith", email: "j2@example.com", phone: null },
    ];
    const hits = possibleDuplicates(
      { name: "John Smith", email: "j3@example.com" },
      twins,
    );
    expect(hits.map((h) => h.ref)).toEqual([10, 11]);
    expect(describeCandidates(hits)).toBe("#10 John Smith, #11 John Smith");
  });

  test("an empty name matches nothing", () => {
    // The route refuses a blank name before this, but a fold that treated ""
    // as a match would flag every client at the facility.
    const hits = possibleDuplicates(
      { name: "   ", email: "blank@example.com" },
      existing,
    );
    expect(hits).toEqual([]);
  });
});
