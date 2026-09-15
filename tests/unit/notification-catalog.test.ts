import { describe, expect, test } from "bun:test";

import {
  deliveryFor,
  NO_PREFERENCES,
  NOTIFICATION_KINDS,
  notificationPreferencesSchema,
  notificationRoleDefaultsSchema,
  SHIPPED_NOTIFICATION_ROLE_DEFAULTS,
  STAFF_ROLES,
} from "@/lib/notifications/catalog";

// Who receives a staff notification: the person's permission first, then their
// own choice, then their role's default. These pin that order.

const defaults = SHIPPED_NOTIFICATION_ROLE_DEFAULTS;

describe("deliveryFor", () => {
  test("a role default decides when the person has not chosen", () => {
    expect(
      deliveryFor({
        role: "reception",
        kind: "booking_request",
        roleDefaults: defaults,
        preferences: NO_PREFERENCES,
        permitted: true,
      }),
    ).toEqual({ inApp: true, email: false });
    expect(
      deliveryFor({
        role: "groomer",
        kind: "booking_request",
        roleDefaults: defaults,
        preferences: NO_PREFERENCES,
        permitted: true,
      }).inApp,
    ).toBe(false);
  });

  test("the person's own choice overrides the role, both ways", () => {
    expect(
      deliveryFor({
        role: "reception",
        kind: "booking_request",
        roleDefaults: defaults,
        preferences: { inApp: { bookings: false }, email: {} },
        permitted: true,
      }).inApp,
    ).toBe(false);
    expect(
      deliveryFor({
        role: "groomer",
        kind: "booking_request",
        roleDefaults: defaults,
        preferences: { inApp: { bookings: true }, email: { bookings: true } },
        permitted: true,
      }),
    ).toEqual({ inApp: true, email: true });
  });

  test("no permission, no notice — whatever the switches say", () => {
    expect(
      deliveryFor({
        role: "owner",
        kind: "estimate_accepted",
        roleDefaults: defaults,
        preferences: { inApp: { estimates: true }, email: { estimates: true } },
        permitted: false,
      }),
    ).toEqual({ inApp: false, email: false });
  });

  test("a mandatory notice cannot be muted in-app; email stays opt-in", () => {
    expect(NOTIFICATION_KINDS.incident_reported.mandatory).toBe(true);
    expect(
      deliveryFor({
        role: "retail",
        kind: "incident_reported",
        roleDefaults: defaults,
        preferences: { inApp: { incidents: false }, email: {} },
        permitted: true,
      }),
    ).toEqual({ inApp: true, email: false });
  });

  test("email is off unless the person switched it on", () => {
    expect(
      deliveryFor({
        role: "owner",
        kind: "form_submitted",
        roleDefaults: defaults,
        preferences: NO_PREFERENCES,
        permitted: true,
      }).email,
    ).toBe(false);
  });
});

describe("the stored shapes", () => {
  test("the shipped defaults cover every real role", () => {
    expect(Object.keys(defaults.roles).sort()).toEqual([...STAFF_ROLES].sort());
    expect(notificationRoleDefaultsSchema.safeParse(defaults).success).toBe(
      true,
    );
  });

  test("an unknown category is refused", () => {
    expect(
      notificationPreferencesSchema.safeParse({
        inApp: { parties: true },
        email: {},
      }).success,
    ).toBe(true); // unknown keys are stripped, not stored
    expect(
      notificationPreferencesSchema.parse({
        inApp: { parties: true },
        email: {},
      }),
    ).toEqual({ inApp: {}, email: {} });
    expect(
      notificationRoleDefaultsSchema.safeParse({
        roles: { ...defaults.roles, owner: ["parties"] },
      }).success,
    ).toBe(false);
  });
});
