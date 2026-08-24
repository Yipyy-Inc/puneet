"use client";

import {
  ArrowRight,
  CircleDashed,
  CreditCard,
  ExternalLink,
  IdCard,
  Landmark,
  Loader2,
  Lock,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { YipyyPayOverview } from "@/lib/api/yipyy-pay";
import { useStartApplication } from "@/lib/api/merchant-application";
import type { MerchantApplication } from "@/lib/merchant-application/application";
import {
  APPLY_STEP_COUNT,
  completedStepCount,
  firstIncompleteStep,
} from "./apply/steps";
import {
  PoweredByClover,
  YipyyPayHero,
  YipyyPayWordmark,
} from "./YipyyPayBrand";
import { useYipyyPayNav } from "./use-yipyy-pay-nav";

// ============================================================================
// The screen a facility sees before they have set anything up.
//
// ── WHY A LANDING PAGE AND NOT A BUTTON ───────────────────────────────────
//
// What this replaces was a button. A facility arrived at Settings, found a
// green card branded with a company they had not heard of in this context, four
// lines of instructions and "Connect your Clover account" — and had no reason
// to believe any of it was a payment system their business could rely on.
//
// The competition treats this moment as a sale, and it is one: nothing here is
// mandatory, and a facility that closes the page keeps taking cash. So the page
// earns the click — what it does, what it costs them in effort, and what they
// need in front of them before they start.
//
// ── THE CHECKLIST IS THE MOST VALUABLE PART ───────────────────────────────
//
// Every acquirer's own guidance names the same biggest cause of a stalled
// setup: a legal business name that does not match the tax authority's records
// character for character. That is worth more to a facility than any of the
// marketing above it, so it is stated before they begin rather than discovered
// in a rejection three days later.
//
// ── AND THE PRIVACY NOTE SAYS WHAT IS TRUE NOW, NOT WHAT WAS ──────────────
//
// This page used to say the documents "go straight to Clover" and that "Yipyy
// never sees them". That was true of the connect-your-own-account flow it was
// written for. It is not true of the application: Yipyy collects the documents,
// holds them in private storage, passes them on, and deletes them. The sentence
// below says exactly that, and it changed in the same release that shipped the
// screens which collect them — not afterwards.
// ============================================================================

const VALUE_PROPS = [
  {
    icon: CreditCard,
    title: "One checkout, everywhere",
    body: "Terminal, online invoice and payment link all settle to the same account and land on the same booking.",
  },
  {
    icon: Sparkles,
    title: "Tips that reach the team",
    body: "On-screen tipping at the terminal, tied to the booking and the staff who did the work.",
  },
  {
    icon: TrendingUp,
    title: "Money you can follow",
    body: "Every card payment and refund is on the booking it belongs to, so the day reconciles itself.",
  },
  {
    icon: ShieldCheck,
    title: "Your account, your money",
    body: "The merchant account is in your business name and payouts go straight to your own bank. Yipyy never holds your funds and never sees a card number.",
  },
] as const;

const CHECKLIST = [
  {
    icon: ClipboardList,
    label: "Your legal business name and tax number",
    detail:
      "Exactly as your tax records show them — capitalisation, punctuation and any Inc., Ltd. or LLC included.",
  },
  {
    icon: IdCard,
    label: "Photo ID for everyone who owns 25% or more",
    detail:
      "Passport, driving licence or national ID card, plus their date of birth, home address and identity number.",
  },
  {
    icon: Landmark,
    label: "The bank account your payouts should reach",
    detail:
      "In the business name, not a personal account, with a void cheque or bank letter to prove it.",
  },
  {
    icon: CreditCard,
    label: "Your card terminal, if you have one",
    detail:
      "A Clover Flex, Mini or Compact. You can apply without one and add it later.",
  },
] as const;

export function YipyyPayLanding({
  overview,
  application,
}: {
  overview: YipyyPayOverview;
  /** A started-but-unsubmitted application, if there is one. */
  application: MerchantApplication | null;
}) {
  const nav = useYipyyPayNav();
  const start = useStartApplication();

  // Somebody who used the connect-an-existing-account path and left mid-flow.
  const resumingSetup =
    overview.connection.connected && !overview.config.setupCompletedAt;
  const resumingApplication = application !== null;

  function begin() {
    if (application) {
      nav.go({ apply: firstIncompleteStep(application) });
      return;
    }
    start.mutate(undefined, {
      onSuccess: () => nav.go({ apply: 1 }),
      onError: (error: Error) => toast.error(error.message),
    });
  }

  const primaryLabel = resumingSetup
    ? "Continue setup"
    : resumingApplication
      ? "Continue my application"
      : "Get started";

  const primaryAction = resumingSetup
    ? () => nav.go({ step: overview.config.setupStep })
    : begin;

  return (
    <div className="space-y-6">
      <YipyyPayHero>
        <div className="max-w-2xl space-y-5">
          <YipyyPayWordmark size="lg" />
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-balance text-white sm:text-3xl">
              Take payments, tips and deposits without leaving Yipyy.
            </h2>
            <p className="text-base/relaxed text-white/85">
              Card on the terminal, a link by text, an invoice by email — all of
              it lands on the booking it belongs to, and all of it pays out to
              your own bank account.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="bg-white text-sky-700 hover:bg-white/90"
              disabled={start.isPending}
              onClick={primaryAction}
            >
              {start.isPending && <Loader2 className="size-4 animate-spin" />}
              {primaryLabel}
              <ArrowRight className="size-4" />
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              {/* Hardware is bought from Clover, not from Yipyy. A new tab
                  because it leaves the product entirely. */}
              <a
                href="https://www.clover.com/pos-hardware"
                target="_blank"
                rel="noreferrer noopener"
              >
                Buy a card reader
                <ExternalLink className="size-3.5 opacity-80" />
              </a>
            </Button>
          </div>
        </div>
        {/* One of the three places the processor is named. */}
        <div className="mt-8 flex justify-end sm:mt-6">
          <PoweredByClover tone="on-brand" />
        </div>
      </YipyyPayHero>

      {resumingSetup && <SetupResumeNotice step={overview.config.setupStep} />}
      {!resumingSetup && application && (
        <ApplicationResumeNotice application={application} onResume={begin} />
      )}

      {/* Two columns, never four. This renders inside the settings content
          pane, which is about 540px wide on a 1440px screen — a `lg:grid-cols-4`
          here gave four ~120px cards whose headings wrapped to two lines and
          whose body text broke every three words. The breakpoint describes the
          VIEWPORT, and the viewport is not what this sits in. */}
      <div className="grid gap-4 sm:grid-cols-2">
        {VALUE_PROPS.map(({ icon: Icon, title, body }) => (
          <Card
            key={title}
            // Informational, not clickable: no pointer cursor, no press
            // affordance. The lift is there so the row does not read as flat.
            className="transition-shadow hover:shadow-md"
          >
            <CardContent className="space-y-3 p-5">
              <span className="flex size-10 items-center justify-center rounded-full bg-sky-500/10 text-sky-600 ring-1 ring-sky-500/20 dark:text-sky-400">
                <Icon className="size-5" />
              </span>
              <p className="leading-tight font-semibold">{title}</p>
              <p className="text-muted-foreground text-sm/relaxed">{body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <BeforeYouStart
        onStart={primaryAction}
        starting={start.isPending}
        label={primaryLabel}
      />

      <AlreadyHaveOne onConnect={() => nav.go({ step: 1 })} />
    </div>
  );
}

function SetupResumeNotice({ step }: { step: number }) {
  return (
    <Card className="border-sky-200 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <CircleDashed className="size-5 shrink-0 text-sky-600 dark:text-sky-400" />
        <p className="min-w-0 flex-1 text-sm/relaxed">
          <span className="font-semibold">Setup in progress</span> — you are on
          step {step} of 3. Nothing you have done is lost.
        </p>
      </CardContent>
    </Card>
  );
}

function ApplicationResumeNotice({
  application,
  onResume,
}: {
  application: MerchantApplication;
  onResume: () => void;
}) {
  const completed = completedStepCount(application);
  return (
    <Card className="border-sky-200 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20">
      <CardContent className="flex flex-wrap items-center gap-3 p-4">
        <CircleDashed className="size-5 shrink-0 text-sky-600 dark:text-sky-400" />
        <p className="min-w-0 flex-1 text-sm/relaxed">
          <span className="font-semibold">Application in progress</span> —{" "}
          {completed} of {APPLY_STEP_COUNT - 1} sections finished. Nothing you
          have entered is lost.
        </p>
        <Button size="sm" onClick={onResume}>
          Continue
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function BeforeYouStart({
  onStart,
  starting,
  label,
}: {
  onStart: () => void;
  starting: boolean;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <p className="text-lg font-semibold">Before you start</p>
          <p className="text-muted-foreground text-sm/relaxed">
            Applying takes about fifteen minutes if you have these to hand. You
            can save and come back at any point.
          </p>
        </div>

        <ul className="space-y-3.5">
          {CHECKLIST.map(({ icon: Icon, label: item, detail }) => (
            <li key={item} className="flex gap-3">
              <span className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item}</span>
                <span className="text-muted-foreground block text-sm/relaxed">
                  {detail}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* The one thing on this page most likely to save a facility three
            days, and a trivially avoidable one. */}
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/20">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="leading-relaxed">
            <span className="font-semibold">
              Your legal business name must match your tax records exactly.
            </span>{" "}
            Capitalisation, punctuation and any Inc., Ltd. or LLC included. A
            mismatch is the most common reason a payment account sits waiting,
            and it is the easiest one to avoid.
          </p>
        </div>

        {/* Says what Yipyy actually does with this material. It is collected
            here, held here, and deleted here — see the banner above. */}
        <div className="flex items-start gap-2.5 rounded-lg border p-3 text-sm">
          <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground leading-relaxed">
            Yipyy collects your identity documents, identity numbers and bank
            account number, encrypts them, and passes them to the provider who
            opens your merchant account. Only you and the Yipyy administrator
            handling your application can open them, and they are deleted once
            the account is open. Only the last four digits of any number are
            ever shown back to you.
          </p>
        </div>

        <div className="flex justify-start">
          <Button size="lg" onClick={onStart} disabled={starting}>
            {starting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wallet className="size-4" />
            )}
            {label}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The other way in, for the facility that already processes cards.
 *
 * Deliberately quiet and at the bottom. Almost nobody arrives already holding a
 * Clover merchant account, and giving that path equal weight at the top would
 * send the majority down a route that asks them to sign in somewhere they have
 * never been. It stays because for the few it fits, it is one click instead of
 * a fifteen-minute application.
 */
function AlreadyHaveOne({ onConnect }: { onConnect: () => void }) {
  return (
    <p className="text-muted-foreground text-center text-sm">
      Already take card payments through a Clover merchant account?{" "}
      <button
        type="button"
        onClick={onConnect}
        className="text-foreground font-medium underline underline-offset-4"
      >
        Link the one you have instead
      </button>
      .
    </p>
  );
}
