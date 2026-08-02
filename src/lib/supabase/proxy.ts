import { createServerClient as createSsrServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import { supabaseConfig } from "./env";

// ============================================================================
// Session refresh. Called from src/proxy.ts.
//
// Supabase access tokens are short-lived. Server Components cannot set cookies,
// so a refreshed token has nowhere to be written from a page render — which
// means without this, sessions silently expire mid-use and every server read
// starts returning empty rows that look exactly like "no data".
//
// It runs before the request reaches a route, refreshes the token if needed,
// and writes the rotated cookies onto the response.
//
// It deliberately does NOT redirect. Portal access is decided in the layouts,
// which need to know *which* portal was asked for and can consult the
// membership claims. This does one job: keep the session alive.
// ============================================================================

/**
 * Copy the request headers and stamp the current path onto them.
 *
 * Layouts cannot see the pathname — Next deliberately does not pass it — but a
 * portal gate needs it for two things: to leave its own /auth/* screens
 * reachable (gating them would make signing in impossible), and to build a
 * `?next=` so a bounced user returns where they were headed.
 *
 * `set` rather than `append`, so a client that sends its own x-pathname header
 * cannot smuggle a value past the gate.
 *
 * Rebuilt on each call rather than captured once: request.cookies.set() writes
 * back through to the cookie header, so headers snapshotted before the refresh
 * would carry the OLD session and undo the token rotation.
 */
function headersWithPathname(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return headers;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: headersWithPathname(request) },
  });

  // This runs on every request, so an unconfigured environment must not take
  // the whole site down — it should behave exactly as it did before auth
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
        response = NextResponse.next({
          request: { headers: headersWithPathname(request) },
        });
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
