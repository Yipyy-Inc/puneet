import { readFileSync } from "node:fs";

// ============================================================================
// Where the test harness gets its Clerk keys.
//
// ONE resolver, used by playwright.config.ts AND scripts/provision-e2e-identities.ts,
// because the two must agree. If the provisioning script creates users in one
// Clerk instance and the suite signs in against another, every spec fails at
// sign-in with "identifier not found" — and nothing in that message points at
// the actual cause, which is two instances.
//
// ── ORDER, AND WHY ────────────────────────────────────────────────────────
//
// 1. The environment. What CI has, and what a developer who ran `clerk env
//    pull` or copied from Vercel has. Always wins.
//
// 2. `.clerk/.tmp/keyless.json`. Clerk's keyless mode writes a throwaway
//    DEVELOPMENT instance there the first time `bun run dev` runs without keys.
//    Falling back to it is what keeps `bun run test:e2e` working from a cold
//    clone, which is the property playwright.config.ts's header already claims.
//
// The fallback is also what stops a WORSE failure. Without keys the dev server
// re-enters keyless mode and writes its own into `.env.local` — mutating a file
// the developer owns, as a side effect of running tests. Setting them in
// process.env here means the server Playwright starts inherits them and has no
// reason to provision anything.
//
// ── TEST KEYS ONLY, AND THAT IS ASSERTED ──────────────────────────────────
//
// Clerk's testing flow requires a development instance: Testing Tokens do not
// exist on production instances, and `clerkSetup()` fails against one. The
// check below is not ceremony — the realistic accident is a developer with
// production keys exported in their shell running the suite and having it
// create seven staff accounts on the live instance.
// ============================================================================

export interface ClerkTestKeys {
  publishableKey: string;
  secretKey: string;
  /** Where they came from, for the one line the harness logs. */
  source: "environment" | "keyless";
}

const KEYLESS_PATH = ".clerk/.tmp/keyless.json";

function fromKeyless(): { publishableKey: string; secretKey: string } | null {
  try {
    const parsed = JSON.parse(readFileSync(KEYLESS_PATH, "utf8")) as {
      publishableKey?: string;
      secretKey?: string;
    };
    if (!parsed.publishableKey || !parsed.secretKey) return null;
    return {
      publishableKey: parsed.publishableKey,
      secretKey: parsed.secretKey,
    };
  } catch {
    return null;
  }
}

export function resolveClerkTestKeys(): ClerkTestKeys {
  const envPublishable =
    process.env.CLERK_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const envSecret = process.env.CLERK_SECRET_KEY?.trim();

  const resolved =
    envPublishable && envSecret
      ? {
          publishableKey: envPublishable,
          secretKey: envSecret,
          source: "environment" as const,
        }
      : (() => {
          const keyless = fromKeyless();
          if (!keyless) {
            throw new Error(
              [
                "No Clerk keys available for the e2e suite.",
                "",
                "Set CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY (both pk_test_/sk_test_),",
                `or run \`bun run dev\` once so Clerk writes ${KEYLESS_PATH}.`,
                "",
                "They are in the Clerk dashboard under API keys, or `clerk env pull`.",
              ].join("\n"),
            );
          }
          return { ...keyless, source: "keyless" as const };
        })();

  if (
    !resolved.publishableKey.startsWith("pk_test_") ||
    !resolved.secretKey.startsWith("sk_test_")
  ) {
    throw new Error(
      [
        "Refusing to run the e2e suite against a Clerk PRODUCTION instance.",
        "",
        `  publishable: ${resolved.publishableKey.slice(0, 8)}…`,
        `  secret:      ${resolved.secretKey.slice(0, 8)}…`,
        "",
        "Testing Tokens only exist on development instances, so clerkSetup()",
        "would fail anyway — but the real risk is provisioning seven staff",
        "accounts on the instance your users sign in to. Use pk_test_/sk_test_.",
      ].join("\n"),
    );
  }

  return resolved;
}

/**
 * Put the resolved keys where everything downstream looks for them.
 *
 * `@clerk/testing` reads CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY; the Next
 * server reads NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY. All four
 * are set from the same pair so the app and the harness cannot end up on
 * different instances.
 *
 * Existing values are never overwritten — an explicit export in the shell is a
 * deliberate act and outranks anything found on disk.
 */
export function applyClerkTestKeys(): ClerkTestKeys {
  const keys = resolveClerkTestKeys();
  const assign = (name: string, value: string) => {
    if (!process.env[name]?.trim()) process.env[name] = value;
  };
  assign("CLERK_PUBLISHABLE_KEY", keys.publishableKey);
  assign("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", keys.publishableKey);
  assign("CLERK_SECRET_KEY", keys.secretKey);
  return keys;
}
