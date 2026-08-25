"use client";

import type { QuickBooksScope } from "./connection-store";

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

// ── WHERE THE MODE LIVES, AND WHY IT IS NOT READ HERE ─────────────────────
//
// It used to be `getQuickBooksSettings({facilityId}).multiLocationMode` — one
// of eight localStorage stores in this module. On 2026-08-25 it moved into the
// `accounting_structure` facility settings domain, because "are our branches
// separate legal entities" is a fact about the company, not about a browser.
//
// This module cannot read it: `useSettings` is a hook and these are plain
// functions on the sync path. So the mode is a PARAMETER now. That is the
// point — leaving a reader here would have made two sources of truth for one
// answer, and the one on the sync path would have been the wrong one.

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
  /** From `accounting_structure`. See the note above — it is not read here. */
  mode: MultiLocationMode,
): { scope?: QuickBooksScope; problem?: string } {
  if (mode === "single_company") {
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

// ── REMOVED 2026-08-25: the per-location connection state helpers ─────────
//
// `LocationConnectionState`, `locationConnectionStates`, `LocationRollup`,
// `rollupLocationConnections` and `locationsStillSyncing` all existed to feed
// `QuickBooksLocationCards`, which offered a "Connect QuickBooks" button per
// branch. That button wrote a mock token to localStorage and reported success.
//
// There is no QuickBooks backend — 27 files in this directory, zero API routes,
// zero tables, and `oauth-mock.ts`. A connect flow that cannot connect is worse
// on an accounting screen than anywhere else, because the person clicking it
// will believe their books are being kept. The cards are deleted and the
// helpers with them; git has them when the integration is actually built.
//
// What stays is what the sync path uses: `scopeForLocation` and
// `syncScopeForTransaction`.
