import "server-only";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// BRIDGE — smaller than it was, and now reading real data.
//
// The groomer and staff surfaces identify the current person by a staff id
// held in localStorage under `facility_current_user_id`. That id used to come
// from the fake logins ("find this email in the `users` array, and you are
// them" — no password involved), and this file used to resolve it by scanning
// two mock arrays.
//
// It now resolves it from the `staff` table, matching on the caller's VERIFIED
// session email. So the authentication is real, the staff record is real, and
// only the identifier handed to the UI is still the legacy "fs-*" string.
//
// WHAT IS LEFT TO DELETE: 47 files still import `facilityStaff` from
// src/data directly, and they are what keep the legacy id alive. Each one that
// moves to `staffQueries.profiles()` shrinks this further; when the last one
// goes, so does `facility_current_user_id` and this file.
//
// Returns null rather than throwing on any failure: a missing staff row means
// "we do not know which staff member this is", and the surfaces already handle
// that. It must never be the reason someone cannot load a page.
// ============================================================================

export async function legacyStaffIdForEmail(
  email: string | null,
): Promise<string | null> {
  if (!email) return null;

  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("staff")
      .select("legacy_id")
      .ilike("email", email.trim())
      .maybeSingle();

    return data?.legacy_id ?? null;
  } catch {
    // Supabase unconfigured, or no session yet — neither is worth failing a
    // page render over.
    return null;
  }
}
