import { describe, expect, test } from "bun:test";

import { answersHaveFiles, redFlagsIn } from "@/lib/forms/red-flags";
import type { FormRedFlags } from "@/lib/settings/form-settings";

const flags: FormRedFlags = {
  keywords: ["bite"],
  rules: [
    {
      id: "r1",
      formId: "intake",
      formName: "Intake",
      questionId: "vaccinated",
      questionLabel: "Is your dog vaccinated?",
      operator: "equals",
      value: "no",
    },
    {
      id: "r2",
      formId: "intake",
      formName: "Intake",
      questionId: "conditions",
      questionLabel: "Medical conditions",
      operator: "contains",
      value: "seizure",
    },
    {
      id: "r3",
      formId: "other-form",
      formName: "Other",
      questionId: "vaccinated",
      questionLabel: "Vaccinated?",
      operator: "equals",
      value: "no",
    },
  ],
};

describe("redFlagsIn", () => {
  test("nothing flagged when no answer matches", () => {
    expect(
      redFlagsIn({
        formId: "intake",
        answers: { vaccinated: "yes", conditions: "none" },
        flags,
      }),
    ).toEqual([]);
  });

  test("equals ignores case and space; contains finds the value inside", () => {
    const matches = redFlagsIn({
      formId: "intake",
      answers: { vaccinated: "  No ", conditions: "Had a SEIZURE in May" },
      flags,
    });
    expect(matches.map((m) => m.label)).toEqual([
      "Is your dog vaccinated?: no",
      "Medical conditions: seizure",
    ]);
  });

  test("a rule for another form does not apply", () => {
    const matches = redFlagsIn({
      formId: "other-intake",
      answers: { vaccinated: "no" },
      flags,
    });
    expect(matches.filter((m) => m.kind === "rule")).toEqual([]);
  });

  test("a keyword is found in any answer, including a list of choices", () => {
    const matches = redFlagsIn({
      formId: "x",
      answers: { history: ["jumps fences", "Bite incident 2025"] },
      flags,
    });
    expect(matches).toEqual([
      { kind: "keyword", questionId: "history", label: "bite" },
    ]);
  });

  test("an equals rule does not match a value that merely contains it", () => {
    const matches = redFlagsIn({
      formId: "intake",
      answers: { vaccinated: "not sure" },
      flags: { keywords: [], rules: flags.rules },
    });
    expect(matches).toEqual([]);
  });
});

describe("answersHaveFiles", () => {
  const questions = [
    { id: "name", type: "text" },
    { id: "records", type: "file" },
  ];

  test("an answered file question counts", () => {
    expect(answersHaveFiles(questions, { records: "rabies.pdf" })).toBe(true);
  });

  test("an empty file question, or files only in text, do not", () => {
    expect(answersHaveFiles(questions, { records: "" })).toBe(false);
    expect(answersHaveFiles(questions, { name: "file.pdf" })).toBe(false);
  });
});
