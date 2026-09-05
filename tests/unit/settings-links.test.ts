import { describe, expect, test } from "bun:test";

import {
  LEGACY_SECTION_ALIASES,
  SETTINGS_LEAVES,
  SETTINGS_PARENT_IDS,
  settingsHref,
  settingsLeaf,
  settingsPortalFor,
} from "../../src/lib/settings/nav";
import {
  EMPLOYEE_ROUTE_BY_FACILITY_URL,
  toEmployeeRoute,
} from "../../src/lib/nav/employee-nav";

// ============================================================================
// A LINK INTO SETTINGS HAS TO KNOW WHICH PORTAL ASKED.
//
// The employee shell re-exports the facility pages — `/employee/grooming` IS
// `@/app/facility/dashboard/services/grooming/page` — so a component renders in
// two portals and any absolute `/facility/dashboard/settings?section=…` inside
// it is right in only one of them.
//
// For a groomer the wrong one is silent. `canAccessFacilityPortal` admits
// facility admins and nobody else, so guardPortal denies the navigation and
// `landingPathFor` sends them to `/employee/schedule` — a 200, a real page, and
// not remotely the one they asked for.
//
// These are cheap and pure, which is the whole test-tier rule in AGENTS.md: the
// browser tier cannot see a wrong href, only where it ended up, and by then the
// redirect looks like a routing decision rather than a bad string.
// ============================================================================

describe("settingsHref", () => {
  test("every leaf resolves in both portals", () => {
    for (const leaf of SETTINGS_LEAVES) {
      if (SETTINGS_PARENT_IDS.has(leaf.id)) continue;
      expect(settingsHref(leaf, "facility")).toStartWith(
        "/facility/dashboard/settings",
      );
      expect(settingsHref(leaf, "employee")).toStartWith("/employee/settings");
    }
  });

  test("the portal decides the base, not the leaf", () => {
    expect(settingsHref("taxes", "facility")).toBe(
      "/facility/dashboard/settings/taxes",
    );
    expect(settingsHref("taxes", "employee")).toBe("/employee/settings/taxes");
  });

  test("the address is the segment, not the id", () => {
    // They are equal today and stop being so the first time a section is
    // renamed. `id` is what a bookmark and Clover's return path carry;
    // `segment` is what the URL says. Asserting the distinction here means a
    // future rename cannot quietly start addressing by the wrong one.
    for (const leaf of SETTINGS_LEAVES) {
      if (SETTINGS_PARENT_IDS.has(leaf.id)) continue;
      expect(settingsHref(leaf)).toBe(
        `/facility/dashboard/settings/${leaf.segment}`,
      );
    }
  });

  test("facility is the default", () => {
    expect(settingsHref("taxes")).toBe(settingsHref("taxes", "facility"));
  });

  test("a legacy id resolves to the leaf that replaced it", () => {
    for (const [legacy, current] of Object.entries(LEGACY_SECTION_ALIASES)) {
      expect(settingsLeaf(legacy)?.id).toBe(current);
      expect(settingsHref(legacy)).toBe(settingsHref(current));
    }
  });

  test("the deleted duplicate role editor resolves to the real one", () => {
    // "Staff & HR › Roles" rendered <FacilityRolesStudio /> — the same
    // component as "Access Control › Roles & Permissions", byte for byte —
    // behind `manage_onboarding` instead of `manage_roles`. Somebody who could
    // set up a new hire got the full role editor. The writes enforce
    // `manage_roles` through RLS so nothing was ever granted, but every button
    // on that screen failed. The entry is gone; its address still resolves.
    expect(settingsLeaf("staff-roles")?.id).toBe("roles-permissions");
    expect(settingsHref("staff-roles", "employee")).toBe(
      "/employee/settings/roles-permissions",
    );
  });

  test("one label per screen, and one screen per label", () => {
    // Three sections were called "Notifications" (two of them exactly that) in
    // three different groups, backed by three different stores with three
    // different permission keys. They are adjacent and distinctly named now,
    // and this is what stops the next one being added.
    const labels = SETTINGS_LEAVES.map((l) => l.label);
    expect(new Set(labels).size).toBe(labels.length);
    const ids = SETTINGS_LEAVES.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("an unknown id lands on the index, never on a broken url", () => {
    // The five links this replaced pointed at ids that do not exist; the page
    // fell through to Business and said nothing. The index is at least honest.
    expect(settingsHref("training-disciplines")).toBe(
      "/facility/dashboard/settings",
    );
    expect(settingsHref("", "employee")).toBe("/employee/settings");
  });
});

describe("settingsPortalFor", () => {
  test("reads the shell out of the pathname", () => {
    expect(settingsPortalFor("/employee/grooming")).toBe("employee");
    expect(settingsPortalFor("/employee/settings")).toBe("employee");
    expect(settingsPortalFor("/facility/dashboard/services/grooming")).toBe(
      "facility",
    );
    expect(settingsPortalFor("")).toBe("facility");
  });
});

describe("toEmployeeRoute", () => {
  test("maps every url it knows", () => {
    for (const [facility, employee] of Object.entries(
      EMPLOYEE_ROUTE_BY_FACILITY_URL,
    )) {
      expect(toEmployeeRoute(facility)).toBe(employee);
    }
  });

  test("a query no longer defeats the lookup", () => {
    // The bug: the map is keyed on the path, the lookup was given path+query,
    // so this missed by exactly the width of `?section=taxes` and was handed
    // back unchanged — straight out of the employee portal.
    expect(toEmployeeRoute("/facility/dashboard/settings?section=taxes")).toBe(
      "/employee/settings?section=taxes",
    );
    expect(toEmployeeRoute("/facility/dashboard/calendar#today")).toBe(
      "/employee/calendar#today",
    );
    expect(
      toEmployeeRoute("/facility/dashboard/settings?section=yipyy-pay&step=2"),
    ).toBe("/employee/settings?section=yipyy-pay&step=2");
  });

  test("settings children map, because the shell mirrors that subtree", () => {
    expect(toEmployeeRoute("/facility/dashboard/settings/taxes")).toBe(
      "/employee/settings/taxes",
    );
    expect(toEmployeeRoute("/facility/dashboard/settings/taxes?edit=1")).toBe(
      "/employee/settings/taxes?edit=1",
    );
  });

  test("children of a single-page wrapper do NOT map", () => {
    // `/employee/grooming` is one page.tsx re-exporting one facility page. It
    // has no children, so inventing `/employee/grooming/settings/booking-rules`
    // would trade a wrong-portal redirect for a 404.
    const deep = "/facility/dashboard/services/grooming/settings/booking-rules";
    expect(toEmployeeRoute(deep)).toBe(deep);
  });

  test("an unmapped url is returned untouched", () => {
    expect(toEmployeeRoute("/facility/dashboard/nothing-here")).toBe(
      "/facility/dashboard/nothing-here",
    );
  });
});
