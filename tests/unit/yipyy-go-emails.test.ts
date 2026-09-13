import { describe, expect, test } from "bun:test";

import {
  buildOwnerConfirmationEmail,
  buildStaffSubmissionEmail,
  fillConfirmationTokens,
} from "@/lib/yipyy-go/emails";

// The emails a pre-arrival form sends. The facility writes the owner's
// message; a pet name is typed by the owner. Neither may become markup, and a
// token the facility used must never reach an inbox unfilled.

describe("the owner's confirmation", () => {
  test("fills {petName} and {date} everywhere they appear, subject included", () => {
    expect(
      fillConfirmationTokens("See {petName} on {date}. {petName}!", {
        petName: "Kofi",
        date: "Tue, Sep 15, 2026",
      }),
    ).toBe("See Kofi on Tue, Sep 15, 2026. Kofi!");

    const email = buildOwnerConfirmationEmail({
      subject: "Thanks for {petName}'s form",
      message: "We're excited to meet {petName} on {date}!",
      petName: "Kofi",
      dateLabel: "Tue, Sep 15, 2026",
      facilityName: "Paws & Co",
      bookingUrl: "https://paws.yipyy.com/customer/bookings/1204",
      origin: "https://paws.yipyy.com",
      locale: "en",
    });
    expect(email.subject).toBe("Thanks for Kofi's form");
    expect(email.text).toContain(
      "We're excited to meet Kofi on Tue, Sep 15, 2026!",
    );
    expect(email.text).not.toContain("{petName}");
    expect(email.html).toContain(
      "https://paws.yipyy.com/customer/bookings/1204",
    );
  });

  test("a name that looks like markup arrives as text", () => {
    const email = buildOwnerConfirmationEmail({
      subject: "Hello",
      message: "See {petName} soon",
      petName: '<img src=x onerror="alert(1)">',
      dateLabel: "Tue",
      facilityName: "Paws & Co",
      bookingUrl: "https://paws.yipyy.com/customer/bookings/1",
      origin: "https://paws.yipyy.com",
      locale: "en",
    });
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img");
  });

  test("the frame follows the owner's language; the facility's words stay theirs", () => {
    const email = buildOwnerConfirmationEmail({
      subject: "",
      message: "Merci pour {petName}",
      petName: "Kofi",
      dateLabel: "mar. 15 sept. 2026",
      facilityName: "Paws & Co",
      bookingUrl: "https://paws.yipyy.com/customer/bookings/1",
      origin: "https://paws.yipyy.com",
      locale: "fr",
    });
    expect(email.subject).toBe("Votre formulaire préalable est bien reçu");
    expect(email.text).toContain("Voir votre réservation");
    expect(email.text).toContain("Merci pour Kofi");
  });
});

describe("the facility's notice", () => {
  test("names the dog, the client and the arrival, with a link to review", () => {
    const email = buildStaffSubmissionEmail({
      facilityName: "Paws & Co",
      clientName: "Ana Roy",
      petName: "Kofi",
      serviceLabel: "daycare",
      arrivalLabel: "Tue, Sep 15, 2026",
      bookingUrl:
        "https://paws.app.yipyy.com/facility/dashboard/bookings/1204#yipyy-go",
      origin: "https://paws.app.yipyy.com",
    });
    expect(email.subject).toBe("Kofi's pre-arrival form is in");
    expect(email.text).toContain("Ana Roy sent Kofi's pre-arrival form");
    expect(email.text).toContain("Tue, Sep 15, 2026");
    expect(email.html).toContain("/facility/dashboard/bookings/1204#yipyy-go");
    expect(email.text.trim().length).toBeGreaterThan(0);
  });
});
