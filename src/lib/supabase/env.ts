// ============================================================================
// Supabase connection config, validated once.
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
        `the values are in the Supabase dashboard under Settings > API.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_PUBLISHABLE_KEY = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
