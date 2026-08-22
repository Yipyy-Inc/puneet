import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  platformAuthenticatorIsAvailable,
  startAuthentication,
  startRegistration,
} from "@simplewebauthn/browser";
import { useSyncExternalStore } from "react";

// ============================================================================
// The browser half of passkeys: four calls, so no component has to know the
// endpoint shapes or the two-step dance underneath them.
//
// EVERY FLOW IS TWO ROUND TRIPS. The server issues a challenge, the
// authenticator signs it, the server checks the signature. That is not an
// implementation detail worth hiding differently in three components, so it is
// hidden once, here.
//
// ── CANCELLING IS NOT FAILING ─────────────────────────────────────────────
//
// Dismissing the Face ID sheet throws `NotAllowedError`, exactly as a genuine
// refusal does — the browser deliberately does not distinguish them, so an
// attacker cannot tell "no such credential" from "user said no". A component
// that renders every throw as an error tells someone who simply changed their
// mind that something went wrong. So cancellation comes back as its own result
// and the callers stay quiet about it.
// ============================================================================

export type PasskeyResult =
  | { ok: true }
  | { cancelled: true }
  | { error: string };

/** Is WebAuthn available at all? False on http:// and in older browsers. */
export function supportsPasskeys(): boolean {
  return browserSupportsWebAuthn();
}

/** Never fires: WebAuthn support cannot change during a page's life. */
const neverChanges = () => () => {};

/**
 * WebAuthn support, as a value a component can render — `null` until known.
 *
 * NOT `useState` + `useEffect`. That is the obvious shape and it trips
 * `react-hooks/set-state-in-effect`, because setting state synchronously in an
 * effect is a cascading render by construction. It is also the wrong tool:
 * this is a read of an external, non-reactive system, which is exactly what
 * `useSyncExternalStore` exists for.
 *
 * The server snapshot is `null` rather than `false` on purpose. `navigator`
 * does not exist during SSR, so the honest server answer is "not known yet" —
 * and returning `false` would make the markup claim, for one frame, that a
 * capable browser is incapable. Callers render nothing while it is null.
 */
export function usePasskeySupport(): boolean | null {
  return useSyncExternalStore(
    neverChanges,
    () => browserSupportsWebAuthn(),
    () => null,
  );
}

/** Can the browser offer a passkey from inside the email field? */
export function supportsPasskeyAutofill(): Promise<boolean> {
  return browserSupportsWebAuthnAutofill();
}

/**
 * Does this device have a built-in sensor — Face ID, Touch ID, Windows Hello?
 *
 * Enrolment asks for `authenticatorAttachment: "platform"`, so on a machine
 * with no such sensor the browser has nothing to offer and the attempt fails.
 * Checking first is the difference between not showing a button and showing one
 * that errors when pressed.
 *
 * Separate from `usePasskeySupport`, and deliberately: WebAuthn being available
 * and a fingerprint reader being present are different facts. A desktop Chrome
 * with no Hello configured answers true to the first and false to this.
 */
export function hasPlatformAuthenticator(): Promise<boolean> {
  return platformAuthenticatorIsAvailable();
}

/**
 * `NotAllowedError` and `AbortError` both mean "the user did not go through
 * with it" — a dismissed sheet, a closed prompt, or a conditional request
 * superseded by another. None of them is worth a red box.
 */
function isCancellation(error: unknown): boolean {
  const name = (error as { name?: string })?.name;
  return name === "NotAllowedError" || name === "AbortError";
}

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error ?? fallback;
}

/** Create a passkey for the signed-in user and store its public key. */
export async function enrolPasskey(): Promise<PasskeyResult> {
  const optionsResponse = await fetch("/api/auth/passkey/register/options", {
    method: "POST",
  });
  if (!optionsResponse.ok) {
    return { error: await readError(optionsResponse, "Could not start that.") };
  }

  let attestation;
  try {
    attestation = await startRegistration({
      optionsJSON: await optionsResponse.json(),
    });
  } catch (error) {
    if (isCancellation(error)) return { cancelled: true };
    // The commonest real failure is InvalidStateError: this device already
    // holds a credential for this account, because `excludeCredentials` told
    // the authenticator to refuse. The end state is the one they wanted.
    if ((error as { name?: string })?.name === "InvalidStateError") {
      return { ok: true };
    }
    return { error: "This device could not create a passkey." };
  }

  const verifyResponse = await fetch("/api/auth/passkey/register/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(attestation),
  });

  if (!verifyResponse.ok) {
    return {
      error: await readError(verifyResponse, "That passkey was not accepted."),
    };
  }
  return { ok: true };
}

/**
 * Sign in with a passkey.
 *
 * `autofill` starts a CONDITIONAL request: nothing pops up, and the browser
 * instead offers the passkey inside the email field's own dropdown. It resolves
 * only if the user picks one, which may be never — so callers must not await it
 * in a way that blocks anything, and must not report its silence as a problem.
 */
export async function signInWithPasskey({
  autofill = false,
}: { autofill?: boolean } = {}): Promise<PasskeyResult> {
  const optionsResponse = await fetch(
    "/api/auth/passkey/authenticate/options",
    { method: "POST" },
  );
  if (!optionsResponse.ok) {
    return { error: await readError(optionsResponse, "Could not start that.") };
  }

  let assertion;
  try {
    assertion = await startAuthentication({
      optionsJSON: await optionsResponse.json(),
      useBrowserAutofill: autofill,
    });
  } catch (error) {
    if (isCancellation(error)) return { cancelled: true };
    return { error: "That passkey could not be used." };
  }

  const verifyResponse = await fetch("/api/auth/passkey/authenticate/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(assertion),
  });

  if (!verifyResponse.ok) {
    return {
      error: await readError(verifyResponse, "That passkey was not accepted."),
    };
  }
  return { ok: true };
}

export type StoredPasskey = {
  credential_id: string;
  nickname: string | null;
  transports: string[];
  backed_up: boolean;
  created_at: string;
  last_used_at: string | null;
};

export async function listPasskeys(): Promise<StoredPasskey[]> {
  const response = await fetch("/api/auth/passkey");
  if (!response.ok) return [];
  const body = (await response.json()) as { passkeys?: StoredPasskey[] };
  return body.passkeys ?? [];
}

export async function revokePasskey(
  credentialId: string,
): Promise<PasskeyResult> {
  const response = await fetch(
    `/api/auth/passkey/${encodeURIComponent(credentialId)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    return {
      error: await readError(response, "That passkey could not be removed."),
    };
  }
  return { ok: true };
}
