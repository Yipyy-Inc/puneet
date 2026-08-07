import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

// ============================================================================
// A facility's face, for a page nobody has signed in to.
//
// Spec 002 phase 3. The branded login page at `pawradise.yipyy.com` is signed
// out by definition, so this is the one read in the codebase that deliberately
// carries NO identity.
//
// ── WHY NOT createServerClient() ──────────────────────────────────────────
//
// That client carries the caller's Clerk JWT, and there is no caller. It would
// resolve to anonymous anyway, so this is the same thing said honestly — an
// anon client, named as such, so nobody later "fixes" it by adding a session it
// cannot have.
//
// ── WHY A FUNCTION AND NOT A TABLE READ ───────────────────────────────────
//
// Measured before it was designed (supabase/tests/facility-branding.sql):
// anon reads ZERO rows from `facilities`, so a subdomain's slug cannot be
// turned into a facility_id by any query available to a signed-out visitor.
// `facility_branding_by_slug` is a SECURITY DEFINER projection that takes an
// exact slug and answers about one facility — a lookup, not a directory.
//
// It deliberately does not return support_email or support_phone. Those are for
// signed-in screens; publishing a facility's contact details to anonymous
// callers is how they end up in a scraper.
// ============================================================================

export interface FacilityBranding {
  facilityId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  wordmarkUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  tagline: string | null;
}

/**
 * The branding for a slug, or `null` when no facility answers to it.
 *
 * `null` is a real answer and the caller must render Yipyy's own neutral card
 * for it — an unknown subdomain must not look like a broken facility.
 */
export async function getBrandingBySlug(
  slug: string,
): Promise<FacilityBranding | null> {
  const trimmed = slug.trim().toLowerCase();
  if (!trimmed) return null;

  let config: ReturnType<typeof supabaseConfig>;
  try {
    config = supabaseConfig();
  } catch {
    // Supabase not configured in this environment. A login page that cannot
    // reach the database still has to render, so this is the neutral card
    // rather than a crash on the one screen someone uses to report the outage.
    return null;
  }

  const supabase = createClient<Database>(config.url, config.publishableKey);

  const { data, error } = await supabase
    .rpc("facility_branding_by_slug", { p_slug: trimmed })
    .maybeSingle();

  if (error || !data) return null;

  return {
    facilityId: data.facility_id,
    name: data.name,
    slug: data.slug,
    logoUrl: data.logo_url,
    wordmarkUrl: data.wordmark_url,
    primaryColor: data.primary_color,
    accentColor: data.accent_color,
    tagline: data.tagline,
  };
}
