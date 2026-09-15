import { describe, expect, test } from "bun:test";

import {
  deliveryReason,
  estimateMessage,
  expiryWarningMessage,
  type EstimateMessageInput,
} from "@/lib/estimates/estimate-message";
import {
  expiryWarningDue,
  expiryWarningKey,
  storedEstimateSettings,
} from "@/lib/estimates/expiry-warning";
import { DEFAULT_ESTIMATE_SETTINGS } from "@/lib/settings/estimates";

const input: EstimateMessageInput = {
  locale: "en",
  facilityName: "Paws & Co",
  facilityOrigin: "https://paws.yipyy.com",
  clientName: "Alex Martin",
  number: "E10042",
  service: "Boarding",
  petNames: ["Kofi", "Nala"],
  total: "$240.00",
  expiresAt: "2026-10-01T16:00:00Z",
  timeZone: "America/Toronto",
  link: "https://paws.yipyy.com/customer/estimates/abc",
};

// The total arrives already formatted for the customer, so a French message is
// tested with a French amount — "240,00 $", held by its own NBSP.
const french: EstimateMessageInput = {
  ...input,
  locale: "fr",
  total: "240,00 $",
};

describe("the estimate message", () => {
  test("names the estimate, the pets and the total, and how to open it", () => {
    const message = estimateMessage(input);
    expect(message.subject).toBe("Paws & Co: estimate E10042");
    expect(message.text).toContain("Hi Alex,");
    expect(message.text).toContain("Boarding for Kofi and Nala, $240.00");
    // The facility's own day, in the formatter's long style.
    expect(message.text).toContain("Oct 1, 2026");
    expect(message.text).toContain(input.link);
    expect(message.text).toContain(
      "create an account with it at https://paws.yipyy.com",
    );
    expect(message.sms).toBe(
      `Paws & Co: estimate E10042, $240.00. ${input.link}`,
    );
  });

  test("in French, with a non-breaking space before every colon", () => {
    const message = estimateMessage(french);
    expect(message.subject).toBe("Paws & Co : estimation E10042");
    expect(message.text).toContain("Bonjour Alex,");
    expect(message.text).toContain("Kofi et Nala");
    expect(message.text).toContain("1 oct. 2026");
    expect(message.text).not.toMatch(/ [:%$]/);
    expect(message.sms).not.toMatch(/ [:%$]/);
  });

  test("without pets or an expiry it still reads", () => {
    const message = estimateMessage({
      ...input,
      petNames: [],
      expiresAt: null,
      clientName: "",
    });
    expect(message.text).toContain("Hello,");
    expect(message.text).toContain("estimate E10042: Boarding, $240.00.");
    expect(message.text).not.toContain("open until");
  });

  test("the expiry warning names the day it expires", () => {
    const warning = expiryWarningMessage(input);
    expect(warning.subject).toStartWith("Your estimate from Paws & Co expires");
    expect(warning.subject).toContain("Oct 1, 2026");
    expect(warning.text).toContain(input.link);
    const fr = expiryWarningMessage(french);
    expect(fr.subject).toContain("expire le");
    expect(fr.subject).toContain("1 oct. 2026");
    expect(fr.text).not.toMatch(/ [:%$]/);
  });

  test("a sender's English detail becomes a reason code", () => {
    expect(deliveryReason("no email service configured")).toBe(
      "not_configured",
    );
    expect(deliveryReason("that email address is not valid")).toBe(
      "invalid_address",
    );
    expect(deliveryReason("email service said 500")).toBe("failed");
    expect(deliveryReason(undefined)).toBe("failed");
  });
});

describe("the expiry warning", () => {
  const expires = "2026-10-01T16:00:00Z";
  const hoursBefore = (h: number) =>
    new Date(Date.parse(expires) - h * 3_600_000);
  const open = { status: "sent", expiresAt: expires };
  const stored = { ...DEFAULT_ESTIMATE_SETTINGS, expiryWarningHoursBefore: 24 };

  test("no stored settings is off, whatever the default says", () => {
    expect(DEFAULT_ESTIMATE_SETTINGS.expiryWarningEnabled).toBe(true);
    expect(expiryWarningDue(open, null, hoursBefore(2))).toBe(false);
    expect(storedEstimateSettings({ nonsense: true })).toBeNull();
  });

  test("due inside the window, until the estimate expires", () => {
    expect(expiryWarningDue(open, stored, hoursBefore(25))).toBe(false);
    expect(expiryWarningDue(open, stored, hoursBefore(24))).toBe(true);
    expect(expiryWarningDue(open, stored, hoursBefore(1))).toBe(true);
    expect(expiryWarningDue(open, stored, hoursBefore(0))).toBe(false);
  });

  test("switched off, or not open, owes nothing", () => {
    const off = { ...stored, expiryWarningEnabled: false };
    expect(expiryWarningDue(open, off, hoursBefore(2))).toBe(false);
    expect(
      expiryWarningDue({ ...open, status: "accepted" }, stored, hoursBefore(2)),
    ).toBe(false);
    expect(
      expiryWarningDue({ ...open, expiresAt: null }, stored, hoursBefore(2)),
    ).toBe(false);
  });

  test("one key per estimate and expiry", () => {
    expect(expiryWarningKey("e1", expires)).toBe(
      `estimate_expiry_warning:e1:${Date.parse(expires) / 1000}`,
    );
    expect(expiryWarningKey("e1", "2026-10-05T16:00:00Z")).not.toBe(
      expiryWarningKey("e1", expires),
    );
  });
});
