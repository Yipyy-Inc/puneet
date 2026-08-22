import { reportCardSectionMeta } from "@/data/settings";
import type { ReportCard } from "@/types/report-card";

// ============================================================================
// What a report card actually says.
//
// One definition, because both sides of the product read it: the owner's
// portal and the facility's client file. It lived in
// `components/customer/report-cards/report-card-shared.tsx`, which meant the
// facility screen could not use it without importing a customer component —
// and so the facility screen rendered `meals`, `pottyBreaks` and `activities`
// instead: arrays nothing in the product has ever produced.
// ============================================================================

/** One prose section of a card, ready to render. */
export type ReportCardSection = {
  id: string;
  label: string;
  body: string;
};

/** The canonical order. A facility's enabled set is a subset of this. */
const SECTION_ORDER = [
  "todaysVibe",
  "friendsAndFun",
  "careMetrics",
  "holidaySparkle",
  "closingNote",
] as const;

/**
 * Which sections this card actually has.
 *
 * Driven by content rather than by the facility's config, deliberately: the
 * owner's portal cannot see `facility_settings`, and a section the facility
 * turned off simply arrives empty. Dropping empties gets the same answer
 * without the customer needing to read a facility's configuration.
 */
export function sectionsOf(card: ReportCard): ReportCardSection[] {
  const generated = card.generated as unknown as Record<string, unknown>;
  return SECTION_ORDER.flatMap((id) => {
    const body = typeof generated[id] === "string" ? String(generated[id]) : "";
    if (!body.trim()) return [];
    return [{ id, label: reportCardSectionMeta[id]?.label ?? id, body }];
  });
}
