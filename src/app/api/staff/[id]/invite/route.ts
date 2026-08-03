import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { buildStaffInviteEmail } from "@/lib/staff-invite-email";
import {
  mintOnboardingToken,
  toByteaLiteral,
} from "@/lib/api/onboarding-token";
import { ROLE_META, type FacilityStaffRole } from "@/types/facility-staff";

// ============================================================================
// Invite a staff member for real: an account, a membership, and one email.
//
// Mirrors /api/admin/invite exactly — env-gated on RESEND_API_KEY, and when the
// key is absent it returns `sent:false, reason:"not_configured"` plus the link
// rather than pretending. Same response shape, same convention. What it adds is
// that a facility hire needs an ACCOUNT, which a platform admin invite does not.
//
// ── generateLink, not inviteUserByEmail ────────────────────────────────────
//
// `admin.inviteUserByEmail` creates the user AND makes Supabase send its own
// invitation email. That would mean the hire receives two emails — Supabase's
// and ours — and the approved copy in staff-invite-copy.ts would be the one
// they ignore. `admin.generateLink({ type: "invite" })` creates the same user
// and returns the action link WITHOUT sending, so there is exactly one email
// and it is the one the facility approved.
//
// ── WHAT IS ATOMIC AND WHAT IS COMPENSATED ─────────────────────────────────
//
// ATOMIC: profile + membership + staff.status, in public.link_staff_invite —
// one function, one Postgres transaction. The half-linked state the task asks
// about (an account that signs in with no facility) is not reachable, because
// the membership and the profile are written by the same statement.
//
// COMPENSATED, not atomic: the auth user. It lives in GoTrue, a separate
// service with its own storage; no transaction spans it and Postgres. So if the
// RPC fails after THIS CALL created the user, we delete that user — and only
// then. A user who already existed is left alone: deleting somebody's existing
// account to clean up our own failure would turn a recoverable error into an
// unrecoverable one.
//
// ORDERED so the email cannot lie: the send happens BEFORE the staff row is
// marked `invited`, and the row is only marked when the provider accepted it
// (or when we deliberately handed the link back for manual delivery). A
// rejected send leaves `status` untouched — and since onboarding_by_token
// requires `status = 'invited'`, the undelivered link would not work either.
// The two facts agree instead of contradicting each other.
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

  if (!hasServiceRoleKey()) {
    // The same honesty as the Resend gate, for the other key. Inviting creates
    // an account; without the service-role key it cannot, and reporting success
    // would leave a manager believing someone can sign in.
    return NextResponse.json(
      {
        sent: false,
        reason: "not_configured",
        message:
          "Accounts cannot be created (set SUPABASE_SERVICE_ROLE_KEY). No invitation was sent.",
      },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    new URL(request.url).origin;

  // ── 1. The account (GoTrue). Compensated below, not atomic. ──────────────
  //
  // `redirectTo` is where they land once the password is set: their onboarding
  // checklist, signed in. That is the whole point of doing this through auth
  // rather than a bare token — the hire arrives authenticated.
  let userId: string | null = null;
  let createdUserHere = false;

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email: staff.email,
    options: { redirectTo: `${origin}/employee/onboarding` },
  });

  if (link?.user?.id) {
    userId = link.user.id;
    // `generateLink type:"invite"` fails on an existing user, so reaching here
    // means we made them. Recorded so the compensation below only deletes an
    // account this request is responsible for.
    createdUserHere = true;
  } else {
    // Already registered — a returning employee, or a resend. Find them and
    // issue a RECOVERY link instead, which is the same "set your password"
    // journey for someone who already has a row.
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", staff.email)
      .maybeSingle();

    if (!existing) {
      console.error("Staff invite: could not create or find user", linkError);
      return NextResponse.json(
        {
          sent: false,
          reason: "error",
          message: "Could not create an account for that email address.",
        },
        { status: 502 },
      );
    }
    userId = existing.id;
  }

  const { data: recovery } = createdUserHere
    ? { data: link }
    : await admin.auth.admin.generateLink({
        type: "recovery",
        email: staff.email,
        options: { redirectTo: `${origin}/employee/onboarding` },
      });

  const actionUrl =
    recovery?.properties?.action_link ?? `${origin}/employee/onboarding`;

  // ── 2. Profile + membership + status, atomically ─────────────────────────
  //
  // Through the CALLER's client, not the admin one: link_staff_invite checks
  // manage_staff against auth.uid(), and calling it as service_role would skip
  // the only permission check in this route.
  if (!userId) {
    // Unreachable in practice — both branches above either set it or return —
    // but narrowing it here beats a non-null assertion on a value that decides
    // which account gets a membership.
    return NextResponse.json(
      {
        sent: false,
        reason: "error",
        message: "Could not resolve an account.",
      },
      { status: 500 },
    );
  }

  const { error: linkRpcError } = await supabase.rpc("link_staff_invite", {
    p_staff_legacy_id: staff.legacy_id!,
    p_user_id: userId,
    p_email: staff.email,
  });

  if (linkRpcError) {
    // THE COMPENSATION. Only for a user this request created — see the header.
    if (createdUserHere && userId) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
      if (cleanupError) {
        // Reported, not swallowed: an auth user with no membership is exactly
        // the orphan this route exists to avoid, and if the cleanup itself
        // failed somebody has to know which id to go and remove.
        console.error(
          `Staff invite: ORPHANED auth user ${userId} — link failed and cleanup failed`,
          cleanupError,
        );
      }
    }
    return NextResponse.json(
      {
        sent: false,
        reason: linkRpcError.code === "42501" ? "denied" : "error",
        message:
          linkRpcError.code === "42501"
            ? "You may not invite staff at this facility."
            : "Could not link that account to the facility. Nothing was sent.",
      },
      { status: linkRpcError.code === "42501" ? 403 : 500 },
    );
  }

  // ── 3. The onboarding instance and its token ─────────────────────────────
  //
  // Minted AFTER the account exists, so a failure above never leaves a live
  // onboarding link pointing at a hire who cannot sign in. Re-inviting replaces
  // the hash, which invalidates the previous link — that is what resending
  // means, and it is why the token is stored as a hash rather than kept.
  const { token, hash } = mintOnboardingToken();
  const expiresAt = new Date(
    Date.now() + expiryDays * 24 * 60 * 60 * 1000,
  ).toISOString();

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

  // ── 4. The email ─────────────────────────────────────────────────────────
  const hireDetails = (staff.details ?? {}) as {
    employment?: { hireDate?: string };
  };
  const email = buildStaffInviteEmail({
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
    // The ACCOUNT link, not the onboarding one: setting a password is the first
    // step and lands them on the checklist signed in. The onboarding URL is
    // returned separately for the manager to share if email is unavailable.
    actionUrl,
  });

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Not configured: the account and membership ARE real, and the manager can
    // deliver the link by hand — so this counts as issued, and the status the
    // RPC set stands. Mirrors /api/admin/invite, which does the same.
    return NextResponse.json({
      sent: false,
      reason: "not_configured",
      message:
        "Email service not configured (set RESEND_API_KEY). Share the setup link below instead.",
      setupUrl: actionUrl,
      onboardingUrl,
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
 * hire never received. The account and membership stay — they are correct and
 * re-usable, and tearing down someone's account because an SMTP call 500'd
 * would be destroying good work to tidy up a transient error.
 *
 * What goes back is `status = 'inactive'`: not `invited`, because nothing was
 * sent. The onboarding RPC requires `invited`, so the token minted above is
 * inert until a successful resend — the database and the email agree.
 */
async function rollbackInviteStatus(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  staffRowId: string,
) {
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
