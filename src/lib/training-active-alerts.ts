/**
 * Active-alert helpers — surface trainer notes flagged "Mark as Active Alert"
 * across the student profile banner, the calendar appointment cards, and the
 * pre-session briefing. A single source of truth so all three surfaces stay
 * in sync as alerts are created and deactivated.
 */
import type { TrainerNote } from "@/types/training";

/** True when the note is still acting as an active alert.
 *
 *  The runtime treats `deactivatedAt` as the source of truth: once a manager
 *  marks the alert resolved, the original note keeps its `isActiveAlert: true`
 *  flag for audit purposes but stops appearing in the banner. */
export function isAlertActive(note: TrainerNote): boolean {
  return !!note.isActiveAlert && !note.deactivatedAt;
}

/** Active alerts for a specific pet, newest first. */
export function getActiveAlertsForPet(
  petId: number,
  notes: TrainerNote[],
): TrainerNote[] {
  return notes
    .filter((n) => n.petId === petId && isAlertActive(n))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Returns a Set of petIds that have at least one active alert. Used by the
 *  calendar appointment cards to render a red exclamation badge without
 *  re-scanning the notes list per session. */
export function buildAlertedPetIdSet(notes: TrainerNote[]): Set<number> {
  const set = new Set<number>();
  for (const n of notes) {
    if (isAlertActive(n)) set.add(n.petId);
  }
  return set;
}

/** Return the currently pinned trainer note for a pet, or null when nothing
 *  is pinned. Most-recently pinned wins so toggling pin on a fresh note
 *  promotes it to the Overview banner without an explicit unpin step. */
export function getPinnedNoteForPet(
  petId: number,
  notes: TrainerNote[],
): TrainerNote | null {
  let best: TrainerNote | null = null;
  for (const n of notes) {
    if (n.petId !== petId) continue;
    if (!n.isPinnedToProfile) continue;
    if (!best) {
      best = n;
      continue;
    }
    const a = n.pinnedAtISO ?? n.date;
    const b = best.pinnedAtISO ?? best.date;
    if (a > b) best = n;
  }
  return best;
}
