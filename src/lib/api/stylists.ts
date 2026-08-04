"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { groomingQueries } from "@/lib/api/grooming";
import type {
  GroomerNotificationPrefs,
  StylistCapacity,
} from "@/types/grooming";

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

// ============================================================================
// Writing a grooming profile.
//
// ── ONE MUTATION FOR FOUR BUTTONS ─────────────────────────────────────────
//
// The editor, the visibility toggle, the notification panel and the "give this
// groomer a profile" path all send the same partial shape to the same route,
// which upserts. Splitting them by which fields they happen to touch would
// mean four hooks that differ only in their omissions.
//
// Availability is separate because it is not a field — it is a set of rows
// replaced whole.
// ============================================================================

async function send(url: string, method: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.ok) return;
  const parsed = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  throw new Error(parsed?.error ?? `Request failed (${response.status})`);
}

/** Everything that reads the roster or the hours. */
function invalidateRoster(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["grooming", "stylists"] });
  void queryClient.invalidateQueries({
    queryKey: ["grooming", "stylist-availability"],
  });
}

export interface StylistProfilePatch {
  specializations?: string[];
  certifications?: string[];
  yearsExperience?: number;
  bio?: string;
  onLeave?: boolean;
  visibleOnline?: boolean;
  calendarColor?: string | null;
  qualifiedPackageIds?: string[];
  capacity?: Partial<StylistCapacity>;
  notificationPrefs?: GroomerNotificationPrefs | null;
}

/**
 * Save a groomer's grooming profile, creating it if they have none.
 *
 * Keyed on the STAFF id, because that is the only id a groomer without a
 * profile has — and giving one to somebody who has none is the same button.
 */
export function useSaveStylistProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { staffId: string; patch: StylistProfilePatch }) =>
      send(
        `/api/grooming/stylists/${encodeURIComponent(input.staffId)}`,
        "PUT",
        input.patch,
      ),
    onSuccess: () => invalidateRoster(queryClient),
  });
}

/**
 * Replace a groomer's working week.
 *
 * The grid sends seven days; only the ones marked available are stored, so
 * absence means "not working" rather than "never set up". Days sent with
 * `isAvailable: false` are simply dropped.
 */
export function useSaveStylistAvailability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      staffId: string;
      availability: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isAvailable: boolean;
      }[];
    }) =>
      send(
        `/api/grooming/stylists/${encodeURIComponent(input.staffId)}`,
        "PATCH",
        { availability: input.availability },
      ),
    onSuccess: () => invalidateRoster(queryClient),
  });
}
