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
  if (branding.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- see the note above
      <img
        src={branding.logoUrl}
        alt={branding.name}
        className="h-12 w-auto object-contain"
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
