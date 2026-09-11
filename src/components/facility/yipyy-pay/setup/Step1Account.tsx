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
import { useYipyyPayNav } from "../use-yipyy-pay-nav";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";

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
  const t = useSettingsText().section("yipyy-pay");
  const nav = useYipyyPayNav();
  const { connection } = overview;

  if (connection.connected) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="leading-relaxed">
            <span className="font-semibold">{t("accountConnected")}</span>{" "}
            {/* Two whole sentences, not one with a bracketed tail: French
                does not put the id where English does, and the trailing "."
                sat outside the conditional as its own text node. */}
            {connection.merchantId ? (
              <InterpolatedText
                template={t("linkedToMerchantId")}
                placeholder="{id}"
              >
                <span className="tabular-nums">{connection.merchantId}</span>
              </InterpolatedText>
            ) : (
              t("linkedToMerchant")
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => nav.go({ step: 2 })}>
            {t("continue")}
            <ArrowRight className="size-4" />
          </Button>
          {/* A facility that picked the wrong merchant from a list of theirs
              must be able to change it. The old card only offered this in the
              not-connected branch, so the first account chosen was the only one
              it could ever have. */}
          <Button asChild variant="ghost" size="sm">
            <a href="/api/payments/clover/connect">
              {t("useDifferentAccount")}
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
        <h3 className="text-xl font-semibold">{t("connectTitle")}</h3>
        <p className="text-muted-foreground mx-auto max-w-md text-sm/relaxed">
          {t("connectHelp")}
        </p>
      </div>

      <div className="mx-auto max-w-md space-y-3 rounded-xl border p-4">
        <p className="text-sm font-semibold">{t("whatHappensNext")}</p>
        <ol className="space-y-2.5">
          {/* Keys, not sentences. An ARRAY OF STRING LITERALS rendered
              through .map() matches none of the gate's extractors — it is
              not a JSX text node, an attribute, a toast or a fallback — so
              these four sat in English with the section reporting clean. */}
          {["connectStep1", "connectStep2", "connectStep3", "connectStep4"].map(
            (key, index) => (
              <li key={key} className="flex gap-3">
                <span className="bg-muted text-muted-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                  {index + 1}
                </span>
                <span className="text-muted-foreground text-sm/relaxed">
                  {t(key)}
                </span>
              </li>
            ),
          )}
        </ol>

        <div className="text-muted-foreground flex items-start gap-2 border-t pt-3 text-xs/relaxed">
          <Lock className="mt-0.5 size-3.5 shrink-0" />
          <p>
            {/* Accurate for THIS path only. A facility who applies through
                Yipyy instead does hand us their documents — that screen says
                so in its own words, and this one must not be copied there. */}
            {t("neverSeesPassword")}
          </p>
        </div>
      </div>

      {connection.status === "error" && connection.lastError && (
        <div className="mx-auto flex max-w-md items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-sm dark:border-rose-900/50 dark:bg-rose-950/20">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <p className="leading-relaxed">
            <span className="font-semibold">{t("lastAttemptFailed")}</span>{" "}
            {connection.lastError}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button asChild size="lg">
          {/* A plain anchor: /connect 303s to Clover. Nothing to fetch. */}
          <a href="/api/payments/clover/connect">
            {t("connectMyAccount")}
            <ArrowRight className="size-4" />
          </a>
        </Button>
        <p className="text-muted-foreground text-xs">
          {t("connectSecureNote")}
        </p>
        {/* Two of three. Named here because the next screen carries their logo. */}
        <PoweredByClover />
      </div>
    </div>
  );
}
