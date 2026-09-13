import { describe, expect, test } from "bun:test";

import {
  parseOfferedAddOns,
  rowToBookingYipyyGo,
  rowToYipyyGoArrival,
  yipyyGoAnswersSchema,
  yipyyGoReviewBodySchema,
  yipyyGoSubmitBodySchema,
  yipyyGoTipChoiceSchema,
} from "@/lib/api/mappers/yipyy-go";
import {
  customQuestionsOf,
  validateYipyyGoAnswers,
} from "@/lib/yipyy-go/validate";
import {
  hashCheckInToken,
  kioskLinkFor,
  mintCheckInToken,
  toByteaLiteral,
} from "@/lib/yipyy-go/check-in-token";
import {
  checkInWriterFor,
  parseCheckInCode,
} from "@/lib/yipyy-go/check-in-code";
import type { FormSection, FormTemplateConfig } from "@/types/yipyygo";

// The pre-arrival form's request bodies, its completeness rule and the check-in
// code. A price that slipped through here would still be priced by SQL; a
// completeness rule that disagreed with the form would let an owner send a form
// the facility said was required — or refuse one that was complete.

const section = (over: Partial<FormSection>): FormSection => ({
  id: "s",
  label: "Section",
  enabled: true,
  required: false,
  order: 1,
  ...over,
});

const template = (
  over: Partial<FormTemplateConfig> = {},
): FormTemplateConfig => ({
  sections: {
    petInfo: section({ id: "pet" }),
    careInstructions: section({ id: "care" }),
    medications: section({ id: "meds", required: true }),
    feedingSchedule: section({ id: "feed", required: true }),
    additionalContacts: section({ id: "contacts", enabled: false }),
    specialRequests: section({ id: "requests" }),
    customSections: [],
  },
  features: { photoUploads: true, addOnsSection: true, tipSection: true },
  multiPetBehavior: "one_form_per_pet",
  addOnsScope: "booking",
  globalCustomQuestions: [],
  ...over,
});

const answers = (over: Record<string, unknown> = {}) =>
  yipyyGoAnswersSchema.parse({ belongings: [], medications: [], ...over });

describe("what a request may say", () => {
  test("a price inside an answer or an add-on request never survives parsing", () => {
    const body = yipyyGoSubmitBodySchema.parse({
      answers: {
        belongings: [{ id: "b1", type: "leash_collar", price: 0.01 }],
        medications: [],
        price: 1,
      },
      addOnRequests: [
        { addOnId: "walk", quantity: 2, price: 0.01, unitPrice: 0.01 },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("price");
    expect(body.addOnRequests).toEqual([{ addOnId: "walk", quantity: 2 }]);
  });

  test("a photo is an id, not a URL", () => {
    const parsed = yipyyGoAnswersSchema.safeParse({
      belongings: [{ id: "b1", type: "bedding", photoId: "not-a-uuid" }],
      medications: [],
    });
    expect(parsed.success).toBe(false);
    const withUrl = yipyyGoAnswersSchema.parse({
      belongings: [{ id: "b1", type: "bedding", photoUrl: "blob:http://x/1" }],
      medications: [],
    });
    expect(JSON.stringify(withUrl)).not.toContain("blob:");
  });

  test("a tip is a preset, a bounded custom amount, or none", () => {
    expect(
      yipyyGoTipChoiceSchema.safeParse({ type: "preset", presetId: "p15" })
        .success,
    ).toBe(true);
    expect(
      yipyyGoTipChoiceSchema.safeParse({ type: "custom", amount: 5000 })
        .success,
    ).toBe(false);
    expect(yipyyGoTipChoiceSchema.safeParse({ type: "none" }).success).toBe(
      true,
    );
    expect(
      yipyyGoTipChoiceSchema.safeParse({ type: "percentage", percentage: 15 })
        .success,
    ).toBe(false);
  });

  test("sending a form back needs a message; completing one needs a reason", () => {
    expect(
      yipyyGoReviewBodySchema.safeParse({ action: "approve", petRef: 7 })
        .success,
    ).toBe(true);
    expect(
      yipyyGoReviewBodySchema.safeParse({
        action: "request_changes",
        petRef: 7,
        message: "  ",
      }).success,
    ).toBe(false);
    expect(
      yipyyGoReviewBodySchema.safeParse({ action: "complete", petRef: 7 })
        .success,
    ).toBe(false);
  });
});

describe("whether a form is complete enough to send", () => {
  test("required medications and feeding must be answered — 'no medications' counts", () => {
    expect(validateYipyyGoAnswers(template(), answers())).toEqual([
      "medications",
      "feeding",
    ]);
    expect(
      validateYipyyGoAnswers(
        template(),
        answers({
          noMedications: true,
          feedingInstructions: {
            foodType: "Kibble",
            portionSize: "1",
            portionUnit: "cups",
            feedingSchedule: [],
          },
        }),
      ),
    ).toEqual([]);
  });

  test("a disabled section asks nothing, even when marked required", () => {
    const t = template();
    t.sections.medications = section({
      id: "meds",
      enabled: false,
      required: true,
    });
    t.sections.feedingSchedule = section({
      id: "feed",
      enabled: false,
      required: true,
    });
    expect(validateYipyyGoAnswers(t, answers())).toEqual([]);
  });

  test("a required custom question in an enabled section must be answered, by its type", () => {
    const t = template({
      globalCustomQuestions: [
        {
          id: "vet",
          type: "short_text",
          label: "Vet",
          required: true,
          order: 2,
        },
      ],
    });
    t.sections.medications = section({ id: "meds" });
    t.sections.feedingSchedule = section({ id: "feed" });
    t.sections.careInstructions = section({
      id: "care",
      customQuestions: [
        {
          id: "crate",
          type: "yes_no",
          label: "Crate trained?",
          required: true,
          order: 1,
        },
      ],
    });
    expect(customQuestionsOf(t).map((q) => q.id)).toEqual(["crate", "vet"]);
    expect(validateYipyyGoAnswers(t, answers())).toEqual([
      "question:crate",
      "question:vet",
    ]);
    expect(
      validateYipyyGoAnswers(
        t,
        answers({ customAnswers: { crate: false, vet: "Dr. Roy" } }),
      ),
    ).toEqual([]);
  });

  test("a required belongings photo is any photo of the belongings", () => {
    const t = template({
      features: {
        photoUploads: true,
        addOnsSection: false,
        tipSection: false,
        belongingsPhotoRequired: true,
      },
    });
    t.sections.medications = section({ id: "meds" });
    t.sections.feedingSchedule = section({ id: "feed" });
    expect(validateYipyyGoAnswers(t, answers())).toEqual(["belongingsPhoto"]);
    expect(
      validateYipyyGoAnswers(
        t,
        answers({
          belongings: [
            {
              id: "b1",
              type: "bedding",
              photoId: "3f0e4c52-7a1b-4c1e-9e0a-1b2c3d4e5f60",
            },
          ],
        }),
      ),
    ).toEqual([]);
  });
});

describe("where a booking stands", () => {
  test("no requirement reads as not required and satisfied, whatever else the row says", () => {
    expect(
      rowToBookingYipyyGo({
        booking_id: "b",
        requirement: null,
        status: "not_required",
        satisfied: false,
        pets_total: 2,
        pets_satisfied: 0,
      }),
    ).toEqual({
      requirement: null,
      status: "not_required",
      satisfied: true,
      petsTotal: 2,
      petsSatisfied: 0,
    });
  });

  test("an arrival carries its dogs, its form and where the dog is", () => {
    const arrival = rowToYipyyGoArrival({
      booking_ref: 1204,
      service: "daycare",
      status: "confirmed",
      start_at: "2026-09-13T13:00:00Z",
      end_at: "2026-09-13T21:00:00Z",
      client_name: "Ana",
      pets: [{ id: "p", ref: 7, name: "Kofi" }],
      requirement: "mandatory",
      form_status: "in_progress",
      satisfied: false,
      presence: "expected",
    });
    expect(arrival.pets).toEqual([{ ref: 7, name: "Kofi" }]);
    expect(arrival.formStatus).toBe("in_progress");
    expect(arrival.satisfied).toBe(false);
    expect(arrival.presence).toBe("expected");
  });

  test("an offered add-on carries only what the owner may see", () => {
    const [offer] = parseOfferedAddOns([
      {
        id: "walk",
        name: "Walk",
        unitPrice: 10,
        maxQuantity: 3,
        petScope: "per_pet",
        taxable: true,
      },
    ]);
    expect(offer).toEqual({
      id: "walk",
      name: "Walk",
      description: "",
      pricingType: "flat",
      unitPrice: 10,
      unitLabel: "",
      maxQuantity: 3,
      petScope: "per_pet",
    });
  });
});

describe("the check-in code", () => {
  test("a minted token is 43 URL-safe characters, hashed to 32 bytes sent as hex", () => {
    const { token, hash } = mintCheckInToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hash.equals(hashCheckInToken(token))).toBe(true);
    expect(toByteaLiteral(hash)).toMatch(/^\\x[0-9a-f]{64}$/);
  });

  test("the kiosk link, a scanned link and a pasted token all read as the token", () => {
    const token = "Abc_def-0123456789xyz";
    const link = kioskLinkFor("https://kennel.app.yipyy.com/", token);
    expect(link).toBe(
      `https://kennel.app.yipyy.com/employee/check-in?code=${token}`,
    );
    expect(parseCheckInCode(link)).toBe(token);
    expect(parseCheckInCode(`  ${token}  `)).toBe(token);
    expect(
      parseCheckInCode(
        "https://kennel.app.yipyy.com/facility/checkin?t=" + token,
      ),
    ).toBe(token);
    expect(parseCheckInCode("short")).toBeNull();
    expect(parseCheckInCode("https://example.com/?code=has spaces")).toBeNull();
  });

  test("each service checks in through its own write; a custom service has none", () => {
    expect(checkInWriterFor("daycare")).toBe("daycare");
    expect(checkInWriterFor("grooming")).toBe("grooming");
    expect(checkInWriterFor("custom:agility")).toBeNull();
  });
});
