// ============================================================================
// What Yipyy needs a telephony provider to do.
//
// ── WHY AN INTERFACE WHEN THERE IS ONE PROVIDER ───────────────────────────
//
// Not to make swapping carriers easy — that is a fantasy this file will not
// indulge, because numbers do not move for free and porting is weeks. It is to
// put every request to a carrier in ONE module.
//
// Before this there were two hand-rolled `fetch` calls to api.twilio.com, in
// `messaging/send.ts` and `clover/receipt-delivery.ts`, each building its own
// URL, its own Basic auth header and its own error handling — and each getting
// a different amount of it right. Provisioning adds four more calls. Six
// scattered copies of "how to talk to the carrier" is how one of them ends up
// missing a timeout, or reading an error body the others parse.
//
// The seam is also where the per-facility subaccount will plug in: every method
// takes its credentials rather than reaching for the environment, so sending as
// Yipyy and sending as a facility differ by an argument.
// ============================================================================

export interface ProviderCredentials {
  accountSid: string;
  authToken: string;
}

export interface SendSmsInput {
  to: string;
  from: string;
  body: string;
}

export interface SendSmsResult {
  ok: boolean;
  /** The carrier's id for the message, when it accepted one. */
  providerId?: string;
  /** The carrier's numeric code, for `providerError()`. Null when not given. */
  errorCode?: number | null;
  /** Already in plain language — never a raw status code. */
  detail?: string;
}

export interface AvailableNumber {
  phoneNumber: string;
  locality: string | null;
  region: string | null;
  sms: boolean;
  mms: boolean;
  voice: boolean;
}

export interface SearchNumbersInput {
  /** ISO country, e.g. "CA" or "US". */
  country: string;
  /** Preferred area code. Omitted means anywhere in the country. */
  areaCode?: string;
  limit?: number;
}

export interface PurchasedNumber {
  phoneNumber: string;
  numberSid: string;
  sms: boolean;
  mms: boolean;
  voice: boolean;
}

export interface Subaccount {
  accountSid: string;
  authToken: string;
  friendlyName: string;
}

/**
 * A carrier, as this product uses one.
 *
 * Every method returns a result rather than throwing on a refusal: a carrier
 * saying no is an ordinary outcome that the screen has to explain, not an
 * exception. They throw only when the request itself could not be made.
 */
export type VerifyResult =
  | { ok: true; friendlyName: string; status: string }
  /**
   * The CARRIER'S own message, not ours.
   *
   * The one place a raw provider string is the right answer: this is a platform
   * admin diagnosing a deployment, and the carrier distinguishes a bad token
   * from a suspended account from a SID that does not exist — three states that
   * look identical from outside and that our own error map deliberately
   * collapses into one sentence for a receptionist.
   */
  | { ok: false; error: string };

export interface CallingProvider {
  readonly name: "twilio";

  /** Authenticate against the carrier. Proves the credentials work TODAY. */
  verifyCredentials(credentials: ProviderCredentials): Promise<VerifyResult>;

  sendSms(
    credentials: ProviderCredentials,
    input: SendSmsInput,
  ): Promise<SendSmsResult>;

  /**
   * Numbers the carrier is currently offering. Read-only and free.
   */
  searchNumbers(
    credentials: ProviderCredentials,
    input: SearchNumbersInput,
  ): Promise<AvailableNumber[]>;

  /**
   * A subaccount for one facility, so its traffic and its bill are its own.
   *
   * CREATES A BILLABLE RESOURCE on the parent account.
   */
  createSubaccount(
    credentials: ProviderCredentials,
    friendlyName: string,
  ): Promise<Subaccount>;

  /**
   * BUYS A NUMBER. This costs money, every month, until it is released.
   *
   * The only method here that spends anything, and it is deliberately not
   * reachable from a route: `src/lib/calling/provisioning.ts` is the one caller,
   * and it is service_role only.
   */
  buyNumber(
    credentials: ProviderCredentials,
    input: { phoneNumber: string; friendlyName?: string },
  ): Promise<PurchasedNumber>;

  /** Gives a number back. Stops the monthly charge; the number is gone. */
  releaseNumber(
    credentials: ProviderCredentials,
    numberSid: string,
  ): Promise<void>;
}
