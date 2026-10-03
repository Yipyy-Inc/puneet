"use client";

import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";

import { RadioCards } from "@/components/evaluations/radio-cards";
import { StepCard } from "./step-card";
import type { DepositPercent, EvaluationSetup } from "./use-evaluation-setup";

// ============================================================================
// STEP 4 — "Confirmation & payment" (the client's mock):
//
//   (•) Staff approve each request          ( ) Confirm instantly
//       Requests land in Booking Requests       If the slot is free and
//                                               vaccines are on file
//   Take a deposit when booking     [Full price | 50%]  (on)
//   Credited to the first daycare day or stay
//
// "Confirm instantly" is `booking_approval.autoConfirm.evaluation`, the same
// switch every service has; the deposit is the evaluation's own rule in
// `deposit_rules`, which the booking's deposit machinery already charges.
// ============================================================================

export function ConfirmationStep({
  setup,
  t,
}: {
  setup: EvaluationSetup;
  t: (key: string) => string;
}) {
  const { autoConfirm, deposit } = setup.draft;

  return (
    <StepCard id="ev-confirm" step={t("step4")} title={t("confirmTitle")}>
      <RadioCards
        labelledBy="ev-confirm-title"
        value={autoConfirm ? "auto" : "review"}
        compact
        className="grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-2"
        options={[
          {
            value: "review",
            title: t("approveReview"),
            help: t("approveReviewHelp"),
          },
          {
            value: "auto",
            title: t("approveAuto"),
            help: t("approveAutoHelp"),
          },
        ]}
        onChange={(next) => setup.setAutoConfirm(next === "auto")}
      />

      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <label
          htmlFor="ev-deposit"
          className="flex min-w-[180px] flex-1 flex-col gap-0.5"
        >
          <span className="text-body-ink text-[14px] font-semibold">
            {t("depositTake")}
          </span>
          <span className="text-ink-tertiary text-[12.5px]">
            {t(deposit.percent === 100 ? "depositFullHelp" : "depositHalfHelp")}
          </span>
        </label>
        <Segmented<"100" | "50">
          name="evaluation-deposit"
          label={t("depositAmount")}
          value={String(deposit.percent) as "100" | "50"}
          options={[
            { value: "100", label: t("depositFull") },
            { value: "50", label: t("depositHalf") },
          ]}
          onChange={(value) =>
            setup.setDeposit({ percent: Number(value) as DepositPercent })
          }
        />
        <Switch
          id="ev-deposit"
          checked={deposit.enabled}
          onCheckedChange={(enabled) => setup.setDeposit({ enabled })}
        />
      </div>
    </StepCard>
  );
}
