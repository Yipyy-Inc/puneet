"use client";

import type { Location } from "@/types/location";

import {
  getQuickBooksConnection,
  isQuickBooksSyncPaused,
  quickBooksSyncPauseReason,
  type QuickBooksConnection,
  type QuickBooksPauseReason,
  type QuickBooksScope,
} from "./connection-store";
import { facilityLocations } from "./location-classes";
import { getQuickBooksSettings } from "./settings-store";
import { getQuickBooksSetup } from "./setup-store";

// ============================================================================
// One QuickBooks company PER LOCATION (Phase 8 / Section 6B).
//
// Two shapes of multi-location facility, and they need opposite things:
//
//   single_company        one company, every branch inside it, split by Class.
//                         See location-classes.ts.
//   company_per_location  a separate QuickBooks company — and therefore a
//                         separate OAuth grant, a separate chart of accounts
//                         and a separate mapping set — for each branch. Often
//                         because the branches are separate legal entities with
//                         their own accountants.
//
// The second shape is why every store in this module is scope-keyed rather than
// facility-keyed. `{facilityId}` and `{facilityId, locationId}` are different
// keys, so the isolation the RULE demands is a property of the storage layout,
// not of any check written here: one location's expired refresh token pauses
// that location's queue and cannot reach another's, because they were never the
// same record.
// ============================================================================

export type MultiLocationMode = "single_company" | "company_per_location";

export function multiLocationMode(facilityId: string): MultiLocationMode {
  return (
    getQuickBooksSettings({ facilityId }).multiLocationMode ?? "single_company"
  );
}

/** The scope a location's own QuickBooks company lives under. */
export function scopeForLocation(
  facilityId: string,
  locationId: string,
): QuickBooksScope {
  return { facilityId, locationId };
}

/**
 * Where a transaction should post.
 *
 * In per-location mode a sale belongs to its branch's company; anywhere else it
 * belongs to the facility's single company. A sale with no location in
 * per-location mode has no company to go to — the caller is told rather than
 * having it guessed, because guessing means one branch's revenue lands in
 * another entity's books.
 */
export function syncScopeForTransaction(
  facilityId: string,
  locationId: string | undefined,
): { scope?: QuickBooksScope; problem?: string } {
  if (multiLocationMode(facilityId) === "single_company") {
    return { scope: { facilityId } };
  }

  if (!locationId) {
    return {
      problem:
        "This sale has no Yipyy location on it, and this facility keeps a separate QuickBooks company per location — there is no company to post it to.",
    };
  }

  return { scope: scopeForLocation(facilityId, locationId) };
}

export interface LocationConnectionState {
  location: Location;
  scope: QuickBooksScope;
  connection: QuickBooksConnection;
  /** Setup finished for THIS location's company. */
  setupComplete: boolean;
  /** True when this location's queue is holding. */
  paused: boolean;
  pauseReason?: QuickBooksPauseReason;
}

/** Every branch and the state of its own QuickBooks connection. */
export function locationConnectionStates(
  facilityId: string,
): LocationConnectionState[] {
  return facilityLocations(facilityId).map((location) => {
    const scope = scopeForLocation(facilityId, location.id);
    const connection = getQuickBooksConnection(scope);
    return {
      location,
      scope,
      connection,
      setupComplete: getQuickBooksSetup(scope).setupComplete,
      paused:
        connection.status !== "disconnected" &&
        isQuickBooksSyncPaused(connection),
      pauseReason: quickBooksSyncPauseReason(connection) ?? undefined,
    };
  });
}

export interface LocationRollup {
  connected: number;
  needsAttention: number;
  notConnected: number;
  total: number;
}

/** The one-line summary above the cards. */
export function rollupLocationConnections(
  states: LocationConnectionState[],
): LocationRollup {
  return {
    connected: states.filter(
      (s) => s.connection.status === "connected" && s.setupComplete,
    ).length,
    // Connected but expired/unreachable, or connected but never finished setup:
    // both are "this branch is not syncing and someone has to do something".
    needsAttention: states.filter(
      (s) =>
        s.connection.status !== "disconnected" &&
        (s.paused || !s.setupComplete),
    ).length,
    notConnected: states.filter((s) => s.connection.status === "disconnected")
      .length,
    total: states.length,
  };
}

/**
 * The isolation guarantee, as something checkable.
 *
 * Returns the branches still syncing when `locationId`'s token has expired. If
 * this ever returns fewer than "all the healthy ones", the scope keying has
 * been broken somewhere.
 */
export function locationsStillSyncing(
  states: LocationConnectionState[],
): LocationConnectionState[] {
  return states.filter(
    (s) => s.connection.status === "connected" && s.setupComplete,
  );
}
