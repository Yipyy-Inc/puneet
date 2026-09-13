import { describe, expect, test } from "bun:test";

import { yipyyGoAnswersSchema } from "@/lib/api/mappers/yipyy-go";
import { withKnownPhotos } from "@/lib/yipyy-go/answer-photos";
import {
  answersFromSectionForm,
  sectionFormFromAnswers,
} from "@/lib/yipyy-go/owner-form";
import type { CustomQuestion } from "@/types/yipyygo";

// A pre-arrival form keeps a photo by its id — the belongings photo, a
// medication’s label, a photo question’s answer. Only the photos the form has
// count: an id whose photo was deleted, or that was never this form’s, is
// dropped before anyone reads the answers.

const KEPT = "11111111-1111-4111-8111-111111111111";
const GONE = "22222222-2222-4222-8222-222222222222";

const question = (
  id: string,
  type: CustomQuestion["type"],
): CustomQuestion => ({ id, type, label: id, required: true, order: 1 });

const answers = yipyyGoAnswersSchema.parse({
  belongings: [
    { id: "b1", type: "food", photoId: KEPT },
    { id: "b2", type: "toys", photoId: GONE },
  ],
  belongingsPhotoId: GONE,
  medications: [
    {
      id: "m1",
      name: "Apoquel",
      dosage: "1 tablet",
      frequency: "once_daily",
      times: [],
      method: "with_food",
      photoId: KEPT,
    },
  ],
  customAnswers: {
    "vaccination-card": GONE,
    "leash-note": GONE,
    "favourite-toy": "The blue ball",
  },
});

const questions = [
  question("vaccination-card", "file_upload"),
  question("leash-note", "long_text"),
  question("favourite-toy", "long_text"),
];

describe("the photos a form’s answers point at", () => {
  test("a photo the form has is kept wherever an answer uses it", () => {
    const held = withKnownPhotos(answers, new Set([KEPT]), questions);
    expect(held.belongings[0]).toEqual({
      id: "b1",
      type: "food",
      photoId: KEPT,
    });
    expect(held.medications[0].photoId).toBe(KEPT);
  });

  test("a photo the form does not have is dropped, and nothing else is", () => {
    const held = withKnownPhotos(answers, new Set([KEPT]), questions);
    expect(held.belongingsPhotoId).toBeUndefined();
    expect(held.belongings[1]).toEqual({ id: "b2", type: "toys" });
    // A text answer that happens to look like an id is still a text answer.
    expect(held.customAnswers).toEqual({
      "leash-note": GONE,
      "favourite-toy": "The blue ball",
    });
    expect(held.medications[0].name).toBe("Apoquel");
  });

  test("with no photos left, no answer points at one", () => {
    const held = withKnownPhotos(answers, new Set(), questions);
    expect(held.belongings.every((item) => item.photoId === undefined)).toBe(
      true,
    );
    expect(held.medications[0].photoId).toBeUndefined();
    expect(held).not.toHaveProperty("belongingsPhotoId");
  });

  test("the belongings photo reaches the sections and comes back by its id", () => {
    const form = sectionFormFromAnswers(
      { ...answers, belongingsPhotoId: KEPT },
      "Kofi",
    );
    expect(form.belongingsPhotoId).toBe(KEPT);
    expect(answersFromSectionForm(form, {}).belongingsPhotoId).toBe(KEPT);
  });
});
