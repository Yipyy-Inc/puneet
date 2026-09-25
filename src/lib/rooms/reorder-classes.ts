/**
 * What a drop on the Rooms tab changes: the new order, and the classes whose
 * `sortOrder` must be saved for it — numbered 1..n, the way a new class is
 * (`count + 1` in POST /api/rooms/categories).
 *
 * Only the classes whose number actually moves are returned, so a facility
 * whose classes already read 1..n saves two rows for a swap, not all of them.
 * One whose numbers have gaps (created, deleted, created again) is renumbered
 * once, on its first drag, and the ORDER is all anybody sees of that.
 *
 * Null when nothing moves: an unknown id, or a drop where it started.
 */
export function reorderedClasses<T extends { id: string; sortOrder: number }>(
  ordered: readonly T[],
  activeId: string,
  overId: string,
): { ids: string[]; moves: T[] } | null {
  const ids = ordered.map((c) => c.id);
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return null;

  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);

  const moves = next.flatMap((id, index) => {
    const category = ordered.find((c) => c.id === id);
    return category && category.sortOrder !== index + 1
      ? [{ ...category, sortOrder: index + 1 }]
      : [];
  });
  return { ids: next, moves };
}
