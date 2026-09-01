// ============================================================================
// What the phone provider's error codes mean, in words a facility can act on.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// A failed text reported `SMS service said 400`. The provider's response body
// carries a numeric code and a description, and `sendSms` read it, logged the
// first 300 characters to the server console, and threw it away — so the row a
// facility actually reads said only that something was a 400.
//
// Those codes are not interchangeable. 21610 means the customer replied STOP
// and must never be messaged again. 21211 means somebody typed the number
// wrong. 30034 means the business has not registered its campaign and NOTHING
// will send until it does. One of those is a data-entry fix, one is a
// compliance state, and one is a week of paperwork — and all three read as
// "400".
//
// ── EVERY ENTRY CARRIES A NEXT STEP ───────────────────────────────────────
//
// "Message blocked" tells a receptionist nothing. What they need is the thing
// to do next, and if there is nothing they can do, to be told that plainly so
// they stop retrying. A description without an action is the same dead end as
// the status code, with better grammar.
//
// ── AND NO VENDOR NAME ────────────────────────────────────────────────────
//
// These strings reach facility screens through `message_sends.detail`, so they
// say "the phone provider". `check:vendor-strings` scans the screens rather
// than this file, which is exactly why the discipline has to be here.
// ============================================================================

export interface ProviderError {
  /** One sentence: what happened, in the facility's terms. */
  summary: string;
  /** What to do about it. "Nothing" is a valid and useful answer. */
  nextStep: string;
  /**
   * Whether retrying the identical send could ever succeed.
   *
   * The field that matters most operationally: a screen offering "Retry" on a
   * STOP or an unregistered campaign invites somebody to keep pressing it.
   */
  retryable: boolean;
}

/**
 * The fallback, returned for any code not in the table.
 *
 * It deliberately does NOT interpolate the number. An unmapped code shown to a
 * receptionist as "Error 30127" is the status-code problem again wearing a
 * different mask — the code belongs in the server log, where somebody who can
 * look it up will see it.
 */
export const UNKNOWN_PROVIDER_ERROR: ProviderError = {
  summary:
    "The phone provider rejected this and did not say why in a way we recognise.",
  nextStep:
    "Try once more. If it fails again, send us the time and the number and we will read the provider's log.",
  retryable: true,
};

const CODES: Record<number, ProviderError> = {
  // ── Account and authentication ─────────────────────────────────────────
  20003: {
    summary: "Yipyy could not authenticate with the phone provider.",
    nextStep:
      "Nothing you can do from here — this is a Yipyy configuration problem. Please tell us; calls and texts are affected for everyone until it is fixed.",
    retryable: false,
  },
  20404: {
    summary:
      "The provider has no record of the number or resource this was sent to.",
    nextStep:
      "Check the number on the client's record. If it is correct, tell us — the number may need reprovisioning.",
    retryable: false,
  },
  20429: {
    summary: "Too many requests to the phone provider at once.",
    nextStep: "Wait a minute and try again. Nothing is lost.",
    retryable: true,
  },

  // ── The number itself ──────────────────────────────────────────────────
  21211: {
    summary: "That is not a valid phone number.",
    nextStep:
      "Correct the number on the client's record — it is usually a missing digit or an area code.",
    retryable: false,
  },
  21212: {
    summary: "The number this was sent FROM is not valid.",
    nextStep:
      "Check the business number in Calling → Settings. If it looks right, tell us.",
    retryable: false,
  },
  21214: {
    summary: "The provider cannot route to that number.",
    nextStep:
      "Check the number, including the country code. Some numbers cannot receive from outside their own country.",
    retryable: false,
  },
  21217: {
    summary: "That number does not look valid to the provider.",
    nextStep: "Re-enter it in full, with the country code.",
    retryable: false,
  },
  21219: {
    summary:
      "That number has not been verified, and this account may only reach verified numbers.",
    nextStep:
      "Tell us — the account is on a trial restriction it should not be on.",
    retryable: false,
  },
  21266: {
    summary: "The From and To numbers are the same.",
    nextStep:
      "The client's number on file matches the business number. Correct the client record.",
    retryable: false,
  },
  21408: {
    summary: "This account is not permitted to send to that country.",
    nextStep:
      "Tell us the country — permission has to be enabled once, then it stays on.",
    retryable: false,
  },
  21606: {
    summary: "The business number cannot send texts.",
    nextStep:
      "The number is voice-only. Tell us and we will enable messaging on it.",
    retryable: false,
  },
  21614: {
    summary: "That number is a landline, so it cannot receive a text.",
    nextStep:
      "Call the client instead, or ask for a mobile number for their record.",
    retryable: false,
  },

  // ── Consent, and the one that must never be retried ────────────────────
  21610: {
    summary: "This person replied STOP and has unsubscribed from your texts.",
    nextStep:
      "Do not text them again — it is unlawful, not merely blocked. They must reply START themselves. Phone them instead.",
    retryable: false,
  },

  // ── Message content and queue ──────────────────────────────────────────
  21611: {
    summary: "The send queue for the business number is full.",
    nextStep:
      "Too many messages at once. Wait a few minutes; queued messages will go out.",
    retryable: true,
  },
  21617: {
    summary: "The message is too long to send.",
    nextStep: "Shorten it, or split it into two.",
    retryable: false,
  },
  21620: {
    summary: "An attachment on this message could not be fetched.",
    nextStep: "Remove the attachment and send again, or re-upload it.",
    retryable: false,
  },

  // ── The carrier, at the far end ────────────────────────────────────────
  30003: {
    summary: "The handset is switched off or out of coverage.",
    nextStep: "Try again later, or phone them.",
    retryable: true,
  },
  30004: {
    summary: "The carrier blocked this message.",
    nextStep:
      "Often the recipient has blocked marketing texts. Phone them instead; retrying will not get through.",
    retryable: false,
  },
  30005: {
    summary: "The carrier does not recognise that number.",
    nextStep:
      "The number is disconnected or was mistyped. Confirm it with the client.",
    retryable: false,
  },
  30006: {
    summary: "That number is a landline, or its carrier cannot take texts.",
    nextStep: "Phone them, or ask for a mobile number.",
    retryable: false,
  },
  30007: {
    summary: "The carrier filtered this message as spam.",
    nextStep:
      "Usually caused by a link, or by sending the same wording to many people at once. Reword it and vary the message.",
    retryable: false,
  },
  30008: {
    summary: "The carrier rejected this without giving a reason.",
    nextStep: "Try once more. If it fails again, phone them.",
    retryable: true,
  },
  30032: {
    summary: "The business number has not completed toll-free verification.",
    nextStep:
      "Nothing will send until it does. Tell us — verification takes a few days and we submit it.",
    retryable: false,
  },
  30034: {
    summary:
      "The business's messaging campaign is not registered, so carriers are refusing everything.",
    nextStep:
      "Nothing will send until registration completes. Tell us; this is paperwork we file on your behalf.",
    retryable: false,
  },

  // ── Voice ──────────────────────────────────────────────────────────────
  13223: {
    summary: "The number dialled is not in a format the provider accepts.",
    nextStep: "Re-enter it with the country code, e.g. +1 514 555 0100.",
    retryable: false,
  },
  13224: {
    summary: "The caller ID on this call is not a number this account may use.",
    nextStep:
      "Check the business number in Calling → Settings. A number must be owned or verified before calls can show it.",
    retryable: false,
  },
};

/** Plain language for a provider error code, or the fallback. */
export function providerError(code: number | null | undefined): ProviderError {
  if (typeof code !== "number" || !Number.isFinite(code)) {
    return UNKNOWN_PROVIDER_ERROR;
  }
  return CODES[code] ?? UNKNOWN_PROVIDER_ERROR;
}

/** True when this code is in the table — for logging, never for display. */
export function isKnownProviderError(code: number | null | undefined): boolean {
  return typeof code === "number" && code in CODES;
}

/**
 * The provider's numeric code out of an error response body.
 *
 * The body is read as text before this because a failure is not guaranteed to
 * be JSON — a gateway timeout is HTML, and `JSON.parse` throwing there would
 * lose the status we do have.
 */
export function parseProviderErrorCode(body: string): number | null {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "code" in parsed) {
      const code = (parsed as { code: unknown }).code;
      if (typeof code === "number") return code;
      if (typeof code === "string" && /^\d+$/.test(code)) return Number(code);
    }
  } catch {
    // not JSON — the caller still has the HTTP status
  }
  return null;
}

/** One line for a screen: what happened, then what to do. */
export function describeProviderError(code: number | null | undefined): string {
  const error = providerError(code);
  return `${error.summary} ${error.nextStep}`;
}
