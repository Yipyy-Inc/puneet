"use client";

import { useQuery } from "@tanstack/react-query";

import { groomingQueries } from "@/lib/api/grooming";

// ============================================================================
// Asking "which stylist is this staff member?" from a component.
//
// ── WHY THIS EXISTS RATHER THAN THE BARE FUNCTION ─────────────────────────
//
// `stylistIdForStaff` in src/lib/api/grooming.ts used to search a module array,
// so it could answer instantly and could never be wrong. The roster is fetched
// now, and that changes the shape of the question: before the first load there
// is no answer, and a synchronous function has no way to say "ask me again".
//
// A component calling it directly would get `undefined` on first paint and
// never re-render, because nothing it subscribes to changed. The grooming queue
// would show an empty board to the groomer it belongs to, and stay empty.
//
// Subscribing to the same query fixes it at the root: the component suspends on
// nothing, renders empty once, and re-renders with the answer. The bare
// function survives for `fetchGroomingAppointments`, which is already async and
// awaits the index instead.
// ============================================================================

/** The full groomer roster, with the grooming profile joined onto the staff row. */
export function useStylists() {
  return useQuery(groomingQueries.stylists());
}

/**
 * The stylist id for a facility staff member (`fs-*`), or undefined.
 *
 * Undefined means one of two things and the caller usually cannot tell them
 * apart: the roster has not loaded, or that staff member is not a groomer.
 * Both should render the same "no queue for you" state, which is what the
 * callers already did when the mock returned undefined.
 */
export function useStylistIdForStaff(
  staffId: string | undefined,
): string | undefined {
  const { data: stylists = [] } = useStylists();
  if (!staffId) return undefined;
  return stylists.find((s) => s.staffId === staffId)?.id;
}
