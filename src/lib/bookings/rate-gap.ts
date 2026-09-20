// ============================================================================
// Why a booking cannot be priced from what the facility has set up.
//
// Until 2026-09-20 each service had a fallback price in its module config —
// boarding 45, daycare 35, grooming 50, training 60 — shipped in a fixture and
// identical for every facility in the product. A kennel class with no rate, a
// facility with no daycare rate card, a training booking with no class in it:
// each was quietly charged one of those numbers, and the bill looked like
// somebody had decided it.
//
// They are gone, and a booking that cannot be priced is REFUSED rather than
// priced at nothing. This is the reason, so the wizard can say which rate is
// missing and where to set it instead of disabling a button in silence.
// ============================================================================

export type RateGap =
  | null
  /** Classes in this stay with no nightly rate, by name. */
  | { kind: "boarding"; classes: string[] }
  /** The facility has no daycare rate card and no branch price. */
  | { kind: "daycare" }
  /** Nothing has been chosen for this training booking to be priced from. */
  | { kind: "training" };

/**
 * The sentence to show, from the booking catalogue.
 *
 * `t` is the caller's translator — the message is a facility's, read in the
 * facility's own language, and the class NAMES inside it are the facility's
 * own words, so they pass through untranslated (§5q).
 */
export function rateGapMessage(
  gap: NonNullable<RateGap>,
  t: (key: string) => string,
): string {
  if (gap.kind === "daycare") return t("noRateDaycare");
  if (gap.kind === "training") return t("noRateTraining");
  const classes = gap.classes.join(", ");
  return t(
    gap.classes.length > 1 ? "noRateBoardingPlural" : "noRateBoarding",
  ).replace("{classes}", classes);
}
