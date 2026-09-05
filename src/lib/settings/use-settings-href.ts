"use client";

import { usePathname } from "next/navigation";
import { useCallback } from "react";

import {
  settingsHref,
  settingsPortalFor,
  type SettingsLeaf,
  type SettingsPortal,
} from "@/lib/settings/nav";

// ============================================================================
// A LINK INTO SETTINGS, FROM WHICHEVER PORTAL IS ASKING.
//
// ── THE BUG THIS EXISTS TO FIX ────────────────────────────────────────────
//
// The employee shell does not reimplement the product: `/employee/grooming`
// renders `@/app/facility/dashboard/services/grooming/page` behind a permission
// gate, and ~40 other routes under `src/app/employee/(shell)/` do the same. So
// one component renders in two portals, and any absolute `/facility/dashboard/
// settings?section=…` it contains is only right in one of them.
//
// There were 28 of those strings. For a groomer or a caretaker every one of
// them was a dead end, and not a visible one:
//
//   · `canAccessFacilityPortal` (viewer.ts) admits facility ADMINS and platform
//     admins. Nobody else.
//   · So the click reaches `/facility/dashboard/settings`, the facility layout's
//     `guardPortal` denies it, and `landingPathFor` sends them to their own
//     landing page — `/employee/schedule`.
//   · Which is a 200. No error, no "you cannot open this". A groomer taps
//     "grooming settings" and arrives at their shift schedule.
//
// The worst of them was inside settings itself: `handleSectionChange` wrote
// `/facility/dashboard/settings?section=…` on every rail click, so an employee
// who opened `/employee/settings` — a route with deliberately NO gate, because
// personal settings belong to everyone — was thrown out of the portal by the
// first item they touched.
//
// ── WHY A HOOK AND NOT A PROP ─────────────────────────────────────────────
//
// The alternative is for each shared component to take the portal from its
// caller, and the callers are the employee wrappers, which are one-line
// re-exports. Threading a prop through would mean editing all of them plus
// every component in between. The pathname already knows the answer.
// ============================================================================

/**
 * `href(id)` for a settings section, in the portal the caller is rendering in.
 *
 * ```tsx
 * const settingsLink = useSettingsHref();
 * <Link href={settingsLink("grooming")}>Grooming settings</Link>
 * ```
 *
 * An unknown id resolves to the settings index rather than a broken URL, and
 * `bun run check:settings-routes` fails on it in CI.
 *
 * A whole leaf may be passed instead of an id, and the rail does: it renders a
 * synthesised `custom-<slug>` entry per active custom module, which is real
 * enough to link to but is not in the static registry, so an id lookup would
 * send it to the index.
 */
export function useSettingsHref(): (
  leaf: SettingsLeaf | string,
  extraQuery?: Record<string, string | number>,
) => string {
  const portal = useSettingsPortal();
  return useCallback(
    (
      leaf: SettingsLeaf | string,
      extraQuery?: Record<string, string | number>,
    ) => {
      const href = settingsHref(leaf, portal);
      if (!extraQuery) return href;
      const params = new URLSearchParams(
        Object.entries(extraQuery).map(([k, v]) => [k, String(v)]),
      );
      // `settingsHref` returns the `?section=` form today and a path when the
      // routes land, so the separator has to be decided from what came back
      // rather than assumed.
      return `${href}${href.includes("?") ? "&" : "?"}${params.toString()}`;
    },
    [portal],
  );
}

/** The portal the caller is rendering in, for the rarer non-href decisions. */
export function useSettingsPortal(): SettingsPortal {
  return settingsPortalFor(usePathname() ?? "");
}
