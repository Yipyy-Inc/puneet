"use client";

import { useAccessToken } from "@workos-inc/authkit-nextjs/components";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

import type { Database } from "@/types/database";
import { supabaseConfig } from "./env";

// ============================================================================
// Browser-side Supabase client authenticated by WORKOS.
//
// The counterpart to ./workos-server.ts, which carries the reasoning about the
// `role` claim and why the RLS layer did not move when the provider did.
//
// A hook rather than a plain factory because the session is React state: it
// starts undefined, resolves once AuthKit loads, and changes on sign-in and
// sign-out. A module-level client captured at import time would hold the
// pre-load token forever and send anonymous requests to a database that answers
// anonymous callers with an empty result rather than an error.
//
// `useAccessToken()` hands back a VALUE, not a getter — unlike Clerk's
// `session.getToken()`, which this replaced. That difference is why the memo
// below is keyed on the token itself: the hook refreshes it on its own schedule,
// and the client has to be rebuilt when it does, or it would keep closing over a
// token that has since expired.
// ============================================================================

export function useWorkosSupabaseClient() {
  const { accessToken } = useAccessToken();

  return useMemo(() => {
    const { url, publishableKey } = supabaseConfig();

    return createClient<Database>(url, publishableKey, {
      async accessToken() {
        return accessToken ?? null;
      },
    });
  }, [accessToken]);
}
