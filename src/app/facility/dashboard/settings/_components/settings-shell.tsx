"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, Lock } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { RouteState } from "@/components/ui/route-state";
import { usePermissionsResolved } from "@/hooks/use-db-permissions";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import {
  canAccessSettingsSection,
  settingsIndexHref,
  settingsLeaf,
  settingsPortalFor,
} from "@/lib/settings/nav";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// THE CHROME AROUND EVERY SETTINGS SCREEN — AND THE GUARD.
//
// Lives in settings/layout.tsx rather than inside a page, so the header and
// the guard render once above every section rather than being repeated fifty
// times.
//
// ── THERE IS NO RAIL, AND THAT IS THE DESIGN ─────────────────────────────
//
// A rail stood beside every section until 2026-09-08. It was the same 51
// leaves in nine groups that the index already lists — 2,202px of it, taller
// than every section but two — so a section page carried a second, worse copy
// of the page you had just come from.
//
// The index is now the only place the fifty live: you enter from it and leave
// by "All settings". One list, one entry point, and every section 266px wider
// for it.
//
// Below lg nothing changed — the rail was already `hidden` there, so the
// small-screen behaviour was always this: the index is the list, a section is
// the section, and "All settings" is a real link to a real address that a
// phone reload lands on.
//
// ── ONE PERMISSION GUARD, FOR ALL 50 SECTIONS ────────────────────────────
//
// This was inside the switchboard, which every section rendered through. The
// switchboard is gone — each section is its own route now — so the guard moved
// UP rather than being copied 50 times. A section added tomorrow is guarded
// because it is inside this layout, not because somebody remembered.
//
// It used to be a redirect rather than a refusal in EVERY case, and the reason
// was sound: `myPermissions()` returns an empty map on any RPC error, so
// "denied" and "we could not find out" were the same value here, and refusing
// on that would lock an owner out of their own settings on one transient
// failure.
//
// The premise, not the reasoning, was what could be fixed. `usePermissionsResolved()`
// reports the QUERY's status rather than its data, so the two cases are now
// distinguishable, and each gets the behaviour it deserves:
//
//   resolved + denied   → refuse, with the §5d2 `secure` state. The address
//                         bar stays put and the screen says why.
//   unresolved + denied → redirect to the fallback, exactly as before. We do
//                         not know, so we do not accuse.
//
// The silent redirect was the case §6 rule 9 names — "a state a component does
// not implement is a bug, not a decision". Asking for Taxes and landing on
// Business with nothing on screen explaining it is indistinguishable, from the
// user's side, from the bug this layout was built to end: rendering Business
// while the URL still said `taxes`.
//
// None of this is enforcement. RLS refuses the row and the server routes refuse
// the request whatever this decides; this only decides what the person reads.
// ============================================================================

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const permissions = useEffectivePermissions();
  const settingsPath = useSettingsHref();
  const label = useSettingsText();

  const portal = settingsPortalFor(pathname);
  const index = settingsIndexHref(portal);

  // The last segment IS the section — /settings itself has none. Read off the
  // pathname rather than passed down, because the layout renders above the
  // route that knows it.
  const rest = pathname.startsWith(index) ? pathname.slice(index.length) : "";
  const segment = rest.replace(/^\//, "").split("/")[0] || null;
  const leaf = segment ? settingsLeaf(segment) : undefined;
  const onSection = Boolean(segment);

  // Admins who can open Business land there; everyone else — an employee with
  // only personal access — defaults to My profile.
  const fallback = canAccessSettingsSection("business", permissions)
    ? "business"
    : "my-profile";

  // ── ONLY A REAL SECTION IS GUARDED ──────────────────────────────────────
  //
  // A segment naming no section at all is the ROUTE's problem, and it has to
  // reach the route to become one. Guarding it here instead sent it to the
  // fallback — which is exactly the fall-through the whole route move exists to
  // end: `?section=training-disciplines` was linked from two training screens
  // for months, landed on Business, and looked like a page.
  //
  // Caught by the spec and not by anything else: `canAccessSettingsSection`
  // answers false for an id it does not know, which is right for a permission
  // question and wrong as an answer to "does this address exist".
  const guarded =
    Boolean(segment) && (Boolean(leaf) || segment!.startsWith("custom-"));
  const allowed =
    !guarded || canAccessSettingsSection(leaf?.id ?? segment!, permissions);

  // A denial is only worth saying out loud once the database has answered.
  // Until then `permissions` may be an empty map standing in for "we could not
  // find out", and every section would refuse — including the owner's.
  const resolved = usePermissionsResolved();
  const refused = !allowed && resolved;

  useEffect(() => {
    if (!allowed && !resolved) router.replace(settingsPath(fallback));
  }, [allowed, resolved, fallback, router, settingsPath]);

  return (
    <div className="space-y-6 p-6">
      {/* ── THE HEADER NAMES THE SECTION, NOT THE AREA (§5b2) ────────────
          §5b2 gives a screen one 32px title, and the screen here IS the
          section — fifty addresses that all printed the same `h1`, "Settings",
          with the section's own name demoted into a card below it.

          That is the client's "hard to use" in one line. Roles & permissions
          is 12,697px tall; scroll past the first card and nothing on screen
          says which of the fifty you are in. The index keeps "Settings",
          because there the page really is the area, and `← All settings`
          above the body carries the parent either way. */}
      <PageHeader
        title={onSection && leaf ? label.leaf(leaf) : label.text("title")}
        description={onSection ? undefined : label.text("description")}
      />

      {/* ── ONE ENTRY POINT: THE INDEX ────────────────────────────────────
          The rail used to stand beside every section. It was 51 leaves in
          nine groups — 2,202px, taller than every section but two — so it
          repeated the whole index next to one page of it, and it was the
          second copy of a list the index already shows better.

          A section is now reached from the index and left by "All settings",
          which makes the index the one place the fifty live. The body also
          stops being a 1fr column beside a fixed rail, so every screen gains
          266px of width — the wide tables and the report-card preview were
          the ones paying for it.

          Below lg this changes nothing: the rail was already `hidden`. */}
      <div>
        <div className="min-w-0 space-y-6">
          {onSection && (
            <Link
              href={index}
              // 48px below 1024px (§6 rule 7). It measured 20px — the height of
              // its own text — on every one of the 50 sections, which is the
              // shape rule 7 exists to catch: a link that is fine under a mouse
              // and a coin-toss under a thumb. `min-h` and padding rather than
              // `h`, because §5g's French strings wrap.
              className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm font-medium max-lg:min-h-12 max-lg:py-3"
            >
              <ArrowLeft className="size-4" />
              {label.text("allSettings")}
            </Link>
          )}
          {/* Three cases, and the middle one is the whole point of this block.

              ALLOWED — the section.

              REFUSED — the §5d2 "Permission denied" rung: pose `secure`, the
              violet ink #4C3BB8, and the sentence the system writes for it,
              verbatim, the same one src/app/forbidden.tsx uses. `surface="card"`
              because the layout survives: the header naming the section and
              the way back both stay, and only the body is replaced.

              NEITHER — nothing, while the redirect above is in flight.
              Rendering the section would flash a screen this viewer may not
              open.

              No action pill, and that is deliberate twice over. §5d2 names
              "Request access" as this pose's CTA and there is no request-access
              flow in the product — forbidden.tsx already recorded that, and a
              pill that performs nothing is what rule 9 and check:success-claims
              both exist to catch. The real destination, "All settings", is
              already on screen four lines above this, so a second copy of it
              inside the card would be the screen's one 48px control (§5b2)
              spent on a link the reader can already see.

              `data-slot` so a spec can measure the SECTION rather than the
              page: settings-french.spec.ts asserts the body is not empty, and
              without a handle its selector matched the whole shell — which is
              full of text from the rail even when the section renders nothing
              at all. That is exactly the case it was added to catch. */}
          <div data-slot="settings-section" className="space-y-6">
            {refused ? (
              <RouteState
                surface="card"
                pose="secure"
                icon={Lock}
                inkClassName="text-violet"
                title={label.text("deniedTitle")}
                description={label.text("deniedBody")}
                className="min-h-0 p-0"
              />
            ) : allowed ? (
              children
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
