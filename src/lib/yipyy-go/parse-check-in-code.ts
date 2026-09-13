// ============================================================================
// A check-in code as the desk receives it.
//
// The owner’s QR code carries the kiosk link — `…/employee/check-in?code=…` —
// so a phone camera opens the kiosk with the code in the address, and a USB
// scanner types the whole link into the search field. Staff may also paste
// the bare code. This takes any of the three and answers the code, or null
// when there is none; whether it is valid is the server’s to say.
// ============================================================================

/** As short as resolve_yipyy_go_check_in_pass() will look at. */
export const MIN_CHECK_IN_CODE_LENGTH = 16;

/** A code is base64url: 32 random bytes, 43 characters. */
const CODE = /^[A-Za-z0-9_-]+$/;

export function parseCheckInCode(input: string): string | null {
  const text = input.trim();
  if (!text) return null;

  let candidate = text;
  if (/^https?:\/\//i.test(text) || /[?&]code=/.test(text)) {
    try {
      candidate =
        new URL(text, "https://desk.invalid").searchParams
          .get("code")
          ?.trim() ?? "";
    } catch {
      return null;
    }
  }

  return candidate.length >= MIN_CHECK_IN_CODE_LENGTH && CODE.test(candidate)
    ? candidate
    : null;
}
