import { NextRequest, NextResponse } from "next/server";

import { roleDisplayNames, type AdminRole } from "@/data/admin-users";
import { buildInviteEmail } from "@/lib/admin-invite-email";
import { createInviteToken, INVITE_TOKEN_TTL_MS } from "@/lib/invitation-token";

// Sends a real admin-team invitation email with a 48-hour setup link.
// Env-gated like the AI routes: when RESEND_API_KEY is absent we don't fake a
// send — we return sent:false + the setup link so the inviter can share it.

interface InviteBody {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { id, name, email, role, department } = body;
  if (!id || !name?.trim() || !email?.trim() || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Name, a valid email, and id are required." },
      { status: 400 },
    );
  }

  const token = createInviteToken({ id, name, email, role, department });
  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(req.url).origin;
  const setupUrl = `${origin}/setup/${token}`;
  const expiresAt = Date.now() + INVITE_TOKEN_TTL_MS;
  const roleLabel = roleDisplayNames[role as AdminRole] ?? role;

  const email_ = buildInviteEmail({
    name,
    roleLabel,
    department,
    setupUrl,
    expiryHours: 48,
  });

  const apiKey = process.env.RESEND_API_KEY;

  // ENV-GATE (mirrors the AI routes): no key → honest "not configured", and we
  // hand back the setup link so the invite still works.
  if (!apiKey) {
    return NextResponse.json({
      sent: false,
      reason: "not_configured",
      message:
        "Email service not configured (set RESEND_API_KEY). Share the setup link below instead.",
      setupUrl,
      expiresAt,
    });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Yipyy <onboarding@resend.dev>",
        to: email,
        subject: email_.subject,
        html: email_.html,
        text: email_.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Resend send failed:", res.status, detail);
      return NextResponse.json({
        sent: false,
        reason: "send_failed",
        message:
          "The email service rejected the request. Share the setup link instead.",
        setupUrl,
        expiresAt,
      });
    }

    const data = (await res.json()) as { id?: string };
    return NextResponse.json({
      sent: true,
      providerId: data.id ?? null,
      setupUrl,
      expiresAt,
    });
  } catch (error) {
    console.error("Admin invite email error:", error);
    return NextResponse.json({
      sent: false,
      reason: "error",
      message:
        "Could not reach the email service. Share the setup link instead.",
      setupUrl,
      expiresAt,
    });
  }
}
