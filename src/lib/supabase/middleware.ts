import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import { supabaseConfig } from "./env";

// ============================================================================
// Session refresh.
//
// Supabase access tokens are short-lived. Server Components cannot set cookies,
// so a refreshed token has nowhere to be written from a page render — which
// means without middleware, sessions silently expire mid-use and every server
// read starts returning empty rows that look exactly like "no data".
//
// This runs before the request reaches a route, refreshes the token if needed,
// and writes the rotated cookies onto the response.
//
// It deliberately does NOT redirect. Portal access is decided in the layouts,
// which need to know *which* portal was asked for and can consult the
// membership claims. Middleware here does one job: keep the session alive.
// ============================================================================

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Middleware runs on every request, so an unconfigured environment must not
  // take the whole site down — it should behave exactly as it did before auth
  // existed. A page that genuinely needs Supabase still throws a named error
  // via supabaseConfig(); this only declines to refresh a session that cannot
  // exist anyway.
  let config: ReturnType<typeof supabaseConfig>;
  try {
    config = supabaseConfig();
  } catch {
    return response;
  }
  const { url, publishableKey } = config;

  const supabase = createSsrServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Must be getUser(), not getSession(). getSession() reads the cookie without
  // verifying it; getUser() validates the JWT with Supabase, and it is the call
  // that actually triggers the refresh.
  await supabase.auth.getUser();

  return response;
}
