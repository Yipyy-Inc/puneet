"use client";

import {
  ArrowRight,
  Building2,
  CircleDashed,
  CreditCard,
  ExternalLink,
  Landmark,
  Lock,
  ClipboardList,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { YipyyPayOverview } from "@/lib/api/yipyy-pay";
import {
  PoweredByClover,
  YipyyPayHero,
  YipyyPayWordmark,
} from "./YipyyPayBrand";
import { useYipyyPayNav } from "./YipyyPaySection";

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
// MoeGo's own help centre names the single biggest cause of a stalled setup: a
// legal business name that does not match the tax authority's records
// character for character. That is worth more to a facility than any of the
// marketing above it, so it is stated before they begin rather than discovered
// in a rejection three days later.
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
    body: "Payouts go straight to your own bank. Yipyy never holds your funds and never sees a card number.",
  },
] as const;

const CHECKLIST = [
  {
    icon: Building2,
    label: "A Clover merchant account",
    detail:
      "If you do not have one yet, you can open one when you start — it is the account your payouts come from.",
  },
  {
    icon: ClipboardList,
    label: "Your legal business name, exactly as your tax records show it",
    detail:
      "Capitalisation, punctuation and any suffix such as Inc., Ltd. or LLC.",
  },
  {
    icon: Landmark,
    label: "The bank account your payouts should reach",
    detail:
      "You give these to Clover directly when you open or verify the merchant account. Yipyy never sees them.",
  },
  {
    icon: CreditCard,
    label: "Your card terminal, if you have one",
    detail:
      "A Clover Flex, Mini or Compact. You can finish setup without one and add it later.",
  },
] as const;

export function YipyyPayLanding({ overview }: { overview: YipyyPayOverview }) {
  const nav = useYipyyPayNav();
  // Connected but never finished — they left mid-flow. The page says so rather
  // than offering "Get Started" to somebody who already did.
  const resuming =
    overview.connection.connected && !overview.config.setupCompletedAt;

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
              onClick={() => nav.go({ step: 1 })}
            >
              {resuming ? "Continue setup" : "Get started"}
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

      {resuming && <ResumeNotice step={overview.config.setupStep} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <BeforeYouStart onStart={() => nav.go({ step: 1 })} resuming={resuming} />
    </div>
  );
}

function ResumeNotice({ step }: { step: number }) {
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

function BeforeYouStart({
  onStart,
  resuming,
}: {
  onStart: () => void;
  resuming: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="space-y-1">
          <p className="text-lg font-semibold">Before you start</p>
          <p className="text-muted-foreground text-sm/relaxed">
            Setup takes about five minutes. Have these to hand.
          </p>
        </div>

        <ul className="space-y-3.5">
          {CHECKLIST.map(({ icon: Icon, label, detail }) => (
            <li key={label} className="flex gap-3">
              <span className="bg-muted text-muted-foreground mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full">
                <Icon className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-muted-foreground block text-sm/relaxed">
                  {detail}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {/* The one thing on this page most likely to save a facility three
            days. MoeGo's help centre names it as the most common cause of a
            stalled application, and it is a trivially avoidable one. */}
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

        <div className="flex items-start gap-2.5 rounded-lg border p-3 text-sm">
          <Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground leading-relaxed">
            Your identity documents, tax number and bank details go straight to
            Clover, who hold your merchant account. Yipyy never sees them and
            never stores them.
          </p>
        </div>

        <div className="flex justify-start">
          <Button size="lg" onClick={onStart}>
            <Wallet className="size-4" />
            {resuming ? "Continue setup" : "Get started with Yipyy Pay"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
