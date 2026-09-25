import { BOARDING_WEIGHT_TIERS } from "@/lib/pricing/boarding-service-choice";
import { sameSpecies } from "@/lib/settings/species";
import { admittedSpecies } from "@/lib/capacity-engine";
import type { RoomRule } from "@/types/rooms";

// ============================================================================
// Which pets a room type takes, as the Rooms page asks it: by size tier and by
// species — written onto the rules the engine already reads.
//
// ── ONE REPRESENTATION, TWO WAYS TO SET IT ────────────────────────────────
//
// Weight is `min_weight` / `max_weight`, in pounds, and stays that way. The
// size tiers are a way of CHOOSING those numbers, not a second mechanism
// beside them: a class that says "up to 20 lb" (Doggieville's Condos) keeps
// saying exactly that, and the tiers show what it covers. Storing tiers
// instead would have forced 20 lb onto 15 or 35 — five live classes carry
// limits that are not tier edges.
//
// The tiers are BOARDING's bands (`BOARDING_WEIGHT_TIERS`), the ones a boarding
// service's own weight eligibility is judged by — so "Medium" means the same
// thing on the service and on the room type it books into.
//
// ── A TIER IS A BAND ──────────────────────────────────────────────────────
//
// Above the tier below it, up to and including its own maximum: a 15 lb dog
// is Small, a 15.5 lb dog Medium — `boardingWeightTierFor`'s rule. A minimum
// is inclusive (`petMatchesRules`: under it is refused), so picking Medium
// writes a minimum of 15 and a dog of exactly 15 lb is admitted too. That one
// boundary weight is the only place the two readings differ, and admitting
// it is the side that never turns a pet away by rounding.
//
// ── EMPTY MEANS NO RESTRICTION ────────────────────────────────────────────
//
// No limit is every tier, so no limit shows every chip on — and turning off
// the last chip leaves no limit, because a room type that takes no size of
// pet is not a setting anybody means. The same for species.
// ============================================================================

/** A room type's weight limits, in pounds. Absent: no limit on that side. */
export interface WeightLimits {
  minLb?: number;
  maxLb?: number;
}

/** A size tier as a band of weight: above `fromLb`, up to `toLb` inclusive. */
export interface WeightBand {
  id: string;
  fromLb?: number;
  toLb?: number;
}

export function weightBands(): WeightBand[] {
  return BOARDING_WEIGHT_TIERS.map((tier, index) => ({
    id: tier.id,
    fromLb: index === 0 ? undefined : BOARDING_WEIGHT_TIERS[index - 1]!.maxLb,
    toLb: tier.maxLb,
  }));
}

function numbersOf(rules: RoomRule[], type: RoomRule["type"]): number[] {
  return rules
    .filter((rule) => rule.enabled && rule.type === type)
    .flatMap((rule) => (typeof rule.value === "number" ? [rule.value] : []));
}

/**
 * The limits a class's rules add up to. Two minimums mean the higher one, as
 * `petMatchesRules` reads them — a pet has to pass both.
 */
export function weightLimitsOf(rules: RoomRule[]): WeightLimits {
  const mins = numbersOf(rules, "min_weight");
  const maxes = numbersOf(rules, "max_weight");
  return {
    minLb: mins.length > 0 ? Math.max(...mins) : undefined,
    maxLb: maxes.length > 0 ? Math.min(...maxes) : undefined,
  };
}

/** Which tiers lie wholly inside the limits — the chips that show as on. */
export function tiersWithin({ minLb, maxLb }: WeightLimits): string[] {
  return weightBands()
    .filter(
      (band) =>
        (minLb === undefined || minLb <= (band.fromLb ?? 0)) &&
        (maxLb === undefined ||
          (band.toLb !== undefined && band.toLb <= maxLb)),
    )
    .map((band) => band.id);
}

/** The lower limit sits above the upper one, so no pet could ever stay. */
export function limitsConflict({ minLb, maxLb }: WeightLimits): boolean {
  return minLb !== undefined && maxLb !== undefined && minLb > maxLb;
}

/**
 * The limits after a tier chip is pressed.
 *
 * What is on is always one unbroken run of tiers, because a weight range
 * cannot skip one — "Small and Large but not Medium" is not a range. So a
 * chip outside the run stretches it to reach that chip, a chip at either end
 * of the run is dropped from it, and a chip in the middle becomes the only
 * one: pressing Medium with Small to Large on means "only Medium".
 */
export function toggledTier(
  limits: WeightLimits,
  tierId: string,
): WeightLimits {
  const bands = weightBands();
  const pressed = bands.findIndex((band) => band.id === tierId);
  if (pressed < 0) return limits;

  const on = tiersWithin(limits).map((id) =>
    bands.findIndex((band) => band.id === id),
  );
  let run: [number, number] | null;
  if (on.length === 0) {
    run = [pressed, pressed];
  } else {
    const low = Math.min(...on);
    const high = Math.max(...on);
    if (pressed < low) run = [pressed, high];
    else if (pressed > high) run = [low, pressed];
    else if (low === high) run = null;
    else if (pressed === low) run = [low + 1, high];
    else if (pressed === high) run = [low, high - 1];
    else run = [pressed, pressed];
  }

  if (!run) return {};
  return { minLb: bands[run[0]]!.fromLb, maxLb: bands[run[1]]!.toLb };
}

/** The message a client reads when their pet's weight is refused. */
export function weightMessageOf(rules: RoomRule[]): string {
  const pick = (type: RoomRule["type"]) =>
    rules.find((rule) => rule.type === type && rule.clientMessage)
      ?.clientMessage;
  return pick("max_weight") ?? pick("min_weight") ?? "";
}

/**
 * The rules with their weight limits replaced. Every weight rule goes — one
 * switched off included, since the picker has no switch and a limit it cannot
 * show is a limit nobody can remove — and at most one of each comes back,
 * keeping its id and its message.
 */
export function withWeightLimits(
  rules: RoomRule[],
  { minLb, maxLb }: WeightLimits,
): RoomRule[] {
  const message = weightMessageOf(rules);
  const make = (type: "min_weight" | "max_weight", value: number): RoomRule => {
    const prior = rules.find((rule) => rule.type === type);
    return {
      id: prior?.id ?? `rule-${type}`,
      type,
      value,
      clientMessage: prior?.clientMessage || message,
      enabled: true,
    };
  };
  return [
    ...rules.filter(
      (rule) => rule.type !== "min_weight" && rule.type !== "max_weight",
    ),
    ...(minLb !== undefined ? [make("min_weight", minLb)] : []),
    ...(maxLb !== undefined ? [make("max_weight", maxLb)] : []),
  ];
}

/** One message for both weight limits, the way the form asks for it. */
export function withWeightMessage(
  rules: RoomRule[],
  message: string,
): RoomRule[] {
  return rules.map((rule) =>
    rule.type === "min_weight" || rule.type === "max_weight"
      ? { ...rule, clientMessage: message }
      : rule,
  );
}

// ── Species ─────────────────────────────────────────────────────────────────

/**
 * The chips to offer: the facility's own species, then any a class already
 * names that the facility has since dropped — so saving an edit never quietly
 * removes a restriction nobody could see.
 */
export function speciesOptions(
  facilitySpecies: string[],
  rules: RoomRule[],
): string[] {
  const extra = (admittedSpecies(rules) ?? []).filter(
    (name) => !facilitySpecies.some((known) => sameSpecies(known, name)),
  );
  return [...facilitySpecies, ...extra];
}

/** Which of `options` a class takes. No rule takes all of them. */
export function speciesWithin(options: string[], rules: RoomRule[]): string[] {
  const admitted = admittedSpecies(rules);
  if (!admitted) return options;
  return options.filter((option) =>
    admitted.some((name) => sameSpecies(name, option)),
  );
}

/**
 * The rules after a species chip is pressed. Every chip on — or none — is no
 * restriction, so the rule goes rather than listing everything.
 */
export function toggledSpecies(
  options: string[],
  rules: RoomRule[],
  species: string,
): RoomRule[] {
  const on = speciesWithin(options, rules);
  const next = on.some((name) => sameSpecies(name, species))
    ? on.filter((name) => !sameSpecies(name, species))
    : [...on, species];
  const prior = rules.find((rule) => rule.type === "pet_type");
  const rest = rules.filter((rule) => rule.type !== "pet_type");
  if (next.length === 0 || next.length === options.length) return rest;
  return [
    ...rest,
    {
      id: prior?.id ?? "rule-pet_type",
      type: "pet_type",
      value: next,
      clientMessage: prior?.clientMessage ?? "",
      enabled: true,
    },
  ];
}

/** The message a client reads when their kind of pet is refused. */
export function speciesMessageOf(rules: RoomRule[]): string {
  return (
    rules.find((rule) => rule.type === "pet_type" && rule.clientMessage)
      ?.clientMessage ?? ""
  );
}

export function withSpeciesMessage(
  rules: RoomRule[],
  message: string,
): RoomRule[] {
  return rules.map((rule) =>
    rule.type === "pet_type" ? { ...rule, clientMessage: message } : rule,
  );
}
