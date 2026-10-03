"use client";

import { LookScope } from "@/components/look/look-context";
import { Button } from "@/components/ui/button";
import { useOpenEvaluationWizard } from "@/components/evaluations/use-open-evaluation-wizard";
import type { FacilityCalendar } from "@/lib/evaluations/facility-days";
import type { AppLocale } from "@/lib/language-settings";
import type { VaccinationRule } from "@/types/facility";

import { ClientsPreview } from "./clients-preview";
import { ConfirmationStep } from "./confirmation-step";
import { MoreOptionsCard } from "./more-options-card";
import { OfferModeStep } from "./offer-mode-step";
import {
  useEvaluationSetup,
  type EvaluationSetupSources,
} from "./use-evaluation-setup";
import { WhenStep } from "./when-step";
import { WhoWhatStep, type ServiceChip } from "./who-what-step";

// ============================================================================
// SETTINGS › SERVICES › EVALUATIONS — the client's setup page (2026-10-02),
// laid out as its mock lays it out: what the page is for beside "Try the
// booking wizard" and "Save"; four numbered steps on the left; "What clients
// will see" on the right, sticky, computed from the draft.
//
// The page's title is the settings shell's (§5b2), so the mock's breadcrumb
// "Settings › Services" is the shell's "← All settings" above it.
// ============================================================================

export function EvaluationSetupPage({
  sources,
  services,
  vaccineRules,
  calendar,
  setupHref,
  t,
  locale,
}: {
  sources: EvaluationSetupSources;
  services: readonly ServiceChip[];
  vaccineRules: readonly VaccinationRule[];
  calendar: FacilityCalendar;
  /** Operations › Evaluations › Setup, in this portal. */
  setupHref: string;
  t: (key: string) => string;
  locale: AppLocale;
}) {
  const setup = useEvaluationSetup(sources, t);
  const openEvaluationWizard = useOpenEvaluationWizard();
  const openWizard = () => openEvaluationWizard();

  // The vaccines the chosen services ask for — what "Vaccines required
  // before booking" will check on an evaluation.
  const chips = new Set(setup.draft.chips);
  const vaccineNames = [
    ...new Set(
      vaccineRules
        .filter(
          (rule) =>
            rule.required &&
            (rule.applicableServices.length === 0 ||
              rule.applicableServices.some((s) => chips.has(s))),
        )
        .map((rule) => rule.vaccineName.trim())
        .filter(Boolean),
    ),
  ];

  return (
    // The evaluation mock's palette is the booking mock's, so the section
    // takes the booking look (CLAUDE.md § "Client mocks decide the look").
    <LookScope name="booking">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-160 min-w-0 flex-col gap-1">
            <p className="text-ink-tertiary text-[14px] text-pretty">
              {t("intro")}
            </p>
            {setup.dirty ? (
              <p className="text-ink-tertiary text-[12.5px]">
                {t("tryAfterSave")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="quiet"
              size="mock-42"
              onClick={openWizard}
              disabled={setup.dirty}
            >
              {t("tryWizard")}
            </Button>
            <Button
              type="button"
              size="mock-42"
              className="px-5 font-bold [--sh-cta:none]"
              onClick={() => void setup.save()}
              disabled={!setup.dirty}
              loading={setup.saving}
            >
              {t("save")}
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-start gap-[18px]">
          <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3.5">
            <OfferModeStep setup={setup} t={t} />
            <WhenStep setup={setup} t={t} locale={locale} />
            <WhoWhatStep
              setup={setup}
              services={services}
              vaccineNames={vaccineNames}
              t={t}
              locale={locale}
            />
            <ConfirmationStep setup={setup} t={t} />
            <MoreOptionsCard setup={setup} t={t} />
          </div>
          <ClientsPreview
            config={setup.draft.config}
            calendar={calendar}
            t={t}
            locale={locale}
            onOpenWizard={openWizard}
            wizardDisabled={setup.dirty}
            setupHref={setupHref}
          />
        </div>
      </div>
    </LookScope>
  );
}
