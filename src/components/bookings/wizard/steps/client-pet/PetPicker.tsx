"use client";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PetAvatar } from "@/components/ui/pet-avatar";
import { Tick } from "@/components/ui/tick";
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
          <h3
            id="wizard-pets"
            className="text-body-ink text-[17px] font-semibold"
          >
            {title}
          </h3>
          <p className="text-ink-tertiary text-[13.5px]">{t("wizPetsHelp")}</p>
        </div>
        {pets.length > 0 ? (
          <div className="flex items-center gap-2">
            {selectable.length > 1 ? (
              <Button
                type="button"
                variant="quiet"
                size="mock-34"
                disabled={allChosen}
                onClick={onSelectAll}
              >
                {t("selectAll")}
              </Button>
            ) : null}
            <span className="bg-surface-inset-2 text-body-ink rounded-full px-3 py-1.5 text-[13px] font-medium tabular-nums">
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
        <div className="border-line-strong flex flex-col items-center gap-1.5 rounded-[20px] border-[1.5px] border-dashed px-6 py-8 text-center">
          <p className="text-body-ink text-[15px] font-semibold">
            {emptyTitle}
          </p>
          <p className="text-ink-tertiary text-[13.5px] text-pretty">
            {emptyText}
          </p>
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
                className="mk-pick bg-card focus-visible:outline-primary data-[locked=true]:bg-surface-inset relative flex min-w-0 items-center gap-3.5 rounded-[18px] p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 data-[locked=true]:cursor-not-allowed"
              >
                <PetAvatar
                  name={pet.name}
                  src={pet.imageUrl}
                  size="mk-52"
                  shape="rounded"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-[3px] pr-6">
                  <span className="text-body-ink text-[16px] font-semibold">
                    {pet.name}
                  </span>
                  {meta ? (
                    <span className="text-ink-tertiary text-[13px]">
                      {meta}
                    </span>
                  ) : null}
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {lock ? (
                      <Chip tone="danger" title={lock.detail}>
                        {lock.label}
                      </Chip>
                    ) : null}
                    {showEvaluation ? (
                      <EvaluationChip state={evaluation} />
                    ) : null}
                    {allergy ? (
                      <Chip tone="danger" className="max-w-full">
                        <span className="truncate">
                          {fill(t("wizAllergy"), { allergy })}
                        </span>
                      </Chip>
                    ) : null}
                  </span>
                  {lock?.detail ? (
                    <span className="text-ink-secondary mt-1 text-[13px]">
                      {lock.detail}
                    </span>
                  ) : null}
                </span>
                {on ? <Tick size={22} className="top-3 right-3" /> : null}
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
    return <Chip tone="success">{t("wizEvaluated")}</Chip>;
  }
  if (state === "failed") {
    return <Chip tone="danger">{t("evalFailed")}</Chip>;
  }
  return (
    <Chip tone="warning">
      {state === "expired" ? t("evalExpired") : t("wizNeedsEvaluation")}
    </Chip>
  );
}
