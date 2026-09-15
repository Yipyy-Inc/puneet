import { describe, expect, test } from "bun:test";

import { LiveWriteError } from "@/lib/api/live-fetch";
import {
  settleFormOverride,
  withFormOverride,
} from "@/lib/forms/override-prompt";
import {
  FORM_OVERRIDE_REASON_REQUIRED,
  FORM_REQUIRED,
} from "@/lib/forms/requirements";

const askedWhy = () =>
  new LiveWriteError("Say why this goes ahead without Intake.", 422, {
    code: FORM_OVERRIDE_REASON_REQUIRED,
    missing: [
      {
        form_id: "f1",
        form_name: "Intake",
        form_slug: "intake",
        pet_id: null,
        pet_name: null,
        enforcement: "block",
      },
    ],
  });

/** Answer the dialog on the next tick, as a person would. */
function answer(reason: string | null) {
  setTimeout(() => settleFormOverride(reason), 0);
}

describe("withFormOverride", () => {
  test("a write that goes through is sent once, with no reason", async () => {
    const sent: (string | undefined)[] = [];
    const result = await withFormOverride(async (reason) => {
      sent.push(reason);
      return "ok";
    });
    expect(result).toBe("ok");
    expect(sent).toEqual([undefined]);
  });

  test("asked why, the write is sent again with the reason staff give", async () => {
    const sent: (string | undefined)[] = [];
    answer("Owner vouched at the door");
    const result = await withFormOverride(async (reason) => {
      sent.push(reason);
      if (!reason) throw askedWhy();
      return "checked in";
    });
    expect(result).toBe("checked in");
    expect(sent).toEqual([undefined, "Owner vouched at the door"]);
  });

  test("going back rethrows the server's refusal and sends nothing more", async () => {
    let calls = 0;
    answer(null);
    const outcome = withFormOverride(async () => {
      calls += 1;
      throw askedWhy();
    });
    await expect(outcome).rejects.toThrow(
      "Say why this goes ahead without Intake.",
    );
    expect(calls).toBe(1);
  });

  test("any other refusal is not a question, and is thrown at once", async () => {
    let calls = 0;
    const outcome = withFormOverride(async () => {
      calls += 1;
      throw new LiveWriteError("Complete Intake before booking.", 422, {
        code: FORM_REQUIRED,
      });
    });
    await expect(outcome).rejects.toThrow("Complete Intake before booking.");
    expect(calls).toBe(1);
  });
});
