"use client";

import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Lock,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { YipyyPayOverview } from "@/lib/api/yipyy-pay";
import { PoweredByClover } from "../YipyyPayBrand";
import { ConnectIllustration } from "../illustrations";
import { useYipyyPayNav } from "../YipyyPaySection";

// ============================================================================
// Step 1 — connecting the account the money lands in.
//
// ── THE BUTTON IS A LINK, DELIBERATELY ────────────────────────────────────
//
// `/api/payments/clover/connect` is a GET that answers 303 to the consent
// screen, so an anchor is the whole implementation. No fetch, no client-side
// redirect, no window.open for a popup blocker to eat — and the facility id is
// sealed into a signed state server-side, so there is nothing for this
// component to pass and nothing it could pass wrongly.
//
// Same tab, not a new one. A new tab leaves the wizard sitting behind the
// consent screen in a state it cannot update, and the facility comes back to
// two tabs disagreeing about whether they are connected.
//
// ── THIS IS ONE OF THE THREE PLACES CLOVER IS NAMED ───────────────────────
//
// And it has to be. The next thing this button does is hand the facility to a
// page with someone else's logo on it, asking for their merchant password. A
// facility who has never been told why is a facility who closes the tab — and
// they would be right to.
// ============================================================================

export function Step1Account({ overview }: { overview: YipyyPayOverview }) {
  const nav = useYipyyPayNav();
  const { connection } = overview;

  if (connection.connected) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="leading-relaxed">
            <span className="font-semibold">Account connected.</span> Yipyy Pay
            is linked to your merchant account
            {connection.merchantId && (
              <>
                {" "}
                <span className="font-[tabular-nums]">
                  {connection.merchantId}
                </span>
              </>
            )}
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => nav.go({ step: 2 })}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
          {/* A facility that picked the wrong merchant from a list of theirs
              must be able to change it. The old card only offered this in the
              not-connected branch, so the first account chosen was the only one
              it could ever have. */}
          <Button asChild variant="ghost" size="sm">
            <a href="/api/payments/clover/connect">
              Use a different account
              <ExternalLink className="size-3.5 opacity-70" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConnectIllustration />

      <div className="space-y-2 text-center">
        <h3 className="text-xl font-semibold">Connect your payment account</h3>
        <p className="text-muted-foreground mx-auto max-w-md text-sm/relaxed">
          Yipyy Pay pays out through a Clover merchant account in your own
          business name. Sign in to yours to link it — or open one on the way
          through if you do not have one yet.
        </p>
      </div>

      <div className="mx-auto max-w-md space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">What happens next</p>
        <ol className="space-y-2.5">
          {[
            "You go to Clover, who hold the merchant account.",
            "You sign in there with your own merchant email and password.",
            "You approve what they ask for — reading your devices, and taking payments.",
            "You come straight back here, connected.",
          ].map((line, index) => (
            <li key={line} className="flex gap-3">
              <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                {index + 1}
              </span>
              <span className="text-muted-foreground text-sm/relaxed">
                {line}
              </span>
            </li>
          ))}
        </ol>

        <div className="text-muted-foreground flex items-start gap-2 border-t pt-3 text-xs/relaxed">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Yipyy never sees your merchant password, your identity documents or
            your bank details. They go straight to Clover.
          </p>
        </div>
      </div>

      {connection.status === "error" && connection.lastError && (
        <div className="mx-auto flex max-w-md items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-sm dark:border-rose-900/50 dark:bg-rose-950/20">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="leading-relaxed">
            <span className="font-semibold">
              The last attempt did not finish.
            </span>{" "}
            {connection.lastError}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button asChild size="lg">
          {/* A plain anchor: /connect 303s to Clover. Nothing to fetch. */}
          <a href="/api/payments/clover/connect">
            Connect my account
            <ArrowRight className="size-4" />
          </a>
        </Button>
        <p className="text-muted-foreground text-xs">
          You will be taken to a secure page to sign in.
        </p>
        {/* Two of three. Named here because the next screen carries their logo. */}
        <PoweredByClover />
      </div>
    </div>
  );
}
