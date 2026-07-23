"use client";

import {
  getQuickBooksConnection,
  type QuickBooksScope,
} from "./connection-store";

// ============================================================================
// The Finish Setup test sync (Phase 3.5).
//
// Writes a throwaway Sales Receipt into QuickBooks and immediately deletes it,
// so a facility learns their connection actually posts BEFORE the first real
// payment depends on it. A setup that merely looked fine and then silently
// failed on a live sale is the outcome this exists to prevent.
//
// The receipt is named "Yipyy Connection Test — do not use" so that, in the
// window between create and delete, anyone looking at the books knows what it
// is — and so a failed delete leaves something obviously disposable rather than
// a mystery $0 sale.
//
// TODO: real QuickBooks API — POST /v3/company/{realmId}/salesreceipt then
// POST .../salesreceipt?operation=delete. The two-step shape below is the same.
// ============================================================================

export const TEST_RECEIPT_MEMO = "Yipyy Connection Test — do not use";

export type TestSyncFailure =
  /** Tokens rejected — usually an expired or revoked connection. */
  | "unauthorised"
  /** QuickBooks was unreachable. */
  | "network"
  /** QuickBooks refused the document (bad account, closed period, …). */
  | "rejected"
  /** The receipt posted but couldn't be removed — needs manual cleanup. */
  | "cleanup_failed";

export type TestSyncResult =
  | { ok: true; documentNumber: string }
  | {
      ok: false;
      failure: TestSyncFailure;
      message: string;
      /** Set when a document was created and is still sitting in the books. */
      strandedDocumentNumber?: string;
    };

const FAILURE_MESSAGE: Record<TestSyncFailure, string> = {
  unauthorised:
    "QuickBooks rejected the connection. Reconnect and run the test again.",
  network:
    "Couldn't reach QuickBooks. Nothing was posted — check your connection and try again.",
  rejected:
    "QuickBooks wouldn't accept the test entry. Check that the accounts you mapped are active and the period isn't closed.",
  cleanup_failed:
    "The test entry posted but couldn't be removed. Delete it in QuickBooks — it's marked “do not use”.",
};

let receiptCounter = 1041;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export interface TestSyncOptions {
  /** Force an outcome so the failure path can be shown on demand. Default is
   *  success: a setup step that failed at random would teach the facility to
   *  distrust a signal that is supposed to be reassuring. */
  simulate?: "success" | TestSyncFailure;
  latencyMs?: number;
}

/**
 * Post a test Sales Receipt and delete it again.
 *
 * Returns the document number it used, so the success summary can say something
 * concrete rather than a bare tick.
 */
export async function runQuickBooksTestSync(
  scope: QuickBooksScope,
  options: TestSyncOptions = {},
): Promise<TestSyncResult> {
  const { simulate = "success", latencyMs = 1200 } = options;

  const connection = getQuickBooksConnection(scope);
  if (connection.status !== "connected") {
    return {
      ok: false,
      failure: "unauthorised",
      message: FAILURE_MESSAGE.unauthorised,
    };
  }

  if (latencyMs > 0) await delay(latencyMs);

  const documentNumber = `SR-${receiptCounter++}`;

  if (simulate === "success") return { ok: true, documentNumber };

  return {
    ok: false,
    failure: simulate,
    message: FAILURE_MESSAGE[simulate],
    // Only a failed cleanup leaves anything behind; the others never posted.
    strandedDocumentNumber:
      simulate === "cleanup_failed" ? documentNumber : undefined,
  };
}
