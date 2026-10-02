import { describe, expect, test } from "bun:test";

import en from "../../messages/en.json";
import {
  classesForProgram,
  classPrice,
  classSessionDates,
  classWhen,
  parseOfferedClasses,
} from "@/lib/training/offered-classes";

// "Pick a class" (the client's mock, 2026-10-01): which classes a program runs.
const rows = parseOfferedClasses([
  {
    id: "a",
    name: "Puppy Foundations — Sat",
    courseTypeName: "Puppy Foundations",
    programId: null,
    spotsLeft: "2",
    capacity: 6,
  },
  {
    id: "b",
    name: "Adult Obedience — Tue",
    courseTypeName: "Adult Obedience",
    programId: null,
    spotsLeft: 0,
    capacity: 6,
  },
  {
    id: "c",
    name: "Agility basics",
    courseTypeName: "Agility",
    programId: "prog-agility",
    spotsLeft: 4,
    capacity: 6,
  },
  { id: "bad" },
]);

describe("offered classes", () => {
  test("the projection is read tolerantly", () => {
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(rows[0]!.spotsLeft).toBe(2);
    expect(rows[0]!.trainerName).toBeNull();
  });

  test("a class linked to a program belongs to that program only", () => {
    const agility = { id: "prog-agility", name: "Agility" };
    expect(classesForProgram(rows, agility, 3).map((r) => r.id)).toEqual(["c"]);
    const puppy = { id: "prog-puppy", name: "Puppy Foundations Package" };
    expect(classesForProgram(rows, puppy, 3).map((r) => r.id)).toEqual(["a"]);
  });

  test("one group program: every unlinked class is its", () => {
    const group = { id: "prog-group", name: "Group class" };
    expect(classesForProgram(rows, group, 1).map((r) => r.id)).toEqual([
      "a",
      "b",
    ]);
  });
});

describe("a class as the wizard books it", () => {
  test("one dog's place costs the sessions still ahead, as enrolment books them", () => {
    // $280 over six sessions: five at $46.67 and the last at $46.65.
    expect(
      classPrice({ totalPrice: 280, numberOfSessions: 6, sessionsLeft: 6 }),
    ).toBe(280);
    expect(
      classPrice({ totalPrice: 280, numberOfSessions: 6, sessionsLeft: 2 }),
    ).toBe(93.32);
    expect(
      classPrice({ totalPrice: 300, numberOfSessions: 6, sessionsLeft: 6 }),
    ).toBe(300);
    expect(
      classPrice({ totalPrice: 300, numberOfSessions: 6, sessionsLeft: 4 }),
    ).toBe(200);
    expect(
      classPrice({ totalPrice: 300, numberOfSessions: 0, sessionsLeft: 0 }),
    ).toBe(0);
  });

  test("the days a dog attends: the next session, then weekly", () => {
    expect(
      classSessionDates({
        startDate: "2026-10-17",
        nextSessionAt: null,
        sessionsLeft: 3,
      }),
    ).toEqual(["2026-10-17", "2026-10-24", "2026-10-31"]);
    // Already running: from the next session, across a month end.
    const next = new Date(2026, 9, 24, 10, 0).toISOString();
    expect(
      classSessionDates({
        startDate: "2026-10-03",
        nextSessionAt: next,
        sessionsLeft: 2,
      }),
    ).toEqual(["2026-10-24", "2026-10-31"]);
    expect(
      classSessionDates({
        startDate: "2026-10-03",
        nextSessionAt: null,
        sessionsLeft: 0,
      }),
    ).toEqual([]);
  });

  test("when it meets, in the mock's words", () => {
    const words = en.shell.booking as Record<string, string>;
    const t = (key: string) => words[key] ?? key;
    expect(classWhen({ dayOfWeek: 6, startTime: "10:00" }, t, "en")).toBe(
      "Saturdays · 10:00 AM",
    );
  });
});
