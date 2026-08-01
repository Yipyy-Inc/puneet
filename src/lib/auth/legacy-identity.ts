import "server-only";

import { users } from "@/data/users";
import { stylists } from "@/data/grooming";

// ============================================================================
// BRIDGE — delete when staff move from src/data into Postgres.
//
// The groomer and staff surfaces (GroomerHeader, StaffHeader, the groomer
// dashboard, the retail pages, use-facility-role) identify the current person
// by a mock-record id kept in localStorage under `facility_current_user_id`.
//
// That id used to be written by the fake logins: "find this email in the
// `users` array, and you are them" — no password involved. Those logins are
// now real Supabase sign-ins, which produce a UUID that means nothing to any
// of those surfaces.
//
// So this maps a verified email onto the mock record it corresponds to. The
// authentication is real; only the identifier handed to the mock data layer is
// legacy. When staff become rows in Postgres, this file and every reader of
// `facility_current_user_id` go together.
//
// Server-only so the mock arrays stay out of the client bundle — the layout
// resolves the id and passes just the string down.
// ============================================================================

export function legacyStaffIdForEmail(email: string | null): string | null {
  if (!email) return null;
  const target = email.trim().toLowerCase();

  const stylist = stylists.find((s) => s.email?.toLowerCase() === target);
  if (stylist) return String(stylist.id);

  const user = users.find((u) => u.email?.toLowerCase() === target);
  if (user) return String(user.id);

  return null;
}
