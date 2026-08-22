/**
 * ============================================================================
 * The magic-auth bridge may not launder an unverified email.
 *
 *   bun run check:passkey-email-verified
 *
 * ── THE HAZARD, MEASURED ──────────────────────────────────────────────────
 *
 * Passkeys sign a user in without WorkOS's hosted UI by verifying WebAuthn
 * ourselves and then minting a real WorkOS session:
 *
 *     createMagicAuth({ email })        -> { code }   // never emailed
 *     authenticateWithMagicAuth({ code, email, clientId })
 *
 * That works because `createMagicAuth` RETURNS the one-time code rather than
 * sending it. Which is also the problem. Spiked against staging on 2026-08-22:
 *
 *     created  passkey-spike-…@yipyy.dev   emailVerified=false
 *     bridge   -> ACCEPTED -> verified=true
 *
 * WorkOS promotes the address to verified, correctly — for REAL Magic Auth,
 * holding a code that arrived by email proves control of the mailbox. We never
 * send the email, so holding the code proves nothing at all.
 *
 * Both environments set `isEmailVerificationRequired: true`. So a passkey path
 * reachable by an unverified account converts an unverified email into a
 * verified one and walks straight through the environment's own policy.
 *
 * ── WHY A GATE AND NOT A COMMENT ──────────────────────────────────────────
 *
 * The check that prevents this looks redundant from inside either route. At
 * enrolment the user already has a session; at sign-in they already presented a
 * passkey. Both readings are wrong, and both are exactly what a future tidy-up
 * would conclude before deleting the guard. Prose does not survive that. A
 * failing gate does.
 *
 * This gate was written BEFORE the routes it guards, so the routes are born
 * inside it and the check can never be "removed as unnecessary" without turning
 * the build red.
 *
 * ── WHAT IT ENFORCES ──────────────────────────────────────────────────────
 *
 * A. `createMagicAuth` appears in ONE file only. It is a session-minting
 *    primitive: anything that can call it can become any user by email. Confine
 *    it, so a second caller is a deliberate act and not a convenience someone
 *    adds to an admin tool.
 * B. Any file that calls it must also check `emailVerified` in real code.
 * C. Every passkey verify route must check `emailVerified` — enrolment as well
 *    as sign-in, because a credential enrolled under a weaker rule must not
 *    become the way around a stronger one.
 *
 * Comment lines never satisfy B or C; writing the word in a comment is how a
 * guard gets faked, so comments are stripped before matching.
 * ============================================================================
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  red: "[31m",
  green: "[32m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

const ROOT = "src";

/** The one file allowed to mint a session from a passkey. */
const BRIDGE = "src/app/api/auth/passkey/authenticate/verify/route.ts";

/** A passkey route that concludes an act and must therefore gate on the email. */
const VERIFY_ROUTE = /^src\/app\/api\/auth\/passkey\/.*\/verify\/route\.ts$/;

const MINTS_SESSION = /\bcreateMagicAuth\b/;

/**
 * Two ways to satisfy the requirement, and they are equally strong.
 *
 * A route may read `emailVerified` itself, or delegate to
 * `requireVerifiedUser()` — whose entire job is that check. Insisting on the
 * literal identifier everywhere would force each route to re-implement a
 * WorkOS lookup it should be sharing, and a copied check is a check that drifts.
 *
 * The delegation is only as good as the helper, so the helper is guarded too:
 * see HELPER below. Gutting `requireVerifiedUser` turns this gate red even
 * though every route still calls it.
 */
const CHECKS_VERIFIED = /\bemailVerified\b|\brequireVerifiedUser\s*\(/;

/** The shared check, and the literal it must keep performing. */
const HELPER = "src/lib/auth/passkeys.ts";
const HELPER_MUST_CONTAIN = /\bemailVerified\b/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(entry)) out.push(path.replace(/\\/g, "/"));
  }
  return out;
}

/**
 * Source with comments removed.
 *
 * A guard that exists only in a comment is not a guard, and `emailVerified`
 * appears in the prose of every file that explains this rule — including this
 * one. Matching raw text would let the explanation satisfy the requirement.
 */
function code(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

type Offence = { file: string; why: string; fix: string };

const offences: Offence[] = [];
const files = walk(ROOT).sort();

// The helper the routes are allowed to delegate to must still do the work.
// Without this, emptying one function would silently disarm every delegation.
if (files.includes(HELPER)) {
  if (!HELPER_MUST_CONTAIN.test(code(readFileSync(HELPER, "utf8")))) {
    offences.push({
      file: HELPER,
      why: "no longer checks emailVerified, and every passkey route delegates to it",
      fix: "requireVerifiedUser() is the shared gate. Restore the check, or the routes that trust it are guarding nothing.",
    });
  }
}

for (const file of files) {
  const source = code(readFileSync(file, "utf8"));

  if (MINTS_SESSION.test(source)) {
    // A — the primitive stays in one place.
    if (file !== BRIDGE) {
      offences.push({
        file,
        why: "calls createMagicAuth, which mints a session for any address",
        fix: `The bridge belongs in ${BRIDGE} alone. A second caller needs its own review, not a copy of this one.`,
      });
    }
    // B — and wherever it lives, it checks first.
    if (!CHECKS_VERIFIED.test(source)) {
      offences.push({
        file,
        why: "calls createMagicAuth without checking emailVerified",
        fix: "Refuse unless the WorkOS user has emailVerified === true. Without it a passkey turns an unverified address into a verified one.",
      });
    }
  }

  // C — both verify routes, enrolment included.
  if (VERIFY_ROUTE.test(file) && !CHECKS_VERIFIED.test(source)) {
    offences.push({
      file,
      why: "is a passkey verify route with no emailVerified check",
      fix: "Check it here too. Enrolment under a weaker rule must not become the way around a stronger one.",
    });
  }
}

console.log(
  `${ANSI.bold}Passkey email-verification guard${ANSI.reset} ${ANSI.dim}(${files.length} files in ${ROOT})${ANSI.reset}\n`,
);

if (offences.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ the magic-auth bridge cannot launder an unverified email${ANSI.reset}`,
  );
  process.exit(0);
}

for (const offence of offences) {
  console.log(`  ${ANSI.red}${offence.file}${ANSI.reset}`);
  console.log(`      ${offence.why}.`);
  console.log(`      ${ANSI.dim}${offence.fix}${ANSI.reset}\n`);
}

process.exit(1);
