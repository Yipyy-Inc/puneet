import { describe, expect, test } from "bun:test";

import { LiveWriteError } from "@/lib/api/live-fetch";
import {
  FORM_OVERRIDE_REASON_REQUIRED,
  FORM_REQUIRED,
  formRefusalOf,
  type MissingForm,
} from "@/lib/forms/requirements";

const intake: MissingForm = {
  form_id: "f1",
  form_name: "Intake",
  form_slug: "intake",
  pet_id: null,
  pet_name: null,
  enforcement: "block",
};

describe("formRefusalOf", () => {
  test("a customer's refusal carries the forms to complete", () => {
    const error = new LiveWriteError("Complete Intake before booking.", 422, {
      error: "Complete Intake before booking.",
      code: FORM_REQUIRED,
      missing: [intake],
    });
    expect(formRefusalOf(error)).toEqual({
      code: FORM_REQUIRED,
      message: "Complete Intake before booking.",
      missing: [intake],
    });
  });

  test("staff are asked for a reason", () => {
    const error = new LiveWriteError("Say why.", 422, {
      code: FORM_OVERRIDE_REASON_REQUIRED,
      missing: [intake],
    });
    expect(formRefusalOf(error)?.code).toBe(FORM_OVERRIDE_REASON_REQUIRED);
  });

  test("any other refusal is not a form refusal", () => {
    expect(
      formRefusalOf(new LiveWriteError("Room taken", 409, { error: "x" })),
    ).toBeNull();
    expect(formRefusalOf(new Error("plain"))).toBeNull();
    expect(formRefusalOf(null)).toBeNull();
  });

  test("a malformed missing list is dropped, not trusted", () => {
    const error = new LiveWriteError("Complete it.", 422, {
      code: FORM_REQUIRED,
      missing: [{ form_name: "no id" }, intake, "junk"],
    });
    expect(formRefusalOf(error)?.missing).toEqual([intake]);
  });
});
