import {
  describeProviderError,
  parseProviderErrorCode,
} from "@/lib/calling/provider-errors";

import type {
  AvailableNumber,
  CallingProvider,
  ProviderCredentials,
  PurchasedNumber,
  SearchNumbersInput,
  SendSmsInput,
  SendSmsResult,
  Subaccount,
} from "./types";
import { outboundSendsSuppressed, SUPPRESSED_DETAIL } from "@/lib/deployment";

// ============================================================================
// The one module that talks to the carrier.
//
// Every api.twilio.com URL, every Basic auth header and every timeout in this
// codebase is here. `messaging/send.ts` and `clover/receipt-delivery.ts` each
// built their own before this, and provisioning was about to build four more.
//
// ── THE ERROR BODY IS READ, NOT DISCARDED ─────────────────────────────────
//
// A failure carries a numeric code, and the codes are not interchangeable —
// 21610 is a customer who replied STOP and must never be messaged again, 21211
// is a typo. `request()` extracts it once so no caller has to remember, and
// `provider-errors.ts` turns it into a sentence with a next step.
//
// ── NO `server-only` HERE, AND THAT IS DELIBERATE ─────────────────────────
//
// This module reads no environment and holds no secret: every method takes its
// credentials as an argument, which is what lets a facility's own subaccount
// use the same code as Yipyy's account. The env guard belongs on `index.ts`,
// which is where `platformTwilio()` is read.
//
// The practical gain is that this file can be unit-tested against a stubbed
// `fetch` — URL, auth header, form encoding and error handling are the parts
// most likely to be wrong and the parts no e2e test would reach without
// spending money at a carrier.
//
// ── AND EVERY REQUEST HAS A DEADLINE ──────────────────────────────────────
//
// 15 seconds. A carrier that has stopped answering must not hold a route open
// until the platform's own timeout kills it, because that turns one slow
// dependency into a queue of stuck requests.
// ============================================================================

const API_ROOT = "https://api.twilio.com/2010-04-01";
const TIMEOUT_MS = 15_000;

function authHeader(credentials: ProviderCredentials): string {
  return `Basic ${Buffer.from(
    `${credentials.accountSid}:${credentials.authToken}`,
  ).toString("base64")}`;
}

interface RequestOutcome {
  ok: boolean;
  status: number;
  body: unknown;
  /** The carrier's numeric code, when the failure carried one. */
  errorCode: number | null;
  /** Plain language, already resolved. Only set when `ok` is false. */
  detail?: string;
  /** The carrier's own words, for the one screen that should see them. */
  providerMessage?: string;
}

/**
 * One request to the carrier.
 *
 * Returns an outcome rather than throwing on a refusal — a carrier saying no is
 * an ordinary event with a message a person has to read. It throws only when
 * the request could not be made at all.
 */
async function request(
  credentials: ProviderCredentials,
  path: string,
  init: { method: "GET" | "POST" | "DELETE"; form?: Record<string, string> },
): Promise<RequestOutcome> {
  const response = await fetch(`${API_ROOT}${path}`, {
    method: init.method,
    headers: {
      Authorization: authHeader(credentials),
      ...(init.form
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: init.form ? new URLSearchParams(init.form) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  // Read as text first. A gateway timeout is an HTML page, and `response.json()`
  // throwing there would lose the status we do have.
  const text = await response.text().catch(() => "");

  if (!response.ok) {
    const errorCode = parseProviderErrorCode(text);
    // The status and the raw body go to the log, where somebody who can look a
    // code up will see them. The caller gets a sentence.
    console.warn(
      `[calling] ${init.method} ${path} -> ${response.status} code=${errorCode ?? "?"} ${text}`.slice(
        0,
        300,
      ),
    );
    let providerMessage: string | undefined;
    try {
      const parsed: unknown = JSON.parse(text);
      const message = (parsed as { message?: unknown } | null)?.message;
      if (typeof message === "string") providerMessage = message;
    } catch {
      // not JSON — there is no carrier message to pass on
    }
    return {
      ok: false,
      status: response.status,
      body: null,
      errorCode,
      detail: describeProviderError(errorCode),
      providerMessage,
    };
  }

  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { ok: true, status: response.status, body, errorCode: null };
}

/** A DELETE returns 204 with no body, so it has nothing to parse. */
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function capabilityFlags(value: unknown): {
  sms: boolean;
  mms: boolean;
  voice: boolean;
} {
  const c = asRecord(value);
  return {
    sms: c.SMS === true || c.sms === true,
    mms: c.MMS === true || c.mms === true,
    voice: c.voice === true || c.Voice === true,
  };
}

export const twilioProvider: CallingProvider = {
  name: "twilio",

  async verifyCredentials(credentials: ProviderCredentials) {
    try {
      const outcome = await request(
        credentials,
        `/Accounts/${credentials.accountSid}.json`,
        { method: "GET" },
      );
      if (!outcome.ok) {
        return {
          ok: false as const,
          error:
            outcome.providerMessage ??
            outcome.detail ??
            `The provider refused the credentials (${outcome.status}).`,
        };
      }
      const row = asRecord(outcome.body);
      return {
        ok: true as const,
        friendlyName: str(row.friendly_name),
        status: str(row.status),
      };
    } catch (error) {
      return {
        ok: false as const,
        error:
          error instanceof Error && error.name === "TimeoutError"
            ? "The provider did not answer in time."
            : "Could not reach the provider.",
      };
    }
  },

  async sendSms(
    credentials: ProviderCredentials,
    input: SendSmsInput,
  ): Promise<SendSmsResult> {
    // ── THE BACKSTOP, NOT THE GATE ──────────────────────────────────────────
    //
    // Every caller that should be suppressed on staging already is, one layer
    // up, where it can record a useful reason on its own row. This is here for
    // the caller that arrives later and does not know it needs to: an SMS is
    // not recallable, and staging reads the PRODUCTION database (ADR 0007), so
    // the number in `input.to` belongs to a real person.
    //
    // `errorCode: null` deliberately — there is no carrier verdict, because
    // nothing was ever sent to a carrier.
    if (outboundSendsSuppressed()) {
      return { ok: false, errorCode: null, detail: SUPPRESSED_DETAIL };
    }

    try {
      const outcome = await request(
        credentials,
        `/Accounts/${credentials.accountSid}/Messages.json`,
        {
          method: "POST",
          form: { To: input.to, From: input.from, Body: input.body },
        },
      );
      if (!outcome.ok) {
        return {
          ok: false,
          errorCode: outcome.errorCode,
          detail: outcome.detail,
        };
      }
      return { ok: true, providerId: str(asRecord(outcome.body).sid) };
    } catch (error) {
      // The request could not be made — DNS, TLS, the 15-second deadline. Not a
      // carrier verdict, so there is no code to map.
      console.warn("[calling] sendSms failed:", error);
      return {
        ok: false,
        errorCode: null,
        detail:
          error instanceof Error && error.name === "TimeoutError"
            ? "The phone provider did not answer in time. Try again in a moment."
            : "Could not reach the phone provider. Check the connection and try again.",
      };
    }
  },

  async searchNumbers(
    credentials: ProviderCredentials,
    input: SearchNumbersInput,
  ): Promise<AvailableNumber[]> {
    const params = new URLSearchParams({
      PageSize: String(Math.min(input.limit ?? 20, 50)),
    });
    if (input.areaCode) params.set("AreaCode", input.areaCode);

    const outcome = await request(
      credentials,
      `/Accounts/${credentials.accountSid}/AvailablePhoneNumbers/${input.country}/Local.json?${params}`,
      { method: "GET" },
    );
    if (!outcome.ok) return [];

    const list = asRecord(outcome.body).available_phone_numbers;
    if (!Array.isArray(list)) return [];

    return list.map((raw) => {
      const row = asRecord(raw);
      const caps = capabilityFlags(row.capabilities);
      return {
        phoneNumber: str(row.phone_number),
        locality: str(row.locality) || null,
        region: str(row.region) || null,
        ...caps,
      };
    });
  },

  async createSubaccount(
    credentials: ProviderCredentials,
    friendlyName: string,
  ): Promise<Subaccount> {
    const outcome = await request(credentials, `/Accounts.json`, {
      method: "POST",
      form: { FriendlyName: friendlyName },
    });
    if (!outcome.ok) {
      throw new Error(outcome.detail ?? "The subaccount could not be created.");
    }
    const row = asRecord(outcome.body);
    const accountSid = str(row.sid);
    const authToken = str(row.auth_token);
    if (!accountSid || !authToken) {
      // A 200 that does not carry both is not a usable subaccount, and storing
      // half of one would leave a facility connected to nothing.
      throw new Error(
        "The provider created a subaccount without returning its credentials.",
      );
    }
    return { accountSid, authToken, friendlyName: str(row.friendly_name) };
  },

  async buyNumber(
    credentials: ProviderCredentials,
    input: { phoneNumber: string; friendlyName?: string },
  ): Promise<PurchasedNumber> {
    const outcome = await request(
      credentials,
      `/Accounts/${credentials.accountSid}/IncomingPhoneNumbers.json`,
      {
        method: "POST",
        form: {
          PhoneNumber: input.phoneNumber,
          ...(input.friendlyName ? { FriendlyName: input.friendlyName } : {}),
        },
      },
    );
    if (!outcome.ok) {
      throw new Error(outcome.detail ?? "The number could not be purchased.");
    }
    const row = asRecord(outcome.body);
    const numberSid = str(row.sid);
    if (!numberSid) {
      // Money may have been spent. Say so rather than reporting a clean failure
      // — the difference decides whether somebody goes looking in the console.
      throw new Error(
        "The provider accepted the purchase but returned no number id. Check the account before retrying.",
      );
    }
    return {
      phoneNumber: str(row.phone_number) || input.phoneNumber,
      numberSid,
      ...capabilityFlags(row.capabilities),
    };
  },

  async releaseNumber(
    credentials: ProviderCredentials,
    numberSid: string,
  ): Promise<void> {
    const outcome = await request(
      credentials,
      `/Accounts/${credentials.accountSid}/IncomingPhoneNumbers/${numberSid}.json`,
      { method: "DELETE" },
    );
    if (!outcome.ok) {
      throw new Error(outcome.detail ?? "The number could not be released.");
    }
  },
};
