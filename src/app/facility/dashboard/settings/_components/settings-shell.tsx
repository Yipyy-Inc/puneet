"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import {
  SettingsSidebar,
  canAccessSettingsSection,
} from "@/components/facility/SettingsSidebar";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import {
  settingsIndexHref,
  settingsLeaf,
  settingsPortalFor,
} from "@/lib/settings/nav";
import { useSettingsHref } from "@/lib/settings/use-settings-href";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// THE CHROME AROUND EVERY SETTINGS SCREEN — AND THE GUARD.
//
// Lives in settings/layout.tsx rather than inside a page, which is the whole
// reason to have routes: the rail renders once and survives navigation instead
// of unmounting and remounting — losing which groups were collapsed — under
// every click.
//
// ── THE RAIL BELONGS TO A SECTION, NOT TO THE INDEX ──────────────────────
//
// At /settings the index IS the list of sections, so a rail beside it prints
// the same 51 items twice — which is what the first build of this did, and it
// looked exactly as bad as it sounds. The rail appears once you are inside a
// section, where it is the quick way to the next one.
//
// Below lg it is one panel either way: the index is the list, a section is the
// section. That used to be useState(mobileShowDetail) seeded from whether a
// ?section= was present; the route answers it now, so "All settings" is a real
// link to a real address and a phone reload lands where it was.
//
// ── ONE PERMISSION GUARD, FOR ALL 50 SECTIONS ────────────────────────────
//
// This was inside the switchboard, which every section rendered through. The
// switchboard is gone — each section is its own route now — so the guard moved
// UP rather than being copied 50 times. A section added tomorrow is guarded
// because it is inside this layout, not because somebody remembered.
//
// It stays a redirect rather than a refusal, deliberately. `myPermissions()`
// returns an empty map on any RPC error, so "denied" and "we could not find
// out" are the same value here; refusing on it would lock an owner out of their
// own settings on one transient failure. The server routes refuse. What this
// does is keep the address bar honest — it used to render Business while the
// URL still said `taxes`.
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

  useEffect(() => {
    if (!allowed) router.replace(settingsPath(fallback));
  }, [allowed, fallback, router, settingsPath]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={label.text("title")}
        description={label.text("description")}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ── STICKY, BECAUSE THE RAIL IS TALLER THAN WHAT IT NAVIGATES TO ──
            51 leaves in nine groups is 2,202px — taller than every section
            but two, and taller than the viewport on any laptop. Left in the
            flow it set the height of the whole row, so a 332px screen
            (Locations) came with 1,870px of nothing beside it, and reaching
            the rail again meant scrolling back up past a screen you had
            already read.

            `max-h`/`overflow-y-auto` so the rail scrolls inside itself
            rather than the page: a sticky element taller than the viewport
            pins its TOP and hides its own bottom, which would have put the
            last two groups permanently out of reach. */}
        {onSection && (
          <div className="hidden lg:block">
            <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
              <SettingsSidebar activeSection={leaf?.id ?? segment ?? ""} />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-6">
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
          {/* Nothing while the redirect above is in flight: rendering the
              section would flash a screen this viewer may not open. */}
          {allowed ? children : null}
        </div>
      </div>
    </div>
  );
}
