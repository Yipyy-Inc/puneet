"use client";

import { CircleCheck, Copy, Plus, Utensils } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { feedingFeeApplies } from "@/lib/settings/care-fees";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import { FeedingPlanCard } from "./feeding-plan";
import { FeedingSchedulePreview } from "./feeding-schedule-preview";
import type { FeedingStepState } from "./use-feeding-step";

// ============================================================================
// The booking form's Feeding step, laid out as the client's design lays it
// out (docs/Feeding_Step.html, 2026-10-01) and drawn in Yipyy's own design
// system: the heading and the step count; a tab per pet saying whether it has
// a plan; the pet's plan, or the empty card that starts one. The stay-and-
// meals panel is in the booking form's left rail (BookingModal), and after
// the plan where there is no rail (below 1024px).
// ============================================================================

const FEE_NOTICE_KEY = {
  per_meal: "feedFeeNoticePerMeal",
  per_pet: "feedFeeNoticePerPet",
  flat: "feedFeeNoticeFlat",
} as const;

export function FeedingStep({
  step,
  stepLabel,
}: {
  step: FeedingStepState;
  /** "Step 3 of 4" — the booking form's own count, as the rail shows it. */
  stepLabel: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();

  if (!step.ready) {
    return (
      <div className="space-y-4" aria-busy>
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const pet = step.pets.find((candidate) => candidate.id === step.activePetId);
  const petName = pet?.name ?? "";
  const fee = step.fees.daycareFeeding;
  const others = step.pets.filter(
    (candidate) => candidate.id !== step.activePetId && candidate.plan,
  );

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="border-line bg-card flex size-12 shrink-0 items-center justify-center rounded-xl border">
            <Utensils className="text-heading size-6" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-section text-heading">{t("feeding")}</h3>
            <p className="text-body text-ink-secondary">
              {t("feedStepSubtitle")}
            </p>
          </div>
        </div>
        <span className="border-line bg-card text-meta text-ink-secondary shrink-0 rounded-full border px-3 py-1.5">
          {stepLabel}
        </span>
      </div>

      {feedingFeeApplies(step.fees, step.service) ? (
        <p className="text-meta text-ink-tertiary">
          {fill(t(FEE_NOTICE_KEY[fee.scope]), {
            amount: formatMoney(fee.amount, locale),
          })}
        </p>
      ) : null}

      {step.pets.length > 0 ? (
        <div
          role="radiogroup"
          aria-label={t("feedPetTabs")}
          className="flex flex-wrap gap-2"
        >
          {step.pets.map((candidate) => {
            const active = candidate.id === step.activePetId;
            return (
              <ChoicePill
                key={candidate.id}
                type="radio"
                name="feeding-pet"
                value={String(candidate.id)}
                checked={active}
                onChange={() => step.selectPet(candidate.id)}
                className="pr-2"
              >
                <span>{candidate.name}</span>
                {candidate.plan ? (
                  <Badge variant="confirmed">
                    <CircleCheck aria-hidden />
                    {t("feedPlanAdded")}
                  </Badge>
                ) : (
                  <span className="bg-surface-inset text-ink-secondary text-meta rounded-full px-2 py-0.5 font-semibold whitespace-nowrap">
                    {t("feedNoPlan")}
                  </span>
                )}
              </ChoicePill>
            );
          })}
        </div>
      ) : null}

      {pet ? (
        step.plan ? (
          <FeedingPlanCard step={step} petName={petName} />
        ) : (
          <div className="border-line-strong bg-card flex flex-col items-start gap-3.5 rounded-xl border-[1.5px] border-dashed p-6">
            <p className="text-body-strong text-body-ink">
              {fill(t("feedEmptyTitle"), { pet: petName })}
            </p>
            <p className="text-body text-ink-secondary">
              {fill(t("feedEmptyText"), { pet: petName })}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button type="button" onClick={step.addPlan}>
                <Plus className="size-4" aria-hidden />
                {t("feedAddPlan")}
              </Button>
              {others.map((other) => (
                <Button
                  key={other.id}
                  type="button"
                  variant="outline"
                  onClick={() => step.copyFrom(other.id)}
                >
                  <Copy className="size-4" aria-hidden />
                  {fill(t("feedCopyPlan"), { pet: other.name })}
                </Button>
              ))}
            </div>
          </div>
        )
      ) : null}

      <FeedingSchedulePreview step={step} className="lg:hidden" />
    </div>
  );
}
