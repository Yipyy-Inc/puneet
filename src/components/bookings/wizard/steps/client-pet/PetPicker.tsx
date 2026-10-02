"use client";

import {
  Check,
  CircleAlert,
  CircleCheck,
  Clock3,
  Lock,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { allergyOf, evaluationState } from "@/lib/bookings/wizard/pet-status";
import { formatWeightFromLb, isPluralOne } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { Pet } from "@/types/pet";

// ============================================================================
// "Pets on this booking" (staff) / "Who’s coming?" (customer) — the client's
// mock, 2026-10-01. Every pet as a card: photo, name, "breed · age · weight",
// and what staff must know before booking — evaluated or not, an allergy.
// Several pets can come; "Select all" from two, and a count of the chosen.
//
// A pet the booking cannot take (an evaluation for one already evaluated, a
// program whose prerequisite it has not finished) stays on the list, greyed,
// with the reason on it — never silently missing.
// ============================================================================

export interface PetLock {
  /** Why the pet cannot be chosen, in a word or two. */
  label: string;
  /** The longer reason, when there is one. */
  detail?: string;
}

export function PetPicker({
  title,
  pets,
  selectedIds,
  onToggle,
  onSelectAll,
  lockOf,
  showEvaluation,
  emptyTitle,
  emptyText,
}: {
  title: string;
  pets: readonly Pet[];
  selectedIds: readonly number[];
  onToggle: (petId: number) => void;
  onSelectAll: () => void;
  lockOf: (pet: Pet) => PetLock | null;
  /** The facility evaluates pets for at least one service. */
  showEvaluation: boolean;
  emptyTitle: string;
  emptyText: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const selectable = pets.filter((pet) => !lockOf(pet));
  const allChosen =
    selectable.length > 0 &&
    selectable.every((pet) => selectedIds.includes(pet.id));
  const chosen = pets.filter((pet) => selectedIds.includes(pet.id)).length;

  return (
    <section aria-labelledby="wizard-pets" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id="wizard-pets" className="text-section text-body-ink">
            {title}
          </h3>
          <p className="text-meta text-ink-tertiary">{t("wizPetsHelp")}</p>
        </div>
        {pets.length > 0 ? (
          <div className="flex items-center gap-2">
            {selectable.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                disabled={allChosen}
                onClick={onSelectAll}
              >
                {t("selectAll")}
              </Button>
            ) : null}
            <span className="bg-surface-inset text-body-ink text-meta rounded-full px-3 py-1.5 font-medium tabular-nums">
              {fill(
                t(
                  isPluralOne(chosen, locale)
                    ? "wizSelectedOfOne"
                    : "wizSelectedOfOther",
                ),
                { count: chosen, total: pets.length },
              )}
            </span>
          </div>
        ) : null}
      </div>

      {pets.length === 0 ? (
        <div className="border-line-strong flex flex-col items-center gap-1.5 rounded-2xl border border-dashed px-6 py-8 text-center">
          <p className="text-body-strong text-body-ink">{emptyTitle}</p>
          <p className="text-meta text-ink-tertiary text-pretty">{emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3">
          {pets.map((pet) => {
            const lock = lockOf(pet);
            const on = selectedIds.includes(pet.id);
            const evaluation = evaluationState(pet);
            const allergy = allergyOf(pet);
            const meta = [
              pet.breed,
              fill(t(pet.age === 1 ? "ageYearsOne" : "ageYearsMany"), {
                count: pet.age,
              }),
              pet.weight > 0 ? formatWeightFromLb(pet.weight, locale) : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <button
                key={pet.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-disabled={lock ? true : undefined}
                data-on={on}
                data-locked={lock ? true : undefined}
                onClick={() => {
                  if (!lock) onToggle(pet.id);
                }}
                className="border-line-strong bg-card hover:border-ink-disabled focus-visible:outline-primary data-[locked=true]:bg-surface-inset data-[locked=true]:hover:border-line-strong relative flex min-w-0 items-center gap-3.5 rounded-xl border p-4 text-left transition-[box-shadow,border-color] duration-120 ease-[ease] focus-visible:outline-2 focus-visible:outline-offset-2 data-[locked=true]:cursor-not-allowed data-[on=true]:border-transparent data-[on=true]:shadow-[inset_0_0_0_2px_var(--primary)] motion-reduce:transition-none"
              >
                <PetAvatar name={pet.name} src={pet.imageUrl} size="lg" />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 pr-6">
                  <span className="text-body-strong text-body-ink">
                    {pet.name}
                  </span>
                  {meta ? (
                    <span className="text-meta text-ink-tertiary">{meta}</span>
                  ) : null}
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {lock ? (
                      <Badge variant="cancelled" title={lock.detail}>
                        <Lock aria-hidden />
                        {lock.label}
                      </Badge>
                    ) : null}
                    {showEvaluation ? (
                      <EvaluationChip state={evaluation} />
                    ) : null}
                    {allergy ? (
                      <Badge variant="overdue" className="max-w-full">
                        <TriangleAlert aria-hidden />
                        <span className="truncate">
                          {fill(t("wizAllergy"), { allergy })}
                        </span>
                      </Badge>
                    ) : null}
                  </span>
                  {lock?.detail ? (
                    <span className="text-meta text-ink-secondary mt-1">
                      {lock.detail}
                    </span>
                  ) : null}
                </span>
                {on ? (
                  <span
                    aria-hidden
                    className="bg-primary text-primary-foreground absolute top-3 right-3 flex size-[22px] items-center justify-center rounded-full"
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function EvaluationChip({
  state,
}: {
  state: ReturnType<typeof evaluationState>;
}) {
  const t = useShellText("booking");
  if (state === "passed") {
    return (
      <Badge variant="confirmed">
        <CircleCheck aria-hidden />
        {t("wizEvaluated")}
      </Badge>
    );
  }
  if (state === "failed") {
    return (
      <Badge variant="overdue">
        <CircleAlert aria-hidden />
        {t("evalFailed")}
      </Badge>
    );
  }
  return (
    <Badge variant="pending">
      <Clock3 aria-hidden />
      {state === "expired" ? t("evalExpired") : t("wizNeedsEvaluation")}
    </Badge>
  );
}
