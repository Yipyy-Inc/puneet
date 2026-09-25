"use client";

import { useState } from "react";

import { ChipRow } from "@/components/facility/services/pet-eligibility";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSpeciesConfig } from "@/lib/api/facility-settings";
import {
  formatList,
  formatWeightFromLb,
  formatWeightRangeFromLb,
} from "@/lib/i18n/format";
import {
  limitsConflict,
  speciesMessageOf,
  speciesOptions,
  speciesWithin,
  tiersWithin,
  toggledSpecies,
  toggledTier,
  weightBands,
  weightLimitsOf,
  weightMessageOf,
  withSpeciesMessage,
  withWeightLimits,
  withWeightMessage,
  type WeightLimits,
} from "@/lib/rooms/lodging-eligibility";
import { useStaffText } from "@/lib/staff/use-staff-text";
import type { RoomRule } from "@/types/rooms";

// ============================================================================
// Which pets a room type takes: by size, and by kind of animal.
//
// It replaces a "pick a rule type, press Add" builder. That builder offered six
// types, three of which decided nothing (20260925164457), and asked for weight
// as two unrelated rules. Here weight is one question — the size tiers a
// boarding service is judged by, with the exact pounds beneath them for a
// limit that is not a tier edge — and every choice is written onto the rules
// the engine reads. See lib/rooms/lodging-eligibility.ts for how.
//
// Each rule's message is what a client reads when their pet is turned away,
// so it is asked for only once there is a limit to be turned away by.
// ============================================================================

const TIER_KEYS: Record<string, string> = {
  small: "tierSmall",
  medium: "tierMedium",
  large: "tierLarge",
  giant: "tierGiant",
};

/** "12.5" or "12,5" — the comma is how a French keyboard writes a decimal. */
function parsePounds(raw: string): number | undefined | "invalid" {
  const text = raw.trim().replace(",", ".");
  if (text === "") return undefined;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : "invalid";
}

/**
 * A pounds field that holds what is being typed until the field is left.
 *
 * Bound straight to the number, "12." reads back as 12 and the dot vanishes
 * under the cursor — a decimal could not be typed at all. Leaving the field
 * hands the display back to the value, so a tier pressed next shows its own
 * edge rather than the text somebody abandoned.
 */
function PoundsInput({
  id,
  value,
  placeholder,
  invalid,
  onChange,
}: {
  id: string;
  value: number | undefined;
  placeholder: string;
  invalid: boolean;
  onChange: (value: number | undefined) => void;
}) {
  const [typing, setTyping] = useState<string | null>(null);
  return (
    <Input
      id={id}
      inputMode="decimal"
      autoComplete="off"
      className="tabular-nums"
      aria-invalid={invalid || undefined}
      value={typing ?? (value === undefined ? "" : String(value))}
      placeholder={placeholder}
      onChange={(event) => {
        setTyping(event.target.value);
        const parsed = parsePounds(event.target.value);
        if (parsed !== "invalid") onChange(parsed);
      }}
      onBlur={() => setTyping(null)}
    />
  );
}

export function LodgingEligibilityField({
  rules,
  onChange,
}: {
  rules: RoomRule[];
  onChange: (rules: RoomRule[]) => void;
}) {
  const { t, fill, locale } = useStaffText("lodging");
  const { config } = useSpeciesConfig();

  const limits = weightLimitsOf(rules);
  const conflict = limitsConflict(limits);
  const limited = limits.minLb !== undefined || limits.maxLb !== undefined;

  const tierOptions = weightBands().map((band) => {
    const tier = t(TIER_KEYS[band.id] ?? band.id);
    const label =
      band.fromLb === undefined && band.toLb !== undefined
        ? fill("tierUpTo", {
            tier,
            weight: formatWeightFromLb(band.toLb, locale),
          })
        : band.fromLb !== undefined && band.toLb === undefined
          ? fill("tierOver", {
              tier,
              weight: formatWeightFromLb(band.fromLb, locale),
            })
          : fill("tierBand", {
              tier,
              range: formatWeightRangeFromLb(
                band.fromLb ?? 0,
                band.toLb ?? 0,
                locale,
              ),
            });
    return { id: band.id, label };
  });

  const weightHelp =
    limits.minLb !== undefined && limits.maxLb !== undefined
      ? fill("takesBetween", {
          from: formatWeightFromLb(limits.minLb, locale),
          to: formatWeightFromLb(limits.maxLb, locale),
        })
      : limits.maxLb !== undefined
        ? fill("takesUpTo", {
            weight: formatWeightFromLb(limits.maxLb, locale),
          })
        : limits.minLb !== undefined
          ? fill("takesFrom", {
              weight: formatWeightFromLb(limits.minLb, locale),
            })
          : t("anyWeight");

  const setLimits = (next: WeightLimits) =>
    onChange(withWeightLimits(rules, next));

  // The facility's own words, never translated (§5q): a species is a name the
  // facility typed, and "Chien" must not come back as "Dog".
  const species = speciesOptions(config.species, rules);
  const speciesOn = speciesWithin(species, rules);
  const speciesLimited = speciesOn.length < species.length;

  return (
    <div className="space-y-7">
      {/* ── Weight ─────────────────────────────────────────────────────── */}
      <div className="space-y-[18px]">
        <div className="space-y-1.5">
          <Label className="text-[13.5px] font-semibold">
            {t("eligibleWeight")}
          </Label>
          <ChipRow
            options={tierOptions}
            selected={tiersWithin(limits)}
            onToggle={(id) => setLimits(toggledTier(limits, id))}
          />
          {/* §5c: the error REPLACES the help text, never stacks with it. */}
          {conflict ? (
            <p
              role="alert"
              className="text-destructive text-[13px] font-medium"
            >
              {t("limitsConflict")}
            </p>
          ) : (
            <p className="text-muted-foreground text-[13px]">{weightHelp}</p>
          )}
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="lodging-min-weight" className="text-[13.5px]">
              {t("lowestLb")}
            </Label>
            <PoundsInput
              id="lodging-min-weight"
              value={limits.minLb}
              placeholder={t("noLimit")}
              invalid={conflict}
              onChange={(minLb) => setLimits({ ...limits, minLb })}
            />
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="lodging-max-weight" className="text-[13.5px]">
              {t("highestLb")}
            </Label>
            <PoundsInput
              id="lodging-max-weight"
              value={limits.maxLb}
              placeholder={t("noLimit")}
              invalid={conflict}
              onChange={(maxLb) => setLimits({ ...limits, maxLb })}
            />
          </div>
        </div>

        {limited ? (
          <div className="space-y-1.5">
            <Label htmlFor="lodging-weight-message" className="text-[13.5px]">
              {t("weightMessage")}{" "}
              <span className="text-muted-foreground font-normal">
                {t("optional")}
              </span>
            </Label>
            <Input
              id="lodging-weight-message"
              value={weightMessageOf(rules)}
              onChange={(event) =>
                onChange(withWeightMessage(rules, event.target.value))
              }
            />
          </div>
        ) : null}
      </div>

      {/* ── Kind of animal ─────────────────────────────────────────────── */}
      <div className="space-y-[18px]">
        <div className="space-y-1.5">
          <Label className="text-[13.5px] font-semibold">
            {t("eligibleSpecies")}
          </Label>
          <ChipRow
            options={species.map((name) => ({ id: name, label: name }))}
            selected={speciesOn}
            onToggle={(name) => onChange(toggledSpecies(species, rules, name))}
          />
          <p className="text-muted-foreground text-[13px]">
            {speciesLimited
              ? fill("takesSpecies", { list: formatList(speciesOn, locale) })
              : t("anySpecies")}
          </p>
        </div>

        {speciesLimited ? (
          <div className="space-y-1.5">
            <Label htmlFor="lodging-species-message" className="text-[13.5px]">
              {t("speciesMessage")}{" "}
              <span className="text-muted-foreground font-normal">
                {t("optional")}
              </span>
            </Label>
            <Input
              id="lodging-species-message"
              value={speciesMessageOf(rules)}
              onChange={(event) =>
                onChange(withSpeciesMessage(rules, event.target.value))
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
