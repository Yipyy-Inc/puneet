"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  HelpCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  checkAccountHealth,
  quickBooksCreateAccountUrl,
  summariseWarnings,
  type AccountFinding,
} from "@/lib/quickbooks/account-requirements";
import {
  useQuickBooksConnection,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import { refresh, useQuickBooksData } from "@/lib/quickbooks/qb-data-cache";
import { patchQuickBooksSetup } from "@/lib/quickbooks/setup-store";

// ============================================================================
// Step 3 (Phase 3.3) — does this company's chart of accounts have what Yipyy
// needs?
//
// Table 1 lives in lib/quickbooks/account-requirements.ts as a pure function;
// this screen only renders its findings. Two rules from the spec shape the
// footer: an Income account and Accounts Receivable are hard requirements —
// without somewhere to book a sale and somewhere to park an unpaid invoice,
// nothing downstream can work — while every other gap is amber, skippable, and
// carried into the setup summary.
// ============================================================================

function FindingRow({
  finding,
  realmId,
}: {
  finding: AccountFinding;
  realmId?: string;
}) {
  const found = Boolean(finding.account);
  const blocking = !found && finding.level === "required";

  return (
    <li
      data-found={found}
      className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b p-3 last:border-b-0"
    >
      {found ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <AlertTriangle
          className={
            blocking
              ? "mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400"
              : "mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
          }
        />
      )}

      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm">
          {found ? (
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              Found — {finding.account?.Name}
            </span>
          ) : (
            <span
              className={
                blocking
                  ? "font-medium text-red-700 dark:text-red-400"
                  : "font-medium text-amber-700 dark:text-amber-400"
              }
            >
              Not found — {finding.label}
            </span>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`What is ${finding.label}?`}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline underline-offset-2"
              >
                <HelpCircle className="size-3.5" />
                What is this?
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {finding.explain}
            </TooltipContent>
          </Tooltip>
        </p>

        {found && finding.level === "required" && (
          <p className="text-muted-foreground text-xs">{finding.label}</p>
        )}

        {!found && (
          <p className="text-muted-foreground text-xs">
            {finding.fallback
              ? `Yipyy will post to "${finding.fallback.Name}" instead.`
              : blocking
                ? "Yipyy needs this account before it can post anything."
                : finding.fallbackNote}
          </p>
        )}
      </div>

      {!found && (
        <a
          href={quickBooksCreateAccountUrl(realmId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-sky-700 underline underline-offset-4 dark:text-sky-400"
        >
          Create this in QuickBooks
          <ExternalLink className="size-3" />
        </a>
      )}
    </li>
  );
}

export function QuickBooksAccountHealthCheck({
  scope,
  onContinue,
}: {
  scope: QuickBooksScope;
  onContinue?: () => void;
}) {
  const connection = useQuickBooksConnection(scope);
  const data = useQuickBooksData(scope);
  const [rechecking, setRechecking] = useState(false);

  const health = checkAccountHealth(data);
  const missing = health.findings.filter((f) => !f.account);

  async function handleRecheck() {
    setRechecking(true);
    await refresh(scope);
    setRechecking(false);
  }

  function handleContinue() {
    // The gaps they chose to live with follow them to the summary, so skipping
    // is a decision on the record rather than something that quietly vanishes.
    patchQuickBooksSetup(scope, {
      accountsReviewed: true,
      accountWarnings: summariseWarnings(health),
    });
    onContinue?.();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">
          Checking your chart of accounts
        </h1>
        <p className="text-muted-foreground text-sm">
          These are the accounts Yipyy posts to. Anything missing can be created
          in QuickBooks now, or left for later.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul>
            {health.findings.map((finding) => (
              <FindingRow
                key={finding.key}
                finding={finding}
                realmId={connection.realmId}
              />
            ))}
          </ul>
        </CardContent>
      </Card>

      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecheck}
            disabled={rechecking}
          >
            {rechecking ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-3.5" />
            )}
            Re-check
          </Button>
          <p className="text-muted-foreground text-xs">
            Created an account in QuickBooks? Re-check to pick it up.
          </p>
        </div>
      )}

      {!health.canProceed && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            {health.blocking.map((b) => b.label).join(" and ")}{" "}
            {health.blocking.length === 1 ? "is" : "are"} required. Create{" "}
            {health.blocking.length === 1 ? "it" : "them"} in QuickBooks, then
            re-check.
          </p>
        </div>
      )}

      {health.canProceed && health.warnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            You can continue without{" "}
            {health.warnings.length === 1
              ? "this account"
              : `these ${health.warnings.length} accounts`}
            . We&apos;ll note what Yipyy uses instead and show it again at the
            end of setup.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!health.canProceed}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          Continue
          <ArrowRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}
