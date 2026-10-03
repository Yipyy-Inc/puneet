"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { formatDecimal } from "@/lib/i18n/format";
import {
  fill,
  formatAmount,
  unitWord,
  type Translate,
} from "@/lib/medications/dose";
import { draftSupply } from "@/lib/medications/draft";
import { DOSE } from "@/lib/medications/vocabulary";
import { useShellLocale, useShellText } from "@/lib/shell/use-shell-text";
import type { AppLocale } from "@/lib/language-settings";

import { AllergyInput } from "./allergy-input";
import { EditorLabelPhoto } from "./editor-label-photo";
import {
  EditorSection,
  FieldLabel,
} from "@/components/booking/care/editor-section";
import type { MedicationStepState } from "./use-medication-step";

// ============================================================================
// SUPPLY & NOTES: how much is being brought against what the stay takes,
// the original pharmacy label where the facility asks for it, drug allergies,
// special instructions, and keeping the medication on the pet's profile.
// ============================================================================

function SupplyStatus({
  step,
  t,
  locale,
}: {
  step: MedicationStepState;
  t: Translate;
  locale: AppLocale;
}) {
  const draft = step.editor!.draft;
  const spec = DOSE[draft.form];
  const check = draftSupply(draft, step);
  const words = (n: number) =>
    `${formatDecimal(n, locale, 2)} ${unitWord(t, draft.unit, n, locale, draft.customUnit)}`;

  if (check.kind === "unscheduled") {
    return <Status tone="neutral">{t("medsSupplyUnscheduled")}</Status>;
  }
  const rounded =
    spec.fraction && check.exact !== check.need
      ? fill(t("medsSupplyRounded"), {
          used: formatAmount(check.exact, true, locale),
        })
      : "";
  if (check.kind === "short") {
    return (
      <Status tone="short">
        {fill(t("medsSupplyShort"), {
          short: words(check.short),
          need: formatDecimal(check.need, locale, 2),
        })}
      </Status>
    );
  }
  if (check.kind === "enough") {
    return (
      <Status tone="enough">
        {fill(t("medsSupplyEnough"), { need: words(check.need), rounded })}
      </Status>
    );
  }
  return (
    <Status tone="neutral">
      {fill(t("medsSupplyNeeded"), { need: words(check.need), rounded })}
    </Status>
  );
}

/** The mock's supply line: a 10px-cornered wash, its words in the tone's ink. */
function Status({
  tone,
  children,
}: {
  tone: "neutral" | "short" | "enough";
  children: React.ReactNode;
}) {
  return (
    <p
      data-tone={tone}
      className="text-ink-secondary data-[tone=enough]:bg-wash-success data-[tone=enough]:text-success rounded-[10px] bg-(--care-track) px-3 py-2 text-[14px] font-medium data-[tone=short]:bg-(--note-bg) data-[tone=short]:text-(--note-ink)"
    >
      {children}
    </p>
  );
}

export function EditorSupply({
  step,
  petName,
}: {
  step: MedicationStepState;
  petName: string;
}) {
  const t = useShellText("booking");
  const locale = useShellLocale();
  const draft = step.editor!.draft;
  const { show, rules } = step.settings;
  if (
    !show.supply &&
    !rules.label &&
    !show.allergies &&
    !show.notes &&
    !show.saveToProfile
  ) {
    return null;
  }

  return (
    <EditorSection label={t("medsSectionSupply")}>
      {show.supply ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel htmlFor="meds-supply">{t("medsSupplyLabel")}</FieldLabel>
          <div className="flex flex-wrap items-center gap-3.5">
            <div className="border-line-strong bg-card has-focus-visible:border-primary flex h-12 items-center gap-2 rounded-[12px] border px-3.5">
              <input
                id="meds-supply"
                type="number"
                min={0}
                inputMode="decimal"
                value={draft.supply}
                placeholder={(() => {
                  const need = draftSupply({ ...draft, supply: "" }, step);
                  return need.kind === "unscheduled"
                    ? ""
                    : formatDecimal(need.need, locale, 2);
                })()}
                onChange={(event) =>
                  step.update({ supply: event.target.value })
                }
                className="text-body-ink w-16 [appearance:textfield] border-0 bg-transparent text-[16px] tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="text-ink-tertiary text-[15px]">
                {unitWord(t, draft.unit, 2, locale, draft.customUnit)}
              </span>
            </div>
            <SupplyStatus step={step} t={t} locale={locale} />
          </div>
        </div>
      ) : null}

      {rules.label ? (
        <div className="border-line flex items-start gap-3 rounded-[12px] border px-4 py-3.5">
          <Checkbox
            id="meds-label-confirmed"
            checked={draft.labelConfirmed}
            onCheckedChange={(on) =>
              step.update({ labelConfirmed: on === true })
            }
            className="mt-0.5"
          />
          <label
            htmlFor="meds-label-confirmed"
            className="flex cursor-pointer flex-col gap-0.5"
          >
            <span className="text-body-ink text-[15px] font-medium">
              {t("medsLabelConfirm")}
            </span>
            <span className="text-ink-tertiary text-[13px]">
              {t("medsLabelConfirmHelp")}
            </span>
          </label>
        </div>
      ) : null}

      <EditorLabelPhoto step={step} />

      {show.allergies ? (
        <div className="flex min-w-0 flex-col gap-2.5">
          <FieldLabel htmlFor="meds-allergy">
            {t("medsAllergiesLabel")}
          </FieldLabel>
          <AllergyInput
            id="meds-allergy"
            values={draft.allergies}
            onChange={(allergies) => step.update({ allergies })}
            placeholder={t("medsAllergyPlaceholder")}
            removeLabel={(name) => fill(t("medsRemoveAllergy"), { name })}
          />
        </div>
      ) : null}

      {show.notes ? (
        <div className="flex min-w-0 flex-col gap-2">
          <FieldLabel htmlFor="meds-notes">
            {t("medsNotesLabel")}{" "}
            <span className="font-normal text-(--care-micro)">
              {t("medsOptional")}
            </span>
          </FieldLabel>
          <Textarea
            id="meds-notes"
            rows={3}
            maxLength={1000}
            value={draft.notes}
            placeholder={fill(t("medsNotesPlaceholder"), { pet: petName })}
            onChange={(event) => step.update({ notes: event.target.value })}
            className="rounded-[12px] px-3.5 py-3 text-[15px] leading-[22.5px]"
          />
        </div>
      ) : null}

      {show.saveToProfile ? (
        <div className="flex items-start gap-3 rounded-[12px] bg-(--care-card-on) px-4 py-3.5">
          <Checkbox
            id="meds-save-profile"
            checked={draft.saveToProfile}
            onCheckedChange={(on) =>
              step.update({ saveToProfile: on === true })
            }
            className="mt-0.5"
          />
          <label
            htmlFor="meds-save-profile"
            className="flex cursor-pointer flex-col gap-0.5"
          >
            <span className="text-acc-soft-text text-[15px] font-medium">
              {t("medsSaveToProfile")}
            </span>
            <span className="text-acc-deep text-[13px]">
              {t("medsSaveToProfileHelp")}
            </span>
          </label>
        </div>
      ) : null}
    </EditorSection>
  );
}
