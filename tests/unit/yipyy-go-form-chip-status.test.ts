import { describe, expect, test } from "bun:test";

import { formChipStatusOf } from "@/lib/yipyy-go/form-chip-status";

// One status for the §3 form chip, from a pet's submission and whether the
// facility asks for the form. The first version called an optional form nobody
// had sent "no form needed", in two places, while booking_yipyy_go called it
// not started.

describe("a pet's pre-arrival form, as a chip", () => {
  test("is not needed only where no form is asked", () => {
    expect(formChipStatusOf(null, null)).toBe("not_required");
  });

  test("is not started where a form is asked and none was sent, optional or not", () => {
    expect(formChipStatusOf(null, false)).toBe("not_started");
    expect(formChipStatusOf(null, true)).toBe("not_started");
  });

  test("is started while the owner has a draft", () => {
    expect(formChipStatusOf({ status: "draft" }, true)).toBe("in_progress");
  });

  test("reads what was sent, even where no form is asked any more", () => {
    for (const status of [
      "submitted",
      "changes_requested",
      "approved",
      "completed_by_staff",
    ] as const) {
      expect(formChipStatusOf({ status }, null)).toBe(status);
      expect(formChipStatusOf({ status }, true)).toBe(status);
    }
  });
});
