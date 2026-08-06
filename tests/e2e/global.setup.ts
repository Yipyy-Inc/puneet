import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// ============================================================================
// Clerk's Testing Token, minted once for the whole run.
//
// Clerk applies bot protection to sign-in, and a headless Chromium driving the
// form is exactly what that protection exists to stop. `clerkSetup()` exchanges
// the secret key for a Testing Token that exempts this run; without it every
// spec fails at sign-in with a bot-detection challenge, which reads like a
// broken selector rather than a missing token.
//
// Serial by contract — it writes a token the other projects read, so it cannot
// share a worker with them.
//
// The keys themselves are resolved in playwright.config.ts before this runs
// (see tests/e2e/_clerk-keys.ts), so a missing-key failure surfaces as one
// sentence at startup rather than as a token exchange returning 401 here.
// ============================================================================

setup.describe.configure({ mode: "serial" });

setup("clerk testing token", async () => {
  await clerkSetup();
});
