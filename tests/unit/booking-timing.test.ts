import { describe, expect, test } from "bun:test";

import {
  balanceDue,
  bookingTiming,
  isAwaitingConfirmation,
  isCustomerCancellable,
  isoDayOrUndefined,
  isPayable,
} from "@/lib/bookings/booking-timing";
import { localToday } from "@/lib/vaccinations";

const TODAY = "2026-09-19";
const b = (status: string, startDate: string, endDate?: string) => ({
  status,
  startDate,
  endDate,
});

describe("bookingTiming", () => {
  test("a booking for today is today's all day, not past", () => {
    expect(bookingTiming(b("confirmed", TODAY, TODAY), TODAY)).toBe("today");
  });
  test("a stay that began yesterday and ends tomorrow is today's", () => {
    expect(
      bookingTiming(b("confirmed", "2026-09-18", "2026-09-20"), TODAY),
    ).toBe("today");
  });
  test("a booking whose last day has gone is past", () => {
    expect(
      bookingTiming(b("confirmed", "2026-09-17", "2026-09-18"), TODAY),
    ).toBe("past");
  });
  test("tomorrow is upcoming", () => {
    expect(bookingTiming(b("confirmed", "2026-09-20"), TODAY)).toBe("upcoming");
  });
  test("finished statuses are past whatever the date", () => {
    for (const s of ["cancelled", "declined", "completed", "no_show"]) {
      expect(bookingTiming(b(s, "2026-12-01"), TODAY)).toBe("past");
    }
  });
  test("a pet on site is today's even on a stale date", () => {
    expect(bookingTiming(b("checked_in", "2026-09-10"), TODAY)).toBe("today");
  });
  test("a full timestamp is read by its day", () => {
    expect(bookingTiming(b("confirmed", `${TODAY}T08:00:00Z`), TODAY)).toBe(
      "today",
    );
  });
});

// The three zones the plan names. The day a customer is living in is what the
// list compares against, whatever UTC says.
describe("localToday is the viewer's calendar", () => {
  test("late evening is still the local day", () => {
    expect(localToday(new Date(2026, 8, 19, 23, 30))).toBe("2026-09-19");
  });
  test("just after midnight is the new local day", () => {
    expect(localToday(new Date(2026, 8, 20, 0, 5))).toBe("2026-09-20");
  });
  test("a day computed in the viewer's zone is the one the list uses", () => {
    const now = new Date(2026, 8, 19, 12, 0);
    expect(
      bookingTiming(b("confirmed", localToday(now)), localToday(now)),
    ).toBe("today");
  });
});

describe("what the customer is offered", () => {
  test("a request is awaiting confirmation and can be withdrawn, even today", () => {
    expect(isAwaitingConfirmation({ status: "request_submitted" })).toBe(true);
    expect(isCustomerCancellable(b("request_submitted", TODAY), TODAY)).toBe(
      true,
    );
  });
  test("a confirmed booking can be cancelled up to its day, not after", () => {
    expect(isCustomerCancellable(b("confirmed", TODAY), TODAY)).toBe(true);
    expect(isCustomerCancellable(b("confirmed", "2026-09-18"), TODAY)).toBe(
      false,
    );
  });
  test("a pet on site, or a finished booking, cannot be cancelled", () => {
    expect(isCustomerCancellable(b("checked_in", TODAY), TODAY)).toBe(false);
    expect(isCustomerCancellable(b("cancelled", "2026-12-01"), TODAY)).toBe(
      false,
    );
  });
});

describe("money", () => {
  test("the balance counts extras and what was paid", () => {
    expect(balanceDue({ totalCost: 64, amountDue: 70, amountPaid: 16 })).toBe(
      54,
    );
  });
  test("an overpaid booking owes nothing", () => {
    expect(balanceDue({ totalCost: 40, amountPaid: 50 })).toBe(0);
  });
  test("a request is never payable, even with a quote on it", () => {
    expect(
      isPayable({ status: "request_submitted", totalCost: 0, amountDue: 0 }),
    ).toBe(false);
  });
  test("a confirmed booking with something owed is payable; a cancelled one is not", () => {
    expect(
      isPayable({ status: "confirmed", totalCost: 40, amountPaid: 0 }),
    ).toBe(true);
    expect(
      isPayable({ status: "cancelled", totalCost: 40, amountPaid: 0 }),
    ).toBe(false);
  });
});

describe("isoDayOrUndefined", () => {
  test("accepts a day and nothing else", () => {
    expect(isoDayOrUndefined("2026-09-19")).toBe("2026-09-19");
    expect(isoDayOrUndefined("09/19/2026")).toBeUndefined();
    expect(isoDayOrUndefined(undefined)).toBeUndefined();
  });
});
