"use client";

import { Users } from "lucide-react";
import { useSettingsText } from "@/lib/settings/use-settings-text";
import { InterpolatedText } from "@/components/ui/interpolated-text";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TipAttribution,
  TipAttributionMode,
  TipAttributionRule,
} from "@/types/facility";

// ============================================================================
// Who a tip belongs to once it has been collected.
//
// ── PER SERVICE, BECAUSE FACILITIES GENUINELY DIFFER BY SERVICE ───────────
//
// A grooming tip is nearly always the groomer's. A daycare tip is for whoever
// was on the floor, and belongs in a pool. One global setting would force a
// facility to be wrong about one of them.
//
// ── THE DIFFERENCE BETWEEN THE LAST TWO MODES IS MONEY ────────────────────
//
// `pool` is a debt the facility still owes its people and has not divided yet.
// `none` is not a debt at all. They look similar on this screen and are not the
// same thing on the payout report — reporting them as one would tell an owner
// they had settled up when they had not.
//
// ── NOTHING HERE IS RETROACTIVE ───────────────────────────────────────────
//
// Attribution runs when a tip is COLLECTED, from the rule in force at that
// moment. Changing this screen does not re-attribute money already taken, and
// the copy says so — otherwise the obvious reading is that it does.
// ============================================================================

/** The services a facility can run. Mirrors the `service_module` enum. */
const SERVICES: { id: string; labelKey: string }[] = [
  { id: "grooming", labelKey: "svcGrooming" },
  { id: "boarding", labelKey: "svcBoarding" },
  { id: "daycare", labelKey: "svcDaycare" },
  { id: "training", labelKey: "svcTraining" },
  { id: "retail", labelKey: "svcRetail" },
];

const MODES: {
  value: TipAttributionMode;
  labelKey: string;
  hintKey: string;
}[] = [
  {
    value: "assigned",
    labelKey: "modeAssigned",
    hintKey: "modeAssignedHint",
  },
  {
    value: "split_even",
    labelKey: "modeSplitEven",
    hintKey: "modeSplitEvenHint",
  },
  { value: "pool", labelKey: "modePool", hintKey: "modePoolHint" },
  { value: "none", labelKey: "modeNone", hintKey: "modeNoneHint" },
];

export function TipAttributionCard({
  value,
  onChange,
  disabled,
}: {
  value: TipAttribution;
  onChange: (next: TipAttribution) => void;
  disabled: boolean;
}) {
  const t = useSettingsText().section("tips");
  const ruleFor = (service: string): TipAttributionRule => ({
    mode: value.byService[service]?.mode ?? value.defaultMode,
    notes: value.byService[service]?.notes,
  });

  const setRule = (service: string, patch: Partial<TipAttributionRule>) =>
    onChange({
      ...value,
      byService: {
        ...value.byService,
        [service]: { ...ruleFor(service), ...patch },
      },
    });

  return (
    <div className="rounded-xl border">
      <div className="flex items-start gap-2 border-b px-4 py-3">
        <Users className="text-primary mt-0.5 size-4 shrink-0" />
        <div>
          <p className="text-sm font-semibold">{t("attributionTitle")}</p>
          <p className="text-muted-foreground text-xs">
            {t("attributionHelp")}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* The default first: it is what every service without its own rule
            uses, INCLUDING a service that does not exist yet. */}
        <div className="bg-muted/40 space-y-1.5 rounded-lg p-3">
          <Label className="text-xs font-medium">
            {t("attributionDefault")}
          </Label>
          <Select
            value={value.defaultMode}
            disabled={disabled}
            onValueChange={(v) =>
              onChange({ ...value, defaultMode: v as TipAttributionMode })
            }
          >
            <SelectTrigger className="h-8 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODES.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {t(m.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-[11px]">
            {(() => {
              const mode = MODES.find((m) => m.value === value.defaultMode);
              return mode ? t(mode.hintKey) : null;
            })()}
          </p>
        </div>

        <div className="space-y-3">
          {SERVICES.map((service) => {
            const rule = ruleFor(service.id);
            const isOverride = value.byService[service.id] !== undefined;
            return (
              <div
                key={service.id}
                className="grid grid-cols-1 gap-2 border-b pb-3 last:border-0 last:pb-0 sm:grid-cols-[7rem_12rem_1fr] sm:items-center"
              >
                <span className="text-sm font-medium">
                  {t(service.labelKey)}
                  {!isOverride && (
                    <span className="text-muted-foreground ml-1 text-[10px]">
                      {t("defaultTag")}
                    </span>
                  )}
                </span>

                <Select
                  value={rule.mode}
                  disabled={disabled}
                  onValueChange={(v) =>
                    setRule(service.id, { mode: v as TipAttributionMode })
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {t(m.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  type="text"
                  placeholder={t("notePlaceholder")}
                  value={rule.notes ?? ""}
                  disabled={disabled}
                  maxLength={200}
                  className="h-8 text-xs"
                  onChange={(e) =>
                    setRule(service.id, {
                      notes: e.target.value || undefined,
                    })
                  }
                />
              </div>
            );
          })}
        </div>

        {/* Said plainly, because the screen cannot show it: the two modes
            differ only at payout time. */}
        <p className="text-muted-foreground text-[11px]/relaxed">
          <InterpolatedText
            template={t("attributionFooter")}
            placeholder="{unassigned}"
          >
            <span className="font-medium">{t("unassigned")}</span>
          </InterpolatedText>
        </p>
      </div>
    </div>
  );
}
