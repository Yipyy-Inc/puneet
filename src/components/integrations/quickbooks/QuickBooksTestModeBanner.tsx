"use client";

import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useQuickBooksConnection,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import { goLive, isTestMode } from "@/lib/quickbooks/test-mode";

// ============================================================================
// The always-on Test-mode banner (Phase 10).
//
// Test mode has to be impossible to forget you're in: a facility that thinks
// they went live but is still posting to a sandbox loses a month of books to a
// test company. So this sits above everything on the dashboard whenever the
// connection is a sandbox, and carries the one-click way out.
// ============================================================================

export function QuickBooksTestModeBanner({
  scope,
}: {
  scope: QuickBooksScope;
}) {
  const connection = useQuickBooksConnection(scope);
  const [busy, setBusy] = useState(false);

  if (!isTestMode(connection)) return null;

  async function handleGoLive() {
    setBusy(true);
    await goLive(scope);
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-amber-400/50 bg-amber-50 p-3 text-sm dark:border-amber-800/60 dark:bg-amber-950/30">
      <FlaskConical className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="min-w-0 flex-1 text-amber-800 dark:text-amber-300">
        <span className="font-semibold">Test mode.</span> Everything is syncing
        to a QuickBooks Sandbox — {connection.companyName} — not your real
        books. Nothing here counts.
      </p>
      <Button
        size="sm"
        disabled={busy}
        onClick={handleGoLive}
        className="bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {busy && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
        Go live
      </Button>
    </div>
  );
}
