"use client";

import { YipyyGoSettings } from "@/components/yipyygo/YipyyGoSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { useYipyyGoConfig } from "@/lib/api/facility-settings";

// ── NOTHING RENDERS UNTIL THE FACILITY'S OWN SETUP HAS ARRIVED ────────────
//
// The editor seeds `useState` from what it is handed and a `useState`
// initialiser runs ONCE, so mounting it against the fallback and letting the
// query land afterwards would show Yipyy Go switched OFF whatever the facility
// had saved — and the first Save would write that back over their own setup.
// This is the shape `check:settings-seeding` exists to catch.
//
// `key` on `configured` remounts the editor if a facility's first row appears
// under it, so the draft it holds is the one it was handed.
//
// The facility comes from the session, not from here. The old wrapper carried
// `const facilityId = 11; // TODO: Get from auth context` and passed it into a
// fixture lookup, so every browser edited the same demo facility's config.
export function YipyyGoSettingsWrapper() {
  const { config, configured, isPending } = useYipyyGoConfig();

  if (isPending) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <YipyyGoSettings
      key={configured ? "stored" : "default"}
      initialConfig={config}
    />
  );
}
