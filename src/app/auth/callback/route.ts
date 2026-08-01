import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The landing point for every link Supabase sends by email — confirmation,
// password recovery, magic link, invite, email-change.
//
// This route is the piece whose absence makes those flows look broken in a way
// that is genuinely hard to diagnose: the mail arrives, the link opens a real
// page, and nothing works, because the code in the URL was never exchanged for
// a session. A reset form with no session cannot reset anything.
//
// Two link shapes exist and both are live depending on the project's settings
// and the age of the email template:
//   ?code=…                    PKCE — exchangeCodeForSession
//   ?token_hash=…&type=recovery  OTP  — verifyOtp
// Handling only the first is the common half-fix, so both are here.
//
// A Route Handler rather than a page because it must SET cookies. Establishing
// the session is the entire job; the redirect afterwards is incidental.
// ============================================================================

/** Same-origin paths only — this value arrives from a URL we do not control. */
function safeNext(value: string | null): string {
  if (!value) return "/customer/dashboard";
  if (!value.startsWith("/")) return "/customer/dashboard";
  if (value.startsWith("//") || value.startsWith("/\\")) {
    return "/customer/dashboard";
  }
  return value;
}

function failure(request: NextRequest, reason: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));

  // Supabase reports its own failures (expired link, already used) on the
  // query string rather than by refusing to redirect.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) return failure(request, providerError);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createServerClient();

  /**
   * Once the address is verified, attach the account to any client record the
   * facility already holds for it. Idempotent and a no-op when there is no
   * match, so it is safe on every callback — including password recovery.
   *
   * Failure here must not break the flow: the link is a convenience, and a
   * user who cannot sign in because a lookup failed is a far worse outcome
   * than one whose history takes a little longer to appear.
   */
  async function linkClientRecord() {
    const { error } = await supabase.rpc("link_client_record");
    if (error) {
      console.warn(`[auth/callback] client link skipped: ${error.message}`);
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure(request, error.message);
    await linkClientRecord();
    return NextResponse.redirect(new URL(next, request.url));
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) return failure(request, error.message);
    await linkClientRecord();
    return NextResponse.redirect(new URL(next, request.url));
  }

  return failure(request, "That link is missing its verification code.");
}
