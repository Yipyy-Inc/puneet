import { describe, expect, it } from "bun:test";

import {
  boardingConfig,
  daycareConfig,
  facilityBookingFlowConfig,
  groomingConfig,
  trainingConfig,
} from "@/data/settings";

// ============================================================================
// A facility that has configured nothing requires nothing, and charges
// nothing it did not set.
//
// These are the FALLBACKS — what every facility reads until it saves that
// settings domain for the first time. They are not neutral defaults by
// accident: each one is a policy, applied to a business that never chose it.
//
// Two of them were live on 2026-09-20:
//
//   servicesRequiringEvaluation: ["daycare"]   — the booking wizard locked the
//     daycare card with "Needs an evaluation" while Settings → Evaluations
//     showed the requirement switched OFF, so there was nothing to turn off.
//
//   daycareConfig.settings.evaluation = {enabled: true, optional: false}
//     — the same demand from a second place, read last by the wizard.
//
// and the four module base prices (boarding 45, daycare 35, grooming 50,
// training 60) priced bookings from the same kind of default until they were
// removed the same day.
//
// This test is here so none of it comes back quietly.
// ============================================================================

const MODULES = {
  daycare: daycareConfig,
  boarding: boardingConfig,
  grooming: groomingConfig,
  training: trainingConfig,
};

describe("the defaults a facility inherits before it configures anything", () => {
  it("requires an evaluation for no service", () => {
    expect(facilityBookingFlowConfig.evaluationRequired).toBe(false);
    expect(facilityBookingFlowConfig.servicesRequiringEvaluation).toEqual([]);
  });

  it("hides no service behind an evaluation", () => {
    expect(facilityBookingFlowConfig.hideServicesUntilEvaluationCompleted).toBe(
      false,
    );
    expect(facilityBookingFlowConfig.hiddenServices).toEqual([]);
  });

  for (const [name, config] of Object.entries(MODULES)) {
    it(`${name} asks for no evaluation of its own`, () => {
      // The wizard reads this last: enabled AND not optional is a hard
      // requirement, whatever the booking-flow settings say.
      const evaluation = config.settings.evaluation;
      expect(evaluation.enabled).toBe(false);
    });

    it(`${name} carries no price`, () => {
      // `basePrice` was a required field on ModuleConfig until 2026-09-20 and
      // the booking wizard charged it wherever the facility's own rate was
      // missing. A price belongs to the facility's rooms, rates and services.
      expect(config).not.toHaveProperty("basePrice");
    });
  }
});
