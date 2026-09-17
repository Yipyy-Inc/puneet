import { describe, expect, test } from "bun:test";

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  giftCardPageSearch,
  likePattern,
  parseGiftCardPageParams,
} from "@/lib/api/gift-card-page-params";

// ============================================================================
// What a screen may ask for, and what the route agrees to apply.
//
// Worth isolating for the same reason booking-page-params is: both sides read
// this, so a disagreement between them is a filter that silently does nothing.
// And one case here is a security question rather than a correctness one — see
// the wildcard tests.
// ============================================================================

const parse = (qs: string) => parseGiftCardPageParams(new URLSearchParams(qs));

describe("likePattern", () => {
  test("matches the term anywhere", () => {
    expect(likePattern("abc")).toBe("%abc%");
  });

  test("neuters the wildcards in the term", () => {
    // THE POINT. `%` and `_` are ilike wildcards, so passing them through lets
    // somebody match a code they do not know one character at a time — and a
    // gift card code is a bearer instrument.
    expect(likePattern("a%b")).toBe("%a\\%b%");
    expect(likePattern("a_b")).toBe("%a\\_b%");
  });

  test("escapes the backslash FIRST, or it escapes the escapes", () => {
    // `\%` typed by a caller must stay a literal backslash then a literal
    // percent — not become an escape for a wildcard we just added.
    expect(likePattern("a\\%b")).toBe("%a\\\\\\%b%");
  });

  test("trims, so a stray space is not part of the search", () => {
    expect(likePattern("  abc  ")).toBe("%abc%");
  });
});

describe("parseGiftCardPageParams", () => {
  test("empty is page 1 at the default size, newest first", () => {
    expect(parse("")).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      q: undefined,
      status: undefined,
      kind: undefined,
      sort: undefined,
      dir: "desc",
    });
  });

  test("a status the enum does not have is dropped, not passed on", () => {
    // Dropped rather than echoed: an unknown enum label is a database error,
    // and a typo in a screen must read as "no such cards", never as a 500.
    expect(parse("status=melted").status).toBeUndefined();
    expect(parse("status=cancelled").status).toBe("cancelled");
  });

  test("a sort the server does not offer is dropped", () => {
    expect(parse("sort=recipientEmail").sort).toBeUndefined();
    expect(parse("sort=balance").sort).toBe("balance");
  });

  test("pageSize is capped", () => {
    expect(parse(`pageSize=${MAX_PAGE_SIZE * 10}`).pageSize).toBe(
      MAX_PAGE_SIZE,
    );
    expect(parse("pageSize=0").pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(parse("pageSize=abc").pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  test("page 0 and nonsense both mean page 1", () => {
    expect(parse("page=0").page).toBe(1);
    expect(parse("page=-3").page).toBe(1);
    expect(parse("page=").page).toBe(1);
    expect(parse("page=4").page).toBe(4);
  });

  test("a blank search is no search, not a search for nothing", () => {
    expect(parse("q=%20%20").q).toBeUndefined();
    expect(parse("q=ABC").q).toBe("ABC");
  });

  test("dir is asc only when asked for it exactly", () => {
    expect(parse("dir=asc").dir).toBe("asc");
    expect(parse("dir=ASC").dir).toBe("desc");
    expect(parse("dir=sideways").dir).toBe("desc");
  });
});

describe("giftCardPageSearch", () => {
  test("nothing to say is an empty string, not a bare ?", () => {
    expect(giftCardPageSearch()).toBe("");
    expect(giftCardPageSearch({ page: 1 })).toBe("");
  });

  test("round-trips through the parser", () => {
    const qs = giftCardPageSearch({
      page: 3,
      pageSize: 25,
      q: "ada",
      status: "active",
      kind: "physical",
      sort: "balance",
      dir: "asc",
    });
    const back = parse(qs.slice(1));
    expect(back.page).toBe(3);
    expect(back.pageSize).toBe(25);
    expect(back.q).toBe("ada");
    expect(back.status).toBe("active");
    expect(back.kind).toBe("physical");
    expect(back.sort).toBe("balance");
    expect(back.dir).toBe("asc");
  });

  test("drops what the route would drop anyway", () => {
    // The two sides agreeing is the whole point of sharing this module: a
    // screen that sent a filter the route ignores would show the user a
    // narrowing that never happened.
    const qs = giftCardPageSearch({ status: "melted", kind: "wooden" });
    expect(qs).toBe("");
  });

  test("a sort always carries a direction", () => {
    // Otherwise the server picks its default and the header arrow disagrees
    // with the rows underneath it.
    expect(giftCardPageSearch({ sort: "code" })).toContain("dir=desc");
  });
});
