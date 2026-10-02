import type { PetSize } from "@/types/base";

// ============================================================================
// Which grooming size a pet is — `create_booking`'s rule, in TypeScript.
//
// The facility's own bands (`grooming_config.pet_size_tiers`): the first band,
// by its weight limit with the open-ended one last, whose limit the pet's
// weight is within (inclusive). No weight, or no bands, is no size — the
// service's base price and length, which is what the database books then.
//
// The wizard used `getPetSize` (20/40/80 lb, exclusive) while the database
// used the facility's 15/35/70 — so a 17 lb dog was quoted Small and booked
// Medium. One rule now, read from the same bands.
// ============================================================================

export interface GroomingSizeTier {
  id: string;
  label?: string | null;
  /** Inclusive; null or absent is open-ended. */
  maxWeightLbs?: number | null;
}

const SIZES: readonly PetSize[] = ["small", "medium", "large", "giant"];

function isPetSize(value: string | null | undefined): value is PetSize {
  return SIZES.includes(value as PetSize);
}

/** The pet's size by the facility's bands, or null (base price and length). */
export function groomingSizeFor(
  weightLb: number | null | undefined,
  tiers: readonly GroomingSizeTier[],
): PetSize | null {
  if (weightLb === null || weightLb === undefined || !Number.isFinite(weightLb))
    return null;
  const limit = (t: GroomingSizeTier) =>
    t.maxWeightLbs === null || t.maxWeightLbs === undefined
      ? Number.POSITIVE_INFINITY
      : Number(t.maxWeightLbs);
  const band = [...tiers]
    .sort((a, b) => limit(a) - limit(b))
    .find((t) => weightLb <= limit(t));
  return band && isPetSize(band.id) ? band.id : null;
}

/** The bands as the API sends them, or none: tolerant of a stored shape. */
export function parseSizeTiers(value: unknown): GroomingSizeTier[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const t = raw as Record<string, unknown>;
    if (typeof t.id !== "string") return [];
    const max = t.maxWeightLbs;
    return [
      {
        id: t.id,
        label: typeof t.label === "string" ? t.label : null,
        maxWeightLbs:
          typeof max === "number"
            ? max
            : typeof max === "string" &&
                max.trim() &&
                Number.isFinite(Number(max))
              ? Number(max)
              : null,
      },
    ];
  });
}
