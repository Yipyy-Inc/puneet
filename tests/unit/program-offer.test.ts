import { describe, expect, test } from "bun:test";

import {
  bookablePrograms,
  cleanPacks,
  packOptions,
  programFormat,
  programMinutes,
  programPrice,
} from "@/lib/training/program-offer";
import type { TrainingPackage } from "@/types/training";

// The booking wizard's "Choose a program" (the client's mock, 2026-10-01).
const program = (over: Partial<TrainingPackage>): TrainingPackage =>
  ({
    id: "p",
    name: "Program",
    description: "",
    classType: "group",
    skillLevel: "beginner",
    sessions: 6,
    price: 280,
    validityDays: 90,
    isActive: true,
    includes: [],
    ...over,
  }) as TrainingPackage;

describe("program offer", () => {
  test("a program saved before `format` books as it always meant", () => {
    expect(programFormat(program({ classType: "group" }))).toBe("group");
    expect(programFormat(program({ classType: "private" }))).toBe("lesson");
    expect(programFormat(program({ format: "consult" }))).toBe("consult");
  });

  test("a lesson is 60 minutes and a consult 90, unless the facility says", () => {
    expect(programMinutes(program({ format: "lesson" }))).toBe(60);
    expect(programMinutes(program({ format: "consult" }))).toBe(90);
    expect(
      programMinutes(program({ format: "lesson", sessionMinutes: 45 })),
    ).toBe(45);
  });

  test("a lesson's packs: single, then by size, each with what it saves", () => {
    const lesson = program({
      format: "lesson",
      price: 95,
      packs: [
        { sessions: 5, price: 425 },
        { sessions: 3, price: 270 },
      ],
    });
    expect(packOptions(lesson)).toEqual([
      { sessions: 1, price: 95, saves: 0 },
      { sessions: 3, price: 270, saves: 15 },
      { sessions: 5, price: 425, saves: 50 },
    ]);
    expect(programPrice(lesson, 3)).toBe(270);
    expect(programPrice(lesson)).toBe(95);
  });

  test("a group or a consult sells no packs", () => {
    expect(packOptions(program({ format: "group" }))).toEqual([]);
    expect(
      packOptions(
        program({ format: "consult", packs: [{ sessions: 3, price: 300 }] }),
      ),
    ).toEqual([]);
  });

  test("inactive programs are not offered; the facility's order holds", () => {
    const list = bookablePrograms([
      program({ id: "b", name: "B", sortOrder: 2 }),
      program({ id: "off", name: "Off", isActive: false }),
      program({ id: "a", name: "A", sortOrder: 1 }),
      program({ id: "c", name: "C" }),
    ]);
    expect(list.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});

describe("the Rates editor's packs", () => {
  test("a half-filled row is dropped; one pack per size, smallest first", () => {
    expect(
      cleanPacks([
        { sessions: 5, price: 425 },
        { sessions: "", price: 300 },
        { sessions: 3, price: "" },
        { sessions: 3, price: 270 },
        { sessions: 3, price: 260 },
        { sessions: 1, price: 95 },
        { sessions: 2.5, price: 200 },
        { sessions: 4, price: -1 },
      ]),
    ).toEqual([
      { sessions: 3, price: 270 },
      { sessions: 5, price: 425 },
    ]);
  });
});
