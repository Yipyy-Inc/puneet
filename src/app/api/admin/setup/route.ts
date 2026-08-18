import { getWorkOS } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

import {
  hashPlatformInviteToken,
  toByteaLiteral,
} from "@/lib/auth/platform-invitation";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

// ============================================================================
// Accept a platform invitation — the step that used to be a lie.
//
// The old /setup/[token] page collected a password, threw it away, wrote a
// localStorage flag and said "Your admin account is ready." Nothing existed
// afterwards: no WorkOS identity, no profile, no platform membership. Somebody
// invited onto the Yipyy team could complete the flow, see the success screen,
// and then be unable to sign in — with no signal anywhere that they were not,
// in fact, set up.
//
// ── PUBLIC, AND THAT IS THE POINT ─────────────────────────────────────────
//
// This route has no session guard, because the person calling it does not have
// an account yet — that is what they are here to create. The token is the
// authorisation, and it is checked three ways:
//
//   1. it must hash to a row in platform_invitations
//   2. that row must be unaccepted and unexpired
//   3. the profile it is accepted onto must have the SAME EMAIL as the row
//
// (3) is the load-bearing one and it lives in SQL, in
// public.accept_platform_invitation, not here. Without it a leaked link would
// mean "make my own account a superadmin" rather than "open a form".
//
// ── ORDER MATTERS ─────────────────────────────────────────────────────────
//
//   validate token -> create WorkOS identity -> write profiles -> accept
//
// The profile is written HERE rather than waiting for the user.created webhook.
// The webhook is asynchronous, so a race would decide whether the invitation
// could be accepted at all, and losing it would leave a real identity with no
// membership and no way to get one. The write is an upsert on the WorkOS id, so
// the webhook landing afterwards is a no-op rather than a conflict.
//
// ── ALREADY HAVING AN ACCOUNT IS THE COMMON CASE ──────────────────────────
//
// A colleague being added to the platform team very often already has a Yipyy
// login — they are a customer of some facility, or they were a facility admin.
// One credential serves everything (ADR 0004), so this does NOT create a second
// identity for them: it finds the existing one, accepts onto it, and tells them
// to sign in with the password they already have.
// ============================================================================

interface SetupBody {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}

export async function POST(req: NextRequest) {
  if (!hasServiceRoleKey()) {
    return NextResponse.json(
      { error: "Account setup is not configured on this environment." },
      { status: 503 },
    );
  }

  let body: SetupBody;
  try {
    body = (await req.json()) as SetupBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const hash = toByteaLiteral(hashPlatformInviteToken(token));

  const { data: invitation, error: lookupError } = await supabase
    .from("platform_invitations")
    .select("id, email, full_name, role, expires_at, accepted_at")
    .eq("token_hash", hash)
    .maybeSingle();

  if (lookupError) {
    console.error("[admin/setup] invitation lookup failed:", lookupError);
    return NextResponse.json(
      { error: "Could not check that invitation." },
      { status: 500 },
    );
  }

  // One answer for missing, used and expired. A caller holding a bad token
  // learns that it is bad and nothing else.
  if (
    !invitation ||
    invitation.accepted_at ||
    new Date(invitation.expires_at).getTime() <= Date.now()
  ) {
    return NextResponse.json(
      { error: "That invitation link is no longer valid." },
      { status: 400 },
    );
  }

  const email = String(invitation.email);
  const workos = getWorkOS();

  // ── The identity ─────────────────────────────────────────────────────────
  let userId: string;
  let alreadyHadAccount = false;

  const existing = await workos.userManagement
    .listUsers({ email })
    .then((page) => page.data[0])
    .catch(() => undefined);

  if (existing) {
    userId = existing.id;
    alreadyHadAccount = true;
  } else {
    if (!body.password || body.password.length < 8) {
      return NextResponse.json(
        { error: "Choose a password of at least 8 characters." },
        { status: 400 },
      );
    }
    try {
      const created = await workos.userManagement.createUser({
        email,
        password: body.password,
        firstName: body.firstName?.trim() || undefined,
        lastName: body.lastName?.trim() || undefined,
      });
      userId = created.id;
    } catch (error) {
      console.error("[admin/setup] createUser failed:", error);
      return NextResponse.json(
        { error: "Could not create that account." },
        { status: 400 },
      );
    }
  }

  // ── The profile RLS reads ────────────────────────────────────────────────
  const fullName =
    [body.firstName?.trim(), body.lastName?.trim()].filter(Boolean).join(" ") ||
    invitation.full_name ||
    email;

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId, email, full_name: fullName }, { onConflict: "id" });

  if (profileError) {
    console.error("[admin/setup] profile upsert failed:", profileError);
    return NextResponse.json(
      { error: "Your account was created but could not be linked." },
      { status: 500 },
    );
  }

  // ── The membership ───────────────────────────────────────────────────────
  //
  // For a brand-new account the profiles insert above has ALREADY claimed this
  // through private.claim_membership_grants, and this call is then a no-op that
  // reports the same row. For an existing account nothing fired, and this is
  // the whole point. Calling it either way means one code path rather than two
  // that can disagree about which case they are in.
  const { error: acceptError } = await supabase.rpc(
    "accept_platform_invitation",
    { p_token_hash: hash, p_profile_id: userId },
  );

  if (acceptError && !acceptError.message.includes("already been used")) {
    console.error("[admin/setup] accept failed:", acceptError);
    return NextResponse.json({ error: acceptError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, email, alreadyHadAccount });
}
