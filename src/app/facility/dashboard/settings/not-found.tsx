"use client";

import { usePathname } from "next/navigation";
import { CircleHelp, Settings } from "lucide-react";

import { RouteState } from "@/components/ui/route-state";
import { settingsIndexHref, settingsPortalFor } from "@/lib/settings/nav";

// ============================================================================
// A settings address that names no section.
//
// §5d2's state ladder, "Not found · 404": pose `confused`, neutral ink rather
// than error — §5d2 gives neutral "nothing wrong, nothing happening", and an
// address that moved is not a fault.
//
// ── THIS RUNG IS WHY THE GUARD WAS NARROWED ──────────────────────────────
//
// `settings-shell.tsx` guards a segment ONLY when it names a real leaf, and
// its comment says why: `?section=training-disciplines` was linked from two
// training screens for months, got sent to the fallback, and looked like a
// page. A segment naming no section is the ROUTE's problem and has to reach
// the route to become one — this is the thing it reaches.
//
// ── THE DESTINATION IS RESOLVED, NOT WRITTEN ─────────────────────────────
//
// It goes to the settings index rather than `/`: somebody who mistyped a
// settings address wants the list of sections, not their dashboard. But the
// index is NOT `/facility/dashboard/settings` — writing that is what
// `check:settings-routes` caught here, and it was right. The employee shell
// re-exports these same components, so a facility path bounces a groomer out
// of their own portal. The portal comes off the pathname, exactly as
// settings-shell.tsx does it.
// ============================================================================
export default function SettingsNotFound() {
  const pathname = usePathname() ?? "";
  const index = settingsIndexHref(settingsPortalFor(pathname));

  return (
    <RouteState
      surface="card"
      pose="confused"
      icon={CircleHelp}
      inkClassName="text-ink-secondary"
      title="That settings section has moved"
      description="The link may be out of date, or the section now lives under a different heading."
      action={{ label: "Go to all settings", icon: Settings, href: index }}
      className="min-h-0 p-0"
    />
  );
}
