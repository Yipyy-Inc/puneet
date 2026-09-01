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
  return <CallingWorkspace initialTab={resolveTab(params.tab)} />;
}
