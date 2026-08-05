"use client";

import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

import type { Database } from "@/types/database";
import { supabaseConfig } from "./env";

// ============================================================================
// Browser-side Supabase client authenticated by CLERK.
//
// The counterpart to ./clerk-server.ts; that file carries the reasoning for why
// this lives alongside ./client.ts rather than replacing it, and why pointing it
// at an auth.uid() table returns zero rows instead of failing.
//
// A hook rather than a plain factory because the Clerk session is React state:
// it starts undefined, resolves after Clerk loads, and changes on sign-in and
// sign-out. A module-level client captured at import time would hold the
// pre-load `undefined` session forever and send anonymous requests.
// ============================================================================

export function useClerkSupabaseClient() {
  const { session } = useSession();

  // Rebuilt when the session identity changes — on sign-in, sign-out, and user
  // switch — so a signed-out client is never reused for the next user.
  return useMemo(() => {
    const { url, publishableKey } = supabaseConfig();

    return createClient<Database>(url, publishableKey, {
      // Read through the closure on every request rather than snapshotting a
      // token: Clerk rotates short-lived session tokens, and a captured string
      // would start 401ing partway through a session.
      async accessToken() {
        return (await session?.getToken()) ?? null;
      },
    });
  }, [session]);
}
