import { describe, expect, test } from "bun:test";

import { formatFileSize } from "@/lib/i18n/format";

// A file's size as §5t's file row shows it: Intl's own units in each
// language, steps of 1024 to match the upload limits, one decimal below ten.

describe("a file size", () => {
  test("in English", () => {
    expect(formatFileSize(10 * 1024 * 1024, "en")).toBe("10 MB");
    expect(formatFileSize(1.1 * 1024 * 1024, "en")).toBe("1.1 MB");
    expect(formatFileSize(240 * 1024, "en")).toBe("240 kB");
  });

  test("in French, with the space held", () => {
    expect(formatFileSize(10 * 1024 * 1024, "fr")).toMatch(/^10\s?Mo$/u);
    expect(formatFileSize(1.1 * 1024 * 1024, "fr")).toMatch(/^1,1\s?Mo$/u);
  });

  test("nothing, or nonsense, is zero", () => {
    expect(formatFileSize(Number.NaN, "en")).toMatch(/^0\s?byte/u);
    expect(formatFileSize(-5, "en")).toMatch(/^0\s?byte/u);
  });
});
