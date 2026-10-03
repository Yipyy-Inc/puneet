"use client";

import { ChoicePill } from "@/components/ui/choice-pill";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { formLabel, formNote } from "@/lib/medications/describe";
import {
  doseWords,
  fill,
  formatAmount,
  isFractional,
  stepDown,
  stepUp,
  unitOption,
  unitWord,
} from "@/lib/medications/dose";
import { controlledSubstance } from "@/lib/medications/controlled";
import {
  DOSE,
  MED_FORMS,
  METHODS_BY_FORM,
  type MedPageForm,
} from "@/lib/medications/vocabulary";
import { isCustomMethod } from "@/lib/settings/medication-instructions";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";

import { AmountStepper } from "@/components/booking/care/amount-stepper";
import {
  EditorSection,
  FieldLabel,
} from "@/components/booking/care/editor-section";
import type { MedicationStepState } from "./use-medication-step";

// ============================================================================
// MEDICATION: its name and strength, its form, and one dose — the quick
// picks, − / +, the unit where a form has more than one, "who splits them?"
// for a half or a quarter, and the form's own note. The facility's rules show
// here too: a controlled substance it does not accept, the forms it does not
// give, and whether its staff split tablets.
// ============================================================================

export function EditorMedication({ step }: { step: MedicationStepState }) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const draft = step.editor!.draft;
  const spec = DOSE[draft.form];
  const { settings } = step;
  // A form the facility has since turned off stays visible on the medication
  // that uses it, rather than vanishing from under it.
  const forms: MedPageForm[] = settings.forms.includes(draft.form)
    ? settings.forms
    : [...settings.forms, draft.form];
  const dose = doseWords(
    t,
    {
      form: draft.form,
      amount: draft.amount,
      unit: draft.unit,
      customUnit: draft.customUnit,
    },
    locale,
  );

  const changeForm = (form: MedPageForm) => {
    if (form === draft.form) return;
    step.update((current) => ({
      form,
      unit: DOSE[form].units[0],
      amount: 1,
      // Its own ways of giving suit every form.
      method:
        current.method &&
        ((METHODS_BY_FORM[form] as readonly string[]).includes(
          current.method,
        ) ||
          isCustomMethod(current.method))
          ? current.method
          : "",
    }));
  };

  const controlled = controlledSubstance(draft.name) !== null;

  return (
    <EditorSection label={t("medsSectionMedication")}>
      <div className="grid gap-3.5 sm:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
          <FieldLabel htmlFor="meds-name">{t("medsNameLabel")}</FieldLabel>
          <Input
            id="meds-name"
            value={draft.name}
            maxLength={120}
            autoComplete="off"
            placeholder={t("medsNamePlaceholder")}
            onChange={(event) => step.update({ name: event.target.value })}
            className="h-12 rounded-[12px] px-3.5 text-[16px] max-lg:h-12"
          />
          {controlled ? (
            settings.rules.controlled ? (
              <p className="text-ink-tertiary text-[13px]">
                {t("medsControlledAccepted")}
              </p>
            ) : (
              <p role="alert" className="text-bad text-[13px]">
                {fill(t("medsControlledRefused"), { name: draft.name.trim() })}
              </p>
            )
          ) : null}
        </div>
        {settings.show.strength ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            <FieldLabel htmlFor="meds-strength">
              {t("medsStrengthLabel")}{" "}
              <span className="font-normal text-(--care-micro)">
                {t("medsOptional")}
              </span>
            </FieldLabel>
            <Input
              id="meds-strength"
              value={draft.strength}
              maxLength={60}
              autoComplete="off"
              placeholder={t("medsStrengthPlaceholder")}
              onChange={(event) =>
                step.update({ strength: event.target.value })
              }
              className="h-12 rounded-[12px] px-3.5 text-[16px] max-lg:h-12"
            />
          </div>
        ) : null}
      </div>

      <fieldset className="flex min-w-0 flex-col gap-2.5">
        <legend className="text-body-ink mb-2.5 text-[14px] font-medium">
          {t("medsFormLabel")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {forms.map((form) => (
            <ChoicePill
              key={form}
              type="radio"
              name="meds-form"
              value={form}
              checked={draft.form === form}
              onChange={() => changeForm(form)}
            >
              {formLabel(t, form)}
            </ChoicePill>
          ))}
        </div>
        {/* Forms the facility does not give: the owner calls instead. */}
        {settings.forms.length < MED_FORMS.length ? (
          <p className="text-ink-tertiary text-[13px] leading-[19.5px]">
            {t("medsFormsMissingNote")}
          </p>
        ) : null}
      </fieldset>

      <div className="flex min-w-0 flex-col gap-3">
        <FieldLabel
          id="meds-amount-label"
          aside={
            <span
              className="text-acc-soft-text text-[14px] font-semibold"
              aria-live="polite"
            >
              {fill(t("medsPerDose"), { dose })}
            </span>
          }
        >
          {t("medsAmountLabel")}
        </FieldLabel>

        {spec.units.length > 1 ? (
          <Segmented
            name="meds-unit"
            label={t("medsUnitLabel")}
            value={draft.unit}
            options={spec.units.map((unit) => ({
              value: unit,
              label: unitOption(t, unit),
            }))}
            onChange={(unit) => step.update({ unit })}
            className="self-start"
          />
        ) : null}

        {draft.form === "other" ? (
          <Input
            aria-label={t("medsCustomUnitLabel")}
            value={draft.customUnit}
            maxLength={40}
            placeholder={t("medsCustomUnitPlaceholder")}
            onChange={(event) =>
              step.update({ customUnit: event.target.value })
            }
            className="h-11 max-w-80 rounded-[12px] px-3.5 text-[15px] max-lg:h-11"
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="radiogroup"
            aria-labelledby="meds-amount-label"
            className="flex flex-wrap gap-2"
          >
            {spec.presets.map((preset) => (
              <ChoicePill
                key={preset}
                type="radio"
                name="meds-preset"
                value={String(preset)}
                checked={draft.amount === preset}
                onChange={() => step.update({ amount: preset })}
                className="min-w-13 justify-center px-3"
              >
                {formatAmount(preset, spec.fraction, locale)}
              </ChoicePill>
            ))}
          </div>
          {/* Below 640px the stepper wraps under the picks, and a divider
              would be left at the end of their row. */}
          <span aria-hidden className="bg-line mx-1 h-7 w-px max-sm:hidden" />
          <AmountStepper
            amount={draft.amount}
            label={formatAmount(draft.amount, spec.fraction, locale)}
            typed={!spec.fraction}
            step={spec.step}
            onDown={() =>
              step.update((current) => ({
                amount: stepDown(current.amount, spec.step),
              }))
            }
            onUp={() =>
              step.update((current) => ({
                amount: stepUp(current.amount, spec.step),
              }))
            }
            onType={(amount) => step.update({ amount })}
            decreaseLabel={t("medsDecrease")}
            increaseLabel={t("medsIncrease")}
            inputLabel={t("medsAmountInput")}
          />
          <span className="text-ink-secondary text-[15px]">
            {unitWord(t, draft.unit, draft.amount, locale, draft.customUnit)}
          </span>
        </div>

        {spec.splittable && isFractional(draft.amount) && !settings.split ? (
          <p className="text-ink-tertiary text-[13px] leading-[19.5px]">
            {t("medsBringSplit")}
          </p>
        ) : null}

        {spec.splittable && isFractional(draft.amount) && settings.split ? (
          <div className="bg-surface-inset flex flex-wrap items-center gap-2.5 rounded-[12px] border border-(--row-line) px-3.5 py-3">
            <span className="text-ink-secondary text-[14px]">
              {fill(t("medsSplitQuestion"), { dose })}
            </span>
            <Segmented
              name="meds-split"
              label={fill(t("medsSplitQuestion"), { dose })}
              value={draft.splitBy}
              options={[
                { value: "owner", label: t("medsSplitOwner") },
                { value: "staff", label: t("medsSplitStaff") },
              ]}
              onChange={(splitBy) => step.update({ splitBy })}
              className="rounded-[10px]"
            />
          </div>
        ) : null}

        {spec.note ? (
          <p className="text-ink-tertiary text-[13px] leading-[19.5px]">
            {formNote(t, spec.note)}
          </p>
        ) : null}
      </div>
    </EditorSection>
  );
}
