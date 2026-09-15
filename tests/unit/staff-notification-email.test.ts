import { describe, expect, test } from "bun:test";

import {
  NOTIFICATION_KINDS,
  type NotificationKind,
} from "@/lib/notifications/catalog";
import { staffNotificationEmail } from "@/lib/notifications/staff-email";

// Every kind a notification can be has words, and a missing value never
// reaches a member of staff as "undefined".

describe("staffNotificationEmail", () => {
  test("names the facility and the thing, and links to it", () => {
    const email = staffNotificationEmail({
      kind: "booking_request",
      params: {
        client: "Alex Martin",
        service: "Boarding",
        date: "2026-10-01",
      },
      facilityName: "Paws & Co",
      url: "https://paws.app.yipyy.com/facility/dashboard/bookings/42",
    });
    expect(email.subject).toBe("Paws & Co: Booking request from Alex Martin");
    expect(email.text).toContain(
      "Alex Martin asked to book Boarding on 2026-10-01",
    );
    expect(email.text).toContain(
      "Open it: https://paws.app.yipyy.com/facility/dashboard/bookings/42",
    );
  });

  test("every kind reads without its values, and never says undefined", () => {
    for (const kind of Object.keys(NOTIFICATION_KINDS) as NotificationKind[]) {
      const email = staffNotificationEmail({
        kind,
        params: {},
        facilityName: "Paws & Co",
        url: null,
      });
      expect(email.subject.length).toBeGreaterThan(10);
      expect(`${email.subject} ${email.text}`).not.toContain("undefined");
      expect(email.text).not.toContain("Open it:");
    }
  });
});
