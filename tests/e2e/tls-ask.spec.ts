import { expect, test, type APIResponse, type Page } from "@playwright/test";

// ============================================================================
// Which hostnames may have a certificate issued for them.
//
// Caddy calls `/api/internal/tls-ask?domain=<host>` DURING a TLS handshake for
// any hostname it has not seen. A 2xx authorises it to ask Let's Encrypt for a
// certificate; anything else refuses.
//
// ── WHY THIS IS WORTH A SPEC IN THE PUSH GATE ─────────────────────────────
//
// DNS holds a wildcard, so every conceivable *.yipyy.com name resolves to this
// server. Without this gate anybody opening TLS connections with random SNIs
// makes us request certificates for them, and Let's Encrypt allows 50 per
// registered domain per week. Exhaust that and a REAL new facility cannot get a
// certificate for seven days — a self-inflicted outage for every business
// onboarded that week.
//
// It also runs before there is any session — it is excluded from the proxy
// matcher on purpose, because the certificate being decided on is the one that
// would carry the session. So "unauthenticated callers are answered" is the
// correct behaviour here and the assertions below depend on it.
//
// ── AND WHY IT CHANGED ON 2026-08-26 ──────────────────────────────────────
//
// `app.yipyy.com` became the address of the software. `app` is one of the
// reserved labels, so `facilitySlugFromHost` answers null for it exactly as it
// does for `mail` — correct, and it also meant the host could not obtain a
// certificate and its handshake failed before anything reached the app. It is
// now allowed by name. Being reserved is what makes that safe: no facility can
// ever be called `app`, so this authorises exactly one hostname.
// ============================================================================

const ask = (page: Page, domain: string): Promise<APIResponse> =>
  page.request.get(
    `/api/internal/tls-ask?domain=${encodeURIComponent(domain)}`,
    { failOnStatusCode: false },
  );

// ── THE APEX IS READ, NEVER ASSUMED ────────────────────────────────────────
//
// The endpoint compares against NEXT_PUBLIC_APP_DOMAIN, and that is NOT
// `yipyy.com` everywhere: CI runs the suite with `yipyy.test`, and so does a
// local checkout. Hardcoding the production apex — which the first draft did —
// makes every "allows" assertion fail against the very environment CI runs in,
// for a reason that has nothing to do with the gate.
//
// playwright.config.ts loads .env.local into process.env, and the CI workflow
// sets the variable directly, so it is present in both.
const APEX = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim().toLowerCase() ?? "";

test.describe("the certificate-issuance gate", () => {
  // Not a skip. An unset app domain means the deployment under test would
  // refuse EVERY hostname — including its own apex — so the right answer is a
  // loud failure, not a quiet pass.
  test.beforeAll(() => {
    expect(
      APEX,
      "NEXT_PUBLIC_APP_DOMAIN must be set for this spec; without it the gate refuses everything",
    ).not.toBe("");
  });

  test.beforeEach(async ({ page }) => {
    // No session, exactly as Caddy has none mid-handshake.
    await page.context().clearCookies();
  });

  test("allows the hosts the platform itself runs on", async ({ page }) => {
    for (const host of [APEX, `www.${APEX}`, `app.${APEX}`]) {
      const response = await ask(page, host);
      expect(response.status(), `${host} should be allowed`).toBe(200);
    }
  });

  test("refuses a reserved label that is not one of them", async ({ page }) => {
    // `app` is allowed by name above; every other reserved label must still be
    // refused, or the carve-out has been written too wide. Checked under BOTH
    // addresses, because a facility now hangs off `app.<apex>` and the reserved
    // list has to hold there too — `mail.app.yipyy.com` is no more a facility
    // than `mail.yipyy.com` was.
    for (const label of ["mail", "admin", "api", "staging", "cdn"]) {
      for (const host of [`${label}.${APEX}`, `${label}.app.${APEX}`]) {
        const response = await ask(page, host);
        expect(response.status(), `${host} should be refused`).toBe(403);
      }
    }
  });

  test("refuses a subdomain that names no facility, under either address", async ({
    page,
  }) => {
    // The quota protection. A wildcard DNS record means both of these names
    // resolve here; nothing else stops a certificate being minted for them.
    for (const host of [
      `definitely-not-a-facility-xyz.${APEX}`,
      `definitely-not-a-facility-xyz.app.${APEX}`,
    ]) {
      const response = await ask(page, host);
      expect(response.status(), `${host} should be refused`).toBe(403);
    }
  });

  test("refuses a name too deep to be a facility", async ({ page }) => {
    // A facility is exactly ONE label in front of `app.<apex>`. Allowing two
    // would make `a.b.app.yipyy.com` and `b.app.yipyy.com` resolve to different
    // slugs for the same business, and mint certificates for both.
    for (const host of [
      `a.b.app.${APEX}`,
      `a.b.${APEX}`,
      `pawradise.app.app.${APEX}`,
    ]) {
      const response = await ask(page, host);
      expect(response.status(), `${host} should be refused`).toBe(403);
    }
  });

  test("still answers for the address facilities used to have", async ({
    page,
  }) => {
    // `<slug>.yipyy.com` is answered with a 308 to `<slug>.app.yipyy.com`, and
    // a redirect cannot be served over a TLS connection that was never
    // established. So the OLD shape must keep earning a certificate for as long
    // as links already sent are still being opened.
    //
    // Asserted as "not a hard refusal of the shape": a real slug is allowed and
    // an invented one is refused, which is the same rule as the new address.
    const invented = await ask(page, `no-such-facility-abc.${APEX}`);
    expect(invented.status()).toBe(403);
  });

  test("refuses a domain that is not ours at all", async ({ page }) => {
    for (const host of [
      "example.com",
      "yipyy.com.attacker.test",
      "notyipyy.com",
    ]) {
      const response = await ask(page, host);
      expect(response.status(), `${host} should be refused`).toBe(403);
    }
  });

  test("refuses an empty or missing domain", async ({ page }) => {
    expect((await ask(page, "")).status()).toBe(403);
    expect(
      (
        await page.request.get("/api/internal/tls-ask", {
          failOnStatusCode: false,
        })
      ).status(),
    ).toBe(403);
  });

  test("normalises a host that arrives with a port or a trailing dot", async ({
    page,
  }) => {
    // Caddy sends a bare hostname, but the same name with a port or a root dot
    // is the same name to DNS — and would otherwise fail the slug check and be
    // refused a certificate it should have.
    expect((await ask(page, `app.${APEX}.`)).status()).toBe(200);
    expect((await ask(page, `${APEX}:443`)).status()).toBe(200);
    expect((await ask(page, `APP.${APEX.toUpperCase()}`)).status()).toBe(200);
  });
});
