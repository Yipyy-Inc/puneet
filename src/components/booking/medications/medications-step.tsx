"use client";

import { LookScope } from "@/components/look/look-context";
import { Button } from "@/components/ui/button";
import { ChoicePill } from "@/components/ui/choice-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney, isPluralOne } from "@/lib/i18n/format";
import { fill } from "@/lib/medications/dose";
import {
  injectionFeeApplies,
  medicationFeeApplies,
} from "@/lib/settings/medication-instructions";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import { MedicationCard } from "./medication-card";
import { MedicationEditor } from "./medication-editor";
import { MedicationSchedulePreview } from "./medication-schedule-preview";
import type { MedicationStepState } from "./use-medication-step";
import { VetContactFields } from "./vet-contact";

// ============================================================================
// The booking form's Medications step, laid out as the client's design lays
// it out (docs/Medications_Step.html, 2026-10-01) and drawn in Yipyy's own
// design system: the heading and the step count; a tab per pet with its
// count; the pet's saved medications as cards; the editor, or the empty card
// that opens it; "add another". The stay-and-doses panel is in the booking
// form's left rail (BookingModal), and below the editor where there is no
// rail (below 1024px).
// ============================================================================

const FEE_NOTICE_KEY = {
  dose: "medsFeeNoticeDose",
  pet_day: "medsFeeNoticePetDay",
  med_day: "medsFeeNoticeMedDay",
} as const;

export function MedicationsStep({
  step,
  stepLabel,
}: {
  step: MedicationStepState;
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
  const { fee } = step.settings;
  const notices = [
    fee.mode !== "none" && medicationFeeApplies(step.settings, step.service)
      ? fill(t(FEE_NOTICE_KEY[fee.mode]), {
          amount: formatMoney(fee.amount, locale),
        })
      : "",
    injectionFeeApplies(step.settings, step.service)
      ? fill(t("medsFeeNoticeInjection"), {
          amount: formatMoney(fee.injection, locale),
        })
      : "",
  ].filter(Boolean);

  return (
    <LookScope name="care-step">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <div
              aria-hidden
              className="border-line bg-card grid size-12 shrink-0 place-items-center rounded-[14px] border"
            >
              <span className="border-primary h-3 w-[26px] -rotate-45 rounded-[6px] border-2 bg-[linear-gradient(90deg,var(--primary)_50%,transparent_50%)]" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <h3 className="text-heading text-[24px] font-semibold tracking-[-0.01em]">
                {t("medications")}
              </h3>
              <p className="text-ink-tertiary text-[15px]">
                {t(
                  step.required
                    ? "medsStepSubtitleRequired"
                    : "medsStepSubtitle",
                )}
              </p>
            </div>
          </div>
          <span className="border-line bg-card text-ink-tertiary shrink-0 rounded-full border px-3 py-2 text-[13px]">
            {stepLabel}
          </span>
        </div>

        {notices.length > 0 ? (
          <p className="text-ink-tertiary text-[13px]">{notices.join(" ")}</p>
        ) : null}

        {step.pets.length > 0 ? (
          <div
            role="radiogroup"
            aria-label={t("medsPetTabs")}
            className="flex flex-wrap gap-2"
          >
            {step.pets.map((candidate) => {
              const active = candidate.id === step.activePetId;
              return (
                <ChoicePill
                  key={candidate.id}
                  type="radio"
                  name="meds-pet"
                  value={String(candidate.id)}
                  checked={active}
                  onChange={() => step.selectPet(candidate.id)}
                  className="gap-2.5 pr-2 pl-4"
                >
                  <span>{candidate.name}</span>
                  <span
                    data-active={active}
                    className="bg-surface-inset-2 text-ink-tertiary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground rounded-full px-2 py-1 text-[12px] leading-none font-semibold whitespace-nowrap tabular-nums"
                  >
                    {candidate.none
                      ? t("medsNoneChip")
                      : fill(
                          t(
                            isPluralOne(candidate.count, locale)
                              ? "medsCountOne"
                              : "medsCountOther",
                          ),
                          { count: candidate.count },
                        )}
                  </span>
                </ChoicePill>
              );
            })}
          </div>
        ) : null}

        {pet ? (
          <div className="flex min-w-0 flex-col gap-4">
            {pet.saved.map((item) => (
              <MedicationCard
                key={item.id}
                item={item}
                stay={step.stay}
                settings={step.settings}
                dateless={step.dateless.has(item.id)}
                photo={Boolean(step.labelPhotos?.photoFor(item.id))}
                editDisabled={step.editBlocked}
                onEdit={() => step.edit(item.id)}
                onRemove={() => step.remove(item.id)}
              />
            ))}

            {step.editor ? (
              <MedicationEditor step={step} petName={petName} />
            ) : (
              <div className="bg-card flex flex-col items-start gap-3.5 rounded-[16px] border-[1.5px] border-dashed border-(--care-dash) px-6 py-7">
                <p className="text-body-ink text-[16px] font-semibold">
                  {pet.saved.length > 0
                    ? t("medsAllSavedTitle")
                    : fill(t("medsEmptyTitle"), { pet: petName })}
                </p>
                <p className="text-ink-tertiary text-[14px]">
                  {pet.saved.length > 0
                    ? t("medsAllSavedText")
                    : fill(
                        t(
                          step.required
                            ? "medsEmptyTextRequired"
                            : "medsEmptyText",
                        ),
                        { pet: petName },
                      )}
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button
                    type="button"
                    variant="flat"
                    size="care"
                    className="gap-1"
                    onClick={step.add}
                  >
                    <span aria-hidden>+</span>
                    {t("medsAddMedication")}
                  </Button>
                  {step.required && pet.saved.length === 0 ? (
                    <ChoicePill
                      type="checkbox"
                      value="none"
                      checked={pet.none}
                      onChange={() => step.setNone(pet.id, !pet.none)}
                    >
                      {fill(t("medsTakesNone"), { pet: petName })}
                    </ChoicePill>
                  ) : null}
                </div>
                {step.required && pet.saved.length === 0 && !pet.none ? (
                  <p className="text-ink-secondary text-[13px]">
                    {fill(t("medsRequiredHint"), { pet: petName })}
                  </p>
                ) : null}
              </div>
            )}

            {!step.editor && pet.saved.length > 0 ? (
              <button
                type="button"
                onClick={step.add}
                className="bg-card text-primary focus-visible:outline-primary flex h-13 w-full items-center justify-center gap-1 rounded-[14px] border-[1.5px] border-dashed border-(--care-add-line) px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <span aria-hidden>+</span>
                {fill(t("medsAddAnother"), { pet: petName })}
              </button>
            ) : null}

            {step.settings.rules.vetContact && pet.count > 0 ? (
              <VetContactFields
                petId={pet.id}
                petName={petName}
                vet={pet.vet}
                onChange={(patch) => step.setVet(pet.id, patch)}
              />
            ) : null}
          </div>
        ) : null}

        <MedicationSchedulePreview step={step} className="lg:hidden" />
      </div>
    </LookScope>
  );
}
