"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { QuickBooksScope } from "@/lib/quickbooks/connection-store";
import {
  CLASS_TRACKING_REQUIRED_MESSAGE,
  facilityLocations,
  PLAN_LABEL,
  planSupportsClasses,
} from "@/lib/quickbooks/location-classes";
import {
  depositAccounts,
  ensureUnassignedIncomeAccount,
  useQuickBooksData,
} from "@/lib/quickbooks/qb-data-cache";
import {
  historicalRangeDays,
  isLargeHistoricalRange,
  patchQuickBooksSettings,
  useQuickBooksSettings,
  type DocumentRule,
  type RefundHandling,
  type SyncTrigger,
  type TaxHandling,
} from "@/lib/quickbooks/settings-store";
import { patchQuickBooksSetup } from "@/lib/quickbooks/setup-store";
import { runQuickBooksTestSync } from "@/lib/quickbooks/test-sync";

// Step 5 (Table 3) — how syncing behaves, then Finish Setup.

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 border-b p-4 last:border-b-0">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
      <div className="pt-1">{children}</div>
    </div>
  );
}

const SYNC_TRIGGERS: { value: SyncTrigger; label: string; hint: string }[] = [
  {
    value: "realtime",
    label: "Real-time",
    hint: "Each payment posts as it's taken.",
  },
  {
    value: "daily",
    label: "Daily batch",
    hint: "Everything from the day posts overnight.",
  },
  {
    value: "manual",
    label: "Manual only",
    hint: "Nothing posts until you send it.",
  },
];

const DOCUMENT_RULES: { value: DocumentRule; label: string; hint: string }[] = [
  {
    value: "auto",
    label: "Match the payment (recommended)",
    hint: "Paid in full becomes a Sales Receipt; an outstanding balance becomes an Invoice.",
  },
  {
    value: "always_sales_receipt",
    label: "Always a Sales Receipt",
    hint: "Simplest books, but unpaid balances won't appear in Accounts Receivable.",
  },
  {
    value: "always_invoice",
    label: "Always an Invoice",
    hint: "Every sale runs through Accounts Receivable, even when paid on the spot.",
  },
];

export function QuickBooksSyncSettings({
  scope,
  onFinished,
}: {
  scope: QuickBooksScope;
  onFinished: (documentNumber: string) => void;
}) {
  const data = useQuickBooksData(scope);
  const settings = useQuickBooksSettings(scope);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stranded, setStranded] = useState<string | undefined>();

  // Phase 8 — the branch list comes from the HQ/locations model, not a list
  // invented for this screen.
  const locations = useMemo(
    () => facilityLocations(scope.facilityId),
    [scope.facilityId],
  );
  const classesAvailable = planSupportsClasses(data.plan);

  const banks = depositAccounts(data);
  const discountChoices = data.accounts.filter(
    (a) => a.Active && a.Classification === "Revenue",
  );

  // Defaults come from the company that was actually read, not a hardcoded id.
  const depositDefault =
    settings.depositAccountId ??
    banks.find((a) => a.AccountSubType === "UndepositedFunds")?.Id ??
    banks[0]?.Id;
  const discountDefault =
    settings.discountAccountId ??
    discountChoices.find((a) => a.AccountSubType === "DiscountsRefundsGiven")
      ?.Id;

  const set = (patch: Parameters<typeof patchQuickBooksSettings>[1]) =>
    patchQuickBooksSettings(scope, patch);

  async function handleFinish() {
    setBusy(true);
    setError(null);
    setStranded(undefined);

    // Persist the two defaults the facility never touched, so what runs is what
    // the screen showed rather than an implicit fallback.
    set({
      depositAccountId: depositDefault,
      discountAccountId: discountDefault,
    });

    // Anything left unmapped needs somewhere to land (3.4 RULE).
    ensureUnassignedIncomeAccount(scope);

    const result = await runQuickBooksTestSync(scope);
    if (!result.ok) {
      setError(result.message);
      setStranded(result.strandedDocumentNumber);
      setBusy(false);
      return;
    }

    patchQuickBooksSetup(scope, { setupComplete: true });
    setBusy(false);
    onFinished(result.documentNumber);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Sync settings</h1>
        <p className="text-muted-foreground text-sm">
          How and when Yipyy posts to QuickBooks. All of this can be changed
          later.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Field label="When should Yipyy sync?">
            <RadioGroup
              value={settings.syncTrigger}
              onValueChange={(v) => set({ syncTrigger: v as SyncTrigger })}
              className="gap-2"
            >
              {SYNC_TRIGGERS.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-start gap-2 text-sm"
                >
                  <RadioGroupItem value={o.value} className="mt-0.5" />
                  <span>
                    {o.label}
                    <span className="text-muted-foreground block text-xs">
                      {o.hint}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </Field>

          <Field
            label="Payment deposit account"
            hint="Where payments land until you reconcile your bank."
          >
            <Select
              value={depositDefault ?? ""}
              onValueChange={(v) => set({ depositAccountId: v })}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((a) => (
                  <SelectItem key={a.Id} value={a.Id}>
                    {a.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Invoice or Sales Receipt?">
            <RadioGroup
              value={settings.documentRule}
              onValueChange={(v) => set({ documentRule: v as DocumentRule })}
              className="gap-2"
            >
              {DOCUMENT_RULES.map((o) => (
                <label
                  key={o.value}
                  className="flex cursor-pointer items-start gap-2 text-sm"
                >
                  <RadioGroupItem value={o.value} className="mt-0.5" />
                  <span>
                    {o.label}
                    <span className="text-muted-foreground block text-xs">
                      {o.hint}
                    </span>
                  </span>
                </label>
              ))}
            </RadioGroup>
          </Field>

          <Field
            label="Tax handling"
            hint="Yipyy's rates are recommended: they're the amounts your clients were actually charged."
          >
            <RadioGroup
              value={settings.taxHandling}
              onValueChange={(v) => set({ taxHandling: v as TaxHandling })}
              className="gap-2"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="yipyy" />
                Use Yipyy tax rates (recommended)
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="quickbooks" />
                Recalculate with QuickBooks tax rates
              </label>
            </RadioGroup>
          </Field>

          <Field
            label="Refunds"
            hint="A refund has already left your till — holding it back leaves your books showing income you no longer have."
          >
            <RadioGroup
              value={settings.refundHandling}
              onValueChange={(v) =>
                set({ refundHandling: v as RefundHandling })
              }
              className="gap-2"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="auto" />
                Sync refunds automatically
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <RadioGroupItem value="manual" />
                Hold refunds for manual approval
              </label>
            </RadioGroup>
          </Field>

          {/* Phase 8 — only worth showing to a facility that has branches. A
              single-location business has nothing to split. */}
          {locations.length > 1 && (
            <Field
              label="Track by location"
              hint="Tag every document with the QuickBooks Class for the branch it came from, so one company's books still give you a P&L per location."
            >
              <div className="flex items-start gap-3">
                <Switch
                  checked={
                    Boolean(settings.trackByLocation) && classesAvailable
                  }
                  disabled={!classesAvailable}
                  onCheckedChange={(v) => set({ trackByLocation: v })}
                  aria-label="Track by location"
                />
                <div className="min-w-0 space-y-1">
                  <p
                    data-disabled={!classesAvailable}
                    className="data-[disabled=true]:text-muted-foreground text-sm"
                  >
                    {locations.length} locations ·{" "}
                    {locations
                      .slice(0, 3)
                      .map((l) => l.name)
                      .join(", ")}
                    {locations.length > 3 ? "…" : ""}
                  </p>
                  {classesAvailable ? (
                    settings.trackByLocation && (
                      <p className="text-muted-foreground text-xs">
                        Map each location to a Class on the next step.
                      </p>
                    )
                  ) : (
                    // The RULE: say what's missing and which plan has it,
                    // rather than letting them switch it on and collect
                    // rejected postings for a month.
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {CLASS_TRACKING_REQUIRED_MESSAGE}
                      <span className="text-muted-foreground ml-1 font-normal">
                        This company is on {PLAN_LABEL[data.plan]}.
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </Field>
          )}

          <Field
            label="Discount account"
            hint="Discounts post here as their own line, so your gross revenue stays visible."
          >
            <Select
              value={discountDefault ?? ""}
              onValueChange={(v) => set({ discountAccountId: v })}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {discountChoices.map((a) => (
                  <SelectItem key={a.Id} value={a.Id}>
                    {a.Name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Sync past transactions">
            <div className="flex items-center gap-3">
              <Switch
                checked={settings.syncHistorical}
                onCheckedChange={(v) => set({ syncHistorical: v })}
                aria-label="Sync past transactions"
              />
              <span className="text-muted-foreground text-xs">
                Off by default — new sales only.
              </span>
            </div>

            {settings.syncHistorical && (
              <div className="mt-3 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <DatePicker
                      value={settings.historicalFrom}
                      onValueChange={(v) =>
                        set({ historicalFrom: v || undefined })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <DatePicker
                      value={settings.historicalTo}
                      onValueChange={(v) =>
                        set({ historicalTo: v || undefined })
                      }
                    />
                  </div>
                </div>

                {isLargeHistoricalRange(settings) && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>
                      That&apos;s {historicalRangeDays(settings)} days of past
                      sales. Yipyy will create a QuickBooks entry for every one
                      of them, and removing them afterwards is manual work in
                      QuickBooks. Start with a shorter range if you&apos;re
                      unsure.
                    </p>
                  </div>
                )}
              </div>
            )}
          </Field>
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        >
          <p className="flex items-start gap-2 font-medium">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
          {stranded && (
            <p className="pl-6">
              Test entry left in QuickBooks: <strong>{stranded}</strong>
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <p className="text-muted-foreground text-xs">
          Finishing runs a test entry and removes it again.
        </p>
        <Button
          onClick={handleFinish}
          disabled={busy}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {busy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 size-4" />
          )}
          {busy ? "Testing…" : error ? "Try again" : "Finish setup"}
        </Button>
      </div>
    </div>
  );
}
