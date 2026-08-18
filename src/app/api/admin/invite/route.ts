import { NextRequest, NextResponse } from "next/server";

import { roleDisplayNames, type AdminRole } from "@/data/admin-users";
import { buildInviteEmail } from "@/lib/admin-invite-email";
import { getViewer } from "@/lib/auth/viewer";
import {
  PLATFORM_INVITE_TTL_MS,
  mintPlatformInviteToken,
  toByteaLiteral,
  toPlatformRole,
} from "@/lib/auth/platform-invitation";
import { platformOrigin } from "@/lib/public-origin";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Invite somebody onto the Yipyy platform team.
//
// ── WHAT THIS ROUTE USED TO BE ────────────────────────────────────────────
//
// An UNAUTHENTICATED RELAY. There was no guard of any kind: any caller who knew
// the path could POST a name and an address and Yipyy would send that person a
// branded "you have been invited to the admin console" email, from the same
// domain that carries password resets. Phishing with the real sender.
//
// It also minted an invitation whose role field was editable by the recipient
// (see lib/auth/platform-invitation.ts), and the link it produced led to a page
// that created nothing.
//
// ── TWO GUARDS, ON PURPOSE ────────────────────────────────────────────────
//
// The check below refuses anyone who is not on the platform team, and it is the
// cheap one — it exists so the route stops being a relay before any work is
// done. The REAL check is in public.invite_platform_admin, which requires
// SUPERADMIN and runs on the database from the caller's own JWT.
//
// So this uses the caller's client, not the service-role one. Doing it with the
// service key would bypass the very check that makes the invitation safe, and
// the route guard would silently become the only thing standing there.
// ============================================================================

interface InviteBody {
  name: string;
  email: string;
  role: string;
  department?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const viewer = await getViewer();
  if (viewer.source !== "session" || !viewer.isPlatformAdmin) {
    // Deliberately the same answer for "not signed in" and "signed in, not on
    // the team": whether this route exists is not a stranger's business.
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { name, email, role, department } = body;
  if (!name?.trim() || !email?.trim() || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "A name and a valid email are required." },
      { status: 400 },
    );
  }

  const platformRole = toPlatformRole(role);
  const { token, hash } = mintPlatformInviteToken();
  const expiresAt = Date.now() + PLATFORM_INVITE_TTL_MS;

  const supabase = await createServerClient();
  const { error } = await supabase.rpc("invite_platform_admin", {
    p_email: email.trim(),
    p_full_name: name.trim(),
    p_role: platformRole,
    p_token_hash: toByteaLiteral(hash),
    p_expires_at: new Date(expiresAt).toISOString(),
  });

  if (error) {
    // 23505 is "already on the platform team" — a legitimate thing to tell a
    // superadmin, who can see the roster anyway.
    const status = error.code === "42501" ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  // Yipyy's OWN address. This invites somebody onto the PLATFORM team, so
  // sending them to a customer's branded host to set up their account would be
  // the facility-invite bug pointing the other way — see lib/public-origin.ts.
  const origin = platformOrigin(req);
  const setupUrl = `${origin}/setup/${token}`;
  const roleLabel = roleDisplayNames[role as AdminRole] ?? role;

  const email_ = buildInviteEmail({
    origin,
    name,
    roleLabel,
    department: department ?? "",
    setupUrl,
    expiryHours: 48,
  });

  const apiKey = process.env.RESEND_API_KEY;

  // ENV-GATE (mirrors the AI routes): no key → honest "not configured", and we
  // hand back the setup link so the invite still works. The invitation ROW
  // exists either way, which is the part that changed — the link is now a
  // pointer to something real rather than the thing itself.
  if (!apiKey) {
    return NextResponse.json({
      sent: false,
      reason: "not_configured",
      message:
        "Email service not configured (set RESEND_API_KEY). Share the setup link below instead.",
      setupUrl,
      expiresAt,
      platformRole,
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
        platformRole,
      });
    }

    const data = (await res.json()) as { id?: string };
    return NextResponse.json({
      sent: true,
      providerId: data.id ?? null,
      setupUrl,
      expiresAt,
      platformRole,
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
      platformRole,
    });
  }
}
