import type { QuickBooksEnvironment } from "./connection-store";

// ============================================================================
// Environment constants (Phase 10) — kept in their own module so both the OAuth
// mock and the test-mode controller can import them without importing each
// other. (oauth-mock builds a sandbox-labelled connection; test-mode switches
// between environments and asks oauth-mock for the production company.)
// ============================================================================

export const QUICKBOOKS_API_BASE_URL: Record<QuickBooksEnvironment, string> = {
  // TODO: these are the real Intuit hosts a live implementation would call — the
  // token is used against one or the other, and nothing else about the request
  // differs between them.
  sandbox: "https://sandbox-quickbooks.api.intuit.com",
  production: "https://quickbooks.api.intuit.com",
};

export const ENVIRONMENT_LABEL: Record<QuickBooksEnvironment, string> = {
  sandbox: "Test mode (QuickBooks Sandbox)",
  production: "Live",
};

/** How the sandbox company presents itself, so a facility never mistakes it for
 *  their real books. Mirrors Intuit's "Sandbox Company_US_1" naming. */
export const SANDBOX_COMPANY_NAME = "Sandbox Company — Yipyy (Test)";
export const SANDBOX_REALM_ID = "9999999999000001";
