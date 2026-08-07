import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { buildOwnerInviteEmail } from "@/lib/facility-owner-invite-email";
import { facilityOrigin } from "@/lib/public-origin";

// ============================================================================
// Inviting a facility's owner — sending, re-sending, withdrawing, and reading
// where it got to.
//
// Spec 002 phase 2. Phase 1 provisions a facility and records a membership
// grant against the owner's address, and there it stopped: unless that person
// already had a Yipyy account, nothing ever told them the business existed.
//
// ── NO NEW MECHANISM WAS ADDED ────────────────────────────────────────────
//
// The plan called for Clerk's Backend API `invitations.create`. The codebase
// already answers this differently and has done since the Clerk migration —
// /api/staff/[id]/invite and /api/admin/invite both do:
//
//   grant recorded -> email linking to /sign-up -> they sign up however they
//   like -> webhook writes `profiles` -> trigger claims the grant -> live
//
// A Clerk-issued invitation would be a second way to do one thing, and it would
// take away the free choice between Google and email-and-password at sign-up.
// So this reuses the mechanism and adds only the two entry points the owner
// case needs (20260807220000).
//
// ── THE EMAIL IS NOT A CREDENTIAL ─────────────────────────────────────────
//
// There is no token in it. Access is tied to the ADDRESS: the grant matches on
// email and the trigger claims it only for a Clerk profile carrying that
// address. Forwarding the message grants nothing, which is why the link can be
// the ordinary sign-up screen and why a leaked send is not an incident.
//
// ── ENV-GATED, LIKE EVERY OTHER SEND HERE ─────────────────────────────────
//
// Without RESEND_API_KEY this returns `sent:false, reason:"not_configured"`
// plus the link, rather than reporting a send that did not happen. The GRANT is
// real either way, so a superadmin can pass the link on by hand and the owner
// still gets in.
// ============================================================================

export const dynamic = "force-dynamic";

/**
 * Long enough that a small business owner who is busy for a fortnight does not
 * lose their facility; short enough that a mistyped address is not a permanent
 * open door. Withdrawing (DELETE) is the answer to a wrong address; this is the
 * answer to a forgotten one.
 */
const EXPIRY_DAYS = 14;

/** Shape only; the address is proved by them signing up with it. */
const AddressInput = z.object({
  email: z.email("Enter a valid email address."),
});

async function requirePlatformAdmin() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only a platform administrator may manage owner invitations." },
      { status: 403 },
    );
  }
  return null;
}

/** Send or re-send. Re-sending refreshes the expiry rather than adding a grant. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const { id: facilityId } = await params;
  const supabase = await createServerClient();

  const expiresAt = new Date(
    Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Through the CALLER's client, not an admin one: invite_facility_owner
  // checks is_platform_admin() against the session, and calling it as
  // service_role would skip the only permission check that matters.
  const { data, error } = await supabase.rpc("invite_facility_owner", {
    p_facility_id: facilityId,
    p_expires_at: expiresAt,
  });

  if (error) {
    const status = error.code === "42501" ? 403 : 400;
    return NextResponse.json(
      { sent: false, reason: "grant_failed", error: error.message },
      { status },
    );
  }

  const grant = data as {
    email: string;
    claimed: boolean;
    facilityName: string;
    ownerName: string;
  };

  // ── The link goes to THEIR facility, not to whoever pressed the button ───
  //
  // Reported from production: the invitation for Doggieville Mtl contained
  // `https://pawradise.yipyy.com/sign-up`. The origin below is the host the
  // SUPERADMIN happened to be on, and a superadmin browsing one facility's
  // host while creating another is not exotic — it is a tab they left open.
  //
  // The new owner then lands on a different business's branded login page, is
  // told to create an account at a company they have never heard of, and the
  // one email that hands somebody their business looks like a phishing
  // attempt. It still WORKED — access is tied to the address, not the host —
  // which is worse, because nothing failed loudly.
  //
  // So the address is derived from the facility's own slug. That is the door
  // spec 002 D2 gives them, it is the page carrying their own name and logo,
  // and it cannot be influenced by the caller's browser.
  // Read from the facility ROW, never from the request. `facilities_read`
  // admits platform admins, and this route has already established the caller
  // is one.
  const { data: facility } = await supabase
    .from("facilities")
    .select("slug")
    .eq("id", facilityId)
    .maybeSingle();

  const origin = facilityOrigin(facility?.slug, request);

  // Already registered means the grant was claimed inline and their access is
  // live now — so send them to sign IN, not to a sign-up screen that would
  // refuse the address they already own.
  const signUpUrl = grant.claimed ? `${origin}/sign-in` : `${origin}/sign-up`;

  const email = buildOwnerInviteEmail({
    ownerName: grant.ownerName,
    facilityName: grant.facilityName,
    signUpUrl,
    expiresInDays: EXPIRY_DAYS,
    alreadyRegistered: grant.claimed,
    // The logo is loaded by the recipient's mail client, so it needs an
    // absolute URL — and taking it from the request origin means preview
    // deploys render their own assets rather than pointing at production.
    origin,
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      sent: false,
      reason: "not_configured",
      message:
        "Email service not configured (set RESEND_API_KEY). Share the link below instead — their access is already recorded.",
      signUpUrl,
      ownerEmail: grant.email,
      alreadyRegistered: grant.claimed,
      expiresAt,
    });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Yipyy <onboarding@resend.dev>",
        to: grant.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });

    if (!response.ok) {
      console.error(
        "Owner invite send failed:",
        response.status,
        await response.text(),
      );
      // The GRANT stays. Withdrawing somebody's access because an SMTP call
      // returned 500 would destroy correct work to tidy up a transient error,
      // and re-sending is one click. Same reasoning as the staff invite route.
      return NextResponse.json({
        sent: false,
        reason: "send_failed",
        message:
          "The email service rejected the request. Their access is recorded — resending will deliver it.",
        signUpUrl,
        ownerEmail: grant.email,
        expiresAt,
      });
    }

    const body = (await response.json()) as { id?: string };
    return NextResponse.json({
      sent: true,
      providerId: body.id ?? null,
      ownerEmail: grant.email,
      alreadyRegistered: grant.claimed,
      signUpUrl,
      expiresAt,
    });
  } catch (caught) {
    console.error("Owner invite email error:", caught);
    return NextResponse.json({
      sent: false,
      reason: "send_failed",
      message:
        "The email service could not be reached. Their access is recorded — resending will deliver it.",
      signUpUrl,
      ownerEmail: grant.email,
      expiresAt,
    });
  }
}

/**
 * Where the invitation got to.
 *
 * Without this a superadmin cannot tell "the owner is in" from "the email
 * bounced three weeks ago", and a facility nobody can enter looks identical to
 * a healthy one.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const { id: facilityId } = await params;
  const supabase = await createServerClient();

  // membership_grants_read admits platform admins, so this is the caller's own
  // client rather than an admin one.
  const { data, error } = await supabase
    .from("facility_membership_grants")
    .select(
      "email, role, created_at, expires_at, claimed_at, claimed_profile_id",
    )
    .eq("facility_id", facilityId)
    .eq("role", "owner")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ state: "none" as const });
  }

  const expired =
    data.expires_at !== null &&
    !data.claimed_at &&
    new Date(data.expires_at).getTime() < Date.now();

  return NextResponse.json({
    state: data.claimed_at ? "accepted" : expired ? "expired" : "pending",
    email: data.email,
    sentAt: data.created_at,
    expiresAt: data.expires_at,
    acceptedAt: data.claimed_at,
  });
}

/**
 * Correct the address an invitation is aimed at.
 *
 * Withdrawing was only half an answer to a mistyped address: the staff row
 * still held the wrong one, so re-inviting sent to the same place and the only
 * exit was editing the database by hand. Which is what happened the afternoon
 * an owner's invitation went astray.
 *
 * `set_facility_owner_email` refuses once the invitation has been ACCEPTED —
 * at that point a Clerk identity holds a membership, and changing the address
 * would not move that access one inch. It would leave the real owner signed in
 * and the record naming somebody else: a correction that corrects nothing.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const parsed = AddressInput.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid email address." },
      { status: 422 },
    );
  }

  const { id: facilityId } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("set_facility_owner_email", {
    p_facility_id: facilityId,
    p_email: parsed.data.email,
  });

  if (error) {
    // 23505 is staff_facility_email_key — somebody at this facility already
    // holds that address, which is a sentence rather than a code.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Somebody at this facility already uses that address." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "42501" ? 403 : 400 },
    );
  }

  return NextResponse.json(data);
}

/** Withdraw an invitation sent to the wrong address. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const { id: facilityId } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("revoke_facility_owner_invite", {
    p_facility_id: facilityId,
  });

  if (error) {
    // 42501 here is one of two things and the function's own message says
    // which: not a platform admin, or the invitation was already accepted.
    // Accepted is not a permission problem, so the message is worth more than
    // the code.
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "42501" ? 403 : 400 },
    );
  }

  return NextResponse.json(data);
}
