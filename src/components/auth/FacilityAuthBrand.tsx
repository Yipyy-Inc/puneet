import type { FacilityBranding } from "@/lib/api/facility-branding";

// ============================================================================
// A facility's mark on the auth screens.
//
// Spec 002 phase 3. Slots into AuthCard's existing `brand` prop, which already
// exists for exactly this — "portals with their own mark pass it in".
//
// ── A PLAIN <img>, NOT next/image ─────────────────────────────────────────
//
// next/image needs the host in `images.remotePatterns` at BUILD time. Logos
// live in Supabase Storage under a project-specific host, and a facility that
// later moves to a CDN would break the one screen it must never break — with a
// 500 from the image optimiser, not a missing picture. The optimiser buys
// little on a single small logo above the fold.
//
// ── WORDMARK FIRST, THEN LOGO, THEN THE NAME ──────────────────────────────
//
// Three states, in the order a facility grows into them.
//
// The wordmark wins where there is one because this slot is WIDE AND SHORT --
// it is the header of a 28rem card. A square logo constrained to h-12 either
// shrinks to a thumbnail or crowds the title, while a wordmark is drawn for
// exactly this shape. Facilities with a single mark upload it as the logo and
// never think about this.
//
// `wordmark_url` was reachable by NOBODY until 2026-08-18: the column, the API
// and facility_branding_by_slug had supported it since 20260807240000, but the
// settings screen posted a hardcoded "" for it on every save -- so it could not
// be set, and any unrelated save would have cleared it. Nothing rendered it
// either. Both ends fixed together; a field that can be stored and not shown is
// the same bug as one that can be shown and not stored.
//
// ── THE NAME IS THE FALLBACK, NOT A BROKEN IMAGE ──────────────────────────
//
// A facility that has not uploaded a logo yet is the normal state on the day it
// is provisioned, and its login page still has to look deliberate. So the name
// is rendered as a wordmark rather than leaving an empty slot.
// ============================================================================

export function FacilityAuthBrand({
  branding,
}: {
  branding: FacilityBranding;
}) {
  const mark = branding.wordmarkUrl ?? branding.logoUrl;

  if (mark) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- see the note above
      <img
        src={mark}
        // The facility's NAME, not "logo" or "wordmark". A screen reader should
        // announce whose sign-in page this is; which asset happened to be
        // uploaded is not information anyone needs.
        alt={branding.name}
        // max-w-full so a wide wordmark scales down inside the card instead of
        // overflowing it -- the height cap alone does not constrain width.
        className="h-12 w-auto max-w-full object-contain"
      />
    );
  }

  return (
    <span
      className="text-2xl font-bold tracking-tight"
      // A checked hex value (facility_branding_primary_color_is_hex) or
      // nothing. The database refuses anything that is not #RRGGBB, so this
      // cannot become a style-attribute injection.
      style={
        branding.primaryColor ? { color: branding.primaryColor } : undefined
      }
    >
      {branding.name}
    </span>
  );
}
