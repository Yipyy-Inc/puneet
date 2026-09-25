// ============================================================================
// A settings snapshot, minus whatever a crashed run left in it.
//
// ── THE TRAP ──────────────────────────────────────────────────────────────
//
// A spec that changes a facility setting reads it first and writes the copy
// back afterwards — "put back what this run took". That is only as good as the
// copy. If an earlier run died before its own restore, the leftover is IN the
// copy, and every later run faithfully restores it: the snapshot turns one
// crashed run into a permanent setting.
//
// Found on 2026-09-25. A run that died in `discount-rules` left a "[e2e
// discount-rules] Cleaning" fee of $15 switched on in the demo facility, and
// for twelve hours it landed on every booking made there — 45 of them, each
// $15 dearer than the bill its spec wrote. `yipyy-go-charges` had been putting
// its own "[e2e yipyy-go-charges] Extra play" add-on back the same way, run
// after run, because the copy it restored already held it.
//
// So a copy is cleaned BEFORE it is kept: any array entry a spec authored — an
// id beginning `e2e-`, or a name or label carrying an `[e2e …]` marker — is
// dropped, at any depth. Arrays are where a setting keeps its catalogue (fees,
// add-ons, presets, rules), and a catalogue entry is what reaches a price. A
// scalar field a spec overwrote cannot be told apart from a facility's own
// choice, so it is left alone.
// ============================================================================

function authoredByASpec(item: unknown): boolean {
  if (!item || typeof item !== "object" || Array.isArray(item)) return false;
  const { id, name, label } = item as Record<string, unknown>;
  if (typeof id === "string" && id.startsWith("e2e-")) return true;
  return [name, label].some(
    (text) => typeof text === "string" && text.startsWith("[e2e"),
  );
}

/** The same settings value with every spec-authored array entry removed. */
export function withoutTestItems<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !authoredByASpec(item))
      .map((item) => withoutTestItems(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [
        key,
        withoutTestItems(inner),
      ]),
    ) as T;
  }
  return value;
}
