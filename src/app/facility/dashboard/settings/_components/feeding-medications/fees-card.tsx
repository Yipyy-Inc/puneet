"use client";

import { OptionCards } from "@/components/booking/care/option-cards";
import type { AppLocale } from "@/lib/language-settings";
import type {
  MedFeeMode,
  MedicationInstructions,
} from "@/lib/settings/medication-instructions";

import { MoneyInput } from "./money-input";
import { SetupCard } from "./setup-card";

// ============================================================================
// MEDICATION FEES: the administration fee — none, per dose, per pet per day,
// or per medication per day — and, while injections are offered, an extra fee
// per injection on top. Lines on the booking's bill, added automatically.
// ============================================================================

const UNIT_KEY: Record<Exclude<MedFeeMode, "none">, string> = {
  dose: "feeUnitDose",
  pet_day: "feeUnitPetDay",
  med_day: "feeUnitMedDay",
};

export function FeesCard({
  fee,
  injectionOffered,
  onChange,
  changed,
  onReset,
  t,
  locale,
}: {
  fee: MedicationInstructions["fee"];
  /** The Injection type is on, so the injection fee can apply. */
  injectionOffered: boolean;
  onChange: (fee: MedicationInstructions["fee"]) => void;
  changed: boolean;
  onReset: () => void;
  t: (key: string) => string;
  locale: AppLocale;
}) {
  return (
    <SetupCard
      id="m-fees"
      title={t("feesTitle")}
      help={t("feesHelp")}
      changed={changed}
      changedNote={t("changedNote")}
      resetLabel={t("resetSection")}
      onReset={onReset}
    >
      <div className="flex min-w-0 flex-col gap-3 px-5 py-4 sm:px-6">
        <span className="text-body-strong text-body-ink">{t("adminFee")}</span>
        <OptionCards<MedFeeMode>
          label={t("adminFee")}
          value={fee.mode}
          columns="sm:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]"
          options={[
            { value: "none", title: t("modeNone"), hint: t("modeNoneSub") },
            { value: "dose", title: t("modeDose"), hint: t("modeDoseSub") },
            {
              value: "pet_day",
              title: t("modePetDay"),
              hint: t("modePetDaySub"),
            },
            {
              value: "med_day",
              title: t("modeMedDay"),
              hint: t("modeMedDaySub"),
            },
          ]}
          onChange={(mode) => onChange({ ...fee, mode })}
        />
        {fee.mode !== "none" ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-32">
              <MoneyInput
                value={fee.amount}
                onChange={(amount) => onChange({ ...fee, amount })}
                label={t("feeAmountLabel")}
                locale={locale}
              />
            </div>
            <span className="text-body text-ink-secondary">
              {t(UNIT_KEY[fee.mode])}
            </span>
          </div>
        ) : null}
      </div>
      {injectionOffered ? (
        <div className="border-line flex flex-wrap items-center justify-between gap-4 border-t px-5 py-4 sm:px-6">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body-strong text-body-ink">
              {t("injectionTitle")}
            </span>
            <span className="text-meta text-ink-tertiary">
              {t("injectionHelp")}
            </span>
          </span>
          <div className="w-32">
            <MoneyInput
              value={fee.injection}
              onChange={(injection) => onChange({ ...fee, injection })}
              label={t("injectionTitle")}
              locale={locale}
            />
          </div>
        </div>
      ) : null}
    </SetupCard>
  );
}
