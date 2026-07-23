"use client";

import { useState } from "react";
import { AlertTriangle, Building2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  disconnectQuickBooks,
  useQuickBooksConnection,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import { clearQuickBooksData } from "@/lib/quickbooks/qb-data-cache";
import {
  patchQuickBooksSetup,
  resetQuickBooksSetup,
} from "@/lib/quickbooks/setup-store";

// ============================================================================
// Step 2 (Section 3C) — confirm the company before anything is mapped.
//
// This step exists because everything after it is expensive to undo: mappings,
// sync settings and, eventually, real entries posted into someone's books. A
// facility with a personal QuickBooks and a business one can land on the wrong
// account without noticing, and the cost of asking here is one click.
// ============================================================================

const COUNTRY_LABEL: Record<string, string> = {
  CA: "Canada",
  US: "United States",
  GB: "United Kingdom",
  AU: "Australia",
};

export function QuickBooksCompanyConfirmCard({
  scope,
  onConfirmed,
}: {
  scope: QuickBooksScope;
  onConfirmed?: () => void;
}) {
  const connection = useQuickBooksConnection(scope);
  const [busy, setBusy] = useState(false);

  function handleYes() {
    patchQuickBooksSetup(scope, { companyConfirmed: true });
    onConfirmed?.();
  }

  function handleNo() {
    setBusy(true);
    // Everything read from — and decided about — the rejected company goes with
    // it. Leaving the cache behind would let the next connect open on the wrong
    // company's chart of accounts.
    disconnectQuickBooks(scope);
    clearQuickBooksData(scope);
    resetQuickBooksSetup(scope);
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardContent className="space-y-5 py-7">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 className="size-6" />
            </span>
            <h1 className="text-lg font-semibold tracking-tight">
              Is this the right QuickBooks company?
            </h1>
            <p className="text-muted-foreground text-sm">
              Everything Yipyy posts from now on goes into these books.
            </p>
          </div>

          <dl className="divide-y rounded-lg border text-sm">
            <div className="flex items-center justify-between gap-4 p-3">
              <dt className="text-muted-foreground">Company</dt>
              <dd className="text-right font-semibold">
                {connection.companyName ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 p-3">
              <dt className="text-muted-foreground">Country</dt>
              <dd className="text-right font-medium">
                {connection.companyCountry
                  ? (COUNTRY_LABEL[connection.companyCountry] ??
                    connection.companyCountry)
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 p-3">
              <dt className="text-muted-foreground">Currency</dt>
              <dd className="text-right font-medium">
                {connection.companyCurrency ?? "—"}
              </dd>
            </div>
          </dl>

          {connection.companyCurrency &&
            connection.companyCurrency !== "CAD" && (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <p>
                  This company&apos;s currency is {connection.companyCurrency},
                  which doesn&apos;t match the currency Yipyy charges in. Totals
                  will not reconcile.
                </p>
              </div>
            )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              onClick={handleYes}
              disabled={busy}
              className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Yes, continue
            </Button>
            <Button
              variant="outline"
              onClick={handleNo}
              disabled={busy}
              className="flex-1"
            >
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
              No, disconnect and try a different account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
