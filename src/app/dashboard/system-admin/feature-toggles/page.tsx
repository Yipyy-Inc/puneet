import { redirect } from "next/navigation";

// The feature-flags console moved to /dashboard/platform/flags (4 tabs:
// Tenant Modules, Global Flags, Tier Defaults, Per-Facility Overrides).
// Redirect any old links/bookmarks there.
export default function FeatureTogglesPage() {
  redirect("/dashboard/platform/flags");
}
