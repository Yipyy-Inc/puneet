"use client";

import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useSaveYipyyPayConfig,
  type YipyyPayOverview,
} from "@/lib/api/yipyy-pay";
import { BusinessIllustration } from "../illustrations";

// ============================================================================
// Step 2 — the business, read back rather than re-typed.
//
// ── WHY THERE IS NO FORM HERE ─────────────────────────────────────────────
//
// The spec asks for a business-verification form: EIN, social security number,
// bank routing and account numbers, and an IRS confirmation letter to upload
// when the tax number is too new to have propagated.
//
// There is nowhere to send any of it. Clover collects all of that itself, from
// the merchant, when the account is opened — and publishes no endpoint through
// which an integration could submit or amend it. A form here would take a
// facility's social security number, validate the shape of it, say "verifying",
// and drop it on the floor. That is not a smaller version of the feature; it is
// the opposite of it.
//
// So this step shows what Clover already holds and asks the facility to confirm
// it is theirs. That is a genuinely useful check — it is where a facility
// notices they authorised the wrong merchant out of the two they own — and it
// is honest about who verified what.
//
// ── THE CURRENCY CHECK IS NOT COSMETIC ────────────────────────────────────
//
// `chargeCard` refuses a merchant whose currency we do not know rather than
// guessing USD. So a connection missing it is not "connected with a blank
// field", it is an account that cannot take a payment — and this is the screen
// where that has to be said, not the checkout where somebody finds out with a
// customer standing there.
// ============================================================================

function Fact({
  label,
  value,
  ok,
}: {
  label: string;
  value: string | null;
  /** Undefined means "nothing to assert" — a blank address is not a fault. */
  ok?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="flex min-w-0 items-center gap-2 text-right">
        <span
          className={cn(
            "truncate text-sm font-medium",
            !value && "text-muted-foreground font-normal italic",
          )}
        >
          {value ?? "Not provided"}
        </span>
        {ok === true && (
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        )}
        {ok === false && (
          <TriangleAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
      </span>
    </div>
  );
}

export function Step2Business({
  overview,
  chargeable,
  onConfirmed,
}: {
  overview: YipyyPayOverview;
  chargeable: boolean;
  onConfirmed: () => void;
}) {
  const { connection, merchant, config } = overview;
  const save = useSaveYipyyPayConfig();
  const queryClient = useQueryClient();
  const [rechecking, setRechecking] = useState(false);

  const address = [
    merchant?.addressLine,
    merchant?.city,
    merchant?.region,
    merchant?.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const sandbox = connection.environment === "sandbox";

  const confirm = async () => {
    try {
      // Only the progress marker moves. Nothing about the business is written,
      // because nothing about the business is ours to write.
      await save.mutateAsync({ ...config, setupStep: 3 });
      onConfirmed();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "That could not be saved.",
      );
    }
  };

  const recheck = async () => {
    setRechecking(true);
    // Re-reads the merchant from Clover through the overview route. A facility
    // who has just fixed something on Clover's side should not have to reload
    // the page to see it.
    await queryClient.invalidateQueries({ queryKey: ["yipyy-pay"] });
    setRechecking(false);
  };

  return (
    <div className="space-y-6">
      <BusinessIllustration />

      <div className="space-y-2 text-center">
        <h3 className="text-xl font-semibold">Check your business details</h3>
        <p className="text-muted-foreground mx-auto max-w-md text-sm/relaxed">
          This is what your merchant account holds. Make sure it is the right
          business before you start taking money into it.
        </p>
      </div>

      <div className="mx-auto max-w-lg divide-y rounded-xl border px-4">
        <Fact
          label="Business name"
          value={merchant?.name ?? null}
          ok={merchant?.name ? true : undefined}
        />
        <Fact label="Address" value={address || null} />
        <Fact
          label="Merchant ID"
          value={connection.merchantId}
          ok={connection.merchantId ? true : false}
        />
        <Fact
          label="Country"
          value={connection.country}
          ok={Boolean(connection.country)}
        />
        <Fact
          label="Currency"
          value={connection.currency}
          ok={Boolean(connection.currency)}
        />
        <Fact
          label="Online payments"
          value={connection.publicApiKey ? "Ready" : "Not available yet"}
          ok={Boolean(connection.publicApiKey)}
        />
      </div>

      {!chargeable && (
        <div className="mx-auto flex max-w-lg items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="space-y-2">
            <p className="leading-relaxed">
              <span className="font-semibold">
                Your account is still being set up on Clover&rsquo;s side.
              </span>{" "}
              Until the country and currency are settled, a card cannot be
              charged — Yipyy refuses rather than guessing, because guessing
              wrong charges a customer in the wrong money.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This usually settles within a few minutes of the account being
              approved. A brand-new business tax number can take longer, because
              it has to reach the tax authority&rsquo;s own records first.
              Nothing here needs doing — check back, or finish anything Clover
              is still asking you for.
            </p>
          </div>
        </div>
      )}

      {!connection.publicApiKey && chargeable && (
        <div className="text-muted-foreground mx-auto max-w-lg rounded-lg border p-3 text-sm/relaxed">
          Card payments on your terminal are ready. Online payments — payment
          links and emailed invoices — need one more key from Clover that has
          not arrived yet. You can finish setup now and it will start working on
          its own.
        </div>
      )}

      {sandbox && (
        <div className="mx-auto flex max-w-lg items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="leading-relaxed">
            <span className="font-semibold">This is a test account.</span> Cards
            are not really charged and no money reaches your bank. Connect your
            live account when you are ready to trade.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={confirm} disabled={save.isPending || !chargeable}>
          {save.isPending && <Loader2 className="size-4 animate-spin" />}
          These details are correct
          <ArrowRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          onClick={recheck}
          disabled={rechecking}
          size="sm"
        >
          <RefreshCw className={cn("size-3.5", rechecking && "animate-spin")} />
          Check again
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href="/api/payments/clover/connect">
            Wrong business? Use a different account
            <ExternalLink className="size-3.5 opacity-70" />
          </a>
        </Button>
      </div>
    </div>
  );
}
