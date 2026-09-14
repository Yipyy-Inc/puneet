import { describe, expect, test } from "bun:test";

import { recoveryLines } from "@/lib/unfinished-bookings/recovery-status";

const at = "2026-09-14T15:00:00.000Z";

describe("recoveryLines", () => {
  test("before the tick decides, staff are told nothing has gone out yet", () => {
    expect(recoveryLines(undefined)).toEqual([{ key: "recoveryNotYet" }]);
  });

  test("a message sent says which channel and when", () => {
    expect(
      recoveryLines({
        outcome: "queued",
        resolvedAt: at,
        sends: [
          { channel: "email", status: "sent", sentAt: at },
          { channel: "sms", status: "queued" },
        ],
      }),
    ).toEqual([
      { key: "recoveryEmailSent", when: at },
      { key: "recoverySmsWaiting" },
    ]);
  });

  test("a message the outbox skipped names the reason in the catalogue's words", () => {
    expect(
      recoveryLines({
        outcome: "queued",
        resolvedAt: at,
        sends: [
          {
            channel: "email",
            status: "skipped",
            skipReason: "suppressed:unsubscribed",
          },
          { channel: "sms", status: "skipped", skipReason: "something new" },
        ],
      }),
    ).toEqual([
      { key: "recoveryEmailSkipped", reasonKey: "reasonUnsubscribed" },
      { key: "recoverySmsSkipped", reasonKey: "reasonOther" },
    ]);
  });

  test("nothing sent is explained from the tick's detail, never shown raw", () => {
    const skipped = (detail?: string) =>
      recoveryLines({ outcome: "skipped", detail, resolvedAt: at, sends: [] });
    expect(skipped("no email address on file")).toEqual([
      { key: "recoveryNoEmail" },
    ]);
    expect(
      skipped(
        "email: the template uses {{pet_name}}, which this booking has no value for",
      ),
    ).toEqual([{ key: "recoveryTemplate" }]);
    expect(skipped("an error nobody planned for")).toEqual([
      { key: "recoveryNotSent" },
    ]);
    expect(
      recoveryLines({
        outcome: "none",
        detail: "recovery is switched off for this step",
        resolvedAt: at,
        sends: [],
      }),
    ).toEqual([{ key: "recoveryOff" }]);
  });
});
