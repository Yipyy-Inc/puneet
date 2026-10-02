"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";

import { UnitField } from "./step-card";
import type { EvaluationSetup } from "./use-evaluation-setup";
import { SwitchRow } from "@/components/evaluations/switch-row";

// ============================================================================
// MORE OPTIONS — what the client's setup page leaves out and an evaluation
// still has: the name and line on the booking wizard's service card, the
// name staff see, a cap on pets a day, how long a pass lasts, and tax. Kept,
// closed, at the end, so the page reads as the mock does and nothing a
// facility had set before 2026-10-02 becomes unreachable.
// ============================================================================

export function MoreOptionsCard({
  setup,
  t,
}: {
  setup: EvaluationSetup;
  t: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const config = setup.draft.config;
  const limits = config.dailyPetLimits ?? {
    enabled: false,
    defaultLimit: 4,
  };
  const validity = config.validityMode ?? "always_valid";

  return (
    <Card className="gap-0 py-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="focus-visible:outline-primary flex min-h-12 w-full items-center gap-3 rounded-3xl px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-6">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-section text-heading">{t("moreTitle")}</span>
            <span className="text-meta text-ink-tertiary">{t("moreHelp")}</span>
          </span>
          <ChevronDown
            aria-hidden
            data-open={open}
            className="text-ink-secondary size-5 shrink-0 transition-transform duration-180 data-[open=true]:rotate-180 motion-reduce:transition-none"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-line flex min-w-0 flex-col gap-4 border-t px-5 py-4 sm:px-6">
            <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-3">
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-meta text-body-ink font-semibold">
                  {t("customerName")}
                </span>
                <Input
                  value={config.customerName}
                  onChange={(event) =>
                    setup.setConfig({ customerName: event.target.value })
                  }
                />
              </label>
              <label className="flex min-w-0 flex-col gap-1.5">
                <span className="text-meta text-body-ink font-semibold">
                  {t("internalName")}
                </span>
                <Input
                  value={config.internalName}
                  onChange={(event) =>
                    setup.setConfig({ internalName: event.target.value })
                  }
                />
              </label>
            </div>
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-meta text-body-ink font-semibold">
                {t("descriptionShown")}
              </span>
              <Textarea
                rows={2}
                value={config.description}
                onChange={(event) =>
                  setup.setConfig({ description: event.target.value })
                }
              />
            </label>

            <SwitchRow
              id="ev-daily-limit"
              label={t("dailyLimits")}
              help={t("dailyLimitsHelp")}
              checked={limits.enabled}
              onChange={(enabled) =>
                setup.setConfig({ dailyPetLimits: { ...limits, enabled } })
              }
            />
            {limits.enabled ? (
              <div className="max-w-[220px]">
                <UnitField
                  id="ev-daily-limit-value"
                  label={t("dailyLimitValue")}
                  unit={t("unitPets")}
                  min={1}
                  value={limits.defaultLimit}
                  onChange={(defaultLimit) =>
                    setup.setConfig({
                      // One number for every day: the per-weekday figures the
                      // old screen offered are cleared with it.
                      dailyPetLimits: {
                        enabled: true,
                        defaultLimit: Math.floor(defaultLimit),
                      },
                    })
                  }
                />
              </div>
            ) : null}

            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-body-strong text-body-ink">
                {t("validity")}
              </span>
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                <Segmented<"always_valid" | "expires_after_inactivity">
                  name="evaluation-validity"
                  label={t("validity")}
                  value={validity}
                  options={[
                    { value: "always_valid", label: t("alwaysValid") },
                    {
                      value: "expires_after_inactivity",
                      label: t("expireAfterInactivity"),
                    },
                  ]}
                  onChange={(validityMode) => setup.setConfig({ validityMode })}
                />
                {validity === "expires_after_inactivity" ? (
                  <div className="w-[200px]">
                    <UnitField
                      id="ev-expiry"
                      label={t("expiresAfter")}
                      unit={t("unitDays")}
                      min={1}
                      value={config.expirationDays ?? 90}
                      onChange={(expirationDays) =>
                        setup.setConfig({
                          expirationDays: Math.floor(expirationDays),
                        })
                      }
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <SwitchRow
              id="ev-taxable"
              label={t("taxable")}
              help={t("taxableHelp")}
              checked={config.taxSettings.taxable}
              onChange={(taxable) =>
                setup.setConfig({
                  taxSettings: { ...config.taxSettings, taxable },
                })
              }
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
