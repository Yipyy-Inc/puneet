import { describe, expect, test } from "bun:test";

import {
  yipyyGoAnswersSchema,
  type YipyyGoAnswers,
} from "@/lib/api/mappers/yipyy-go";
import {
  answerableQuestions,
  answersFromSectionForm,
  calendarDay,
  emptyYipyyGoAnswers,
  lastStayAnswers,
  sectionFormFromAnswers,
  stepForMissing,
  withCustomAnswer,
  yipyyGoFormSteps,
} from "@/lib/yipyy-go/owner-form";
import { validateYipyyGoAnswers } from "@/lib/yipyy-go/validate";
import type {
  CustomQuestion,
  FormSection,
  FormTemplateConfig,
} from "@/types/yipyygo";

// The owner's pre-arrival form: which steps the facility's template gives it,
// and the answers on their way between the sections and the server. A step
// list that disagreed with the completeness rule would send an owner looking
// for a question no step asks; a round trip that dropped a field would lose
// what they typed on the next save.

const section = (
  id: string,
  overrides: Partial<FormSection> = {},
): FormSection => ({
  id,
  label: id,
  enabled: false,
  required: false,
  order: 0,
  ...overrides,
});

const question = (
  id: string,
  overrides: Partial<CustomQuestion> = {},
): CustomQuestion => ({
  id,
  type: "short_text",
  label: `Question ${id}`,
  required: false,
  order: 0,
  ...overrides,
});

function template(
  overrides: {
    sections?: Partial<FormTemplateConfig["sections"]>;
    features?: Partial<FormTemplateConfig["features"]>;
    globalCustomQuestions?: CustomQuestion[];
  } = {},
): FormTemplateConfig {
  return {
    sections: {
      petInfo: section("petInfo"),
      careInstructions: section("careInstructions"),
      medications: section("medications"),
      feedingSchedule: section("feedingSchedule"),
      additionalContacts: section("additionalContacts"),
      specialRequests: section("specialRequests"),
      customSections: [],
      ...overrides.sections,
    },
    features: {
      photoUploads: false,
      addOnsSection: false,
      tipSection: false,
      ...overrides.features,
    },
    multiPetBehavior: "one_form_per_pet",
    addOnsScope: "booking",
    globalCustomQuestions: overrides.globalCustomQuestions ?? [],
  };
}

const everything = { contact: true, pet: true };

describe("the steps", () => {
  test("follow the facility's template and the order it gave its sections", () => {
    const steps = yipyyGoFormSteps(
      template({
        sections: {
          feedingSchedule: section("feedingSchedule", {
            enabled: true,
            order: 3,
          }),
          medications: section("medications", { enabled: true, order: 1 }),
          careInstructions: section("careInstructions", {
            enabled: true,
            order: 2,
          }),
        },
        globalCustomQuestions: [question("q1")],
      }),
      everything,
    );
    expect(steps).toEqual([
      "contact",
      "pet",
      "booking",
      "medications",
      "behavior",
      "feeding",
      "belongings",
      "questions",
      "review",
    ]);
  });

  test("a section the facility switched off is not a step", () => {
    expect(
      yipyyGoFormSteps(
        template({
          features: {
            contactInfoSection: false,
            petDetailsSection: false,
            bookingDetailsSection: false,
          },
        }),
        everything,
      ),
    ).toEqual(["belongings", "review"]);
  });

  test("no contact or pet step without a record to show", () => {
    expect(
      yipyyGoFormSteps(template(), { contact: false, pet: false }),
    ).toEqual(["booking", "belongings", "review"]);
  });

  test("add-ons are a step only where the form offers them and the booking has some", () => {
    const offering = template({ features: { addOnsSection: true } });
    expect(yipyyGoFormSteps(offering, { ...everything, addOns: true })).toEqual(
      ["contact", "pet", "booking", "addons", "belongings", "review"],
    );
    expect(
      yipyyGoFormSteps(offering, { ...everything, addOns: false }),
    ).not.toContain("addons");
    expect(
      yipyyGoFormSteps(template(), { ...everything, addOns: true }),
    ).not.toContain("addons");
  });

  test("a file question waits for uploads, and asks for no step of its own", () => {
    const withFileOnly = template({
      globalCustomQuestions: [question("file", { type: "file_upload" })],
    });
    expect(answerableQuestions(withFileOnly)).toEqual([]);
    expect(yipyyGoFormSteps(withFileOnly, everything)).not.toContain(
      "questions",
    );
  });

  test("everything the form can still need names a step the form has", () => {
    const strict = template({
      sections: {
        feedingSchedule: section("feedingSchedule", {
          enabled: true,
          required: true,
        }),
        medications: section("medications", { enabled: true, required: true }),
        careInstructions: section("careInstructions", {
          enabled: true,
          required: true,
        }),
      },
      features: { belongingsPhotoRequired: true },
      globalCustomQuestions: [question("q1", { required: true })],
    });
    const steps = yipyyGoFormSteps(strict, everything);
    const missing = validateYipyyGoAnswers(strict, emptyYipyyGoAnswers());
    expect(missing).toHaveLength(5);
    for (const item of missing) {
      expect(steps).toContain(stepForMissing(item));
    }
  });
});

describe("the answers", () => {
  const photoId = "5b7d1f5e-1b6f-4f3a-9f0e-2a1c9d8e7f60";
  const answers: YipyyGoAnswers = {
    belongings: [
      { id: "b1", type: "leash_collar", quantity: 1, photoId },
      { id: "b2", type: "bedding", notes: "Blue blanket" },
    ],
    feedingInstructions: {
      foodType: "",
      portionSize: "",
      portionUnit: "cups",
      feedingSchedule: [],
      occasions: [
        {
          id: "o1",
          label: "Breakfast",
          time: "07:00",
          components: [
            {
              id: "c1",
              type: "kibble",
              name: "",
              amount: "1",
              unit: "cups",
            },
          ],
        },
      ],
    },
    medications: [
      {
        id: "m1",
        name: "Apoquel",
        dosage: "16 mg",
        frequency: "once_daily",
        times: ["08:00"],
        method: "with_food",
      },
    ],
    noMedications: false,
    behaviorNotes: {
      energyLevel: "high",
      socialization: { withDogs: "friendly", withHumans: "shy" },
      anxietyTriggers: ["thunderstorms", "Fireworks"],
      specialNotes: "Loves belly rubs",
    },
    customAnswers: { q1: "Yes, twice", q2: false, q3: 12.5 },
  };

  test("come back from the sections exactly as they went in, and the server accepts them", () => {
    const back = answersFromSectionForm(
      sectionFormFromAnswers(answers, "Kofi"),
      answers.customAnswers ?? {},
    );
    expect(back).toEqual(answers);
    expect(yipyyGoAnswersSchema.parse(back)).toEqual(back);
  });

  test("a preview picked in this tab never reaches the request", () => {
    const form = sectionFormFromAnswers(emptyYipyyGoAnswers(), "Kofi");
    form.belongings = [
      { id: "b1", type: "food", photoUrl: "blob:http://localhost/1" },
    ];
    const sent = answersFromSectionForm(form, {});
    expect(sent.belongings).toEqual([{ id: "b1", type: "food" }]);
    expect("customAnswers" in sent).toBe(false);
  });

  test("the last stay starts a new form without its photos or its questions", () => {
    let n = 0;
    const copied = lastStayAnswers(answers, () => `new-${++n}`);
    expect(copied.belongings.map((item) => item.id)).toEqual([
      "new-1",
      "new-2",
    ]);
    expect(copied.belongings.some((item) => "photoId" in item)).toBe(false);
    expect(copied.medications[0]).toMatchObject({
      id: "new-3",
      name: "Apoquel",
    });
    expect(copied.customAnswers).toBeUndefined();
    expect(copied.feedingInstructions).toEqual(answers.feedingInstructions);
  });

  test("an answer that says nothing is taken out; a no or a zero is kept", () => {
    const start = { keep: "x" };
    expect(withCustomAnswer(start, "a", "   ")).toEqual(start);
    expect(withCustomAnswer(start, "a", [])).toEqual(start);
    expect(withCustomAnswer(start, "a", Number.NaN)).toEqual(start);
    expect(withCustomAnswer({ ...start, a: "y" }, "a", undefined)).toEqual(
      start,
    );
    expect(withCustomAnswer(start, "a", false)).toEqual({ ...start, a: false });
    expect(withCustomAnswer(start, "a", 0)).toEqual({ ...start, a: 0 });
  });
});

test("a booking's day is the calendar day it names, not the day before", () => {
  const day = calendarDay("2026-09-15");
  expect([day.getFullYear(), day.getMonth(), day.getDate()]).toEqual([
    2026, 8, 15,
  ]);
});
