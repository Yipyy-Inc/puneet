import { redirect } from "next/navigation";

import { settingsHref } from "@/lib/settings/nav";

// This was a 2,000-line screen of facility 11's fixture: a Fiserv block for a
// processor Yipyy does not use and Tap to Pay switches that saved nothing. A
// facility's real payment setup is Settings → Yipyy Pay, so an old link (or
// the onboarding step) lands there.
export default function OldPaymentSettingsPage() {
  redirect(settingsHref("yipyy-pay"));
}
