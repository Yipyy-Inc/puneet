import { describe, expect, test } from "bun:test";

import { staffNoticeWanted } from "@/lib/forms/notice-rules";
import {
  DEFAULT_FORM_NOTIFICATIONS,
  type FormNotifications,
} from "@/lib/settings/form-settings";

function withStaff(staff: FormNotifications["staff"]): FormNotifications {
  return { ...DEFAULT_FORM_NOTIFICATIONS, staff };
}

const quiet = withStaff({
  newSubmission: false,
  redFlagAnswers: false,
  hasFileUpload: false,
});

describe("staffNoticeWanted", () => {
  test("every submission, when the facility asks for each one", () => {
    expect(
      staffNoticeWanted(DEFAULT_FORM_NOTIFICATIONS, {
        flagged: false,
        hasFiles: false,
      }),
    ).toBe(true);
  });

  test("nothing, when every switch is off, whatever the submission", () => {
    expect(staffNoticeWanted(quiet, { flagged: true, hasFiles: true })).toBe(
      false,
    );
  });

  test("only flagged ones, when only flagged answers are asked for", () => {
    const flaggedOnly = withStaff({
      newSubmission: false,
      redFlagAnswers: true,
      hasFileUpload: false,
    });
    expect(
      staffNoticeWanted(flaggedOnly, { flagged: true, hasFiles: false }),
    ).toBe(true);
    expect(
      staffNoticeWanted(flaggedOnly, { flagged: false, hasFiles: true }),
    ).toBe(false);
  });

  test("only ones with a file, when only uploads are asked for", () => {
    const filesOnly = withStaff({
      newSubmission: false,
      redFlagAnswers: false,
      hasFileUpload: true,
    });
    expect(
      staffNoticeWanted(filesOnly, { flagged: false, hasFiles: true }),
    ).toBe(true);
    expect(
      staffNoticeWanted(filesOnly, { flagged: true, hasFiles: false }),
    ).toBe(false);
  });
});
