import { RequirePermission } from "@/components/employee/AccessRestricted";
import { callingSystemStatus } from "@/lib/calling/system-status";

import { CallingWorkspace } from "./_components/CallingWorkspace";

// ============================================================================
// Communication → Calling.
//
// A Server Component whose only job is to resolve the tab from the query
// string. Everything interactive lives in CallingWorkspace, which is a client
// component — the split exists so this file can read `searchParams` at all.
//
// ── WHY THIS ROUTE READS A TAB ────────────────────────────────────────────
//
// `smartInsightLinks.calling()` (src/lib/smart-insights/links.ts) has always
// produced `/facility/dashboard/calling?tab=voicemail`, and the page has always
// ignored it — the tab was `useState("live")` with nothing reading the URL. So
// every Smart Insight linking a voicemail landed the reader on the Live tab and
// left them to find it.
//
// `missed` is aliased rather than dropped: the same helper emits it, there is
// no Missed tab, and unanswered calls are what the Live tab is for. An unknown
// value falls back to Live rather than rendering an empty Tabs body.
//
// ── WHY THIS ROUTE IS GATED, AND WHO IT ACTUALLY STOPS ────────────────────
//
// /employee/calling wrapped this same component in `calling_view` from the day
// it was written. This route rendered it bare. Two doors onto one component,
// one of them locked, is not a design — it is the older door never having been
// fixed.
//
// But be precise about what this catches, because the obvious answer is wrong.
// `canAccessFacilityPortal` requires `isFacilityAdmin` — access_level 'admin' —
// so a groomer typing this URL is redirected to /employee/schedule before the
// route renders. MEASURED: only owner and manager reach the facility portal at
// all, and both hold calling_view by default. On a stock facility this gate
// fires for nobody.
//
// What makes it reachable is the role editor. `facility_role_permissions` lets
// an owner set calling_view to 'none' for managers, and until this gate existed
// that revocation hid the nav link and left the whole module answering at its
// URL. Verified by revoking it and loading this page.
//
// So: not a hole being closed, a revocation being honoured. The security
// boundary remains RLS (`call_record_read`) and the route, which refuse a caller
// without the permission whatever this renders. This decides whether someone is
// shown a Calling screen at all, rather than an empty one they would reasonably
// read as "no calls".
// ============================================================================

const TABS = [
  "live",
  "dialer",
  "calls",
  "voicemail",
  "recordings",
  "ivr",
  "analytics",
  "settings",
] as const;

/** Query values that name a real destination under a different word. */
const ALIASES: Record<string, (typeof TABS)[number]> = {
  missed: "live",
};

function resolveTab(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "live";
  if ((TABS as readonly string[]).includes(value)) return value;
  return ALIASES[value] ?? "live";
}

export default async function CallingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <RequirePermission
      permKey="calling_view"
      home={{ href: "/facility/dashboard", label: "Go to the dashboard" }}
    >
      <CallingWorkspace
        initialTab={resolveTab(params.tab)}
        systemStatus={callingSystemStatus()}
      />
    </RequirePermission>
  );
}
