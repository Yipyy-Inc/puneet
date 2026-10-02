import { describe, expect, test } from "bun:test";

import { detailSubSteps } from "@/components/bookings/modals/constants";
import {
  careStayFor,
  FEEDING_SUB_STEP_ID,
  legacySubStepId,
  MEDICATION_SUB_STEP_ID,
  subStepIndexOf,
} from "@/lib/bookings/care-steps";

// Where the Feeding and Medications steps sit in a booking (2026-10-01): in
// every service the facility turns them on for, at fixed ids, so the form —
// and a draft — stays on the same question when the list changes under it.

const ids = (steps: { id: number }[]) => steps.map((step) => step.id);
const ON = { feeding: "optional", medication: "required" } as const;
const OFF = { feeding: "disabled", medication: "disabled" } as const;

describe("each service's sub-steps", () => {
  test("the care steps follow the service's own, where they are on", () => {
    expect(
      ids(detailSubSteps("boarding", { customer: false, care: ON })),
    ).toEqual([0, 1, 2, FEEDING_SUB_STEP_ID, MEDICATION_SUB_STEP_ID]);
    // Daycare's play area is not a screen since 2026-10-01 (staff change it
    // on Confirm), so its ids run 0, 2.
    expect(
      ids(detailSubSteps("daycare", { customer: false, care: OFF })),
    ).toEqual([0, 2]);
    expect(
      ids(detailSubSteps("grooming", { customer: false, care: ON })),
    ).toEqual([0, 1, 2, 3, 4]);
    // Training (the client's mock): Program · Trainer & time · Goals.
    expect(
      ids(
        detailSubSteps("training", {
          customer: false,
          care: { feeding: "disabled", medication: "optional" },
        }),
      ),
    ).toEqual([0, 1, 2, 4]);
  });

  test("a customer chooses a room type too; an evaluation never the care steps", () => {
    expect(
      ids(detailSubSteps("daycare", { customer: true, care: ON })),
    ).toEqual([0, 2, 3, 4]);
    // The client's mock: a customer picks the room type (never its count).
    expect(
      ids(detailSubSteps("boarding", { customer: true, care: ON })),
    ).toEqual([0, 1, 2, 3, 4]);
    expect(
      ids(detailSubSteps("evaluation", { customer: false, care: ON })),
    ).toEqual([0, 1]);
    expect(ids(detailSubSteps("", { customer: false, care: ON }))).toEqual([]);
  });
});

describe("the place of a sub-step", () => {
  const flow = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 4 }];
  test("its own, else the next one, else the last", () => {
    expect(subStepIndexOf(flow, 2)).toBe(2);
    // Feeding switched off: the form moves on to Medications.
    expect(subStepIndexOf(flow, FEEDING_SUB_STEP_ID)).toBe(3);
    expect(subStepIndexOf(flow, 9)).toBe(3);
    expect(subStepIndexOf([], 3)).toBe(0);
  });

  test("a draft saved before ids were kept names one by its place", () => {
    // A customer's daycare list was 0, 2, 3, 4: place 2 was Feeding.
    expect(legacySubStepId("daycare", 2, true)).toBe(3);
    expect(legacySubStepId("daycare", 2, false)).toBe(2);
    expect(legacySubStepId("boarding", 4, false)).toBe(4);
    expect(legacySubStepId("grooming", 9, false)).toBe(2);
    expect(legacySubStepId("daycare", undefined, false)).toBeUndefined();
  });
});

describe("the days the care steps plan over", () => {
  test("a stay, the daycare days, a groom's day, a class's sessions", () => {
    expect(
      careStayFor({
        service: "boarding",
        boardingStart: "2026-03-17",
        boardingEnd: "2026-03-19",
      }),
    ).toEqual({
      days: ["2026-03-17", "2026-03-18", "2026-03-19"],
      overnight: true,
    });
    expect(
      careStayFor({
        service: "daycare",
        daycareDates: ["2026-03-19", "2026-03-17"],
      }),
    ).toEqual({ days: ["2026-03-17", "2026-03-19"], overnight: false });
    expect(
      careStayFor({ service: "grooming", startDate: "2026-03-20" }),
    ).toEqual({ days: ["2026-03-20"], overnight: false });
    expect(
      careStayFor({
        service: "training",
        trainingDates: ["2026-04-07", "2026-04-14", "2026-04-21"],
      }).days,
    ).toHaveLength(3);
    expect(careStayFor({ service: "grooming", startDate: "" })).toEqual({
      days: [],
      overnight: false,
    });
  });
});
