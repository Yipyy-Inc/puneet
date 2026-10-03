"use client";

import { LookScope } from "@/components/look/look-context";
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
//
// Drawn as the mock draws it too, since 2026-10-02 (CLAUDE.md § "Client
// mocks decide the look"), on the wizard's accent: the `care-step` look.
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
    <LookScope name="care-step">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              aria-hidden
              className="border-line bg-card grid size-12 shrink-0 place-items-center rounded-[14px] border"
            >
              <span className="border-primary grid size-6 place-items-center rounded-full border-2">
                <span className="bg-primary size-2.5 rounded-full" />
              </span>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="text-heading text-[24px] font-semibold tracking-[-0.01em]">
                {t("feeding")}
              </h3>
              <p className="text-ink-tertiary text-[15px]">
                {t("feedStepSubtitle")}
              </p>
            </div>
          </div>
          <span className="border-line bg-card text-ink-tertiary shrink-0 rounded-full border px-3 py-2 text-[13px]">
            {stepLabel}
          </span>
        </div>

        {feedingFeeApplies(step.fees, step.service) ? (
          <p className="text-ink-tertiary text-[13px]">
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
                  className="gap-2.5 pr-2 pl-4"
                >
                  <span>{candidate.name}</span>
                  {/* The mock's tab badge: a plan is green, or the accent on
                    the open tab; none is grey. */}
                  <span
                    data-plan={
                      candidate.plan ? (active ? "open" : "yes") : "no"
                    }
                    className="bg-surface-inset-2 text-ink-tertiary data-[plan=open]:bg-primary data-[plan=open]:text-primary-foreground data-[plan=yes]:bg-wash-success data-[plan=yes]:text-success rounded-full px-2 py-1 text-[12px] leading-none font-semibold whitespace-nowrap"
                  >
                    {candidate.plan ? t("feedPlanAdded") : t("feedNoPlan")}
                  </span>
                </ChoicePill>
              );
            })}
          </div>
        ) : null}

        {pet ? (
          step.plan ? (
            <FeedingPlanCard step={step} petName={petName} />
          ) : (
            <div className="bg-card flex flex-col items-start gap-3.5 rounded-[16px] border-[1.5px] border-dashed border-(--care-dash) px-6 py-7">
              <p className="text-body-ink text-[16px] font-semibold">
                {fill(t("feedEmptyTitle"), { pet: petName })}
              </p>
              <p className="text-ink-tertiary text-[14px]">
                {fill(
                  t(step.required ? "feedEmptyTextRequired" : "feedEmptyText"),
                  { pet: petName },
                )}
              </p>
              {step.required ? (
                <p className="text-ink-secondary text-[13px]">
                  {fill(t("feedRequiredHint"), { pet: petName })}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2.5">
                <Button
                  type="button"
                  variant="flat"
                  size="care"
                  className="gap-1"
                  onClick={step.addPlan}
                >
                  <span aria-hidden>+</span>
                  {t("feedAddPlan")}
                </Button>
                {others.map((other) => (
                  <Button
                    key={other.id}
                    type="button"
                    variant="quiet"
                    size="care"
                    className="font-medium"
                    onClick={() => step.copyFrom(other.id)}
                  >
                    {fill(t("feedCopyPlan"), { pet: other.name })}
                  </Button>
                ))}
              </div>
            </div>
          )
        ) : null}

        <FeedingSchedulePreview step={step} className="lg:hidden" />
      </div>
    </LookScope>
  );
}
