// ============================================================================
// The facility's own training goals (Settings › Training), which the booking
// wizard's Goals step offers instead of the eight it ships (the client's mock,
// 2026-10-01).
// ============================================================================

/**
 * The goals as saved: trimmed, at most 80 characters, one of each whatever
 * its case, at most twenty. Nothing left is `undefined` — the shipped eight.
 */
export function cleanGoalOptions(
  lines: readonly string[] | undefined,
): string[] | undefined {
  const seen = new Set<string>();
  const goals: string[] = [];
  for (const raw of lines ?? []) {
    const goal = raw.trim().slice(0, 80).trim();
    const key = goal.toLocaleLowerCase();
    if (!goal || seen.has(key)) continue;
    seen.add(key);
    goals.push(goal);
    if (goals.length === 20) break;
  }
  return goals.length > 0 ? goals : undefined;
}
