"use client";

import { Info, Pill, Plus } from "lucide-react";

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
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="border-line bg-card flex size-12 shrink-0 items-center justify-center rounded-xl border">
            <Pill className="text-heading size-6" aria-hidden />
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-section text-heading">{t("medications")}</h3>
            <p className="text-body text-ink-secondary">
              {t(
                step.required ? "medsStepSubtitleRequired" : "medsStepSubtitle",
              )}
            </p>
          </div>
        </div>
        <span className="border-line bg-card text-meta text-ink-secondary shrink-0 rounded-full border px-3 py-1.5">
          {stepLabel}
        </span>
      </div>

      {notices.length > 0 ? (
        <p className="text-meta text-ink-tertiary">{notices.join(" ")}</p>
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
                className="pr-2"
              >
                <span>{candidate.name}</span>
                <span
                  data-active={active}
                  className="bg-surface-inset text-ink-secondary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground text-meta rounded-full px-2 py-0.5 font-semibold whitespace-nowrap tabular-nums"
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
            <div className="border-line-strong bg-card flex flex-col items-start gap-3.5 rounded-xl border-[1.5px] border-dashed p-6">
              <p className="text-body-strong text-body-ink">
                {pet.saved.length > 0
                  ? t("medsAllSavedTitle")
                  : fill(t("medsEmptyTitle"), { pet: petName })}
              </p>
              <p className="text-body text-ink-secondary">
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
                <Button type="button" onClick={step.add}>
                  <Plus className="size-4" aria-hidden />
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
                <p className="text-meta text-ink-secondary flex items-start gap-2">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {fill(t("medsRequiredHint"), { pet: petName })}
                </p>
              ) : null}
            </div>
          )}

          {!step.editor && pet.saved.length > 0 ? (
            <button
              type="button"
              onClick={step.add}
              className="border-line-strong bg-card text-primary hover:bg-surface-inset focus-visible:outline-primary text-body-strong flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed px-4 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Plus className="size-5" aria-hidden />
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
  );
}
