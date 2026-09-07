import { test, expect } from "@playwright/test";
import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A converted settings section, read in French.
//
// ── WHY THIS EXISTS ALONGSIDE `check:ui-french` ───────────────────────────
//
// The gate is static, and on 2026-09-07 it certified six sections and five
// whole surfaces as finished while they rendered English. Three separate
// blind spots did it: a text node next to an interpolation, a paragraph over
// the extractor's length cap, and — the one no regex will ever close — copy
// living in a `src/data` fixture. All three were found by LOADING THE PAGE IN
// FRENCH AND READING IT.
//
// So this is the other half of the measurement: the gate proves a surface has
// not gone backwards in the SOURCE, and this proves what actually reaches the
// SCREEN. Neither is sufficient alone, and the gate's own header has said so
// since it was written.
//
// ── THE FIRST ASSERTION IS THE LOAD-BEARING ONE ───────────────────────────
//
// An earlier version of this spec set a cookie named `app-language-settings`,
// which this app does not read — the locale lives in `APP_LANG_PRIMARY`. It
// passed, cheerfully, against a page rendering English, because every other
// assertion here is about the ABSENCE of something. A spec that checks only
// for absences cannot tell "clean" from "not looking".
// ============================================================================

/**
 * Words that only appear on a French render. Any one of them is enough — the
 * point is to tell French from English, not to grade the translation.
 */
const FRENCH =
  /\b(?:param[eè]tres|enregistrer|r[eé]servations|[eé]tablissement|configuration|modifications)\b/i;

/** Sections whose baseline entry has been removed — they must be finished. */
const CONVERTED = [
  "yipyy-pay",
  "retail",
  "employment-types",
  "termination-reasons",
  "notifications",
  "form-requirements",
  "business",
  "hours",
  "language",
  "branding",
  "payroll-rules",
  "deposit-rules",
  "taxes",
  "mobile-app",
  "pet-breeds",
  "hr-config",
  "my-profile",
  "offboarding-templates",
  "my-notifications",
  "booking-rules",
  "form-notifications",
  "checkin-requirements",
  "onboarding-templates",
  "care-tasks",
  "tags-notes",
  "invoice-template",
  "tips",
  "booking-statuses",
  "estimate-settings",
  "yipyygo",
  "roles-permissions",
  "report-card-template",
  "evaluations",
  "addons",
  "training",
] as const;

test("a converted settings section renders no English, no key and no hole", async ({
  page,
}) => {
  // One test walking every converted section, so the budget grows with the
  // list. `test.slow()` gave 360s and 31 sections blew through it; the number
  // only goes up from here.
  test.setTimeout(15 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);

  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);

  // ── WARM THE FIRST ROUTE BEFORE MEASURING IT ────────────────────────────
  //
  // Against a cold DEV server the first section pays for compiling its route,
  // and several of them are two levels of `dynamic(ssr:false)`. yipyy-pay —
  // which happens to be first in the list — took over 30s cold and under 2s
  // warm, so the spec was failing on the compiler rather than on the page.
  // CI runs this against a BUILT server where the visit costs nothing.
  await page.goto(`/facility/dashboard/settings/${CONVERTED[0]}`, {
    waitUntil: "domcontentloaded",
  });
  // Waits for TEXT, not for the element. The slot exists on the first paint
  // and is empty; waiting for it to appear warmed nothing.
  await expect
    .poll(
      async () =>
        (
          await page
            .locator("[data-slot='settings-section']")
            .first()
            .innerText()
            .catch(() => "")
        ).length,
      { timeout: 120_000 },
    )
    .toBeGreaterThan(200);

  for (const section of CONVERTED) {
    // `domcontentloaded`, not `networkidle`: this app polls, so "idle" is a
    // second or two of waiting on every section for no signal. The poll below
    // is the real wait, and it ends the moment content is there.
    await page.goto(`/facility/dashboard/settings/${section}`, {
      waitUntil: "domcontentloaded",
    });

    // 0. THE SECTION ACTUALLY RENDERED SOMETHING.
    //
    //    Added 2026-09-07, after a dot in a message key made next-intl throw
    //    from `getLocale()` in the root layout and the roles studio rendered
    //    an EMPTY PANEL. This spec passed. Of course it did: an empty panel
    //    contains no English, no raw key and no unfilled placeholder, and the
    //    French words in assertion 1 were all in the surrounding rail.
    //
    //    So the first thing measured is that the section's own body exists.
    //    The rail and the page header are ~700 characters on their own; a
    //    section that renders adds several hundred more.
    //    It POLLS rather than sampling once: a section that is still fetching
    //    shows a skeleton, which has no text either, and a spec that cannot
    //    tell "still loading" from "never rendered" is the same bug in a new
    //    place.
    await expect
      .poll(
        async () =>
          (
            await page
              .locator("[data-slot='settings-section']")
              .first()
              .innerText()
              .catch(() => "")
          ).length,
        {
          // 30s, not 15: against a cold DEV server the first section pays for
          // compiling its route, and several are `dynamic(ssr:false)`. CI runs
          // this against a built server where it returns in well under a
          // second, so the ceiling costs nothing there.
          message: `${section} never rendered a body`,
          timeout: 30_000,
        },
      )
      .toBeGreaterThan(200);

    // 1. It really is French. Everything below tests for an ABSENCE, so
    //    without this the whole spec passes against an English page.
    //
    //    POLLED, for the same reason as the presence check: the locale lives
    //    in a cookie the CLIENT reads, so the first paint is English and the
    //    swap happens on hydration. Sampling once caught `termination-reasons`
    //    mid-swap and failed a section that was perfectly correct.
    await expect
      .poll(
        async () => FRENCH.test((await page.locator("body").innerText()) ?? ""),
        { message: `${section} is not rendering French`, timeout: 20_000 },
      )
      .toBe(true);

    // Read AFTER both polls. Reading it first meant every assertion below ran
    // against whatever was on screen 1.2s in, which on a section still
    // fetching is a skeleton — and a skeleton passes all three.
    //
    // ── WHY THIS IS NOT `innerText`, AND WHAT THAT COST TO LEARN ─────────
    //
    // `innerText` is LAYOUT-AWARE: it inserts a line break where the box tree
    // says there is one, so a `<span className="block">` only reads as its
    // own line once the stylesheet has applied. Without it the spans are
    // inline and their text runs together.
    //
    // On 2026-09-07 that produced twenty-five reported "raw catalogue keys"
    // on pages that had none — `entrepriseHeures`, `marqueYipyy`,
    // `personnelNotifications`, every one of them two adjacent labels with
    // the gap missing. French made it worse: `é` is not a `\w`, so
    // `\b[a-z]+[A-Z]` can start mid-word and `Intégrations Analyses` became
    // `grationsAnalyses`.
    //
    // **The cause was not the page.** A `next start` from an earlier build
    // was still holding the port, the new one had died on EADDRINUSE
    // unnoticed, and the old server was answering 500 for CSS chunks that
    // had been overwritten underneath it. So the run really was reading an
    // unstyled page — which is not a state CI can reach, and diagnosing it
    // as one cost three runs. **Check the server log for EADDRINUSE before
    // believing a shape like this**; `bun run start` prints it and exits 1,
    // and nothing else says the port did not change hands.
    //
    // The read below stays anyway, because it is simply the right one: a
    // check hunting for raw identifiers wants text, not typography, and
    // walking the text nodes has no layout dependency to race against.
    // Scoped to the section for its own reason — the rail was never this
    // spec's subject, and half the noise above came from it.
    const body = await page
      .locator("[data-slot='settings-section']")
      .first()
      .evaluate((root) => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const out: string[] = [];
        let node = walker.nextNode();
        while (node) {
          const text = (node.nodeValue ?? "").trim();
          if (text) out.push(text);
          node = walker.nextNode();
        }
        return out.join("\n");
      });

    // 2. No raw catalogue key on screen — the failure mode when a constant is
    //    converted to keys and its render site is not. Two shapes: camelCase
    //    identifiers, and id-style keys (`notif-001`) that a camelCase test
    //    cannot see.
    const camel = [...body.matchAll(/\b[a-z]+[A-Z][a-zA-Z]{4,}\b/g)]
      .map((m) => m[0])
      .filter((w) => !/^(YipyyPay|QuickBooks|PayPal|MasterCard)$/.test(w));
    const ids = [...body.matchAll(/\b(?:notif|cat|role)-?\d{2,}\b/g)].map(
      (m) => m[0],
    );
    // KEBAB-CASE IDS TOO, added 2026-09-07 after they were missed once.
    // The roles studio draws POSITION_EDITOR_GROUPS, which is
    // PERMISSION_GROUPS plus fourteen groups derived from the nav with ids
    // like `nav-dashboard`. A lookup that fell back to the id printed all
    // fourteen on screen, and the camelCase test above cannot see a hyphen —
    // it was caught by looking at the page, which is the whole reason this
    // spec exists.
    const kebab = [
      ...body.matchAll(/\b(?:nav|perm|group|scope)-[a-z]+\b/g),
    ].map((m) => m[0]);
    expect(
      [...camel, ...ids, ...kebab],
      `raw catalogue keys on ${section}`,
    ).toEqual([]);

    // 3. No unfilled placeholder — a `.replace("{count}", …)` that named a
    //    token the French string spells differently leaves `{count}`
    //    visible.
    //
    //    ── TELLING A HOLE FROM A MERGE TAG ─────────────────────────────
    //
    //    This used to key off the BRACE COUNT: `{{customer_name}}` is a
    //    merge tag, and estimate-settings draws five of them as badges on
    //    purpose, so a double brace was exempt and a single brace was a
    //    hole. That rule was written from one screen and it is not true of
    //    the product. Measured 2026-09-07: the waiver editors write
    //    `{{petName}}`, while report cards, Yipyy Go and training all write
    //    SINGLE-braced `{petName}`. Both conventions ship, and the training
    //    screen renders its two tags on purpose — which this spec called a
    //    failure, correctly by its own rule and wrongly about the page.
    //
    //    Deriving the token list from the catalogue does not separate them
    //    either: `petName` and `customer_name` are BOTH placeholder names
    //    inside `messages/*.json` and BOTH are also rendered deliberately.
    //
    //    So the test is structural, which is the thing that actually
    //    differs. A merge tag shown on purpose is the ENTIRE text of its
    //    own element — a `<code>` chip, a badge. An unfilled hole sits
    //    inside a sentence. Ask the DOM which one it is.
    const shownOnPurpose = new Set(
      await page.evaluate(() =>
        // A `<code>` chip and a shadcn Badge, and nothing looser. `span`
        // was in this list for one draft and is exactly wrong: a hole
        // rendered alone inside a span would exempt itself.
        Array.from(document.querySelectorAll('code, [data-slot="badge"]'))
          .map((el) => (el.textContent ?? "").trim())
          .filter((text) => /^\{+[a-z]\w*\}+$/i.test(text)),
      ),
    );
    expect(
      [...body.matchAll(/\{+[a-z]\w*\}+/gi)]
        .map((m) => m[0])
        .filter((token) => !shownOnPurpose.has(token)),
      `unfilled placeholders on ${section}`,
    ).toEqual([]);
  }
});
