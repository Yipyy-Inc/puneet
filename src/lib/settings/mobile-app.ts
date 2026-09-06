import { z } from "zod";

// ============================================================================
// A facility's white-label mobile app: what it is called, what it looks like,
// where it is published, and which features it offers a customer.
//
// ── WHERE THIS USED TO LIVE ───────────────────────────────────────────────
//
// `useState(mobileAppSettings)`, under a "Save Changes" button with NO
// `onClick` at all. Not a stub, not a toast, not a console.log — the button
// simply did nothing, which is why this section failed silently and why
// `check:success-claims` could never have found it. `check:settings-persistence`
// exists because of exactly this half of the problem.
//
// ── THE FALLBACK IS EMPTY, AND THAT IS THE POINT ─────────────────────────
//
// The fixture is another company's identity:
//
//   appName: "PawCare"
//   iosAppId: "com.pawcare.facility"
//   customDomain: "app.pawcare.com"
//   termsOfServiceUrl: "https://pawcare.com/terms"
//
// Every facility on the platform opened this screen and was shown that as
// though it were their own configuration — the same defect
// CustomEmailDomainSettings had on 2026-09-05, where the DNS records named a
// competitor's mail infrastructure. A facility that has not filled this in has
// no app name, no bundle id and no policy URLs, and the screen should say so
// rather than inherit somebody else's.
//
// ── AND THE FEATURE FLAGS DEFAULT OFF ─────────────────────────────────────
//
// `enableLiveCamera` is not decoration: the customer portal reads it in two
// places to decide whether to offer a live camera feed of somebody's pet. The
// fixture shipped it `true`, so every facility advertised a capability nobody
// there had switched on. Same reasoning as NO_PRICING_RULES and NO_DEPOSITS —
// an unset capability offers nothing rather than inheriting a seed file.
//
// The colours default to the Yipyy palette rather than to the fixture's
// `#3B82F6` / `#8B5CF6` / `#10B981`, none of which is a token in §1.
// ============================================================================

export const mobileAppConfigSchema = z.object({
  appName: z.string(),
  appIcon: z.string(),
  splashScreen: z.string(),
  primaryColor: z.string(),
  secondaryColor: z.string(),
  accentColor: z.string(),
  logoUrl: z.string(),
  iosAppId: z.string().optional(),
  androidPackageName: z.string().optional(),
  appStoreUrl: z.string().optional(),
  playStoreUrl: z.string().optional(),
  enablePushNotifications: z.boolean(),
  enableInAppMessaging: z.boolean(),
  /** Read by the customer portal to decide whether to offer a live pet camera. */
  enableLiveCamera: z.boolean(),
  enableBookingFlow: z.boolean(),
  enableLoyaltyProgram: z.boolean(),
  customDomain: z.string().optional(),
  termsOfServiceUrl: z.string(),
  privacyPolicyUrl: z.string(),
});

export type MobileAppConfig = z.infer<typeof mobileAppConfigSchema>;

/**
 * What a facility that has never opened this screen has: no app identity, and
 * no feature switched on.
 *
 * Cloned on every read — the domain fallback is handed straight to a component
 * that will edit it.
 */
export function noMobileApp(): MobileAppConfig {
  return {
    appName: "",
    appIcon: "",
    splashScreen: "",
    // §1's primary, heading ink and success ink. The fixture's three were raw
    // hex from the pre-redesign palette and belong to no token.
    primaryColor: "#1668E3",
    secondaryColor: "#0E3A5C",
    accentColor: "#0F7A52",
    logoUrl: "",
    enablePushNotifications: false,
    enableInAppMessaging: false,
    enableLiveCamera: false,
    enableBookingFlow: false,
    enableLoyaltyProgram: false,
    termsOfServiceUrl: "",
    privacyPolicyUrl: "",
  };
}

/** The empty value the registry hands out. See `noMobileApp()` for why it is empty. */
export const NO_MOBILE_APP: MobileAppConfig = noMobileApp();
