import { describe, expect, test } from "bun:test";

import { toEmployeeHref } from "@/lib/nav/employee-nav";

// ============================================================================
// A LINK FROM A SHARED PAGE, FOR STAFF.
//
// The booking page and the operations calendar render in /employee as well as
// /facility/dashboard, and their links were written for the second. Staff
// following one were refused by the facility gate and sent to their schedule —
// reception checking out a guest who owed landed there instead of on the
// booking and its payment. These pin where each of those links goes instead.
// ============================================================================

describe("toEmployeeHref", () => {
  test("a booking opens on the shell's booking page, from either address", () => {
    expect(
      toEmployeeHref("/facility/dashboard/clients/15/bookings/10896"),
    ).toBe("/employee/bookings/10896");
    expect(toEmployeeHref("/facility/dashboard/bookings/10896")).toBe(
      "/employee/bookings/10896",
    );
  });

  test("a client opens on the shell's client page, keeping its query", () => {
    expect(toEmployeeHref("/facility/dashboard/clients/15")).toBe(
      "/employee/clients/15",
    );
    expect(toEmployeeHref("/facility/dashboard/clients/15?tab=pets")).toBe(
      "/employee/clients/15?tab=pets",
    );
  });

  test("a pet opens on its owner's profile — the shell has no pet page", () => {
    expect(toEmployeeHref("/facility/dashboard/clients/15/pets/1")).toBe(
      "/employee/clients/15",
    );
  });

  test("a nav page maps through the nav's own table", () => {
    expect(toEmployeeHref("/facility/dashboard/bookings")).toBe(
      "/employee/bookings",
    );
    expect(toEmployeeHref("/facility/dashboard/estimates?q=42")).toBe(
      "/employee/estimates?q=42",
    );
  });

  test("a page the shell does not have comes back unchanged", () => {
    const settings =
      "/facility/dashboard/services/boarding/settings#early-checkout";
    expect(toEmployeeHref(settings)).toBe(settings);
    // Only numbers are booking refs: another child of /bookings is not one.
    expect(toEmployeeHref("/facility/dashboard/bookings/new")).toBe(
      "/facility/dashboard/bookings/new",
    );
  });
});
