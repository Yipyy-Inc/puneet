import { describe, expect, test } from "bun:test";

import {
  fillRecoveryTags,
  recoveryDueAt,
  recoveryPlan,
  recoveryResumeLink,
} from "@/lib/unfinished-bookings/recovery";
import { SHIPPED_ABANDONMENT_RECOVERY } from "@/lib/settings/abandonment-recovery";
import type { AbandonmentRecoverySettings } from "@/types/unfinished-booking";

const on = (): AbandonmentRecoverySettings => ({
  ...structuredClone(SHIPPED_ABANDONMENT_RECOVERY),
  enabled: true,
});

describe("recoveryPlan", () => {
  test("ships switched off, so nothing is owed until a facility turns it on", () => {
    expect(recoveryPlan(SHIPPED_ABANDONMENT_RECOVERY, "payment").off).toBe(
      true,
    );
  });

  test("a step that inherits takes the facility's channel and delay", () => {
    const plan = recoveryPlan(on(), "pet_selection");
    expect(plan).toEqual({ off: false, channels: ["email"], delayHours: 2 });
  });

  test("a step's own channel and delay win, and both means email and SMS", () => {
    const plan = recoveryPlan(on(), "payment");
    expect(plan).toEqual({
      off: false,
      channels: ["email", "sms"],
      delayHours: 1,
    });
  });

  test("a disabled step, or a channel of off, owes nothing", () => {
    expect(recoveryPlan(on(), "service_selection").off).toBe(true);
    const settings = on();
    settings.defaultChannel = "off";
    expect(recoveryPlan(settings, "review").off).toBe(true);
  });
});

describe("recoveryDueAt", () => {
  test("adds the delay in hours to the moment the customer left", () => {
    expect(recoveryDueAt("2026-09-14T10:00:00.000Z", 2).toISOString()).toBe(
      "2026-09-14T12:00:00.000Z",
    );
  });
});

describe("fillRecoveryTags", () => {
  const facts = {
    clientName: "Olive Owner",
    petName: "Kofi",
    service: "daycare",
    facilityName: "Paws & Co",
    resumeLink:
      "https://paws-co.yipyy.com/customer/bookings/new?resumeBooking=abc",
  };

  test("fills every recovery tag, greeting the client by first name", () => {
    expect(
      fillRecoveryTags(
        "Hi {{client_name}}, {{pet_name}}'s {{service}} at {{facility_name}}: {{resume_link}}",
        facts,
      ),
    ).toBe(
      "Hi Olive, Kofi's daycare at Paws & Co: https://paws-co.yipyy.com/customer/bookings/new?resumeBooking=abc",
    );
  });

  test("leaves a tag it has no value for, so the message is refused rather than sent blank", () => {
    expect(
      fillRecoveryTags("Hi {{pet_name}}", { ...facts, petName: null }),
    ).toBe("Hi {{pet_name}}");
  });
});

test("the resume link opens the customer's booking form on the draft", () => {
  expect(recoveryResumeLink("https://a.yipyy.com", "3f2b8c1e")).toBe(
    "https://a.yipyy.com/customer/bookings/new?resumeBooking=3f2b8c1e",
  );
});
