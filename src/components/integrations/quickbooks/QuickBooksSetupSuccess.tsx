"use client";

import { useMemo } from "react";
import { AlertTriangle, ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { withPeriod } from "@/lib/quickbooks/format";
import {
  useQuickBooksConnection,
  type QuickBooksScope,
} from "@/lib/quickbooks/connection-store";
import {
  mappingProgress,
  useQuickBooksMappings,
} from "@/lib/quickbooks/mappings-store";
import { useQuickBooksData } from "@/lib/quickbooks/qb-data-cache";
import {
  SYNC_TRIGGER_LABEL,
  useQuickBooksSettings,
} from "@/lib/quickbooks/settings-store";
import { useQuickBooksSetup } from "@/lib/quickbooks/setup-store";
import { buildMappableGroups } from "@/lib/quickbooks/yipyy-catalog";

// The end of setup. Full screen, one message, and the numbers that matter — a
// facility should be able to read this and know exactly what they just turned
// on, including the gaps they chose to skip.

export function QuickBooksSetupSuccess({
  scope,
  testDocumentNumber,
  onViewDashboard,
}: {
  scope: QuickBooksScope;
  testDocumentNumber?: string;
  onViewDashboard: () => void;
}) {
  const connection = useQuickBooksConnection(scope);
  const settings = useQuickBooksSettings(scope);
  const setup = useQuickBooksSetup(scope);
  const data = useQuickBooksData(scope);
  const mappings = useQuickBooksMappings(scope);

  const groups = useMemo(() => buildMappableGroups(), []);
  const progress = mappingProgress(groups, mappings);
  const depositAccount = data.accounts.find(
    (a) => a.Id === settings.depositAccountId,
  );

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-10 text-center">
      {/* The tick draws itself in — a beat of confirmation, not decoration. */}
      <span className="mb-6 flex size-16 animate-[scale-in_240ms_ease-out] items-center justify-center rounded-full bg-emerald-500/10">
        <Check
          className="size-9 text-emerald-600 dark:text-emerald-400"
          strokeWidth={3}
        />
      </span>

      <h1 className="text-2xl font-semibold tracking-tight">
        QuickBooks is connected!
      </h1>
      <p className="text-muted-foreground mt-2 text-sm">
        Yipyy is now posting to{" "}
        <span className="text-foreground font-medium">
          {withPeriod(connection.companyName)}
        </span>{" "}
        From here on, every sale, payment and refund reaches your books on its
        own.
      </p>

      <dl className="mt-6 w-full divide-y rounded-lg border text-sm">
        <div className="flex items-center justify-between gap-4 p-3">
          <dt className="text-muted-foreground">Services mapped</dt>
          <dd className="font-semibold">
            {progress.mapped} of {progress.total}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 p-3">
          <dt className="text-muted-foreground">Sync mode</dt>
          <dd className="font-medium">
            {SYNC_TRIGGER_LABEL[settings.syncTrigger]}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 p-3">
          <dt className="text-muted-foreground">Payment account</dt>
          <dd className="font-medium">{depositAccount?.Name ?? "—"}</dd>
        </div>
        {testDocumentNumber && (
          <div className="flex items-center justify-between gap-4 p-3">
            <dt className="text-muted-foreground">Test entry</dt>
            <dd className="font-medium">
              {testDocumentNumber} · posted and removed
            </dd>
          </div>
        )}
      </dl>

      {/* The amber rows they clicked past in step 3, shown one last time
          instead of quietly disappearing. */}
      {setup.accountWarnings.length > 0 && (
        <div className="mt-4 w-full space-y-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <p className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="size-3.5" />
            Worth knowing
          </p>
          <ul className="list-disc space-y-0.5 pl-5">
            {setup.accountWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {progress.mapped < progress.total && (
        <p className="text-muted-foreground mt-4 text-xs">
          {progress.total - progress.mapped} unmapped{" "}
          {progress.total - progress.mapped === 1 ? "item posts" : "items post"}{" "}
          to “Yipyy Unassigned Income” and are flagged in the sync log.
        </p>
      )}

      <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row-reverse">
        <Button
          onClick={onViewDashboard}
          className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          View integration dashboard
          <ArrowRight className="ml-1 size-4" />
        </Button>
        <Button variant="outline" onClick={onViewDashboard} className="flex-1">
          Done
        </Button>
      </div>
    </div>
  );
}
