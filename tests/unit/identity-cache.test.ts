import { describe, expect, test } from "bun:test";

import {
  forgetIdentities,
  identityCache,
  registerIdentityCache,
} from "@/lib/auth/identity-cache";

// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// The identity chain answered "who is this" with four database reads on every
// server request — 73% of a day's API traffic. This cache is the fix, and its
// edges are the point: one page load's burst shares ONE read, an answer
// expires, a failure is never served again, an answer that is still arriving
// is not kept, and one write forgets everything.

function clock(start = 1_000) {
  let now = start;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

describe("remembering who someone is", () => {
  test("a burst of callers shares one read", async () => {
    const c = clock();
    const cache = identityCache<string>(10_000, 500, c.now);
    let reads = 0;
    const load = async () => {
      reads++;
      return "owner";
    };
    const answers = await Promise.all(
      Array.from({ length: 37 }, () => cache.get("u1|s1", load)),
    );
    expect(answers.every((a) => a === "owner")).toBe(true);
    expect(reads).toBe(1);
  });

  test("an answer expires, and a different key is a different answer", async () => {
    const c = clock();
    const cache = identityCache<string>(10_000, 500, c.now);
    let reads = 0;
    const load = async () => `read ${++reads}`;
    expect(await cache.get("u1|s1", load)).toBe("read 1");
    c.advance(9_999);
    expect(await cache.get("u1|s1", load)).toBe("read 1");
    c.advance(1);
    expect(await cache.get("u1|s1", load)).toBe("read 2");
    expect(await cache.get("u2|s9", load)).toBe("read 3");
  });

  test("a failure is not remembered", async () => {
    const cache = identityCache<string>(10_000);
    let reads = 0;
    const failing = async () => {
      reads++;
      throw new Error("timeout");
    };
    await expect(cache.get("u1|s1", failing)).rejects.toThrow("timeout");
    await Promise.resolve();
    await expect(cache.get("u1|s1", failing)).rejects.toThrow("timeout");
    expect(reads).toBe(2);
  });

  test("an answer that is still arriving is not kept", async () => {
    const cache = identityCache<{ profile: boolean }>(10_000);
    let reads = 0;
    const load = async () => ({ profile: ++reads > 1 });
    const keep = (v: { profile: boolean }) => v.profile;
    expect((await cache.get("u1|s1", load, keep)).profile).toBe(false);
    await Promise.resolve();
    expect((await cache.get("u1|s1", load, keep)).profile).toBe(true);
    expect((await cache.get("u1|s1", load, keep)).profile).toBe(true);
    expect(reads).toBe(2);
  });

  test("it holds a bounded number of people, dropping the oldest", async () => {
    const cache = identityCache<number>(10_000, 3);
    for (let i = 0; i < 5; i++) await cache.get(`u${i}`, async () => i);
    expect(cache.size).toBe(3);
  });

  test("one write forgets every registered cache", async () => {
    const a = registerIdentityCache(identityCache<number>(10_000));
    const b = registerIdentityCache(identityCache<number>(10_000));
    await a.get("x", async () => 1);
    await b.get("y", async () => 2);
    forgetIdentities();
    expect(a.size + b.size).toBe(0);
  });
});
