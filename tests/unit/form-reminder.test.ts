import { describe, expect, test } from "bun:test";

import {
  reminderDue,
  reminderKey,
  reminderMessage,
  reminderWindowHours,
} from "@/lib/forms/reminder";

const start = "2026-10-10T13:00:00Z";
const hoursBefore = (h: number) =>
  new Date(new Date(start).getTime() - h * 3_600_000);

describe("reminderDue", () => {
  const fortyEight = {
    value: 48,
    unit: "hours" as const,
    anchor: "check_in" as const,
  };

  test("due from the window's opening until the booking starts", () => {
    expect(reminderDue(start, hoursBefore(49), fortyEight)).toBe(false);
    expect(reminderDue(start, hoursBefore(48), fortyEight)).toBe(true);
    expect(reminderDue(start, hoursBefore(1), fortyEight)).toBe(true);
  });

  test("never once the booking has started", () => {
    expect(reminderDue(start, hoursBefore(0), fortyEight)).toBe(false);
    expect(reminderDue(start, hoursBefore(-2), fortyEight)).toBe(false);
  });

  test("days are 24 hours each", () => {
    const threeDays = {
      value: 3,
      unit: "days" as const,
      anchor: "appointment" as const,
    };
    expect(reminderWindowHours(threeDays)).toBe(72);
    expect(reminderDue(start, hoursBefore(71), threeDays)).toBe(true);
    expect(reminderDue(start, hoursBefore(73), threeDays)).toBe(false);
  });

  test("an unreadable start is never due", () => {
    expect(reminderDue("not a date", new Date(), fortyEight)).toBe(false);
  });
});

describe("reminderKey", () => {
  test("the same booking and forms, in any order, are one reminder", () => {
    expect(reminderKey("b1", ["f2", "f1", "f2"])).toBe(
      reminderKey("b1", ["f1", "f2"]),
    );
  });

  test("a form added later is a new reminder", () => {
    expect(reminderKey("b1", ["f1"])).not.toBe(reminderKey("b1", ["f1", "f3"]));
  });
});

describe("reminderMessage", () => {
  const forms = [
    { name: "Intake", url: "https://paws.example/forms/intake", petName: null },
    {
      name: "Temperament",
      url: "https://paws.example/forms/temperament",
      petName: "Biscuit",
    },
  ];

  test("names each form with its link, and the pet for a per-pet form", () => {
    const { subject, body } = reminderMessage({
      locale: "en",
      clientName: "Nadia",
      facilityName: "Paws & Co",
      startAt: start,
      timeZone: "America/Toronto",
      forms,
    });
    expect(subject).toBe("Forms to complete for Paws & Co");
    expect(body).toContain("Hi Nadia,");
    expect(body).toContain("- Intake\n  https://paws.example/forms/intake");
    expect(body).toContain("- Temperament (Biscuit)");
  });

  test("the day is the facility's, in the customer's language", () => {
    // 01:30 UTC on the 11th is still the 10th in Toronto.
    const late = reminderMessage({
      locale: "fr",
      clientName: "Nadia",
      facilityName: "Paws & Co",
      startAt: "2026-10-11T01:30:00Z",
      timeZone: "America/Toronto",
      forms,
    });
    expect(late.subject).toBe("Formulaires à remplir pour Paws & Co");
    expect(late.body).toContain("10 oct.");
  });
});
