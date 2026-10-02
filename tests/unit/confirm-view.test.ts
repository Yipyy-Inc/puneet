import { describe, expect, test } from "bun:test";

import {
  checklistIssues,
  confirmButtonKey,
  heroLine,
  joinNames,
  previewStatus,
} from "@/lib/bookings/wizard/confirm-view";

// The English the catalogue holds, so the lines read as the mock prints them.
const EN: Record<string, string> = {
  wizHeroStay: "{from} → {to} · {nights}",
  wizHeroDays: "{days} · {from} – {to}",
  wizHeroClass: "{name} · starts {date} · {when}",
  wizNightsOne: "{count} night",
  wizNightsOther: "{count} nights",
  wizDaysOne: "{count} day",
  wizDaysOther: "{count} days",
  wizWith: "with {name}",
};
const t = (key: string) => EN[key] ?? key;

describe("joinNames", () => {
  test("one, two, three", () => {
    expect(joinNames(["Bubu"])).toBe("Bubu");
    expect(joinNames(["Bubu", "Mango"])).toBe("Bubu & Mango");
    expect(joinNames(["Bubu", "Mango", "Rocky"])).toBe("Bubu, Mango & Rocky");
    expect(joinNames([])).toBe("");
  });
});

describe("heroLine — the mock's lines", () => {
  test("a stay", () => {
    expect(
      heroLine(
        {
          service: "boarding",
          stay: {
            start: "2026-10-01",
            end: "2026-10-05",
            checkIn: "08:00",
            checkOut: "17:00",
            nights: 4,
          },
        },
        t,
        "en",
      ),
    ).toBe("Thu, Oct 1 8:00 AM → Mon, Oct 5 5:00 PM · 4 nights");
  });

  test("daycare days", () => {
    expect(
      heroLine(
        {
          service: "daycare",
          days: { count: 3, checkIn: "08:00", checkOut: "17:30" },
        },
        t,
        "en",
      ),
    ).toBe("3 days · 8:00 AM – 5:30 PM");
  });

  test("an appointment, with whom", () => {
    expect(
      heroLine(
        {
          service: "grooming",
          slot: {
            date: "2026-10-02",
            start: "10:00",
            end: "13:15",
            staffName: "Maya R.",
          },
        },
        t,
        "en",
      ),
    ).toBe("Fri, Oct 2 · 10:00 AM – 1:15 PM · with Maya R.");
  });

  test("a class", () => {
    expect(
      heroLine(
        {
          service: "training",
          course: {
            name: "Puppy Foundations",
            start: "2026-10-17",
            when: "Saturdays · 10:00 AM",
          },
        },
        t,
        "en",
      ),
    ).toBe("Puppy Foundations · starts Sat, Oct 17 · Saturdays · 10:00 AM");
  });

  test("French time is 14 h 30", () => {
    const line = heroLine(
      {
        service: "daycare",
        days: { count: 1, checkIn: "08:00", checkOut: "14:30" },
      },
      t,
      "fr",
    );
    expect(line).toContain("14 h 30");
  });
});

describe("previewStatus", () => {
  const staff = {
    isCustomer: false,
    missingAgreements: 0,
    requiresApproval: false,
    depositDue: false,
  };
  test("staff", () => {
    expect(previewStatus(staff)).toBe("confirmed");
    expect(previewStatus({ ...staff, missingAgreements: 2 })).toBe(
      "pending_agreements",
    );
    expect(previewStatus({ ...staff, depositDue: true })).toBe("deposit_due");
    // Agreements outrank the deposit: the booking is not confirmed at all.
    expect(
      previewStatus({ ...staff, missingAgreements: 1, depositDue: true }),
    ).toBe("pending_agreements");
  });
  test("customer", () => {
    expect(
      previewStatus({ ...staff, isCustomer: true, requiresApproval: true }),
    ).toBe("request");
    expect(previewStatus({ ...staff, isCustomer: true })).toBe("confirmed");
  });
});

test("checklistIssues counts the mock's way", () => {
  expect(
    checklistIssues({
      missingAgreements: 2,
      vaccinationWarning: true,
      evaluationDeclined: false,
    }),
  ).toBe(3);
  expect(
    checklistIssues({
      missingAgreements: 0,
      vaccinationWarning: false,
      evaluationDeclined: false,
    }),
  ).toBe(0);
});

describe("confirmButtonKey", () => {
  const base = {
    isCustomer: false,
    editMode: false,
    estimateMode: false,
    missingAgreements: 0,
    requiresApproval: false,
    hasDeposit: false,
  };
  test("staff", () => {
    expect(confirmButtonKey(base)).toBe("createBooking");
    expect(confirmButtonKey({ ...base, missingAgreements: 1 })).toBe(
      "wizCreateAsPending",
    );
    expect(confirmButtonKey({ ...base, editMode: true })).toBe("saveChanges");
    expect(confirmButtonKey({ ...base, estimateMode: true })).toBe(
      "createEstimate",
    );
  });
  test("customer", () => {
    const customer = { ...base, isCustomer: true };
    expect(confirmButtonKey({ ...customer, requiresApproval: true })).toBe(
      "requestBooking",
    );
    expect(confirmButtonKey({ ...customer, hasDeposit: true })).toBe(
      "wizBookAndPayDeposit",
    );
    expect(confirmButtonKey(customer)).toBe("wizBookAppointment");
  });
});
