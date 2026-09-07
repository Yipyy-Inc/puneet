"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Clock,
  MessageSquareWarning,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { YipyyPayOverview } from "@/lib/api/yipyy-pay";
import type {
  ApplicationStatus as Status,
  MerchantApplication,
} from "@/lib/merchant-application/application";
import { PoweredByClover, YipyyPayWordmark } from "../YipyyPayBrand";
import { useYipyyPayNav } from "../use-yipyy-pay-nav";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// What a facility sees once they have submitted, and until the account is open.
//
// ── IT REPORTS, IT DOES NOT REASSURE ──────────────────────────────────────
//
// There is no progress bar creeping forward on a timer and no "usually 2–3
// days" invented to fill the silence. The screen shows the status a human
// actually set, the words they wrote, and when. Underwriting takes as long as
// it takes, and a screen that guesses is a screen that is wrong in public.
//
// ── AND `more_info_needed` IS THE ONE THAT MATTERS ────────────────────────
//
// It is the only status where something is expected of the facility, so it is
// the only one with a button. The rest are a wait, and dressing a wait up as an
// action is how somebody ends up clicking Refresh for three days.
// ============================================================================

const PRESENTATION: Record<
  Status,
  {
    label: string;
    tone: "sky" | "amber" | "emerald";
    headline: string;
    body: string;
  }
> = {
  draft: {
    label: "statusDraft",
    tone: "sky",
    headline: "draftHeadline",
    // The opposite of a claim, and keyed off the status the server returned:
    // `draft` means nothing has been submitted, and this screen reports that
    // word rather than asserting an outcome of its own.
    // success-claim-ok: reports a status the route returned; asserts nothing.
    body: "draftBody",
  },
  submitted: {
    label: "statusSubmitted",
    tone: "sky",
    headline: "submittedHeadline",
    body: "submittedBody",
  },
  under_review: {
    label: "statusUnderReview",
    tone: "sky",
    headline: "reviewHeadline",
    body: "reviewBody",
  },
  more_info_needed: {
    label: "statusMoreInfo",
    tone: "amber",
    headline: "moreInfoHeadline",
    body: "moreInfoBody",
  },
  approved: {
    label: "statusApproved",
    tone: "emerald",
    headline: "approvedHeadline",
    body: "approvedBody",
  },
  rejected: {
    label: "statusNotApproved",
    tone: "amber",
    headline: "rejectedHeadline",
    body: "rejectedBody",
  },
  withdrawn: {
    label: "statusWithdrawn",
    tone: "sky",
    headline: "withdrawnHeadline",
    // Same shape as `draft` above, and equally negative. Withdrawing an
    // application happens in the platform portal, not here.
    // success-claim-ok: reports a status the route returned; asserts nothing.
    body: "withdrawnBody",
  },
};

const TONE_CLASS = {
  sky: "border-sky-200 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20",
  amber:
    "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20",
  emerald:
    "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20",
} as const;

const BADGE_CLASS = {
  sky: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  amber:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  emerald:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
} as const;

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ApplicationStatus({
  application,
  overview,
}: {
  application: MerchantApplication;
  overview: YipyyPayOverview;
}) {
  const t = useSettingsText().section("yipyy-pay");
  const nav = useYipyyPayNav();
  const presentation = PRESENTATION[application.status];
  const submittedOn = formatWhen(application.submittedAt);
  const needsAnswer = application.status === "more_info_needed";
  const approved = application.status === "approved";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <YipyyPayWordmark size="md" tone="ink" />
          <Badge className={BADGE_CLASS[presentation.tone]}>
            {t(presentation.label)}
          </Badge>
        </div>
        <PoweredByClover />
      </div>

      <Card className={TONE_CLASS[presentation.tone]}>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1.5">
            <h3 className="text-xl font-semibold">
              {t(presentation.headline)}
            </h3>
            <p className="text-[14.5px]/relaxed">{t(presentation.body)}</p>
          </div>

          {application.statusDetail && (
            <div className="bg-background/70 flex items-start gap-2.5 rounded-lg border p-3.5">
              <MessageSquareWarning className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm/relaxed">{application.statusDetail}</p>
            </div>
          )}

          <dl className="text-muted-foreground grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {submittedOn && (
              <div className="flex gap-2">
                <dt>{t("statusSubmitted")}</dt>
                <dd className="text-foreground font-medium">{submittedOn}</dd>
              </div>
            )}
            {application.signedName && (
              <div className="flex gap-2">
                <dt>{t("signedBy")}</dt>
                <dd className="text-foreground font-medium">
                  {application.signedName}
                </dd>
              </div>
            )}
            {application.externalReference && (
              <div className="flex gap-2">
                <dt>{t("reference")}</dt>
                <dd className="text-foreground font-[tabular-nums] font-medium">
                  {application.externalReference}
                </dd>
              </div>
            )}
            <div className="flex gap-2">
              <dt>{t("business")}</dt>
              <dd className="text-foreground font-medium">
                {application.business.legalName ?? overview.facility.name}
              </dd>
            </div>
          </dl>

          {needsAnswer && (
            <Button size="lg" onClick={() => nav.go({ apply: 1 })}>
              {t("updateApplication")}
              <ArrowRight className="size-4" />
            </Button>
          )}

          {approved && !overview.connection.connected && (
            <Button
              size="lg"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => nav.go({ step: 1 })}
            >
              {t("linkMyAccount")}
              <ArrowRight className="size-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      <WhatHappensNext status={application.status} />

      <Card>
        <CardContent className="flex items-start gap-2.5 p-5 text-sm">
          <ShieldCheck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">
              {t("holdingHelp")}
            </span>{" "}
            Your identity documents and the identity and account numbers you
            gave are encrypted, readable only by you and the Yipyy administrator
            handling this application, and deleted once your merchant account is
            open. The business details stay, because they are what the account
            is registered against.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const TIMELINE: { key: string; label: string; detail: string }[] = [
  {
    key: "submitted",
    label: "stepYouSubmit",
    detail: "stepYouSubmitDetail",
  },
  {
    key: "under_review",
    label: "stepUnderwriting",
    detail: "stepUnderwritingDetail",
  },
  {
    key: "approved",
    label: "stepAccountOpened",
    detail: "stepAccountOpenedDetail",
  },
  {
    key: "connected",
    label: "stepLinked",
    detail: "stepLinkedDetail",
  },
];

function WhatHappensNext({ status }: { status: Status }) {
  const t = useSettingsText().section("yipyy-pay");
  // How far along the timeline we are. Derived from the status word rather
  // than a stored step, so it cannot claim more progress than there is.
  const reached =
    status === "approved"
      ? 3
      : status === "under_review" || status === "more_info_needed"
        ? 2
        : status === "submitted"
          ? 1
          : 0;

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="font-semibold">{t("whatHappensNext")}</p>
        <ol className="space-y-4">
          {TIMELINE.map((entry, index) => {
            const done = index < reached;
            const current = index === reached;
            return (
              <li key={entry.key} className="flex gap-3">
                <span className="mt-0.5 shrink-0">
                  {done ? (
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                  ) : current ? (
                    <CircleDashed className="size-5 text-sky-600 dark:text-sky-400" />
                  ) : (
                    <Clock className="text-muted-foreground/50 size-5" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {t(entry.label)}
                  </span>
                  <span className="text-muted-foreground block text-sm/relaxed">
                    {t(entry.detail)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
