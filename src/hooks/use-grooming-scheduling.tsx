"use client";

import { useCallback } from "react";

import { useSettings } from "@/hooks/use-settings";
import type { GroomingScheduling } from "@/types/facility";

// ============================================================================
// How grooming slots are offered — from the FACILITY, not the browser.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// A React context over `localStorage["settings-grooming-scheduling-v1"]`, with
// a provider, a hydration effect and a JSON adapter — about 125 lines whose
// whole job was to keep three facility-wide numbers on one device.
//
// That was not a settings-page problem. `slotGranularityMin` and
// `defaultBufferMin` are read by `GroomingDetails` and
// `new-appointment-dialog`, so they decide what times a member of staff is
// OFFERED when booking a groom. A manager setting 60-minute slots with a
// 30-minute buffer changed nothing for the receptionist taking the calls,
// whose browser kept offering 30 and 15 — and every new device started from
// the defaults again. Two people booking the same day booked different grids.
//
// ── NO PROVIDER ANY MORE ──────────────────────────────────────────────────
//
// `useSettings` already spans the facility portal and already holds twenty
// domains, so a second context around a third of a screen's worth of state was
// its own small tax. The hook keeps its name and its shape so callers did not
// have to change.
// ============================================================================

export type SlotGranularityMin = GroomingScheduling["slotGranularityMin"];
export type GroomingSchedulingSettings = GroomingScheduling;

export interface GroomingSchedulingContextValue extends GroomingScheduling {
  update: (patch: Partial<GroomingScheduling>) => Promise<unknown>;
}

export function useGroomingScheduling(): GroomingSchedulingContextValue {
  const { groomingScheduling, updateGroomingScheduling } = useSettings();

  // A PATCH, as before — callers change one field and expect the rest to
  // stand. The merge happens against the value the server last returned, not
  // against local state, so two people editing different fields do not
  // overwrite each other with a stale copy of the third.
  const update = useCallback(
    (patch: Partial<GroomingScheduling>) =>
      updateGroomingScheduling({ ...groomingScheduling, ...patch }),
    [groomingScheduling, updateGroomingScheduling],
  );

  return { ...groomingScheduling, update };
}
