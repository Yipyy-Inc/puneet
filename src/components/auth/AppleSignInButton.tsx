"use client";

import { OAuthButton } from "@/components/auth/OAuthButton";

// ============================================================================
// The Apple button. The flow lives in OAuthButton; this file is the brand.
//
// ENABLED ON STAGING ONLY, as of 2026-08-17. `isAppleOauthEnabled` is false on
// the WorkOS production environment and cannot be turned on until somebody
// supplies real credentials from an Apple Developer account — a Services ID, a
// Team ID, a Key ID and a .p8 private key. Apple is the only provider here with
// no free path, and that was equally true under Clerk: the gap is Apple's, not
// the identity provider's.
//
// So the button renders in both environments and will fail at the hand-off in
// production until those are set. That is deliberate: hiding it per-environment
// would need a flag, a flag would need a source of truth, and the honest
// failure ("could not reach Apple") is one config change away from never
// happening again. Do not paper over it with a disabled state.
// ============================================================================

/**
 * Apple's mark, monochrome and inheriting `currentColor` — Apple's guidelines
 * require the logo on the button and allow black or white to suit the ground,
 * which is exactly what the outline button's foreground already gives us in
 * both light and dark themes.
 */
function AppleMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className="size-5 shrink-0"
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}

export function AppleSignInButton() {
  return (
    <OAuthButton
      provider="AppleOAuth"
      providerName="Apple"
      mark={<AppleMark />}
    />
  );
}
