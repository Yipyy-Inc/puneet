import { describe, expect, test } from "bun:test";

import { middleTruncate, uploadedFileName } from "@/lib/files/file-name";

// §5t: a file name is shortened in the middle, because the end — the version,
// the date, the extension — is the part that tells two files apart.

describe("a file name shortened in the middle", () => {
  test("a name that fits is left alone", () => {
    expect(middleTruncate("kofi.jpg", 32)).toBe("kofi.jpg");
  });

  test("the start, the end and the extension survive", () => {
    const short = middleTruncate(
      "vaccination-record-kofi-2026-09-FINAL.pdf",
      24,
    );
    expect(short.length).toBeLessThanOrEqual(24);
    expect(short.startsWith("vaccina")).toBe(true);
    expect(short.endsWith("FINAL.pdf")).toBe(true);
    expect(short).toContain("…");
  });

  test("a name with no extension is cut in the middle too", () => {
    const short = middleTruncate("a-very-long-name-without-any-extension", 16);
    expect(short.length).toBeLessThanOrEqual(16);
    expect(short).toContain("…");
    expect(short.endsWith("extension")).toBe(false);
    expect(short.endsWith("sion")).toBe(true);
  });

  test("a leading dot is a name, not an extension", () => {
    expect(middleTruncate(".a-hidden-file-with-a-long-name", 12)).toContain(
      "…",
    );
    expect(middleTruncate(".a-hidden-file-with-a-long-name", 12).length).toBe(
      12,
    );
  });
});

describe("the name a file was uploaded with", () => {
  test("comes back without its folders or the uuid in front of it", () => {
    expect(
      uploadedFileName(
        "f0e1d2c3-b4a5-4697-8899-aabbccddeeff/0a1b2c3d-4e5f-4061-8273-8495a6b7c8d9/3f2504e0-4f89-41d3-9a0c-0305e82c3301-labelled bags.jpg",
      ),
    ).toBe("labelled bags.jpg");
  });

  test("a name that only starts like a uuid is left alone", () => {
    expect(uploadedFileName("facility/form/2026-09-13-bags.jpg")).toBe(
      "2026-09-13-bags.jpg",
    );
  });

  test("a bare name is its own name", () => {
    expect(uploadedFileName("bags.jpg")).toBe("bags.jpg");
  });
});
