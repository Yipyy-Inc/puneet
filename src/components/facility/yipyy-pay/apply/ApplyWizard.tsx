"use client";

import { ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { MerchantApplication } from "@/lib/merchant-application/application";
import type { YipyyPayOverview } from "@/lib/api/yipyy-pay";
import { stepCompletion } from "@/lib/merchant-application/application";
import { YipyyPayWordmark } from "../YipyyPayBrand";
import { useYipyyPayNav } from "../use-yipyy-pay-nav";
import { SetupStepper, type StepState } from "../setup/SetupStepper";
import { APPLY_STEPS, firstIncompleteStep } from "./steps";
import { StepBanking } from "./StepBanking";
import { StepBusiness } from "./StepBusiness";
import { StepDocuments } from "./StepDocuments";
import { StepOwners } from "./StepOwners";
import { StepReview } from "./StepReview";

// ============================================================================
// The merchant application, in five steps.
//
// ── ITS STEPPER IS A CONTROL, UNLIKE THE CONNECT WIZARD'S ─────────────────
//
// Nobody completes a merchant application in one sitting. It asks for a tax
// number, two owners' identity documents and a bank account, and the person
// filling it in will have some of that and not the rest. So every step is
// reachable at any time and each saves on its own — a wizard that made them
// walk forward through four forms to reach the one they had the paperwork for
// is a wizard they abandon.
//
// The one thing it will not do is submit an incomplete application. That check
// is on step 5, and again on the route, because a browser can send anything.
//
// ── AND PROGRESS IS DERIVED FROM THE ROWS ─────────────────────────────────
//
// `stepCompletion` reads the saved application every render. There is no stored
// "you are on step 3": a facility who came back after deleting an owner would
// see a green tick over a step that no longer passes.
// ============================================================================

export function ApplyWizard({
  application,
  overview,
}: {
  application: MerchantApplication;
  overview: YipyyPayOverview;
}) {
  const nav = useYipyyPayNav();
  const done = stepCompletion(application);

  const asked = nav.requestedApplyStep;
  const step =
    asked && asked >= 1 && asked <= APPLY_STEPS.length
      ? asked
      : firstIncompleteStep(application);

  const steps: StepState[] = APPLY_STEPS.map((s) => ({
    n: s.n,
    title: s.title,
    hint: s.hint,
    done:
      s.n === 1
        ? done.business
        : s.n === 2
          ? done.principals
          : s.n === 3
            ? done.banking
            : s.n === 4
              ? done.documents
              : false,
  }));

  const go = (next: number) => nav.go({ apply: next });

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => nav.go({ apply: null })}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" />
        Back to Yipyy Pay
      </button>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <YipyyPayWordmark size="md" tone="ink" />
          <span className="text-muted-foreground text-lg">application</span>
        </div>
        <p className="text-muted-foreground text-sm/relaxed">
          What we need to open a merchant account for{" "}
          <span className="font-medium">{overview.facility.name}</span>. Each
          step saves on its own — leave whenever you like and come back to it.
        </p>
      </div>

      <Card className="overflow-hidden py-0">
        <SetupStepper steps={steps} current={step} onSelect={go} />
      </Card>

      <Card>
        <CardContent className="p-6 sm:p-8">
          {step === 1 && (
            <StepBusiness application={application} onSaved={() => go(2)} />
          )}
          {step === 2 && (
            <StepOwners
              application={application}
              onBack={() => go(1)}
              onContinue={() => go(3)}
            />
          )}
          {step === 3 && (
            <StepBanking
              application={application}
              onBack={() => go(2)}
              onSaved={() => go(4)}
            />
          )}
          {step === 4 && (
            <StepDocuments
              application={application}
              onBack={() => go(3)}
              onContinue={() => go(5)}
            />
          )}
          {step === 5 && (
            <StepReview
              application={application}
              onBack={() => go(4)}
              onEditStep={go}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
