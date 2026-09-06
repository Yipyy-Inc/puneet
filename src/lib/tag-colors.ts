// ============================================================================
// The colours a facility may give a tag (§1, §3).
//
// ── WHAT THIS REPLACED, AND WHY IT MATTERED MORE AFTER 2026-09-06 ─────────
//
// `TAG_COLOR_PRESETS` in src/data/tags-notes.ts offered fifteen raw Tailwind
// hexes — #ef4444, #f97316, #eab308, #a855f7 … — none of which is in §1. While
// the tag list lived in a fixture that was untidy. The moment the catalogue
// became `public.facility_tags` it became DURABLE: a colour chosen from that
// list is written to a row and rendered on every screen that shows the tag,
// which is how off-palette values outlive the redesign.
//
// ── SIX, NOT FIFTEEN ──────────────────────────────────────────────────────
//
// These are §3's status inks, unchanged. Six rather than fifteen is deliberate:
// eleven of the fifteen were near-duplicates (red/rose, green/emerald/lime,
// blue/indigo, purple/pink), which is a distinction a colour-blind reader
// cannot make at all — and §3's rule is that colour is never the only channel.
// A tag also carries a glyph and its own name, so the palette does not have to
// do work it is bad at.
//
// Orange is absent on purpose. §2b gives it five territories and every one of
// them is the ANIMAL — a ring, a presence dot, a capacity meter. A tag is a
// statement about a record, so orange here would put the accent on the one
// thing it must never mean. Where a tag needs to read as orange it is the
// warning ink, which is what `#8A5115` is.
//
// TagBadge fills solid and computes its own text colour, so each of these
// carries legible type at full strength — which is §6 rule 2's "where one must
// dominate, fill it solid with the ink at full strength".
// ============================================================================

export interface TagColorPreset {
  /** The §3 role, so the picker can say what the colour MEANS, not just show it. */
  label: string;
  hex: string;
}

export const TAG_COLOR_PRESETS: TagColorPreset[] = [
  { label: "Critical", hex: "#B23B3B" },
  { label: "Warning", hex: "#8A5115" },
  { label: "Good", hex: "#0F7A52" },
  { label: "Information", hex: "#0F58C6" },
  { label: "Programme", hex: "#4C3BB8" },
  { label: "Neutral", hex: "#4C5B6C" },
];

/** The colour a tag gets when nobody has chosen one. */
export const DEFAULT_TAG_COLOR = "#4C5B6C";
