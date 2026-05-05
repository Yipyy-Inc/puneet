"use client";

import { useMemo } from "react";
import { useLocationContext } from "@/hooks/use-location-context";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Location } from "@/types/location";

/**
 * Resolves what locations the current user can see and what
 * the active filter scope is right now.
 *
 * Every list / dashboard / report should read through this hook —
 * if a location filter ever drifts out of sync between pages,
 * this is the single source of truth for "which locationIds am I scoped to?".
 *
 * Scope semantics:
 *   - `accessibleLocations`: every location the user is allowed to see at all
 *   - `activeLocationIds`: the subset they are looking at right now
 *     (HQ view = all accessible; specific location = just that one)
 *   - `canViewHq`: whether the user is allowed to ever switch to HQ view
 *   - `canManageHq`: whether the user can edit HQ-level settings
 */
export function useLocationScope() {
  const { user } = useCurrentUser();
  const {
    locations,
    currentLocationId,
    currentLocation,
    isHQView,
    isMultiLocation,
    settings,
  } = useLocationContext();

  return useMemo(() => {
    const isOwner = user.role === "owner";
    const isGeneralManager = user.role === "general_manager";
    const isDepartmentManager = user.role === "department_manager";

    // Owner + general manager: every location, full HQ access.
    // Department manager: only the locations they're assigned to via
    //   user.departmentIds (treated as locationIds for the multi-location feature).
    // Everyone else: same as department manager.
    const accessibleLocations: Location[] = (() => {
      if (isOwner || isGeneralManager) return locations;
      if (user.departmentIds.length === 0) {
        // No explicit assignments — show only the primary location.
        return locations.filter((l) => l.isPrimary);
      }
      const assigned = new Set(user.departmentIds);
      return locations.filter((l) => assigned.has(l.id));
    })();

    const accessibleLocationIds = accessibleLocations.map((l) => l.id);

    // Active scope = what the user is filtered to *right now*
    // If the user has lost access to the saved location, fall back to first accessible.
    const validActiveLocationId =
      currentLocationId && accessibleLocationIds.includes(currentLocationId)
        ? currentLocationId
        : null;

    const effectiveIsHqView =
      isHQView && (isOwner || isGeneralManager);

    const activeLocationIds: string[] = effectiveIsHqView
      ? accessibleLocationIds
      : validActiveLocationId
        ? [validActiveLocationId]
        : accessibleLocationIds.length > 0
          ? [accessibleLocationIds[0]]
          : [];

    const canViewHq = isOwner || isGeneralManager;
    const canManageHq = isOwner;
    const canManageLocation = isOwner || isGeneralManager || isDepartmentManager;

    return {
      // Identity
      user,

      // Reachable
      accessibleLocations,
      accessibleLocationIds,

      // Active filter
      activeLocationIds,
      activeLocation: validActiveLocationId
        ? (currentLocation ??
          accessibleLocations.find((l) => l.id === validActiveLocationId) ??
          null)
        : null,
      isHqView: effectiveIsHqView,

      // Capabilities
      canViewHq,
      canManageHq,
      canManageLocation,

      // Misc
      isMultiLocation,
      settings,

      // Helpers
      /** True if the given location is in scope right now. */
      isInScope: (locationId: string | null | undefined) => {
        if (!locationId) return effectiveIsHqView;
        return activeLocationIds.includes(locationId);
      },
      /** Filter any list of items that carry a `locationId` field. */
      filterByScope: <T extends { locationId?: string | null }>(
        items: T[],
      ): T[] => {
        if (effectiveIsHqView) return items;
        return items.filter(
          (item) => item.locationId && activeLocationIds.includes(item.locationId),
        );
      },
    };
  }, [
    user,
    locations,
    currentLocationId,
    currentLocation,
    isHQView,
    isMultiLocation,
    settings,
  ]);
}
