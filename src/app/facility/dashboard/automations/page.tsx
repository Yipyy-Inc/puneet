import { AutomationsClient } from "./_components/automations-client";

// ============================================================================
// Automations.
//
// A Server Component, per the build-performance rules — the previous version
// was 879 lines of `"use client"` in the page file itself, which is both of the
// things CLAUDE.md asks pages not to be.
//
// Everything interactive lives in `_components/automations-client.tsx`.
// ============================================================================

export default function AutomationsPage() {
  return <AutomationsClient />;
}
