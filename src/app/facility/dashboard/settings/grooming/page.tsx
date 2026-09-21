import { redirect } from "next/navigation";

// ============================================================================
// Settings → grooming goes STRAIGHT to the module's own settings.
//
// This route used to render an interstitial: one card whose only content was a
// link reading "Open grooming settings →", and a calendar-colour picker. Two
// clicks to reach a screen that was never anywhere else, and a colour control
// filed under a heading nobody opens to change a colour.
//
// Reported by the client on 2026-09-21 — "when I click that it shows this page
// with colours and then the settings, this shouldn't be like this" — and they
// were right: the page had nothing of its own to say.
//
// The route stays because `src/lib/settings/nav.ts` is the single list the
// rail, the index, the redirects and the permission guard all read, and a
// section that is not in it does not exist. It redirects rather than being
// deleted, so the rail entry, the index card, a bookmark and `?section=grooming`
// all land in the same place.
// ============================================================================

export default function Page() {
  redirect("/facility/dashboard/services/grooming/settings");
}
