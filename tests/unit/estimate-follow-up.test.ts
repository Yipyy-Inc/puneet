import { describe, expect, test } from "bun:test";

import {
  dueFollowUp,
  fillFollowUp,
  followUpKey,
  followUpMessage,
  type FollowUpEstimate,
} from "@/lib/estimates/follow-up";
import {
  estimateFollowUpsSchema,
  NO_ESTIMATE_FOLLOW_UPS,
  type EstimateFollowUps,
} from "@/lib/settings/estimate-follow-ups";

const DAY = 86_400_000;
const sent = "2026-09-01T12:00:00Z";
const at = (days: number) => new Date(Date.parse(sent) + days * DAY);

const on: EstimateFollowUps = {
  ...NO_ESTIMATE_FOLLOW_UPS,
  enabled: true,
};

const open: FollowUpEstimate = {
  status: "sent",
  sentAt: sent,
  viewedAt: null,
  expiresAt: null,
};

describe("dueFollowUp", () => {
  test("nothing is owed while follow-ups are off, which is the default", () => {
    expect(NO_ESTIMATE_FOLLOW_UPS.enabled).toBe(false);
    expect(dueFollowUp(open, NO_ESTIMATE_FOLLOW_UPS, at(30), false)).toBeNull();
  });

  test("not viewed: one reminder every delay after sending, up to the maximum", () => {
    // notViewed: every 3 days, at most 2.
    expect(dueFollowUp(open, on, at(2.9), false)).toBeNull();
    expect(dueFollowUp(open, on, at(3), false)).toEqual({
      variant: "not_viewed",
      number: 1,
      anchor: sent,
    });
    expect(dueFollowUp(open, on, at(6), false)?.number).toBe(2);
    expect(dueFollowUp(open, on, at(20), false)?.number).toBe(2);
  });

  test("viewed: counts from the view, not the send", () => {
    const viewedAt = at(5).toISOString();
    const viewed = { ...open, viewedAt };
    // viewed: every 2 days, at most 1.
    expect(dueFollowUp(viewed, on, at(6), false)).toBeNull();
    expect(dueFollowUp(viewed, on, at(7), false)).toEqual({
      variant: "viewed",
      number: 1,
      anchor: viewedAt,
    });
  });

  test("an answered, expired or booked-past estimate is owed nothing", () => {
    for (const status of ["accepted", "declined", "converted", "draft"]) {
      expect(dueFollowUp({ ...open, status }, on, at(10), false)).toBeNull();
    }
    const expired = { ...open, expiresAt: at(9).toISOString() };
    expect(dueFollowUp(expired, on, at(10), false)).toBeNull();
    expect(dueFollowUp(open, on, at(10), true)).toBeNull();
  });

  test("a rule switched off sends nothing for its stage", () => {
    const quiet = { ...on, notViewed: { ...on.notViewed, enabled: false } };
    expect(dueFollowUp(open, quiet, at(10), false)).toBeNull();
  });
});

describe("followUpKey", () => {
  test("names the estimate, stage, anchor, number and channel", () => {
    const due = dueFollowUp(open, on, at(3), false)!;
    const key = followUpKey("e1", due, "email");
    expect(key).toBe(
      `estimate_follow_up:e1:not_viewed:${Date.parse(sent) / 1000}:1:email`,
    );
    expect(followUpKey("e1", due, "sms")).not.toBe(key);
    // A re-sent estimate has a new anchor, so its count starts again.
    const resent = dueFollowUp(
      { ...open, sentAt: at(4).toISOString() },
      on,
      at(7),
      false,
    )!;
    expect(followUpKey("e1", resent, "email")).not.toBe(key);
  });
});

describe("the message", () => {
  const values = {
    customer_name: "Alex",
    pet_name: "Kofi",
    service_name: "Boarding",
    estimate_total: "$120.00",
    estimate_link: "https://paws.yipyy.com/customer/estimates/abc",
  };

  test("an empty template is the standard one, in the customer's language", () => {
    const en = followUpMessage({
      locale: "en",
      variant: "not_viewed",
      facilityName: "Paws & Co",
      emailTemplate: "",
      smsTemplate: "  ",
      values,
    });
    expect(en.subject).toBe("Your estimate from Paws & Co");
    expect(en.email).toContain("Hi Alex");
    expect(en.email).toContain(values.estimate_link);
    expect(en.sms).toContain("Boarding");

    const fr = followUpMessage({
      locale: "fr",
      variant: "viewed",
      facilityName: "Paws & Co",
      emailTemplate: "",
      smsTemplate: "",
      values,
    });
    expect(fr.subject).toBe(
      "Votre estimation de Paws & Co est toujours ouverte",
    );
    expect(fr.email).toContain("Bonjour Alex");
    expect(fr.email).toContain("ici :");
  });

  test("a facility's own template is used as typed, with its tags filled", () => {
    const message = followUpMessage({
      locale: "fr",
      variant: "not_viewed",
      facilityName: "Paws & Co",
      emailTemplate:
        "Hey {{customer_name}}, {{pet_name}} total {{estimate_total}} {{estimate_link}}",
      smsTemplate: "",
      values,
    });
    expect(message.email).toBe(
      `Hey Alex, Kofi total $120.00 ${values.estimate_link}`,
    );
  });

  test("an unknown tag is removed, and a missing link is added", () => {
    expect(fillFollowUp("Hi {{customer_name}} {{typo}}", values)).toBe(
      `Hi Alex\n\n${values.estimate_link}`,
    );
  });
});

describe("the stored settings", () => {
  test("are bounded", () => {
    const bad = (rule: Record<string, unknown>) =>
      estimateFollowUpsSchema.safeParse({
        ...on,
        notViewed: { ...on.notViewed, ...rule },
      }).success;
    expect(bad({})).toBe(true);
    expect(bad({ delayDays: 0 })).toBe(false);
    expect(bad({ delayDays: 15 })).toBe(false);
    expect(bad({ maxFollowUps: 11 })).toBe(false);
    expect(bad({ smsMessage: "x".repeat(321) })).toBe(false);
  });
});
