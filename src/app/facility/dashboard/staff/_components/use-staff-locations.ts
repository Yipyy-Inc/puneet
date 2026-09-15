"use client";

import { useMemo } from "react";

import { useFacilityLocations } from "@/lib/api/locations";

// ============================================================================
// The branches a staff member can be assigned to: the facility's own.
//
// Every staff screen listed `FACILITY_LOCATIONS` from `src/data/facility-staff`
// — three Montreal branches of a business that is not in this database. So a
// real facility offered its staff someone else's addresses, and the ids a save
// stored ("loc-mtl-plateau") named no location anywhere. Measured 2026-09-15:
// no staff row held a real location id.
//
// An assignment is still the list of ids in `details.assignedLocations`. An id
// that names none of this facility's branches — an old fixture id — is simply
// not shown, and is dropped the next time the list is saved.
// ============================================================================

export interface StaffLocationOption {
  id: string;
  label: string;
}

export function useStaffLocations() {
  const { data, isPending } = useFacilityLocations();

  return useMemo(() => {
    const locations: StaffLocationOption[] = (data ?? []).map((location) => ({
      id: location.id,
      label: location.name,
    }));
    const byId = new Map(locations.map((location) => [location.id, location]));

    /** The names of the branches these ids name, in the order given. */
    const labelsFor = (ids: readonly string[]): string[] =>
      ids
        .map((id) => byId.get(id)?.label)
        .filter((label): label is string => Boolean(label));

    /** Only the ids that name one of this facility's branches. */
    const realIds = (ids: readonly string[]): string[] =>
      ids.filter((id) => byId.has(id));

    return { locations, labelsFor, realIds, isPending };
  }, [data, isPending]);
}
