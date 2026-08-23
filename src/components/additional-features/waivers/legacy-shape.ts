import type { PublishWaiverInput, WaiverRow } from "@/lib/api/waivers";
import type {
  DigitalWaiver,
  WaiverServiceTag,
} from "@/data/additional-features";

// ============================================================================
// A Postgres waiver, in the shape this screen already speaks.
//
// ── WHY A SHIM AND NOT A RETYPE ───────────────────────────────────────────
//
// `DigitalWaiversManager` is 930 lines and its four dialogs another ~1,900, all
// typed against `DigitalWaiver`. Retyping them in the same change that swaps
// the data source would make one diff that both moves the data and rewrites the
// UI, and a bug in it would be impossible to attribute to either.
//
// This file is the whole seam, both directions, and it deletes in one piece.
//
// ── WHAT DOES NOT SURVIVE THE CROSSING ────────────────────────────────────
//
// `type` — the legacy shape carries a PRIMARY service tag plus an optional
// list, which is two representations of one fact and they can disagree.
// Postgres keeps only the list. Coming back, `type` is the first tag, and
// nothing writes it: `services` is the truth in both directions.
//
// A tag the legacy union does not know (a facility invents a service later)
// falls back to `general` rather than being cast blindly, so an unknown tag
// renders as something rather than breaking a badge lookup.
// ============================================================================

const KNOWN_SERVICES: readonly WaiverServiceTag[] = [
  "boarding",
  "daycare",
  "grooming",
  "training",
  "vet",
  "retail",
  "general",
];

function asServiceTag(value: string): WaiverServiceTag {
  return (KNOWN_SERVICES as readonly string[]).includes(value)
    ? (value as WaiverServiceTag)
    : "general";
}

export function toLegacyWaiver(row: WaiverRow): DigitalWaiver {
  const services = row.services.map(asServiceTag);

  return {
    id: row.id,
    name: row.name,
    // The legacy PRIMARY tag. Derived, never stored - see the header.
    type: services[0] ?? "general",
    services: services.length > 0 ? services : undefined,
    content: row.body,
    blocks: Array.isArray(row.blocks)
      ? (row.blocks as DigitalWaiver["blocks"])
      : undefined,
    version: row.version,
    isActive: row.active,
    requiresSignature: row.requiresSignature,
    requireDigitalSignature: row.requiresDigitalSignature,
    requiresWitness: row.requiresWitness,
    expiryDays: row.expiryDays ?? undefined,
    categoryId: row.category ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * The other direction, for saving.
 *
 * `body` is what gets COPIED onto every signature taken against this waiver, so
 * it is the field that has to be right. The editor keeps its rich `blocks` and
 * a flat `content`; the flat one is what a person can be shown to have read, so
 * it is what travels as `body`.
 */
export function fromLegacyWaiver(waiver: DigitalWaiver): PublishWaiverInput {
  const services =
    waiver.services && waiver.services.length > 0
      ? waiver.services
      : [waiver.type];

  return {
    name: waiver.name,
    body: waiver.content,
    blocks: waiver.blocks ?? [],
    services,
    version: waiver.version,
    category: waiver.categoryId,
    requiresSignature: waiver.requiresSignature,
    requiresDigitalSignature: waiver.requireDigitalSignature,
    requiresWitness: waiver.requiresWitness,
    // `undefined` on the legacy shape means "never expires", and the column is
    // nullable for exactly that reason - so it maps to null, not to a large
    // number standing in for one.
    expiryDays: waiver.expiryDays ?? null,
  };
}
