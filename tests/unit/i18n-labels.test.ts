import { describe, expect, test } from "bun:test";

import { serviceTypeLabel, statusLabel } from "@/lib/i18n/labels";

// `messages.serviceTypes` and `messages.status` were translated and read by
// nothing; screens printed the raw enum. These pin the two ways that can go
// wrong: a known value rendering English on the French side, and an unknown
// value rendering as `request_submitted`.

describe("a service by its id", () => {
  test("a built-in service reads in both languages", () => {
    expect(serviceTypeLabel("en", "grooming")).toBe("Grooming");
    expect(serviceTypeLabel("fr", "grooming")).toBe("Toilettage");
    expect(serviceTypeLabel("fr", "boarding")).toBe("Pension");
  });

  test("the case the record happens to carry does not matter", () => {
    expect(serviceTypeLabel("fr", "Daycare")).toBe("Garderie");
  });

  test("a service the facility named comes back exactly as typed (§5q)", () => {
    expect(serviceTypeLabel("fr", "Yoda's Splash")).toBe("Yoda's Splash");
  });
});

describe("a status by its enum", () => {
  test("a known status reads in both languages", () => {
    expect(statusLabel("en", "pending")).toBe("Pending");
    expect(statusLabel("fr", "pending")).toBe("En attente");
    expect(statusLabel("fr", "cancelled")).toBe("Annulé");
  });

  test("every booking status has French, including the eight added 2026-09-10", () => {
    expect(statusLabel("fr", "request_submitted")).toBe("Demande envoyée");
    expect(statusLabel("fr", "checked_in")).toBe("Arrivé");
    expect(statusLabel("fr", "no_show")).toBe("Absent");
  });

  test("an unknown status is English words, never a raw identifier", () => {
    expect(statusLabel("fr", "on_hold_for_review")).toBe("On hold for review");
  });
});
