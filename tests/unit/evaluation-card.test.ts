import { describe, expect, test } from "bun:test";

import { daycareConfig, boardingConfig } from "@/data/settings";
import {
  deliveryAction,
  mayReview,
  openState,
} from "@/lib/evaluations/delivery";
import {
  evaluationCreditShare,
  evaluationDeposit,
  evaluationPetPrices,
  evaluationTotal,
} from "@/lib/evaluations/pricing";
import {
  optionsFromText,
  progressOf,
  requiredKeys,
  sectionDone,
  sectionQuestions,
  type CustomQuestion,
} from "@/lib/evaluations/questions";
import {
  cardCta,
  cardExtras,
  cardHelpWith,
  cardMeters,
  cardStrengths,
  cardThingsToKnow,
  cardUnlocked,
} from "@/lib/evaluations/report-card";
import {
  requiredServicesNow,
  requirementWrites,
} from "@/lib/evaluations/requirement";
import type { FacilityBookingFlowConfig, ModuleConfig } from "@/types/facility";

// The evaluation's money, its report card and who sends it (the client's
// mocks, 2026-10-02).

describe("what an evaluation costs", () => {
  test("$45 per pet, the second and later at half", () => {
    expect(evaluationPetPrices(45, 2, true)).toEqual([45, 22.5]);
    expect(evaluationPetPrices(45, 2, false)).toEqual([45, 45]);
    expect(evaluationTotal(45, 3, true)).toBe(90);
    expect(evaluationTotal(0, 2, true)).toBe(0);
  });

  test("a deposit is the rule's share of the total", () => {
    expect(evaluationDeposit(67.5, 100)).toBe(67.5);
    expect(evaluationDeposit(67.5, 50)).toBe(33.75);
    expect(evaluationDeposit(0, 100)).toBe(0);
  });

  test("an approval credits the pet's equal share of what was paid", () => {
    expect(
      evaluationCreditShare({ paid: 67.5, petCount: 2, petIndex: 0 }),
    ).toBe(33.75);
    expect(
      evaluationCreditShare({ paid: 67.5, petCount: 2, petIndex: 1 }),
    ).toBe(33.75);
    // The last pet takes the cent a split leaves over.
    const thirds = [0, 1, 2].map((petIndex) =>
      evaluationCreditShare({ paid: 100, petCount: 3, petIndex }),
    );
    expect(thirds).toEqual([33.33, 33.33, 33.34]);
    expect(evaluationCreditShare({ paid: 0, petCount: 2, petIndex: 0 })).toBe(
      0,
    );
    expect(evaluationCreditShare({ paid: 45, petCount: 1, petIndex: 1 })).toBe(
      0,
    );
  });
});

describe("the report card, from the answers", () => {
  test("confidence and calm read the right way round", () => {
    const [energy, confidence, calm] = cardMeters({
      energy: "h",
      anx: "l",
      react: "m",
    });
    expect(energy).toEqual({ key: "energy", level: 3, value: "high" });
    expect(confidence).toEqual({ key: "confidence", level: 3, value: "high" });
    expect(calm).toEqual({ key: "calm", level: 2, value: "mostly_calm" });
    expect(cardMeters({})[0]).toEqual({ key: "energy", level: 0, value: null });
  });

  test("what we loved: the strengths, then the social answers, five at most", () => {
    expect(cardStrengths(["recall", "toy"], { dog: "y", human: "y" })).toEqual([
      { kind: "tag", id: "toy" },
      { kind: "tag", id: "recall" },
      { kind: "social", id: "dogs_yes" },
      { kind: "social", id: "people_yes" },
    ]);
    expect(
      cardStrengths(["food", "toy", "recall", "puppies", "people"], {
        dog: "y",
      }),
    ).toHaveLength(5);
  });

  test("we'll help with: kind words, and never resource guarding", () => {
    expect(cardHelpWith(["jumper", "guarder", "shy"])).toEqual([
      "confidence",
      "four_paws",
    ]);
  });

  test("services unlock only on a pass", () => {
    expect(cardUnlocked("approved_with_restrictions", ["daycare"])).toEqual([
      "daycare",
    ]);
    expect(cardUnlocked("needs_re_evaluation", ["daycare"])).toEqual([]);
    expect(cardCta("approved")).toBe("first_day");
    expect(cardCta("needs_re_evaluation")).toBe("reevaluation");
    expect(cardCta("not_approved")).toBe("message");
    expect(cardCta(null)).toBeNull();
  });

  test("the facility's own questions reach the card only when marked", () => {
    const custom: CustomQuestion[] = [
      {
        id: "c1",
        section: 0,
        label: "Comfortable being handled?",
        type: "yn",
        options: [],
        onCard: true,
        required: false,
      },
      {
        id: "c2",
        section: 1,
        label: "Staff only",
        type: "text",
        options: [],
        onCard: false,
        required: true,
      },
    ];
    expect(cardExtras(custom, { c1: "y", c2: "x" })).toEqual([
      { id: "c1", label: "Comfortable being handled?", value: "y", kind: "yn" },
    ]);
    expect(requiredKeys(custom)).toContain("c2");
    expect(requiredKeys(custom)).not.toContain("c1");
    expect(progressOf({ dog: "y", c2: "x" }, custom)).toEqual({
      done: 2,
      total: 11,
    });
  });

  test("internal notes appear only when the facility says so", () => {
    const base = {
      watchFor: ["guarder"],
      internalNote: "Guarded the bowl",
      answers: { guard: "y" },
    };
    expect(cardThingsToKnow({ ...base, hideInternal: true })).toBeNull();
    expect(cardThingsToKnow({ ...base, hideInternal: false })).toEqual({
      tags: ["guarder"],
      guarding: true,
      note: "Guarded the bowl",
    });
  });
});

describe("the evaluator's form", () => {
  const custom: CustomQuestion[] = [
    {
      id: "c9",
      section: 3,
      label: "Ready for the pool?",
      type: "yn",
      options: [],
      onCard: false,
      required: false,
    },
  ];

  test("a facility's question on Result comes before the outcome", () => {
    expect(sectionQuestions(3, custom).map((q) => q.key)).toEqual([
      "c9",
      "result",
    ]);
    expect(sectionQuestions(0, custom).map((q) => q.key)).toEqual([
      "dog",
      "human",
      "energy",
      "anx",
      "react",
    ]);
  });

  test("a step is done when every question in it is answered", () => {
    expect(sectionDone(2, { guard: "n" }, custom)).toBe(true);
    expect(sectionDone(3, { result: "approved" }, custom)).toBe(false);
  });

  test("options typed with commas are cleaned", () => {
    expect(optionsFromText(" Ball, Rope ,,Ball ")).toEqual(["Ball", "Rope"]);
  });
});

describe("who sends the card", () => {
  test("review, send automatically, or send passes only", () => {
    expect(deliveryAction("review", "approved")).toBe("review");
    expect(deliveryAction("auto", "not_approved")).toBe("send");
    expect(deliveryAction("autoPass", "approved")).toBe("send");
    expect(deliveryAction("autoPass", "approved_with_restrictions")).toBe(
      "review",
    );
  });

  test("owners always; the chosen roles; an evaluator only when allowed", () => {
    const rule = { reviewerRoles: ["reception"], evaluatorSelfSend: false };
    expect(mayReview({ ...rule, role: "owner", isEvaluator: false })).toBe(
      true,
    );
    expect(mayReview({ ...rule, role: "reception", isEvaluator: false })).toBe(
      true,
    );
    expect(mayReview({ ...rule, role: "manager", isEvaluator: false })).toBe(
      false,
    );
    expect(
      mayReview({
        ...rule,
        evaluatorSelfSend: true,
        role: "daycare_attendant",
        isEvaluator: true,
      }),
    ).toBe(true);
  });

  test("delivered, opened, not opened", () => {
    const now = new Date("2026-10-05T12:00:00Z");
    expect(
      openState({
        sentAt: "2026-10-05T11:00:00Z",
        openedAt: null,
        bookedService: null,
        now,
      }),
    ).toEqual({ kind: "delivered" });
    expect(
      openState({
        sentAt: "2026-10-01T11:00:00Z",
        openedAt: null,
        bookedService: null,
        now,
      }),
    ).toEqual({ kind: "not_opened" });
    expect(
      openState({
        sentAt: "2026-10-01T11:00:00Z",
        openedAt: "2026-10-02T09:00:00Z",
        bookedService: "daycare",
        now,
      }),
    ).toEqual({ kind: "opened", bookedService: "daycare" });
  });
});

describe("services that need an evaluation first", () => {
  const flow: FacilityBookingFlowConfig = {
    evaluationRequired: false,
    hideServicesUntilEvaluationCompleted: false,
    servicesRequiringEvaluation: ["daycare"],
    hiddenServices: [],
  };
  const demanding: ModuleConfig = {
    ...boardingConfig,
    settings: {
      ...boardingConfig.settings,
      evaluation: { enabled: true, optional: false },
    },
  };
  const modules = { daycare: daycareConfig, boarding: demanding };
  const moduleOf = (s: string) => modules[s as keyof typeof modules];

  test("the chips start from everything enforced today", () => {
    expect(
      requiredServicesNow({
        services: ["boarding", "daycare", "grooming"],
        flow,
        moduleOf,
      }),
    ).toEqual(["boarding", "daycare"]);
    expect(
      requiredServicesNow({
        services: ["boarding", "grooming"],
        flow: { ...flow, evaluationRequired: true },
        moduleOf,
      }),
    ).toEqual(["boarding", "grooming"]);
  });

  test("saving makes the list the whole rule", () => {
    const writes = requirementWrites({ chips: ["daycare"], flow, modules });
    expect(writes.flow.servicesRequiringEvaluation).toEqual(["daycare"]);
    expect(writes.flow.evaluationRequired).toBe(false);
    expect(writes.modules.map((m) => m.service)).toEqual(["boarding"]);
    expect(writes.modules[0]!.config.settings.evaluation.enabled).toBe(false);
    // A module that already agrees is not written.
    expect(
      requirementWrites({ chips: ["daycare", "boarding"], flow, modules })
        .modules,
    ).toEqual([]);
  });
});
