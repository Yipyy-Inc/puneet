import { describe, expect, test } from "bun:test";

import {
  availableActions,
  bookingStage,
  checkStatusTransition,
  type ActionContext,
  type LifecycleBooking,
} from "@/lib/bookings/booking-lifecycle";
import { arrivalPermissionFor } from "@/lib/bookings/arrival-writer";
import { bookingTotals } from "@/lib/payments/booking-totals";
import { NO_TAX, type TaxConfig } from "@/lib/settings/tax";
import type { PermissionKey } from "@/types/facility-staff";

// The booking page's action bar used to decide its own buttons: "Undo
// check-in" on a booking that was only confirmed, No-show gated on a fixture
// invoice no real booking carries, and a status menu that moved anything to
// anything. These pin the one answer every surface now reads.

const daycare = (over: Partial<LifecycleBooking> = {}): LifecycleBooking => ({
  status: "confirmed",
  service: "daycare",
  presence: "expected",
  startDate: "2026-09-18",
  endDate: "2026-09-18",
  ...over,
});

const everyone: ActionContext = {
  can: () => true,
  owed: 0,
  paid: 0,
  today: "2026-09-18",
  depositDue: false,
  multiLocation: false,
};

const only = (...keys: PermissionKey[]): ActionContext => ({
  ...everyone,
  can: (k) => keys.includes(k),
});

const ids = (b: LifecycleBooking, ctx: ActionContext) =>
  availableActions(b, ctx).map((a) => a.id);
const primary = (b: LifecycleBooking, ctx: ActionContext) =>
  availableActions(b, ctx).find((a) => a.placement === "primary")?.id;

describe("bookingStage", () => {
  test("presence decides a tracked service's stage", () => {
    expect(bookingStage(daycare())).toBe("expected");
    expect(bookingStage(daycare({ presence: "on-site" }))).toBe("on_site");
    expect(bookingStage(daycare({ presence: "departed" }))).toBe("gone_home");
  });

  test("a status the mirror never saw does not fool it", () => {
    // checked_in with nobody on site: rows from before the mirror.
    expect(
      bookingStage(daycare({ status: "checked_in", presence: "expected" })),
    ).toBe("expected");
  });

  test("an untracked service's status is its lifecycle", () => {
    const evaluation = daycare({ service: "evaluation", presence: "unknown" });
    expect(bookingStage(evaluation)).toBe("expected");
    expect(bookingStage({ ...evaluation, status: "checked_in" })).toBe(
      "on_site",
    );
  });

  test("requests, closed and final states", () => {
    expect(bookingStage(daycare({ status: "request_submitted" }))).toBe(
      "request",
    );
    expect(bookingStage(daycare({ status: "waitlisted" }))).toBe("request");
    expect(bookingStage(daycare({ status: "estimate_sent" }))).toBe(
      "unconfirmed",
    );
    expect(bookingStage(daycare({ status: "completed" }))).toBe("completed");
    expect(bookingStage(daycare({ status: "no_show" }))).toBe("no_show");
    expect(bookingStage(daycare({ status: "cancelled" }))).toBe("cancelled");
  });
});

describe("availableActions", () => {
  test("a confirmed booking is checked in, and cannot be undone as a check-in", () => {
    const actions = ids(daycare(), everyone);
    expect(primary(daycare(), everyone)).toBe("check_in");
    expect(actions).not.toContain("undo_check_in");
    expect(actions).not.toContain("mark_ready");
  });

  test("a pet on site is checked out, and its check-in can be undone", () => {
    const onSite = daycare({ status: "checked_in", presence: "on-site" });
    expect(primary(onSite, everyone)).toBe("check_out");
    expect(ids(onSite, everyone)).toContain("undo_check_in");
    expect(ids(onSite, everyone)).not.toContain("no_show");
  });

  test("no-show is offered from the start day, not before", () => {
    expect(ids(daycare(), everyone)).toContain("no_show");
    const tomorrow = daycare({
      startDate: "2026-09-19",
      endDate: "2026-09-19",
    });
    expect(ids(tomorrow, everyone)).not.toContain("no_show");
  });

  test("the check-in follows the service's own permission", () => {
    // A manager holds check_in_out but not daycare_check_in_out, by design.
    expect(arrivalPermissionFor("daycare")).toBe("daycare_check_in_out");
    expect(arrivalPermissionFor("boarding")).toBe("check_in_out");
    expect(arrivalPermissionFor("grooming")).toBe("edit_bookings");
    expect(arrivalPermissionFor("evaluation")).toBe("edit_bookings");
    expect(ids(daycare(), only("check_in_out"))).not.toContain("check_in");
    expect(
      ids(daycare({ service: "boarding" }), only("check_in_out")),
    ).toContain("check_in");
  });

  test("a request is reviewed, never confirmed or checked in straight away", () => {
    const request = daycare({ status: "request_submitted" });
    expect(primary(request, everyone)).toBe("review_request");
    const actions = ids(request, everyone);
    expect(actions).not.toContain("confirm");
    expect(actions).not.toContain("check_in");
    expect(actions).not.toContain("charge_deposit");
    expect(actions).toContain("decline_request");
  });

  test("the deposit shows only when a rule applies and nothing is paid", () => {
    expect(ids(daycare(), everyone)).not.toContain("charge_deposit");
    expect(ids(daycare(), { ...everyone, depositDue: true })).toContain(
      "charge_deposit",
    );
  });

  test("undoing a confirmation is only for a booking with nothing paid", () => {
    expect(ids(daycare(), everyone)).toContain("undo_confirm");
    expect(ids(daycare(), { ...everyone, paid: 20 })).not.toContain(
      "undo_confirm",
    );
  });

  test("a completed booking takes the balance first, then refunds and tips", () => {
    const done = daycare({ status: "completed", presence: "departed" });
    expect(primary(done, { ...everyone, owed: 30 })).toBe("take_payment");
    expect(primary(done, everyone)).toBeUndefined();
    const paid = ids(done, { ...everyone, paid: 40 });
    expect(paid).toContain("refund");
    expect(paid).toContain("split_tips");
    expect(paid).toContain("undo_checkout");
  });

  test("an accountant can take payment but not move the pet", () => {
    const accountant = only("take_payment", "process_refund");
    const onSite = daycare({ status: "checked_in", presence: "on-site" });
    // Checkout through the till is still theirs when money is owed...
    expect(ids(onSite, { ...accountant, owed: 20 })).toContain("check_out");
    // ...but with nothing owed there is nothing for them to do there.
    expect(ids(onSite, accountant)).not.toContain("check_out");
    expect(ids(onSite, accountant)).not.toContain("undo_check_in");
  });

  test("grooming alone has in-progress and ready steps", () => {
    const groom = daycare({
      service: "grooming",
      status: "checked_in",
      presence: "on-site",
    });
    expect(ids(groom, everyone)).toContain("mark_ready");
    const stay = daycare({ status: "checked_in", presence: "on-site" });
    expect(ids(stay, everyone)).not.toContain("mark_ready");
  });

  test("cancelled and declined offer only what can still happen", () => {
    expect(ids(daycare({ status: "cancelled" }), everyone)).toEqual([
      "reinstate",
    ]);
    expect(ids(daycare({ status: "declined" }), everyone)).toEqual([]);
  });

  test("nothing is offered to somebody with no permissions", () => {
    expect(ids(daycare(), only())).toEqual([]);
  });
});

describe("checkStatusTransition", () => {
  const onSite = { service: "daycare", presence: "on-site" as const };
  const expected = { service: "daycare", presence: "expected" as const };

  test("a tracked check-in goes through the attendance write", () => {
    expect(checkStatusTransition("confirmed", "checked_in", expected)).toEqual({
      ok: false,
      reason: "use_arrival",
    });
    expect(checkStatusTransition("confirmed", "completed", onSite)).toEqual({
      ok: false,
      reason: "use_arrival",
    });
  });

  test("a direct write may bring a stray status into line with presence", () => {
    expect(checkStatusTransition("confirmed", "checked_in", onSite).ok).toBe(
      true,
    );
    expect(
      checkStatusTransition("confirmed", "completed", {
        service: "boarding",
        presence: "departed",
      }).ok,
    ).toBe(true);
  });

  test("a pet that arrived was not a no-show", () => {
    expect(checkStatusTransition("confirmed", "no_show", onSite)).toEqual({
      ok: false,
      reason: "arrived",
    });
    expect(checkStatusTransition("confirmed", "no_show", expected).ok).toBe(
      true,
    );
  });

  test("cancelling is always a transition; final states stay final", () => {
    expect(checkStatusTransition("completed", "cancelled", onSite).ok).toBe(
      true,
    );
    expect(checkStatusTransition("declined", "confirmed", expected)).toEqual({
      ok: false,
      reason: "declined_final",
    });
    expect(checkStatusTransition("cancelled", "confirmed", expected).ok).toBe(
      true,
    );
    expect(checkStatusTransition("cancelled", "completed", expected)).toEqual({
      ok: false,
      reason: "cancelled_final",
    });
  });

  test("a confirmed booking does not go back to being a request", () => {
    expect(
      checkStatusTransition("confirmed", "request_submitted", expected),
    ).toEqual({ ok: false, reason: "not_a_request" });
    expect(
      checkStatusTransition("request_submitted", "waitlisted", expected).ok,
    ).toBe(true);
  });

  test("an untracked service moves by status", () => {
    const evaluation = { service: "evaluation" };
    expect(
      checkStatusTransition("confirmed", "checked_in", evaluation).ok,
    ).toBe(true);
    expect(checkStatusTransition("confirmed", "ready", evaluation)).toEqual({
      ok: false,
      reason: "not_on_site",
    });
    expect(
      checkStatusTransition("checked_in", "completed", evaluation).ok,
    ).toBe(true);
  });
});

describe("bookingTotals", () => {
  const qc: TaxConfig = {
    ...NO_TAX,
    taxes: [
      {
        id: "gst",
        name: "GST",
        rate: 0.05,
        enabled: true,
        appliesTo: "all",
      } as TaxConfig["taxes"][number],
    ],
  };

  test("without tax, the total is the cost plus the tip", () => {
    const t = bookingTotals(
      { totalCost: 64, amountDue: 80, amountPaid: 16, tipAmount: 5 },
      NO_TAX,
    );
    expect(t.total).toBe(85);
    expect(t.owed).toBe(64);
    expect(t.balance).toBe(64);
  });

  test("tax is on what is owed, not on the whole bill", () => {
    const t = bookingTotals(
      { totalCost: 100, amountDue: 100, amountPaid: 40 },
      qc,
    );
    expect(t.owed).toBe(60);
    expect(t.taxCents).toBe(300);
    expect(t.balance).toBe(63);
    expect(t.total).toBe(103);
  });

  test("a paid booking owes nothing", () => {
    const t = bookingTotals(
      { totalCost: 50, amountDue: 50, amountPaid: 50 },
      qc,
    );
    expect(t.owed).toBe(0);
    expect(t.balance).toBe(0);
  });
});
