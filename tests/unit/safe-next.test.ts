import { describe, expect, test } from "bun:test";

import { nextQuery, safeNextPath } from "@/lib/auth/safe-next";

// A sign-in page that redirects to whatever `?next=` says is an open redirect.
// These pin that only a path on this site passes.

describe("safeNextPath", () => {
  test("a path on this site passes, with its query", () => {
    expect(safeNextPath("/customer/estimates/abc")).toBe(
      "/customer/estimates/abc",
    );
    expect(safeNextPath("/join?next=%2Fcustomer%2Festimates")).toBe(
      "/join?next=%2Fcustomer%2Festimates",
    );
  });

  test("another site does not", () => {
    for (const raw of [
      "https://evil.example/customer",
      "//evil.example",
      "/\\evil.example",
      "/customer\\..\\evil",
      "javascript:alert(1)",
      "customer/estimates",
      " //evil.example",
      "/customer\n/evil",
    ]) {
      expect(safeNextPath(raw)).toBeNull();
    }
  });

  test("the auth screens do not, so a next cannot loop back to them", () => {
    expect(safeNextPath("/sign-in")).toBeNull();
    expect(safeNextPath("/sign-in?next=/x")).toBeNull();
    expect(safeNextPath("/sign-up")).toBeNull();
    expect(safeNextPath("/auth/callback?code=1")).toBeNull();
    expect(safeNextPath("/passkey-setup")).toBeNull();
    // A path that merely starts with the same letters is not an auth screen.
    expect(safeNextPath("/sign-inside")).toBe("/sign-inside");
  });

  test("nothing, or too long, is nothing", () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(`/${"a".repeat(600)}`)).toBeNull();
  });

  test("nextQuery encodes a safe path and drops an unsafe one", () => {
    expect(nextQuery("/customer/estimates/abc")).toBe(
      "?next=%2Fcustomer%2Festimates%2Fabc",
    );
    expect(nextQuery("//evil.example")).toBe("");
  });
});
