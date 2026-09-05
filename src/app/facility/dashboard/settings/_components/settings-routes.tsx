import { notFound, redirect } from "next/navigation";

import { SettingsLanding } from "./settings-landing";
import {
  settingsIndexHref,
  settingsLeaf,
  type SettingsPortal,
} from "@/lib/settings/nav";

// ============================================================================
// THE SETTINGS ROUTES THAT ARE NOT A SECTION, WRITTEN ONCE AND MOUNTED TWICE.
//
// /facility/dashboard/settings/* and /employee/settings/* are the same screens:
// the employee shell re-exports them, filtered by the acting viewer's
// permissions. Only the base path differs, and the base path is the ONE thing
// that must not be got wrong. canAccessFacilityPortal admits facility admins
// and platform admins and nobody else, so a facility URL served to a groomer is
// denied by guardPortal and forwarded to /employee/schedule: a 200, a real
// screen, and nothing to do with settings.
//
// So `portal` is a required argument rather than something each route file
// works out for itself. Two copies of this logic is how the two portals drift.
//
// ── EVERY REAL SECTION IS ITS OWN FILE NOW ────────────────────────────────
//
// settings/taxes/page.tsx, settings/hours/page.tsx, and 48 more. What is left
// here is the index, and the dynamic segment — which no longer renders a
// section at all. It exists for two things a static file cannot cover: an
// address that has been RENAMED, and the custom service modules whose ids are
// built from live facility data.
// ============================================================================

/** Everything after `section` in the query, preserved verbatim. */
function residualQuery(
  query: Record<string, string | string[] | undefined>,
): string {
  const rest = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "section") continue;
    if (typeof value === "string") rest.set(key, value);
    else if (Array.isArray(value)) for (const v of value) rest.append(key, v);
  }
  const tail = rest.toString();
  return tail ? "?" + tail : "";
}

/**
 * The settings index — and the front door for every old address.
 *
 * ?section= was how this screen was navigated for its whole life, so it is in
 * bookmarks, in emails, in src/data/facility-onboarding.ts, and — the one
 * nobody here can edit — in the Site URL Clover redirects a merchant back to
 * after connecting a real account. That one carries &step=2, which is why the
 * rest of the query survives: dropping it lands somebody who has just connected
 * on the screen offering to connect.
 *
 * An unknown section RENDERS the index rather than redirecting to it, because
 * redirecting to the index from the index is a loop.
 */
export async function settingsIndexRoute({
  searchParams,
  portal,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  portal: SettingsPortal;
}) {
  const query = await searchParams;
  const requested = typeof query.section === "string" ? query.section : null;
  const leaf = requested ? settingsLeaf(requested) : undefined;

  if (leaf) {
    redirect(
      settingsIndexHref(portal) + "/" + leaf.segment + residualQuery(query),
    );
  }

  return <SettingsLanding />;
}

/**
 * The segments no static file claims.
 *
 * Next resolves a static segment ahead of a dynamic one, so every extracted
 * section — all 50 — is served by its own page.tsx and never reaches here. Two
 * things do:
 *
 *   A RENAMED SECTION. `id` is the permanent identifier a bookmark carries;
 *   `segment` is the current address. When they diverge — staff-roles, the
 *   duplicate role editor that was deleted — the old address redirects to the
 *   real one instead of 404ing, exactly as the index resolves
 *   ?section=staff-roles. An alias that worked in one URL form and not the
 *   other would be worse than no alias.
 *
 *   A CUSTOM SERVICE MODULE. The rail and the index synthesise a `custom-<slug>`
 *   entry per active module, from live data, which no static list can contain.
 *   There is no screen behind one yet — that is a known gap, held at one by
 *   `bun run check:settings-routes` — and the layout's permission guard sends
 *   the viewer to a section they can open rather than leaving them on a blank
 *   panel.
 *
 * Anything else is a 404, and that is the point of the whole route move:
 * ?section=training-disciplines was linked from two training screens for
 * months, fell through to Business, and looked like a page.
 */
export async function settingsSectionRoute({
  params,
  portal,
}: {
  params: Promise<{ section: string }>;
  portal: SettingsPortal;
}) {
  const { section } = await params;

  if (section.startsWith("custom-")) return null;

  const leaf = settingsLeaf(section);
  if (!leaf || leaf.segment === section) notFound();

  redirect(settingsIndexHref(portal) + "/" + leaf.segment);
}
