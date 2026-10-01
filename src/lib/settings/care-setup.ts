import { z } from "zod";

// ============================================================================
// What the facility's Feeding & medications page shares between its two tabs
// (2026-10-01): where a step appears, the rows of times picked with one tap,
// and the quick-pick lists a facility can add to.
//
// ── WHERE A STEP APPEARS ──────────────────────────────────────────────────
//
// Per service, a step is left out, optional, or required. It lived in each
// module's config (`settings.careInstructions`) — which no screen edited and
// the booking form never read — and moved here with the page that edits it.
//
// ── A ROW IS THE VOCABULARY'S, OR THE FACILITY'S ──────────────────────────
//
// A built-in row (breakfast, morning, a feeding style) has an id the booking
// stores and a translated name; the facility may rename it, which stores its
// own words as `label`, and clearing them brings the translation back. A row
// the facility adds has its own id (`meal-…`, `custom-…`) and always a label —
// shown as typed, in every language, like a pet's name.
// ============================================================================

export const CARE_STEP_USE = ["disabled", "optional", "required"] as const;
export type CareStepUse = (typeof CARE_STEP_USE)[number];

/** The services a care step can appear in. */
export const CARE_SERVICES = [
  "boarding",
  "daycare",
  "grooming",
  "training",
] as const;
export type CareService = (typeof CARE_SERVICES)[number];

const stepUse = z.enum(CARE_STEP_USE);

export const careServicesSchema = z.object({
  boarding: stepUse,
  daycare: stepUse,
  grooming: stepUse,
  training: stepUse,
});
export type CareServices = z.infer<typeof careServicesSchema>;

const isCareService = (value: unknown): value is CareService =>
  typeof value === "string" &&
  (CARE_SERVICES as readonly string[]).includes(value);

/** How a step appears for `service` — any service the page does not list has none. */
export function careStepUse(
  settings: { services: CareServices },
  service: string | undefined,
): CareStepUse {
  return isCareService(service) ? settings.services[service] : "disabled";
}

const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** A time picked with one tap: a meal time or a dose round. */
export const careTimeSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]{0,40}$/),
  /** The facility's own name — for a built-in row, instead of the translation. */
  label: z.string().trim().max(40).optional(),
  time: clockTime,
  on: z.boolean(),
  /** A new plan or medication starts with it picked. */
  preselected: z.boolean(),
});
export type CareTime = z.infer<typeof careTimeSchema>;

/** One quick pick: a vocabulary key, or the facility's own words. */
export const careOptionSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_-]{0,60}$/),
  label: z.string().trim().max(60).optional(),
  on: z.boolean(),
});
export type CareOption = z.infer<typeof careOptionSchema>;

export const unique = <T>(values: readonly T[]) =>
  new Set(values).size === values.length;

/** Each id once; every row outside the vocabulary carries its own words. */
export function rowsAreSound(
  rows: readonly { id: string; label?: string }[],
  builtIn: readonly string[],
): boolean {
  return (
    unique(rows.map((row) => row.id)) &&
    rows.every((row) => builtIn.includes(row.id) || Boolean(row.label?.trim()))
  );
}

/** A row the facility adds: `meal-3f9a1c2e`. */
export function newRowId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
}

/** The rows a list offers: the ones switched on. */
function onRows<T extends { on: boolean }>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.on);
}

/** The times a page offers, in the order of the day. */
export function offeredTimes<T extends CareTime>(rows: readonly T[]): T[] {
  return onRows(rows).sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * What "Reset to default" leaves: every built-in row as shipped, and the rows
 * the facility added, as they are — "keeps anything you added".
 */
export function resetRows<T extends { id: string }>(
  defaults: readonly T[],
  current: readonly T[],
  builtIn: readonly string[],
): T[] {
  return [
    ...defaults.map((row) => ({ ...row })),
    ...current.filter((row) => !builtIn.includes(row.id)),
  ];
}
