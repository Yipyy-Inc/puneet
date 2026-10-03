"use client";

import { OptionCards } from "@/components/booking/care/option-cards";
import { Switch } from "@/components/ui/switch";
import type {
  MedicationInstructions,
  SupplyRule,
} from "@/lib/settings/medication-instructions";

import { SetupCard, SetupRow } from "./setup-card";

// ============================================================================
// SUPPLY & SAFETY RULES: the checks that run when a customer adds a
// medication — whether a short supply only warns or stops the booking, and
// whether the step asks for the pharmacy label, the vet's contact, a photo of
// the label, and whether it accepts controlled substances at all.
// ============================================================================

type Rule = keyof MedicationInstructions["rules"];

const RULES: { rule: Rule; title: string; sub: string }[] = [
  { rule: "label", title: "ruleLabel", sub: "ruleLabelSub" },
  { rule: "vetContact", title: "ruleVetContact", sub: "ruleVetContactSub" },
  { rule: "photo", title: "rulePhoto", sub: "rulePhotoSub" },
  { rule: "controlled", title: "ruleControlled", sub: "ruleControlledSub" },
];

export function RulesCard({
  supply,
  rules,
  onSupply,
  onRules,
  changed,
  onReset,
  t,
}: {
  supply: SupplyRule;
  rules: MedicationInstructions["rules"];
  onSupply: (supply: SupplyRule) => void;
  onRules: (rules: MedicationInstructions["rules"]) => void;
  changed: boolean;
  onReset: () => void;
  t: (key: string) => string;
}) {
  return (
    <SetupCard
      id="m-rules"
      title={t("rulesTitle")}
      help={t("rulesHelp")}
      changed={changed}
      changedNote={t("changedNote")}
      resetLabel={t("resetSection")}
      onReset={onReset}
    >
      <div className="flex min-w-0 flex-col gap-2.5 px-5 py-4 sm:px-6">
        <span className="text-body-ink text-[15px] font-medium">
          {t("supplyRule")}
        </span>
        <OptionCards<SupplyRule>
          label={t("supplyRule")}
          value={supply}
          options={[
            { value: "warn", title: t("supplyWarn"), hint: t("supplyWarnSub") },
            {
              value: "block",
              title: t("supplyBlock"),
              hint: t("supplyBlockSub"),
            },
          ]}
          onChange={onSupply}
        />
      </div>
      <div className="border-line flex flex-col border-t">
        {RULES.map(({ rule, title, sub }) => (
          <SetupRow key={rule} className="justify-between">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-ink text-[15px] font-medium">
                {t(title)}
              </span>
              <span className="text-ink-tertiary text-[13px]">{t(sub)}</span>
            </span>
            <Switch
              checked={rules[rule]}
              onCheckedChange={(on) => onRules({ ...rules, [rule]: on })}
              aria-label={t(title)}
            />
          </SetupRow>
        ))}
      </div>
    </SetupCard>
  );
}
