import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { buildStaffInviteEmail } from "@/lib/staff-invite-email";
import {
  mintOnboardingToken,
  toByteaLiteral,
} from "@/lib/api/onboarding-token";
import { ROLE_META, type FacilityStaffRole } from "@/types/facility-staff";

// ============================================================================
// Invite a staff member: a membership grant, an onboarding link, one email.
//
// Mirrors /api/admin/invite — env-gated on RESEND_API_KEY, and when the key is
// absent it returns `sent:false, reason:"not_configured"` plus the link rather
// than pretending.
//
// ── WHY THIS NO LONGER CREATES AN ACCOUNT ──────────────────────────────────
//
// It used to call `admin.auth.admin.generateLink({type:"invite"})`, which
// created a GoTrue user, and hand that uuid to link_staff_invite. Clerk owns
// identity now (20260805223000): profiles.id holds a Clerk sub, and a GoTrue
// uuid matches no session. Measured on the live project before the fix — the
// invite reported success and granted a real membership to profile
// 11111111-2222-3333-4444-555555555555, which nobody can ever sign in as, and
// which 20260805233000's `id !~ '^user_'` rule marks for deletion.
//
// So there is no account to create here. Clerk mints the subject when the hire
// signs up — with Google or with an email and password, whichever they pick —
// and the sync webhook writes the profile.
//
// ── THE GRANT COMES FIRST, THE IDENTITY ARRIVES LATER ──────────────────────
//
// public.record_membership_grant records the admin's decision against the
// address on the staff row, and a trigger on `profiles` turns it into a real
// membership the moment a Clerk profile appears carrying that address
// (20260807120000). If they have already signed up, the RPC claims it inline
// and comes back `claimed: true`.
//
// The address is NOT a parameter — the RPC reads it off the staff row, the
// same way it reads the facility and the role. An email argument would let
// somebody with manage_staff grant their own facility's owner role to an
// address they control.
//
// ── WHAT IS ATOMIC ─────────────────────────────────────────────────────────
//
// All of it. Grant + staff.status + any inline claim happen inside one
// Postgres function, so the half-linked states the old flow had to compensate
// for — an auth user with no membership, a membership with no account — are
// not reachable. The compensating delete is gone with the thing it compensated.
//
// ORDERED so the email cannot lie: `status = 'invited'` is set by the RPC, and
// a rejected send puts it back. onboarding_by_token requires `invited`, so an
// undelivered link does not work either — the two facts agree.
// ============================================================================

export const dynamic = "force-dynamic";

interface Body {
  /** Optional: the template to onboard against. Falls back to role resolution. */
  templateId?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id: staffLegacyId } = await params;
  const body = (await request.json().catch(() => ({}))) as Body;
  const supabase = await createServerClient();

  // ── Reads, through the caller's own client so RLS still applies ───────────
  const { data: staff } = await supabase
    .from("staff")
    .select(
      "id, facility_id, legacy_id, first_name, last_name, email, primary_role, details",
    )
    .eq("legacy_id", staffLegacyId)
    .maybeSingle();

  if (!staff) {
    return NextResponse.json(
      { error: "Staff member not found." },
      { status: 404 },
    );
  }
  if (!staff.email?.trim()) {
    return NextResponse.json(
      { error: "That staff member has no email address to invite." },
      { status: 422 },
    );
  }

  const { data: facility } = await supabase
    .from("facilities")
    .select("name")
    .eq("id", staff.facility_id)
    .maybeSingle();

  // The template supplies the welcome, the expiry and the deadline. NOT
  // constants: a facility that set a 14-day window means 14 days, and an email
  // that says 7 because a constant said so is a lie the facility did not write.
  const { data: template } = body.templateId
    ? await supabase
        .from("onboarding_templates")
        .select(
          "id, welcome_message, invite_expiry_days, completion_deadline_days",
        )
        .eq("legacy_id", body.templateId)
        .maybeSingle()
    : await supabase
        .from("onboarding_templates")
        .select(
          "id, welcome_message, invite_expiry_days, completion_deadline_days",
        )
        .eq("status", "active")
        .contains("applies_to_roles", [staff.primary_role])
        .maybeSingle();

  const expiryDays = template?.invite_expiry_days ?? 7;

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(request.url).origin;

  const grantExpiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // ── 1. The grant: membership + staff.status, atomically ──────────────────
  //
  // Through the CALLER's client, not the admin one: record_membership_grant
  // checks manage_staff against the session, and calling it as service_role
  // would skip the only permission check in this route.
  //
  // The grant EXPIRES with the invitation. A hire who never signs up does not
  // leave a live route into the facility sitting in the table forever.
  const { data: grant, error: grantError } = await supabase.rpc(
    "record_membership_grant",
    {
      p_staff_legacy_id: staff.legacy_id!,
      p_expires_at: grantExpiresAt,
    },
  );

  if (grantError) {
    return NextResponse.json(
      {
        sent: false,
        reason: grantError.code === "42501" ? "denied" : "error",
        message:
          grantError.code === "42501"
            ? "You may not invite staff at this facility."
            : "Could not grant that person access to the facility. Nothing was sent.",
      },
      { status: grantError.code === "42501" ? 403 : 500 },
    );
  }

  // Clerk's own sign-up, not a Supabase action link. Whether they use Google or
  // an email and password is their choice at that screen, and neither needs
  // anything from us: the grant is already recorded against their address and
  // is claimed by the profiles trigger the moment the sync webhook lands.
  const alreadyRegistered = (grant as { claimed?: boolean } | null)?.claimed;
  const actionUrl = alreadyRegistered
    ? `${origin}/employee/onboarding`
    : `${origin}/sign-up`;

  // ── 2. The onboarding instance and its token ─────────────────────────────
  //
  // Minted AFTER the grant, so a failure above never leaves a live onboarding
  // link pointing at a hire with no access. Re-inviting replaces the hash,
  // which invalidates the previous link — that is what resending means, and it
  // is why the token is stored as a hash rather than kept.
  //
  // Same expiry as the grant, deliberately: an onboarding link that outlived
  // the membership behind it would open a checklist the hire cannot complete.
  const { token, hash } = mintOnboardingToken();
  const expiresAt = grantExpiresAt;

  await supabase.from("onboarding_instances").upsert(
    {
      staff_id: staff.id,
      facility_id: staff.facility_id,
      template_id: template?.id ?? null,
      token_hash: toByteaLiteral(hash),
      token_expires_at: expiresAt,
      expiry_notified_at: null,
    } as never,
    { onConflict: "staff_id" },
  );

  const onboardingUrl = `${origin}/onboard/${token}`;

  // ── 3. The email ─────────────────────────────────────────────────────────
  const hireDetails = (staff.details ?? {}) as {
    employment?: { hireDate?: string };
  };
  const email = buildStaffInviteEmail({
    origin,
    firstName: staff.first_name,
    facilityName: facility?.name ?? "your facility",
    roleLabel:
      ROLE_META[staff.primary_role as FacilityStaffRole]?.label ??
      staff.primary_role,
    startDate: hireDetails.employment?.hireDate
      ? new Date(
          `${hireDetails.employment.hireDate}T00:00:00`,
        ).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "—",
    welcomeMessage: template?.welcome_message ?? undefined,
    expiresInDays: expiryDays,
    // The SIGN-UP link, not the onboarding one: creating the account is the
    // first step, and their access is already waiting for the address they use.
    // A hire who has signed up before skips straight to the checklist. The
    // onboarding URL is returned separately for the manager to share if email
    // is unavailable.
    actionUrl,
  });

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Not configured: the GRANT is real, and the manager can deliver the link
    // by hand — so this counts as issued, and the status the RPC set stands.
    // Mirrors /api/admin/invite, which does the same.
    return NextResponse.json({
      sent: false,
      reason: "not_configured",
      message:
        "Email service not configured (set RESEND_API_KEY). Share the setup link below instead.",
      setupUrl: actionUrl,
      onboardingUrl,
      expiresAt,
      alreadyRegistered,
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
        to: staff.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });

    if (!res.ok) {
      console.error("Staff invite send failed:", res.status, await res.text());
      return NextResponse.json(await rollbackInviteStatus(supabase, staff.id));
    }

    const data = (await res.json()) as { id?: string };
    return NextResponse.json({
      sent: true,
      providerId: data.id ?? null,
      setupUrl: actionUrl,
      onboardingUrl,
      expiresAt,
      alreadyRegistered,
    });
  } catch (error) {
    console.error("Staff invite email error:", error);
    return NextResponse.json(await rollbackInviteStatus(supabase, staff.id));
  }
}

/**
 * FAILURE MODE A, handled rather than swallowed.
 *
 * The provider rejected the send, so the row must not claim an invitation the
 * hire never received. The GRANT stays — it is correct and re-usable, and
 * withdrawing somebody's access because an SMTP call 500'd would be destroying
 * good work to tidy up a transient error.
 *
 * What goes back is `status = 'inactive'`: not `invited`, because nothing was
 * sent. The onboarding RPC requires `invited`, so the token minted above is
 * inert until a successful resend — the database and the email agree.
 */
async function rollbackInviteStatus(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  staffRowId: string,
) {
  // rls-write-ok: compensation inside a failure path. The caller is already
  // being told the invitation was not sent; a refusal here changes nothing
  // they see, and the account stays exactly as it was.
  await supabase
    .from("staff")
    .update({ status: "inactive" } as never)
    .eq("id", staffRowId);

  return {
    sent: false,
    reason: "send_failed" as const,
    message:
      "The email service rejected the request. The invitation was not sent — the account exists, so resending will deliver it.",
  };
}
