import { expect, test } from "@playwright/test";

// ============================================================================
// The survey link is the only unauthenticated write surface in this product.
//
// ── WHY THIS IS IN THE GATE ───────────────────────────────────────────────
//
// `/api/review/<token>` accepts a POST from anybody on the internet and writes
// a row attributed to a named customer, at a named facility, about a named
// member of staff. Everything that stops it being a graffiti endpoint is the
// token: 32 bytes from the OS CSPRNG, stored only as sha256, checked inside a
// SECURITY DEFINER function against a unique index.
//
// The build this replaces used the request's own id as its "token", and the
// ids were sequential — `rr-001`, `rr-002`. Anybody could have answered
// anybody's survey by counting. That is the regression this spec exists to
// make impossible to reintroduce quietly.
//
// ── EVERY FAILURE MUST LOOK THE SAME ──────────────────────────────────────
//
// Expired, already answered, suppressed, cancelled, never existed. If any of
// them answered differently, a caller working through tokens would learn which
// guesses were close — and "this link has expired" tells them a real request
// existed, which is most of the way to knowing a customer visited.
//
// So the assertions are on the SHAPE of the refusal as much as the status.
//
// ── IT DOES NOT SIGN IN, AND THAT IS THE POINT ────────────────────────────
//
// A customer opening this from an SMS has no account. Every other refusal spec
// in this suite drives a session; this one deliberately does not, because the
// whole surface is defined by what a stranger may do.
//
// It also writes nothing and needs no cleanup: every request it makes is
// refused, which is the assertion.
// ============================================================================

/** Well-formed but invented. 43 base64url characters, like a real one. */
const INVENTED = "Zm9vYmFyYmF6cXV4Y29ycmVnZXNwZWN0YWJseTEyMzQ1";
const ALSO_INVENTED = "cXV1eGNvcmdlZ3JhdWx0Z2FycGx5emZvb2JhcjEyMzQ1";
const SHORT = "abc";

test.describe("the review survey token", () => {
  test("an invented token is refused, and says nothing about why", async ({
    request,
  }) => {
    const response = await request.get(`/api/review/${INVENTED}`, {
      failOnStatusCode: false,
    });
    expect(response.status()).toBe(404);

    const body = (await response.text()).toLowerCase();
    // Not "expired", not "already used", not "no such facility" — each of those
    // would confirm something about a request that may or may not exist.
    expect(body).not.toContain("expired");
    expect(body).not.toContain("already");
    expect(body).not.toContain("facility");
  });

  test("two different invented tokens are refused identically", async ({
    request,
  }) => {
    const [first, second] = await Promise.all([
      request.get(`/api/review/${INVENTED}`, { failOnStatusCode: false }),
      request.get(`/api/review/${ALSO_INVENTED}`, { failOnStatusCode: false }),
    ]);

    expect(first.status()).toBe(second.status());
    expect(await first.text()).toBe(await second.text());
  });

  test("a token too short to be one is refused the same way", async ({
    request,
  }) => {
    // The RPC returns before touching the index below 16 characters. The
    // ANSWER still has to be indistinguishable, or the length check itself
    // becomes an oracle.
    const short = await request.get(`/api/review/${SHORT}`, {
      failOnStatusCode: false,
    });
    const invented = await request.get(`/api/review/${INVENTED}`, {
      failOnStatusCode: false,
    });

    expect(short.status()).toBe(404);
    expect(await short.text()).toBe(await invented.text());
  });

  test("a stranger cannot record a review against an invented token", async ({
    request,
  }) => {
    const response = await request.post(`/api/review/${INVENTED}`, {
      data: { rating: 5, comment: "Wrote this myself" },
      failOnStatusCode: false,
    });

    // 404, not 500 and certainly not 200. A 200 here would mean a public
    // endpoint that writes a five-star review for any facility on demand.
    expect(response.status()).toBe(404);
  });

  test("a malformed answer is refused before the token is even considered", async ({
    request,
  }) => {
    const response = await request.post(`/api/review/${INVENTED}`, {
      data: { rating: 9000 },
      failOnStatusCode: false,
    });

    // 422 from the schema. Worth asserting because it proves the route
    // validates rather than passing whatever arrives to Postgres and hoping the
    // CHECK catches it.
    expect(response.status()).toBe(422);
  });

  test("the click redirect never becomes an open redirect", async ({
    request,
  }) => {
    // The destination is resolved from a CHANNEL ID inside the function, never
    // taken from the caller. If a URL parameter were ever honoured, this would
    // be a phishing endpoint on the facility's own domain, sent by SMS, in
    // their name — and the entire value of the link is that customers trust it.
    const response = await request.get(
      `/api/review/${INVENTED}/click?channel=https://example.invalid/evil`,
      { failOnStatusCode: false, maxRedirects: 0 },
    );

    const location = response.headers()["location"] ?? "";
    expect(location).not.toContain("example.invalid");
    expect(location).not.toContain("evil");
  });

  test("a well-formed but foreign channel id resolves nowhere", async ({
    request,
  }) => {
    const response = await request.get(
      `/api/review/${INVENTED}/click?channel=11111111-1111-4111-8111-111111111111`,
      { failOnStatusCode: false, maxRedirects: 0 },
    );

    // Back to the survey, which is the dead end. Never onward to a platform,
    // because the token names no request and the channel belongs to nobody.
    expect([302, 307]).toContain(response.status());
    expect(response.headers()["location"] ?? "").toContain("/review/");
  });
});
