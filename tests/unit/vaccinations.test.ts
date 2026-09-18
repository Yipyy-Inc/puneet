import { describe, expect, test } from "bun:test";

import {
  addDaysIso,
  expiryState,
  isCover,
  missingForService,
  missingRequired,
  recordMatchesRule,
} from "@/lib/vaccinations";
import type { VaccinationRecord } from "@/types/pet";

// ============================================================================
// WHAT A VACCINATION RECORD MEANS ON A GIVEN DAY.
//
// The screens compared `new Date(expiryDate)` with `Date.now()`. An ISO date
// parses as midnight UTC, which in Montréal is 20:00 the day BEFORE — so a
// certificate read as expired through the whole of its last valid day. These
// pin the calendar-day comparison that replaced it.
// ============================================================================

const rec = (over: Partial<VaccinationRecord>): VaccinationRecord => ({
  id: "r",
  petId: 1,
  vaccineName: "Rabies",
  administeredDate: "",
  expiryDate: "2026-12-01",
  status: "approved",
  ...over,
});

describe("expiryState", () => {
  test("the last valid day is not expired", () => {
    expect(expiryState("2026-09-11", "2026-09-11")).toBe("expiring");
  });
  test("the day after is", () => {
    expect(expiryState("2026-09-10", "2026-09-11")).toBe("expired");
  });
  test("thirty days out is expiring, thirty-one is current", () => {
    expect(expiryState("2026-10-11", "2026-09-11")).toBe("expiring");
    expect(expiryState("2026-10-12", "2026-09-11")).toBe("current");
  });
  test("no expiry never lapses", () => {
    expect(expiryState("", "2026-09-11")).toBe("none");
    expect(expiryState(undefined, "2026-09-11")).toBe("none");
  });
  test("a timestamp is read as its calendar day", () => {
    expect(expiryState("2026-09-11T00:00:00Z", "2026-09-11")).toBe("expiring");
  });
});

describe("addDaysIso", () => {
  test("crosses a month and a year", () => {
    expect(addDaysIso("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("cover", () => {
  test("a rejected record is not cover, a pending one is", () => {
    expect(isCover(rec({ status: "rejected" }), "2026-09-11")).toBe(false);
    expect(isCover(rec({ status: "pending_review" }), "2026-09-11")).toBe(true);
  });
  test("an expired record is not cover", () => {
    expect(isCover(rec({ expiryDate: "2026-01-01" }), "2026-09-11")).toBe(
      false,
    );
  });
  test("a longer certificate name answers the rule", () => {
    expect(
      recordMatchesRule({ vaccineName: "Rabies (3 year)" }, "rabies"),
    ).toBe(true);
    expect(recordMatchesRule({ vaccineName: "" }, "rabies")).toBe(false);
  });
  test("missingRequired names only the required, same-species gaps", () => {
    const rules = [
      { vaccineName: "Rabies", required: true, species: "Dog" },
      { vaccineName: "Bordetella", required: true, species: "dog" },
      { vaccineName: "Lepto", required: false, species: "Dog" },
      { vaccineName: "FVRCP", required: true, species: "Cat" },
    ];
    const missing = missingRequired(
      "dog",
      [rec({ vaccineName: "Rabies" })],
      rules,
      "2026-09-11",
    );
    expect(missing.map((r) => r.vaccineName)).toEqual(["Bordetella"]);
  });
});

describe("missingForService", () => {
  const rules = [
    {
      vaccineName: "Rabies",
      required: true,
      species: "Dog",
      applicableServices: ["boarding", "daycare", "grooming"],
    },
    {
      vaccineName: "Bordetella",
      required: true,
      species: "Dog",
      applicableServices: ["Boarding", "daycare"],
    },
    {
      vaccineName: "DHPP",
      required: true,
      species: "Dog",
      applicableServices: [],
    },
  ];
  const none: VaccinationRecord[] = [];

  test("asks only what the service requires", () => {
    const missing = missingForService(
      "grooming",
      "Dog",
      none,
      rules,
      "2026-09-18",
    );
    expect(missing.map((r) => r.vaccineName)).toEqual(["Rabies", "DHPP"]);
  });
  test("matches the service whatever its case", () => {
    const missing = missingForService(
      "boarding",
      "dog",
      [rec({ vaccineName: "Rabies" }), rec({ vaccineName: "DHPP" })],
      rules,
      "2026-09-18",
    );
    expect(missing.map((r) => r.vaccineName)).toEqual(["Bordetella"]);
  });
  test("an expired certificate is a gap", () => {
    const missing = missingForService(
      "training",
      "Dog",
      [rec({ vaccineName: "DHPP", expiryDate: "2026-09-17" })],
      rules,
      "2026-09-18",
    );
    expect(missing.map((r) => r.vaccineName)).toEqual(["DHPP"]);
  });
});
