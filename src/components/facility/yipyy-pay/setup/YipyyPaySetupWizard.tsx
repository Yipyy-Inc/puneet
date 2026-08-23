"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { YipyyPayOverview } from "@/lib/api/yipyy-pay";
import { YipyyPayWordmark } from "../YipyyPayBrand";
import { useYipyyPayNav } from "../use-yipyy-pay-nav";
import { SetupStepper, type StepState } from "./SetupStepper";
import { Step1Account } from "./Step1Account";
import { Step2Business } from "./Step2Business";
import { Step3Preferences } from "./Step3Preferences";
import { SetupSuccess } from "./SetupSuccess";

// ============================================================================
// Setting up Yipyy Pay, in three steps.
//
// ── WHAT EACH STEP ACTUALLY IS ────────────────────────────────────────────
//
// The written spec describes a Stripe Connect onboarding: scan an ID, type an
// EIN and a social security number, hand over bank routing details. Clover does
// not work that way and exposes nothing of the sort to an integration — a
// facility owns their merchant account directly, and everything on that list is
// collected by Clover, from them, on Clover's own pages.
//
// So the three steps are kept, and each is pointed at something real:
//
//   1  Connect the account   the OAuth flow that already existed
//   2  Confirm the business  what Clover holds, read back for them to check
//   3  Set your preferences  the part that genuinely belongs to Yipyy
//
// Building the specified screens instead would have produced two steps that
// collect documents with nowhere to send them. A verification screen that
// verifies nothing is worse than no verification screen: it tells a facility
// their business has been checked when nobody has checked anything.
//
// ── PROGRESS IS DERIVED FIRST, STORED SECOND ──────────────────────────────
//
// Steps 1 and 2 are answered by the live connection every render. Only step 3's
// own completion is stored, because only step 3 has no counterpart at Clover to
// read back. See the banner on YipyyPaySection.
//
// ── AND THE STEPPER CANNOT BE USED TO SKIP ────────────────────────────────
//
// `&step=` is honoured up to the first incomplete step and clamped past it. A
// facility can go back to review a finished step; nobody can arrive at step 3
// without an account for its settings to belong to.
// ============================================================================

export function YipyyPaySetupWizard({
  overview,
}: {
  overview: YipyyPayOverview;
}) {
  const nav = useYipyyPayNav();
  const [celebrating, setCelebrating] = useState(false);

  const { connection, config } = overview;

  // Step 1 is done when Clover says the connection is live — not when we stored
  // that it was.
  const step1Done = connection.connected;

  // Step 2 is done when the facility has confirmed what Clover holds AND Clover
  // gave us everything a charge needs. The currency check is not cosmetic: the
  // charge path refuses a merchant with no currency rather than guessing one,
  // so a facility marked "verified" without it would reach a dashboard that
  // cannot take a payment.
  const chargeable = Boolean(connection.currency && connection.country);
  const step2Done = step1Done && chargeable && config.setupStep > 2;

  const firstIncomplete: 1 | 2 | 3 = !step1Done ? 1 : !step2Done ? 2 : 3;
  const asked = nav.requestedStep;
  const step =
    asked && asked >= 1 && asked <= firstIncomplete ? asked : firstIncomplete;

  const steps: StepState[] = [
    {
      n: 1,
      title: "Your account",
      hint: "Connect and authorise",
      done: step1Done,
    },
    {
      n: 2,
      title: "Your business",
      hint: "Check the details",
      done: step2Done,
    },
    {
      n: 3,
      title: "Your preferences",
      hint: "Payouts and fees",
      done: Boolean(config.setupCompletedAt),
    },
  ];

  if (celebrating) {
    return (
      <SetupSuccess
        overview={overview}
        onDone={() => nav.go({ step: null, tab: "overview" })}
        onDevices={() => nav.go({ step: null, tab: "devices" })}
      />
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => nav.go({ step: null })}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" />
        Back to Yipyy Pay
      </button>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <YipyyPayWordmark size="md" tone="ink" />
          <span className="text-muted-foreground text-lg">setup</span>
        </div>
        <p className="text-muted-foreground text-sm/relaxed">
          Three steps to start taking card payments at{" "}
          <span className="font-medium">{overview.facility.name}</span>. You can
          leave at any point and pick up where you stopped.
        </p>
      </div>

      <Card className="overflow-hidden py-0">
        <SetupStepper steps={steps} current={step} />
      </Card>

      <Card>
        <CardContent className="p-6 sm:p-8">
          {step === 1 && <Step1Account overview={overview} />}
          {step === 2 && (
            <Step2Business
              overview={overview}
              chargeable={chargeable}
              onConfirmed={() => nav.go({ step: 3 })}
            />
          )}
          {step === 3 && (
            <Step3Preferences
              overview={overview}
              onComplete={() => setCelebrating(true)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
