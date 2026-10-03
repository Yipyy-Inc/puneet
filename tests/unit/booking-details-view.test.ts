import { describe, expect, test } from "bun:test";

import type { BookingAction } from "@/lib/bookings/booking-lifecycle";
import {
  alertsFor,
  allergiesOf,
  detailSteps,
  detailTabs,
  detailsCard,
  isConcerning,
  journalKind,
  journalOptions,
  moreMenu,
  nextSkillRating,
  petsLabel,
  pillTone,
  primaryFor,
  serviceKind,
  skillState,
  stepState,
} from "@/lib/bookings/details/service-view";

// ============================================================================
// The booking page's decisions, by service, as the client's Booking_Details
// mocks make them (2026-10-03). The four mocks are one page whose tabs,
// steps and next action differ by service; these pin every answer.
// ============================================================================

const at = (
  service: string,
  status: string,
  presence?: "expected" | "on-site" | "departed",
) => ({
  service,
  status: status as never,
  presence,
  startDate: "2026-10-03",
  endDate: "2026-10-05",
});

const actions = (...ids: [string, BookingAction["placement"]][]) =>
  ids.map(([id, placement]) => ({ id, placement }) as BookingAction);

describe("serviceKind and the tabs", () => {
  test("the four services, and everything else", () => {
    expect(serviceKind("Boarding")).toBe("boarding");
    expect(serviceKind("daycare")).toBe("daycare");
    expect(serviceKind("grooming")).toBe("grooming");
    expect(serviceKind("training")).toBe("training");
    expect(serviceKind("evaluation")).toBe("other");
    expect(serviceKind(undefined)).toBe("other");
  });

  test("a stay or a day has a journal and tasks; a groom or a lesson does not", () => {
    expect(detailTabs("boarding")).toEqual([
      "overview",
      "journal",
      "tasks",
      "notes",
    ]);
    expect(detailTabs("daycare")).toEqual([
      "overview",
      "journal",
      "tasks",
      "notes",
    ]);
    expect(detailTabs("grooming")).toEqual(["overview", "notes"]);
    expect(detailTabs("training")).toEqual(["overview", "notes"]);
    expect(detailTabs("other")).toEqual(["overview", "notes"]);
  });
});

describe("the stepper", () => {
  test("each service walks its own steps", () => {
    expect(detailSteps("boarding")).toEqual([
      "confirmed",
      "checkedIn",
      "checkedOut",
    ]);
    expect(detailSteps("grooming")).toEqual([
      "booked",
      "checkedIn",
      "inGrooming",
      "readyForPickup",
      "completed",
    ]);
    expect(detailSteps("training")).toEqual([
      "booked",
      "checkedIn",
      "sessionComplete",
    ]);
  });

  test("a stay: confirmed, then here, then gone", () => {
    expect(
      stepState("boarding", at("boarding", "confirmed", "expected")),
    ).toMatchObject({ index: 0, done: false });
    expect(
      stepState("boarding", at("boarding", "checked_in", "on-site")),
    ).toMatchObject({ index: 1, done: false });
    expect(
      stepState("boarding", at("boarding", "completed", "departed")),
    ).toMatchObject({ index: 2, done: true });
  });

  test("where the pet IS decides, not a stray status", () => {
    // Departed on the attendance record while the status never followed.
    expect(
      stepState("daycare", at("daycare", "checked_in", "departed")),
    ).toMatchObject({ index: 2, done: true });
  });

  test("a groom walks all five", () => {
    expect(
      stepState("grooming", at("grooming", "checked_in", "on-site"))?.index,
    ).toBe(1);
    expect(
      stepState("grooming", at("grooming", "in_progress", "on-site"))?.index,
    ).toBe(2);
    expect(
      stepState("grooming", at("grooming", "ready", "on-site"))?.index,
    ).toBe(3);
    expect(
      stepState("grooming", at("grooming", "completed", "departed")),
    ).toMatchObject({ index: 4, done: true });
  });

  test("a request has reached no step; a cancelled booking has no stepper", () => {
    expect(stepState("boarding", at("boarding", "pending"))?.index).toBe(-1);
    expect(
      stepState("boarding", at("boarding", "request_submitted"))?.index,
    ).toBe(-1);
    expect(stepState("boarding", at("boarding", "cancelled"))).toBeNull();
    expect(stepState("boarding", at("boarding", "declined"))).toBeNull();
    expect(stepState("boarding", at("boarding", "no_show"))).toBeNull();
  });

  test("the pill: live, done, waiting, stopped", () => {
    expect(
      pillTone({ index: 1, done: false, stage: "on_site" }, "checked_in"),
    ).toBe("live");
    expect(
      pillTone({ index: 2, done: true, stage: "completed" }, "completed"),
    ).toBe("done");
    expect(
      pillTone({ index: -1, done: false, stage: "unconfirmed" }, "pending"),
    ).toBe("waiting");
    expect(pillTone(null, "cancelled")).toBe("stopped");
    expect(pillTone(null, "no_show")).toBe("neutral");
  });
});

describe("the header's one button", () => {
  test("a stay: the lifecycle's own next step", () => {
    expect(
      primaryFor(
        "boarding",
        at("boarding", "confirmed", "expected"),
        actions(["check_in", "primary"], ["edit", "secondary"]),
      ),
    ).toBe("check_in");
    expect(
      primaryFor(
        "boarding",
        at("boarding", "checked_in", "on-site"),
        actions(["check_out", "primary"], ["undo_check_in", "reverse"]),
      ),
    ).toBe("check_out");
  });

  test("a groom: start, then ready, then complete", () => {
    const onSite = actions(
      ["check_out", "primary"],
      ["mark_in_progress", "secondary"],
      ["mark_ready", "secondary"],
    );
    expect(
      primaryFor("grooming", at("grooming", "checked_in", "on-site"), onSite),
    ).toBe("mark_in_progress");
    expect(
      primaryFor(
        "grooming",
        at("grooming", "in_progress", "on-site"),
        actions(["check_out", "primary"], ["mark_ready", "secondary"]),
      ),
    ).toBe("mark_ready");
    expect(
      primaryFor(
        "grooming",
        at("grooming", "ready", "on-site"),
        actions(["check_out", "primary"], ["mark_in_progress", "secondary"]),
      ),
    ).toBe("check_out");
  });

  test("never a payment, and nothing the viewer may not do", () => {
    expect(
      primaryFor(
        "boarding",
        at("boarding", "completed", "departed"),
        actions(["take_payment", "primary"]),
      ),
    ).toBeNull();
    expect(
      primaryFor("boarding", at("boarding", "confirmed", "expected"), []),
    ).toBeNull();
    // Without permission to edit, a groom cannot be started from here.
    expect(
      primaryFor(
        "grooming",
        at("grooming", "checked_in", "on-site"),
        actions(["check_out", "primary"]),
      ),
    ).toBe("check_out");
  });
});

describe("the details card", () => {
  test("its title and its action, by service", () => {
    expect(detailsCard("boarding")).toEqual({
      title: "stay",
      action: "moveKennel",
    });
    expect(detailsCard("daycare")).toEqual({
      title: "visit",
      action: "changeGroup",
    });
    expect(detailsCard("grooming")).toEqual({
      title: "appointment",
      action: "reschedule",
    });
    expect(detailsCard("training")).toEqual({
      title: "program",
      action: "reschedule",
    });
    expect(detailsCard("other")).toEqual({ title: "visit", action: null });
  });
});

describe("the More menu", () => {
  const options = {
    primary: null,
    canPrintCareSheet: false,
    canEarlyCheckout: false,
    canEmailReceipt: false,
    paymentCardShown: true,
  };

  test("the mock's order: print, the service's move, the link, then Other", () => {
    const groups = moreMenu(
      "boarding",
      actions(
        ["check_out", "primary"],
        ["edit", "secondary"],
        ["add_item", "secondary"],
        ["send_pay_link", "more"],
        ["report_incident", "more"],
        ["undo_check_in", "reverse"],
        ["cancel", "reverse"],
      ),
      { ...options, primary: "check_out", canEarlyCheckout: true },
    );
    expect(groups).toEqual([
      { heading: null, items: ["printBooking", "earlyCheckout"] },
      { heading: "sendPaymentLink", items: ["payLinkEmail", "payLinkSms"] },
      {
        heading: "other",
        items: ["undo_check_in", "tags", "report_incident", "cancel"],
      },
    ]);
  });

  test("a groom reschedules instead, and a no-show leads Other", () => {
    const groups = moreMenu(
      "grooming",
      actions(
        ["check_in", "primary"],
        ["edit", "secondary"],
        ["no_show", "reverse"],
        ["cancel", "reverse"],
      ),
      { ...options, primary: "check_in" },
    );
    expect(groups[0].items).toEqual(["printBooking", "reschedule"]);
    expect(groups.at(-1)?.items).toEqual(["no_show", "tags", "cancel"]);
  });

  test("taking a payment is offered here only when the payment card is not", () => {
    const owed = actions(["take_payment", "primary"], ["refund", "more"]);
    expect(moreMenu("boarding", owed, options).at(-1)?.items).toEqual([
      "refund",
      "tags",
    ]);
    expect(
      moreMenu("boarding", owed, { ...options, paymentCardShown: false }).at(-1)
        ?.items,
    ).toEqual(["take_payment", "refund", "tags"]);
  });
});

describe("the alerts", () => {
  test("allergies first, then what is late, then what today holds", () => {
    expect(
      alertsFor({
        allergies: allergiesOf("Chicken; none, Beef"),
        careOverdue: 1,
        checkoutToday: { time: "19:00" },
        vaccineGaps: null,
        flags: [{ text: "Nervous with the dryer", tone: "amber" }],
      }).map((a) => a.kind),
    ).toEqual(["allergy", "allergy", "careOverdue", "flag", "checkoutToday"]);
  });

  test("a profile that says None has no allergy", () => {
    expect(allergiesOf("None")).toEqual([]);
    expect(allergiesOf("n/a")).toEqual([]);
    expect(allergiesOf("aucune")).toEqual([]);
    expect(allergiesOf(" Chicken , Chicken ")).toEqual(["Chicken"]);
  });
});

describe("the journal", () => {
  test("a care-log type is one of the four kinds", () => {
    expect(journalKind("feeding")).toBe("meal");
    expect(journalKind("medication")).toBe("med");
    expect(journalKind("potty")).toBe("potty");
    expect(journalKind("walk")).toBe("activity");
    expect(journalKind("addon")).toBe("activity");
  });

  test("the answers are the outcomes the Daily Care board writes", () => {
    expect(journalOptions("meal")).toEqual(["ate_all", "ate_some", "refused"]);
    expect(journalOptions("med")).toEqual(["given", "refused", "skipped"]);
    expect(journalOptions("potty")).toEqual(["pee", "poop", "both", "nothing"]);
    expect(journalOptions("activity")).toEqual(["completed", "skipped"]);
  });

  test("what somebody should notice", () => {
    expect(isConcerning("ate_some")).toBe(true);
    expect(isConcerning("refused")).toBe(true);
    expect(isConcerning("ate_all")).toBe(false);
    expect(isConcerning("given")).toBe(false);
  });
});

describe("training", () => {
  test("a skill's state is its latest rating", () => {
    expect(skillState(undefined)).toBe("not-started");
    expect(skillState(3)).toBe("practising");
    expect(skillState(5)).toBe("mastered");
  });

  test("a tap writes the next state, and the third takes it off", () => {
    expect(nextSkillRating("not-started")).toBe(3);
    expect(nextSkillRating("practising")).toBe(5);
    expect(nextSkillRating("mastered")).toBeNull();
  });
});

describe("the pets", () => {
  test("one, two, or the first and a count", () => {
    expect(petsLabel([])).toBeNull();
    expect(petsLabel(["Bubu"])).toBe("Bubu");
    expect(petsLabel(["Bubu", "Kofi"])).toBe("Bubu & Kofi");
    expect(petsLabel(["Bubu", "Kofi", "Ziggy"])).toBe("Bubu +2");
  });
});
