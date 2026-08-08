import "server-only";

// ============================================================================
// Which Clover we are talking to, and with whose identity.
//
// ── THE HOST PAIR IS ONE DECISION, NOT TWO ────────────────────────────────
//
// Clover runs separate estates, and each has a DIFFERENT host for authorising
// than for exchanging the code:
//
//   sandbox     sandbox.dev.clover.com   apisandbox.dev.clover.com
//   production  www.clover.com           api.clover.com
//
// Authorising on one and exchanging on the other is the most common way to lose
// an afternoon to this integration, because the failure arrives as an opaque
// 401 that reads exactly like a wrong App Secret. So the environment is a
// single variable and both hosts are derived from it — there is no way to
// configure half of a crossover.
//
// ── DEFAULTS TO SANDBOX, DELIBERATELY ─────────────────────────────────────
//
// An unset CLOVER_ENVIRONMENT means sandbox. The other default would mean a
// missing variable silently points a test app at real merchants and real cards,
// and the first evidence would be a live charge.
//
// ── NULL WHEN UNCONFIGURED ────────────────────────────────────────────────
//
// Same shape as every other integration here: without credentials this returns
// null and the routes say "not configured" rather than half-attempting a
// connection. A payments integration that pretends to be wired is worse than
// one that is plainly absent.
// ============================================================================

export type CloverEnvironment = "sandbox" | "production";

export interface CloverConfig {
  appId: string;
  appSecret: string;
  environment: CloverEnvironment;
  /** Where the merchant is sent to approve. */
  authorizeOrigin: string;
  /** Where the code is exchanged, and where the v3 platform API lives. */
  apiOrigin: string;
  /**
   * A THIRD host. Ecommerce — the public key and /v1/charges — is not served
   * by apiOrigin: `GET /pakms/apikey` there is a flat 404, while the same path
   * on this host returns the key. Established by probing the live sandbox
   * rather than from the documentation, which covers only the single-merchant
   * dashboard flow.
   */
  ecommerceOrigin: string;
  /** The SDK the browser loads to tokenise a card. */
  checkoutSdkUrl: string;
  /**
   * The Remote Application ID — "{developerId}.{appId}", and NOT the App ID.
   *
   * Card-present is gated on it. Without one configured, every /connect/v1/*
   * call answers:
   *
   *   401 "Authentication successful, but no Remote Application ID has been
   *        configured for Application <appId>"
   *
   * Measured once it existed: the gate is server-side against the app, so this
   * is never sent as a header — the same request with and without it returns
   * identically. It is held here because Clover's payment REQUESTS carry it,
   * and because a value that lives only in their dashboard is a value nobody
   * can find when this breaks.
   *
   * Null when unset: terminal payments then refuse rather than half-attempt.
   */
  remoteApplicationId: string | null;
}

const HOSTS: Record<
  CloverEnvironment,
  { authorize: string; api: string; ecommerce: string; sdk: string }
> = {
  sandbox: {
    authorize: "https://sandbox.dev.clover.com",
    api: "https://apisandbox.dev.clover.com",
    ecommerce: "https://scl-sandbox.dev.clover.com",
    sdk: "https://checkout.sandbox.dev.clover.com/sdk.js",
  },
  production: {
    authorize: "https://www.clover.com",
    api: "https://api.clover.com",
    ecommerce: "https://scl.clover.com",
    sdk: "https://checkout.clover.com/sdk.js",
  },
};

export function cloverEnvironment(): CloverEnvironment {
  return process.env.CLOVER_ENVIRONMENT?.trim() === "production"
    ? "production"
    : "sandbox";
}

/** The configuration, or null when the app has no Clover credentials. */
export function cloverConfig(): CloverConfig | null {
  const appId = process.env.CLOVER_APP_ID?.trim();
  const appSecret = process.env.CLOVER_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;

  const environment = cloverEnvironment();
  return {
    appId,
    appSecret,
    environment,
    authorizeOrigin: HOSTS[environment].authorize,
    apiOrigin: HOSTS[environment].api,
    ecommerceOrigin: HOSTS[environment].ecommerce,
    checkoutSdkUrl: HOSTS[environment].sdk,
    remoteApplicationId:
      process.env.CLOVER_REMOTE_APPLICATION_ID?.trim() || null,
  };
}

/**
 * Where Clover returns the merchant. Registered as the app's Site URL, which
 * Clover reviews before it can change — so it is derived from the same
 * environment variables the rest of the app uses for its public address rather
 * than written down twice.
 */
export function cloverReturnUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return `${configured.replace(/\/+$/, "")}/clover`;

  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim();
  if (domain) return `https://${domain}/clover`;

  return "http://localhost:3000/clover";
}
