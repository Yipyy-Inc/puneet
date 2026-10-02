import { describe, expect, test } from "bun:test";

import { vaccinationLines } from "@/lib/bookings/wizard/vaccination-check";
import type { VaccinationRule } from "@/types/facility";
import type { Pet, VaccinationRecord } from "@/types/pet";

const rule = (
  vaccineName: string,
  over: Partial<VaccinationRule> = {},
): VaccinationRule => ({
  id: vaccineName,
  vaccineName,
  species: "Dog",
  required: true,
  expiryWarningDays: 30,
  applicableServices: [],
  ...over,
});

const record = (
  petId: number,
  vaccineName: string,
  expiryDate: string,
  over: Partial<VaccinationRecord> = {},
): VaccinationRecord => ({
  id: `${petId}-${vaccineName}`,
  petId,
  vaccineName,
  administeredDate: "2025-01-01",
  expiryDate,
  ...over,
});

const pet = (id: number, name: string, type = "Dog") =>
  ({ id, name, type }) as Pet;

const RULES = [rule("Rabies"), rule("DHPP"), rule("Bordetella")];
const stay = { firstDay: "2026-10-01", lastDay: "2026-10-05" };

describe("vaccinationLines — the mock's two pets", () => {
  const lines = vaccinationLines({
    pets: [pet(1, "Bubu"), pet(2, "Mango")],
    records: [
      record(1, "Rabies", "2027-06-01"),
      record(1, "DHPP", "2027-06-01"),
      record(1, "Bordetella", "2027-06-01"),
      record(2, "Rabies", "2027-06-01"),
      record(2, "DHPP", "2027-06-01"),
      record(2, "Bordetella", "2026-10-03"),
    ],
    rules: RULES,
    service: "boarding",
    ...stay,
  });

  test("Bubu is up to date", () => {
    expect(lines[0]).toEqual({
      petId: 1,
      petName: "Bubu",
      state: "ok",
      vaccines: ["Rabies", "DHPP", "Bordetella"],
    });
  });

  test("Mango's Bordetella lapses during the stay", () => {
    expect(lines[1]).toEqual({
      petId: 2,
      petName: "Mango",
      state: "expiring",
      vaccines: ["Bordetella"],
      expiresOn: "2026-10-03",
    });
  });
});

describe("vaccinationLines — what counts", () => {
  test("missing outranks expiring, and names what is missing", () => {
    const [line] = vaccinationLines({
      pets: [pet(1, "Rocky")],
      records: [record(1, "Rabies", "2026-10-02")],
      rules: RULES,
      service: "daycare",
      ...stay,
    });
    expect(line!.state).toBe("missing");
    expect(line!.vaccines).toEqual(["DHPP", "Bordetella"]);
  });

  test("expired before the first day is missing", () => {
    const [line] = vaccinationLines({
      pets: [pet(1, "Rocky")],
      records: [record(1, "Rabies", "2026-09-30")],
      rules: [rule("Rabies")],
      service: "daycare",
      ...stay,
    });
    expect(line!.state).toBe("missing");
  });

  test("a rejected certificate is no cover", () => {
    const [line] = vaccinationLines({
      pets: [pet(1, "Rocky")],
      records: [record(1, "Rabies", "2027-01-01", { status: "rejected" })],
      rules: [rule("Rabies")],
      service: "daycare",
      ...stay,
    });
    expect(line!.state).toBe("missing");
  });

  test("a rule for another service or species asks nothing", () => {
    const lines = vaccinationLines({
      pets: [pet(1, "Pepper", "Cat")],
      records: [],
      rules: [
        rule("Rabies"),
        rule("FVRCP", { applicableServices: ["boarding"] }),
      ],
      service: "grooming",
      ...stay,
    });
    expect(lines).toEqual([]);
  });

  test("a record with no expiry never lapses", () => {
    const [line] = vaccinationLines({
      pets: [pet(1, "Rocky")],
      records: [record(1, "Rabies (3 year)", "")],
      rules: [rule("Rabies")],
      service: "boarding",
      ...stay,
    });
    expect(line!.state).toBe("ok");
  });
});
