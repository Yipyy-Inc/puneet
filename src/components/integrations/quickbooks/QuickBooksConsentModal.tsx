"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Landmark,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { QuickBooksScope } from "@/lib/quickbooks/connection-store";
import {
  cancelQuickBooksConnect,
  connectQuickBooks,
  getQuickBooksConsentCompany,
  QUICKBOOKS_CONSENT,
} from "@/lib/quickbooks/oauth-mock";
import { readQuickBooksData } from "@/lib/quickbooks/qb-data-cache";

// ============================================================================
// Part 3.2 — the simulated QuickBooks consent screen.
//
// Stands in for the page Intuit hosts. It names the company being authorised
// before anything is granted, lists exactly what Yipyy will read and create,
// and offers a real way out. Approving runs the mock token exchange and the
// company read; both are separate calls here because both are separate calls
// against the real API.
//
// TODO: real QuickBooks OAuth 2.0 (Intuit) — this whole dialog is replaced by a
// redirect to Intuit's authorization endpoint and a callback route.
// ============================================================================

/** Shown whenever the connection didn't happen, however it didn't happen — a
 *  facility that hit Cancel by accident and one whose token exchange failed
 *  both need the same next step. */
const RETRY_HINT =
  "Make sure you're logged in to the correct QuickBooks account.";

type Phase = "consent" | "connecting" | "success" | "error";

export function QuickBooksConsentModal({
  open,
  scope,
  onOpenChange,
  onContinue,
}: {
  open: boolean;
  scope: QuickBooksScope;
  onOpenChange: (open: boolean) => void;
  /** Fired when the facility presses "Continue to setup". */
  onContinue: () => void;
}) {
  const company = getQuickBooksConsentCompany();
  const [phase, setPhase] = useState<Phase>("consent");
  const [error, setError] = useState<string | null>(null);

  // Reopening after a cancelled or failed attempt must start at consent again,
  // not on the error the facility already dismissed.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhase("consent");
    setError(null);
  }, [open]);

  async function handleConnect() {
    setPhase("connecting");
    setError(null);

    const result = await connectQuickBooks(scope);
    if (!result.ok) {
      setError(result.message);
      setPhase("error");
      return;
    }

    // Read the chart of accounts, items, customers and tax codes into the
    // cache. A read failure does NOT undo the connection — the facility is
    // authorised, and the health check's "Re-check" retries the read.
    await readQuickBooksData(scope);
    setPhase("success");
  }

  function handleCancel() {
    const cancelled = cancelQuickBooksConnect();
    setError(cancelled.message);
    setPhase("error");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Dismissing mid-flight would leave a spinner running against a closed
        // dialog; the facility can cancel explicitly instead.
        if (phase === "connecting") return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {phase === "success" ? (
          <>
            <DialogHeader>
              <div className="flex flex-col items-center gap-3 pt-2 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="size-7 text-emerald-600 dark:text-emerald-400" />
                </span>
                <DialogTitle className="text-emerald-700 dark:text-emerald-400">
                  QuickBooks connected — {company.name}
                </DialogTitle>
                <DialogDescription>
                  We&apos;ve read your chart of accounts, products and services.
                  Next, confirm this is the right company and map your services.
                </DialogDescription>
              </div>
            </DialogHeader>
            <DialogFooter>
              <Button
                onClick={onContinue}
                className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Continue to setup
                <ArrowRight className="ml-1 size-4" />
              </Button>
            </DialogFooter>
          </>
        ) : phase === "error" ? (
          <>
            <DialogHeader>
              <div className="flex flex-col items-center gap-3 pt-2 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-red-500/10">
                  <AlertTriangle className="size-7 text-red-600 dark:text-red-400" />
                </span>
                <DialogTitle>Couldn&apos;t connect to QuickBooks</DialogTitle>
                <DialogDescription>{error}</DialogDescription>
              </div>
            </DialogHeader>
            <p className="text-muted-foreground bg-muted/40 rounded-md border p-3 text-center text-xs">
              {RETRY_HINT}
            </p>
            <DialogFooter className="gap-2 sm:justify-center">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setPhase("consent")}>Try again</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-500 to-green-700 text-white">
                  <Landmark className="size-5" />
                </span>
                <div className="min-w-0">
                  <DialogTitle className="text-base">
                    Authorise QuickBooks
                  </DialogTitle>
                  <DialogDescription className="mt-0.5">
                    Signed in to QuickBooks Online
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-1">
              <p className="text-sm">
                <span className="font-medium">Yipyy</span> would like to access
                your QuickBooks company:{" "}
                <span className="font-semibold">{company.name}</span>
              </p>

              <div className="space-y-3 rounded-md border p-3">
                <div>
                  <p className="text-xs font-semibold">Read</p>
                  <p className="text-muted-foreground text-xs">
                    {QUICKBOOKS_CONSENT.reads.join(" · ")}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold">Create</p>
                  <p className="text-muted-foreground text-xs">
                    {QUICKBOOKS_CONSENT.writes.join(" · ")}
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground text-xs">
                Yipyy never edits or deletes entries that are already in your
                books. You can disconnect at any time.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="ghost"
                onClick={handleCancel}
                disabled={phase === "connecting"}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConnect}
                disabled={phase === "connecting"}
                className="bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {phase === "connecting" && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {phase === "connecting" ? "Connecting…" : "Connect"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
