"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  useFacilitySettings,
  useSaveFacilitySetting,
} from "@/lib/api/facility-settings";
import {
  DEFAULT_DESK_TIP_SERVICES,
  type CheckoutConfig,
} from "@/lib/settings/checkout";
import { useSettingsText } from "@/lib/settings/use-settings-text";

// ============================================================================
// "At checkout" — what the front desk's Take payment dialog does (2026-10-03).
//
//   Account credit   applied automatically, or only once the client is asked
//   Tips at the desk which services the dialog asks a tip on
//
// Two domains, `checkout_config` and `tip_config.deskServices`, saved by one
// button. Nothing is copied into state from the settings: the draft starts
// empty and only holds what somebody CHANGED, so a page that rendered before
// the row arrived cannot save the defaults over the facility's own choice
// (check:settings-seeding) — and Save waits for the row besides.
// ============================================================================

const SERVICES = [
  { id: "boarding", labelKey: "svcBoarding" },
  { id: "daycare", labelKey: "svcDaycare" },
  { id: "grooming", labelKey: "svcGrooming" },
  { id: "training", labelKey: "svcTraining" },
] as const;

export function CheckoutAtDeskCard() {
  const t = useSettingsText().section("tips");
  const { settings, isPending } = useFacilitySettings();
  const save = useSaveFacilitySetting();
  const [credit, setCredit] = useState<
    CheckoutConfig["creditAtCheckout"] | null
  >(null);
  const [desk, setDesk] = useState<string[] | null>(null);

  const storedCredit = settings.checkout_config.value.creditAtCheckout;
  const tipConfig = settings.tip_config.value;
  const storedDesk = tipConfig.deskServices ?? [...DEFAULT_DESK_TIP_SERVICES];
  const shownCredit = credit ?? storedCredit;
  const shownDesk = desk ?? storedDesk;
  const dirty = credit !== null || desk !== null;

  const submit = async () => {
    try {
      if (credit !== null) {
        await save.mutateAsync({
          domain: "checkout_config",
          value: { creditAtCheckout: credit } satisfies CheckoutConfig,
        });
      }
      if (desk !== null) {
        await save.mutateAsync({
          domain: "tip_config",
          value: { ...tipConfig, deskServices: desk },
        });
      }
      setCredit(null);
      setDesk(null);
      toast.success(t("atCheckoutSaved"));
    } catch (error) {
      toast.error(t("atCheckoutNotSaved"), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <section
      aria-labelledby="at-checkout-title"
      className="bg-card border-line rounded-2xl border"
    >
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="at-checkout-title" className="text-[17px] font-bold">
            {t("atCheckoutTitle")}
          </h2>
          <p className="text-ink-tertiary text-[13.5px]">
            {t("atCheckoutIntro")}
          </p>
        </div>
        {dirty ? (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCredit(null);
                setDesk(null);
              }}
              disabled={save.isPending}
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={isPending || save.isPending}
              data-loading={save.isPending || undefined}
            >
              {t("atCheckoutSave")}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-6 px-5 py-5">
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="text-[15px] font-semibold">
            {t("creditLegend")}
          </legend>
          <RadioGroup
            value={shownCredit}
            onValueChange={(value) =>
              setCredit(value as CheckoutConfig["creditAtCheckout"])
            }
            disabled={isPending}
            className="gap-3"
          >
            {(["auto", "ask"] as const).map((value) => (
              <div key={value} className="flex items-start gap-3">
                <RadioGroupItem
                  value={value}
                  id={`credit-${value}`}
                  className="mt-1"
                />
                <Label
                  htmlFor={`credit-${value}`}
                  className="flex min-w-0 flex-col items-start gap-0.5 font-normal"
                >
                  <span className="text-[14.5px] font-semibold">
                    {t(value === "auto" ? "creditAuto" : "creditAsk")}
                  </span>
                  <span className="text-ink-tertiary text-[13.5px]">
                    {t(value === "auto" ? "creditAutoHelp" : "creditAskHelp")}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </fieldset>

        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="text-[15px] font-semibold">
            {t("deskTipsLegend")}
          </legend>
          <p className="text-ink-tertiary text-[13.5px]">
            {tipConfig.enabled ? t("deskTipsHelp") : t("deskTipsOff")}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {SERVICES.map((service) => {
              const checked = shownDesk.includes(service.id);
              return (
                <div key={service.id} className="flex items-center gap-2.5">
                  <Checkbox
                    id={`desk-tip-${service.id}`}
                    checked={checked}
                    disabled={isPending || !tipConfig.enabled}
                    onCheckedChange={(next) =>
                      setDesk(
                        next === true
                          ? [...shownDesk, service.id]
                          : shownDesk.filter((id) => id !== service.id),
                      )
                    }
                  />
                  <Label
                    htmlFor={`desk-tip-${service.id}`}
                    className="text-[14.5px] font-normal"
                  >
                    {t(service.labelKey)}
                  </Label>
                </div>
              );
            })}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
