"use client";

import {
  getQuickBooksConnection,
  type QuickBooksScope,
} from "./connection-store";
import {
  getQuickBooksSettings,
  type QuickBooksSettings,
} from "./settings-store";
import { getQuickBooksSetup } from "./setup-store";

// ============================================================================
// The one gate every sync entry point passes through (Phase 6).
//
// Extracted from checkout-sync when refunds, invoices and credit memos gained
// their own entry points: four copies of "are we connected, is setup done" is
// four chances for one of them to drift and start posting into a company that
// hasn't been configured.
// ============================================================================

export type SyncSkipReason =
  | "not_connected"
  | "setup_incomplete"
  | "not_paid"
  | "manual_only"
  | "nothing_to_sync";

export type Preflight =
  | { ok: true; settings: QuickBooksSettings; manualOnly: boolean }
  | { ok: false; skipped: SyncSkipReason };

/**
 * May this scope post to QuickBooks right now?
 *
 * "Manual only" is deliberately NOT a failure: the work is still queued, it
 * just doesn't send by itself. A facility that reviews before posting still has
 * every transaction waiting for them.
 */
export function quickBooksPreflight(scope: QuickBooksScope): Preflight {
  const connection = getQuickBooksConnection(scope);
  if (connection.status === "disconnected") {
    return { ok: false, skipped: "not_connected" };
  }

  if (!getQuickBooksSetup(scope).setupComplete) {
    return { ok: false, skipped: "setup_incomplete" };
  }

  const settings = getQuickBooksSettings(scope);
  return { ok: true, settings, manualOnly: settings.syncTrigger === "manual" };
}
