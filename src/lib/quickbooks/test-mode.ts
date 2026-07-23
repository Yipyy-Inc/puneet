"use client";

import {
  getQuickBooksConnection,
  patchQuickBooksConnection,
  type QuickBooksConnection,
  type QuickBooksEnvironment,
  type QuickBooksScope,
} from "./connection-store";
import { SANDBOX_COMPANY_NAME, SANDBOX_REALM_ID } from "./environments";
import { getQuickBooksConsentCompany } from "./oauth-mock";
import { readQuickBooksData } from "./qb-data-cache";
import {
  clearSyncedDocuments,
  getSyncedDocuments,
  type SyncedDocument,
} from "./synced-documents-store";
import { clearSyncQueue } from "./sync-engine";

// ============================================================================
// Test mode / QuickBooks Sandbox (Phase 10).
//
// Before a facility trusts the integration with real books, they can point it
// at Intuit's sandbox — a throwaway company — and rehearse the whole mapping
// and sync flow. Nothing they do there touches their real QuickBooks.
//
// The one hard rule: Test mode is only offered BEFORE the first production
// sync. Once a real document has posted, the books are live, and quietly
// switching a live integration to a sandbox — where the next month of sales
// would vanish into a test company — is precisely the disaster this gate
// prevents. Going the other way (sandbox → production) is always allowed;
// that's "go live".
//
// TODO: real Intuit environments. The only functional difference in production
// is the API base URL the token is used against:
//   sandbox    → https://sandbox-quickbooks.api.intuit.com
//   production → https://quickbooks.api.intuit.com
// Everything else — OAuth, entity shapes, the document builders — is identical,
// which is why swapping this in is a change of base URL and dataset, not of
// logic. The sandbox realm is also distinct, so a sandbox token is rejected by
// the production stack and vice versa.
// ============================================================================

// The environment constants live in ./environments (shared with oauth-mock);
// re-exported so existing importers of this module keep working.
export {
  ENVIRONMENT_LABEL,
  QUICKBOOKS_API_BASE_URL,
  SANDBOX_COMPANY_NAME,
  SANDBOX_REALM_ID,
} from "./environments";

export const TEST_MODE_EXPLAINER =
  "Rehearse your mapping and a full sync against a throwaway QuickBooks company. Nothing here touches your real books. You can switch to live at any time — but only until your first live sale syncs.";

export const TEST_MODE_LOCKED_EXPLAINER =
  "You've already synced live sales, so Test mode is no longer available — switching now would send new sales to a test company. Disconnect and reconnect to start over in Test mode.";

export function environmentOf(
  connection: QuickBooksConnection,
): QuickBooksEnvironment {
  return connection.environment ?? "production";
}

export function isTestMode(connection: QuickBooksConnection): boolean {
  return environmentOf(connection) === "sandbox";
}

/** A production document is the point of no return: once real money has posted,
 *  the integration is live and cannot be sent back to a sandbox. */
export function hasProductionSync(docs: SyncedDocument[]): boolean {
  return docs.some((d) => (d.environment ?? "production") === "production");
}

/** Documents belonging to one environment. The dashboard money totals filter to
 *  the environment in use, so test entries never inflate real revenue and the
 *  rehearsal still shows its own results while it's happening. */
export function documentsForEnvironment(
  docs: SyncedDocument[],
  environment: QuickBooksEnvironment,
): SyncedDocument[] {
  return docs.filter((d) => (d.environment ?? "production") === environment);
}

/**
 * May this scope still turn Test mode ON?
 *
 * Only while nothing real has synced. Deliberately does NOT require an active
 * connection — the toggle is shown during setup, and being able to choose
 * sandbox before the test-sync runs is the whole point.
 */
export function canEnableTestMode(scope: QuickBooksScope): boolean {
  return !hasProductionSync(getSyncedDocuments(scope));
}

async function switchEnvironment(
  scope: QuickBooksScope,
  environment: QuickBooksEnvironment,
): Promise<void> {
  const current = getQuickBooksConnection(scope);
  if (current.status === "disconnected") {
    // No connection yet: record the intent so the next connect reads the right
    // company. connectQuickBooks preserves an existing environment.
    patchQuickBooksConnection(scope, { environment });
  } else {
    // The sandbox is a different company with a different name and realm, so the
    // labels move with the environment. Going live restores the REAL company
    // (from the mock consent screen) rather than keeping the sandbox label — a
    // header still reading "Sandbox" over live books is the exact confusion the
    // banner exists to avoid.
    const production = getQuickBooksConsentCompany(scope);
    patchQuickBooksConnection(scope, {
      environment,
      companyName:
        environment === "sandbox" ? SANDBOX_COMPANY_NAME : production.name,
      realmId:
        environment === "sandbox" ? SANDBOX_REALM_ID : production.realmId,
    });
  }

  // Re-read the company under the matching dataset so the mapping screen shows
  // the environment the facility is now pointed at.
  await readQuickBooksData(scope, {
    variant: environment === "sandbox" ? "sandbox" : "production",
    latencyMs: 0,
  });
}

/** Turn Test mode on. No-op (and returns false) once a live sync has happened. */
export async function enableTestMode(scope: QuickBooksScope): Promise<boolean> {
  if (!canEnableTestMode(scope)) return false;
  await switchEnvironment(scope, "sandbox");
  return true;
}

/**
 * Go live — leave Test mode for production.
 *
 * Always allowed. Clears the rehearsal — the sandbox queue and its test
 * documents — so the live record starts clean rather than carrying practice
 * entries into the real log. Only fires when actually leaving sandbox, so
 * calling it on an already-live connection can't wipe real data.
 *
 * Mappings and settings are NOT cleared: they're the whole point of the
 * rehearsal, and sandbox and production share account and item ids, so they're
 * valid the moment the facility goes live.
 */
export async function goLive(scope: QuickBooksScope): Promise<void> {
  const leavingSandbox = isTestMode(getQuickBooksConnection(scope));
  await switchEnvironment(scope, "production");
  if (leavingSandbox) {
    clearSyncQueue(scope);
    clearSyncedDocuments(scope);
  }
}
