"use client";

import { Switch } from "@/components/ui/switch";
import type { AppLocale } from "@/lib/language-settings";
import { formLabel, slotLabel } from "@/lib/medications/describe";
import {
  DAY_RULES,
  MED_FORMS,
  TIME_SLOT_IDS,
  type MedPageForm,
} from "@/lib/medications/vocabulary";
import type { CareService } from "@/lib/settings/care-setup";
import {
  MEDICATION_PAGE_PARTS,
  type MedicationInstructions,
  type MedicationPagePart,
} from "@/lib/settings/medication-instructions";

import { FeesCard } from "./fees-card";
import { MethodsCard } from "./methods-card";
import { MoreOptionsCard } from "./more-options-card";
import { RulesCard } from "./rules-card";
import { ServiceUseCard } from "./service-use-card";
import { SetupRow } from "./setup-card";
import { TimeRowsCard } from "./time-rows-card";
import { TypeCardsCard } from "./type-cards-card";
import type { CareSetup } from "./use-care-setup";

// ============================================================================
// THE MEDICATIONS TAB, in the client's order: where the step appears, the
// forms given, the fees, dose rounds, ways of giving, the safety rules — then
// which days and the parts of the page.
// ============================================================================

export const MEDICATION_SECTIONS = {
  "m-services": ["services"],
  "m-forms": ["forms", "split"],
  "m-fees": ["fee"],
  "m-times": ["times", "customTimes"],
  "m-methods": ["methods"],
  "m-rules": ["supply", "rules"],
  "m-more": ["dayRules", "show"],
} as const satisfies Record<string, readonly (keyof MedicationInstructions)[]>;

/** How each form is given — the line under its name. */
const FORM_SUB: Record<MedPageForm, string> = {
  tablet: "formSubTablet",
  capsule: "formSubCapsule",
  chewable: "formSubChewable",
  liquid: "formSubLiquid",
  powder: "formSubPowder",
  topical: "formSubTopical",
  drops: "formSubDrops",
  injection: "formSubInjection",
  other: "subDescribes",
};

const PART_KEY: Record<MedicationPagePart, string> = {
  strength: "partStrength",
  food: "partFood",
  supply: "partSupply",
  allergies: "partAllergies",
  notes: "partNotes",
  saveToProfile: "partSaveToProfile",
};

export function MedicationsTab({
  setup,
  others,
  t,
  bt,
  locale,
}: {
  setup: CareSetup;
  others: CareService[];
  t: (key: string) => string;
  bt: (key: string) => string;
  locale: AppLocale;
}) {
  const {
    medications,
    setMedications,
    medicationsChanged,
    resetMedications,
    removed,
  } = setup;
  const section = (id: keyof typeof MEDICATION_SECTIONS) => ({
    changed: medicationsChanged(MEDICATION_SECTIONS[id]),
    onReset: () => resetMedications(MEDICATION_SECTIONS[id]),
  });

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <ServiceUseCard
        id="m-services"
        title={t("medServicesTitle")}
        help={t("medServicesHelp")}
        services={medications.services}
        others={others}
        onChange={(services) => setMedications({ services })}
        t={t}
        {...section("m-services")}
      />
      <TypeCardsCard<MedPageForm>
        id="m-forms"
        title={t("formsTitle")}
        help={t("formsHelp")}
        items={MED_FORMS.map((form) => ({
          id: form,
          label: formLabel(bt, form),
          sub: t(FORM_SUB[form]),
        }))}
        on={medications.forms}
        onChange={(forms) => setMedications({ forms })}
        t={t}
        {...section("m-forms")}
      >
        <SetupRow className="justify-between">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-body-strong text-body-ink">
              {t("splitTitle")}
            </span>
            <span className="text-meta text-ink-tertiary">
              {t("splitHelp")}
            </span>
          </span>
          <Switch
            checked={medications.split}
            onCheckedChange={(split) => setMedications({ split })}
            aria-label={t("splitTitle")}
          />
        </SetupRow>
      </TypeCardsCard>
      <FeesCard
        fee={medications.fee}
        injectionOffered={medications.forms.includes("injection")}
        onChange={(fee) => setMedications({ fee })}
        t={t}
        locale={locale}
        {...section("m-fees")}
      />
      <TimeRowsCard
        id="m-times"
        title={t("doseTimesTitle")}
        help={t("doseTimesHelp")}
        rows={medications.times}
        builtIn={TIME_SLOT_IDS}
        builtInName={(id) => slotLabel(bt, id)}
        prefix="dose"
        newName={t("newRound")}
        addLabel={t("addDoseTime")}
        onChange={(change) =>
          setMedications((current) => ({ times: change(current.times) }))
        }
        customTimes={{
          checked: medications.customTimes,
          onChange: (customTimes) => setMedications({ customTimes }),
        }}
        removed={removed}
        t={t}
        {...section("m-times")}
      />
      <MethodsCard
        methods={medications.methods}
        onChange={(change) =>
          setMedications((current) => ({ methods: change(current.methods) }))
        }
        removed={removed}
        t={t}
        bt={bt}
        locale={locale}
        {...section("m-methods")}
      />
      <RulesCard
        supply={medications.supply}
        rules={medications.rules}
        onSupply={(supply) => setMedications({ supply })}
        onRules={(rules) => setMedications({ rules })}
        t={t}
        {...section("m-rules")}
      />
      <MoreOptionsCard<MedicationPagePart>
        id="m-more"
        rules={DAY_RULES}
        dayRules={medications.dayRules}
        onDayRules={(dayRules) =>
          setMedications({
            dayRules: dayRules as MedicationInstructions["dayRules"],
          })
        }
        parts={MEDICATION_PAGE_PARTS}
        partKey={PART_KEY}
        show={medications.show}
        onShow={(show) => setMedications({ show })}
        t={t}
        bt={bt}
        {...section("m-more")}
      />
    </div>
  );
}
