import { createBrowserClient as createSsrBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { supabaseConfig } from "./env";

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
//
// Named `createBrowserClient`, not `createClient`, to pair unambiguously with
// `createServerClient` in ./server. `server-only` stops the server client
// leaking into the browser, but nothing stops the reverse — using this one in
// a server context would silently lose cookie-based auth, so the names carry
// that distinction.
// ============================================================================

export function createBrowserClient() {
  const { url, publishableKey } = supabaseConfig();
  return createSsrBrowserClient<Database>(url, publishableKey);
}
