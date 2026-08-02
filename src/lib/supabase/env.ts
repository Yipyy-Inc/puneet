// ============================================================================
// Supabase connection config.
//
// Validated LAZILY, on first use — deliberately not at module scope. Next
// inlines NEXT_PUBLIC_* at build time, so a module-scope throw would fail
// `next build` on any machine without these set: CI, a fresh clone, a
// contributor who only wants to run typecheck. Worse, the error would name
// this file rather than whatever imported it, so the person who broke the
// build would have no idea why.
//
// Failing on first *use* keeps the build independent of project config while
// still refusing to run half-configured.
//
// Both values are safe in the browser by design — the publishable key
// identifies the project, it does not authorise anything on its own. Every
// permission decision is made by RLS against the caller's JWT (see
// supabase/migrations/20260726120000_tenancy_and_identity.sql).
//
// The SERVICE ROLE key is deliberately absent from this file and from the
// client factories. It bypasses RLS entirely, so it must never be reachable
// from anything that could be bundled for the browser. If a background job
// genuinely needs it, read it inside that route handler and nowhere else.
// ============================================================================

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill it in — ` +
        `the values are in the Supabase dashboard under Project Settings > API. ` +
        `Deployed environments need it set in the Vercel project too, before ` +
        `the build: NEXT_PUBLIC_* are inlined at build time, not read at runtime.`,
    );
  }
  return value;
}

/**
 * Project URL and publishable key, validated on call.
 *
 * The `process.env.X` references are written out in full rather than looked up
 * dynamically, because Next only inlines NEXT_PUBLIC_* when it can see the
 * literal property access at build time.
 */
export function supabaseConfig(): { url: string; publishableKey: string } {
  return {
    url: required(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    ),
    publishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}
