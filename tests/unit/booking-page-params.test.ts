import { describe, expect, test } from "bun:test";

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  bookingPageSearch,
  likePattern,
  normalizeBookingPageParams,
} from "@/lib/api/booking-page-params";

const read = (search: string) =>
  normalizeBookingPageParams(
    Object.fromEntries(new URLSearchParams(search).entries()),
  );

describe("normalizeBookingPageParams", () => {
  test("nothing asked is the first page, newest first", () => {
    const p = read("");
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(p.view).toBe("all");
    expect(p.dir).toBe("desc");
    expect(p.sort).toBeUndefined();
  });

  test("anything malformed is dropped rather than guessed", () => {
    const p = read(
      "page=-2&pageSize=99999&status=done&service=Day Care&tagId=abc&from=14/09/2026&locationId=x&sort=client&dir=up&assigned=yes",
    );
    expect(p.page).toBe(1);
    expect(p.pageSize).toBe(MAX_PAGE_SIZE);
    expect(p.status).toBeUndefined();
    expect(p.service).toBeUndefined();
    expect(p.tagId).toBeUndefined();
    expect(p.from).toBeUndefined();
    expect(p.locationId).toBeUndefined();
    expect(p.sort).toBeUndefined();
    expect(p.dir).toBe("desc");
    expect(p.assigned).toBeUndefined();
    // An inherited name is not a sort the server offers.
    expect(read("sort=toString").sort).toBeUndefined();
    expect(read("sort=constructor").sort).toBeUndefined();
  });

  test("what the page sends is what the route reads", () => {
    const sent = {
      page: 3,
      pageSize: 15,
      q: "Johnson",
      status: "confirmed",
      service: "daycare",
      paymentStatus: "paid",
      view: "today" as const,
      from: "2026-09-01",
      to: "2026-09-30",
      locationId: "a0000000-0000-4000-8000-0000000000c1",
      assigned: true,
      sort: "totalCost" as const,
      dir: "asc" as const,
    };
    expect(read(bookingPageSearch(sent))).toEqual({
      ...sent,
      tagId: undefined,
    });
  });
});

test("a search term cannot widen the ilike pattern", () => {
  expect(likePattern("50%_off, (vip)")).toBe("%50\\%\\_off\\, \\(vip\\)%");
});
