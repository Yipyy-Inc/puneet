"use client";

import { ChoicePill } from "@/components/ui/choice-pill";
import { SwitchRow } from "@/components/evaluations/switch-row";
import { INTAKE_QUESTIONS } from "@/lib/evaluations/questions";
import { formatList } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import type { EvaluationConfig } from "@/types/facility";

import { FieldLabel, StepCard } from "./step-card";
import type { EvaluationSetup } from "./use-evaluation-setup";

// ============================================================================
// STEP 3 — "Who & what" (the client's mock):
//
//   Services that need an evaluation first    the facility's own services
//   Let clients choose their evaluator        Off = first available …
//   Allow multiple pets in one evaluation     2nd pet at 50%
//   Vaccines required before booking          Rabies, DHPP, Bordetella
//   Questions clients answer when booking     five switches
//
// The mock's "Group play" is not a service a booking can carry in Yipyy, so
// the chips are the services this facility actually runs (decided with the
// user, 2026-10-02).
// ============================================================================

export interface ServiceChip {
  id: string;
  /** Already in the viewer's language — or the facility's own name. */
  label: string;
}

export function WhoWhatStep({
  setup,
  services,
  vaccineNames,
  t,
  locale,
}: {
  setup: EvaluationSetup;
  services: readonly ServiceChip[];
  /** The vaccines the chosen services require, in the facility's words. */
  vaccineNames: readonly string[];
  t: (key: string) => string;
  locale: AppLocale;
}) {
  const config = setup.draft.config;
  const chips = new Set(setup.draft.chips);
  const questions = config.intakeQuestions;
  const setQuestion = (
    key: keyof EvaluationConfig["intakeQuestions"],
    on: boolean,
  ) => setup.setConfig({ intakeQuestions: { ...questions, [key]: on } });

  return (
    <StepCard id="ev-who" step={t("step3")} title={t("whoTitle")}>
      <div className="flex min-w-0 flex-col gap-2">
        <FieldLabel id="ev-services-label">{t("servicesFirst")}</FieldLabel>
        <div
          role="group"
          aria-labelledby="ev-services-label"
          className="flex min-w-0 flex-wrap gap-1.5"
        >
          {services.map((service) => (
            <ChoicePill
              key={service.id}
              type="checkbox"
              checked={chips.has(service.id)}
              onChange={() => {
                const next = new Set(chips);
                if (next.has(service.id)) next.delete(service.id);
                else next.add(service.id);
                setup.setChips(
                  services.map((s) => s.id).filter((id) => next.has(id)),
                );
              }}
            >
              {service.label}
            </ChoicePill>
          ))}
        </div>
      </div>

      <SwitchRow
        id="ev-pick-evaluator"
        label={t("pickEvaluator")}
        help={t("pickEvaluatorHelp")}
        checked={config.customerPicksEvaluator}
        onChange={(customerPicksEvaluator) =>
          setup.setConfig({ customerPicksEvaluator })
        }
      />
      <SwitchRow
        id="ev-multi-pet"
        label={t("multiPet")}
        help={t("multiPetHelp")}
        checked={config.multiPet}
        onChange={(multiPet) => setup.setConfig({ multiPet })}
      />
      <SwitchRow
        id="ev-vaccines"
        label={t("vaccinesRequired")}
        help={
          vaccineNames.length > 0
            ? formatList([...vaccineNames], locale)
            : t("vaccinesNoneSet")
        }
        checked={config.vaccinesRequired}
        onChange={(vaccinesRequired) => setup.setConfig({ vaccinesRequired })}
      />

      <div className="flex min-w-0 flex-col gap-2">
        <FieldLabel>{t("clientQuestions")}</FieldLabel>
        <div className="flex min-w-0 flex-col gap-1.5">
          {INTAKE_QUESTIONS.map((question) => (
            <SwitchRow
              key={question.key}
              id={`ev-question-${question.key}`}
              label={t(`question_${question.key}`)}
              checked={questions[question.key]}
              onChange={(on) => setQuestion(question.key, on)}
            />
          ))}
        </div>
      </div>
    </StepCard>
  );
}
