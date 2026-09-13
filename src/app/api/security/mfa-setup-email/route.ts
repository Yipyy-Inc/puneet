import { NextResponse } from "next/server";

import { buildMfaSetupEmail } from "@/lib/mfa-setup-email";
import { platformOrigin } from "@/lib/public-origin";

// Honest, env-gated "Resend MFA Setup Email". Sends a real email via Resend when
// RESEND_API_KEY is configured; otherwise returns sent:false + reason
// "not_configured" (never fakes a send). Mirrors /api/admin/invite.

type Result =
  | { sent: true; message: string }
  | { sent: false; reason: "not_configured" | "send_failed"; message: string };

export async function POST(req: Request) {
  let userName = "";
  let email = "";
  try {
    const body = (await req.json()) as { userName?: string; email?: string };
    userName = (body.userName ?? "").trim();
    email = (body.email ?? "").trim();
  } catch {
    // ignore — validated below
  }

  if (!email) {
    return NextResponse.json<Result>({
      sent: false,
      reason: "not_configured",
      message: "No email address on file for this user.",
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json<Result>({
      sent: false,
      reason: "not_configured",
      message:
        "Email service not configured (set RESEND_API_KEY). Could not send the MFA setup email.",
    });
  }

  // A platform security notice, so Yipyy's own address — not whichever host
  // the administrator sending it happened to be looking at.
  const origin = platformOrigin(req);
  const message = buildMfaSetupEmail({ userName, origin });

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // EMAIL_FROM, like every other send here. This route hardcoded
        // "security@yipyy.com", so changing the verified sending domain
        // would have silently broken this one email and nothing else.
        from: process.env.EMAIL_FROM ?? "Yipyy <onboarding@resend.dev>",
        to: [email],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json<Result>({
        sent: false,
        reason: "send_failed",
        message: `The email service rejected the request (HTTP ${res.status}${
          detail ? `: ${detail.slice(0, 80)}` : ""
        }).`,
      });
    }

    return NextResponse.json<Result>({
      sent: true,
      message: `MFA setup email sent to ${email}.`,
    });
  } catch (err) {
    return NextResponse.json<Result>({
      sent: false,
      reason: "send_failed",
      message:
        err instanceof Error
          ? `Could not reach the email service: ${err.message}`
          : "Could not reach the email service.",
    });
  }
}
