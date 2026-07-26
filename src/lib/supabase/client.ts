import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

// ============================================================================
// Browser Supabase client.
//
// Scope: auth (sign-in/out, session), Storage uploads, and Realtime
// subscriptions. NOT business reads and writes — those go through Route
// Handlers and Server Actions using the server client, because the domain has
// invariants RLS cannot express (booking capacity, credit-ledger balance,
// dunning idempotency, shift handover). Fetching business data straight from
// the browser would route around all of them.
//
// Reads still flow through the `src/lib/api/` query factories, so swapping a
// domain from mock to real data stays a one-file change.
// ============================================================================

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
