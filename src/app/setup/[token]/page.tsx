import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ShieldAlert } from "lucide-react";

import {
  PLATFORM_ROLE_LABELS,
  hashPlatformInviteToken,
  toByteaLiteral,
  type PlatformRole,
} from "@/lib/auth/platform-invitation";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

import { SetupForm } from "./_components/setup-form";

export const metadata: Metadata = {
  title: "Set up your account — Yipyy",
};

export const dynamic = "force-dynamic";

// ============================================================================
// The only door onto the Yipyy platform team.
//
// `www.yipyy.com/sign-up` was closed on 2026-08-18 so that accounts are created
// at a facility's address, which makes this page load-bearing rather than a
// convenience — see docs/product/onboarding-and-roles.md.
//
// It used to DECODE the token and believe it: the name, the email and the role
// all came out of a base64url blob supplied by whoever opened the link. Now the
// token is opaque, and everything on screen is read from the
// `platform_invitations` row it hashes to.
//
// Read with the service-role client on purpose. The visitor has no session —
// that is what they are here to create — so there is no JWT for RLS to work
// from, and `platform_invitations_read` deliberately admits only the platform
// team. The token is what authorises this read, and it authorises exactly one
// row.
// ============================================================================

interface Invitation {
  email: string;
  full_name: string | null;
  role: PlatformRole;
  expires_at: string;
  accepted_at: string | null;
}

async function readInvitation(token: string): Promise<Invitation | null> {
  if (!token || !hasServiceRoleKey()) return null;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("platform_invitations")
    .select("email, full_name, role, expires_at, accepted_at")
    .eq("token_hash", toByteaLiteral(hashPlatformInviteToken(token)))
    .maybeSingle();

  const invitation = data as Invitation | null;
  if (!invitation) return null;
  // Used and expired both render the same screen as "never existed". Which of
  // the three it was is not something a holder of a bad link should learn.
  if (invitation.accepted_at) return null;
  if (new Date(invitation.expires_at).getTime() <= Date.now()) return null;
  return invitation;
}

export default async function AdminSetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await readInvitation(token);

  return (
    <div className="from-muted/40 flex min-h-screen items-center justify-center bg-linear-to-br to-transparent p-4">
      <div className="bg-card w-full max-w-md overflow-hidden rounded-2xl border shadow-sm">
        <div className="bg-linear-to-br from-violet-600 to-fuchsia-500 px-7 py-6 text-white">
          <p className="text-lg font-bold tracking-tight">Yipyy</p>
          <p className="text-xs text-violet-100">Admin Console</p>
        </div>

        {invitation ? (
          <SetupForm
            token={token}
            name={invitation.full_name ?? ""}
            email={invitation.email}
            roleLabel={PLATFORM_ROLE_LABELS[invitation.role] ?? invitation.role}
            expiresAt={new Date(invitation.expires_at).getTime()}
          />
        ) : (
          <div className="p-7 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/15">
              <ShieldAlert className="size-6" />
            </div>
            <h1 className="mt-4 text-lg font-semibold">
              This invitation link is invalid or has expired
            </h1>
            <p className="text-muted-foreground mt-1.5 flex items-center justify-center gap-1.5 text-sm">
              <Clock className="size-3.5" />
              Setup links are valid for 48 hours and may be used once.
            </p>
            <p className="text-muted-foreground mt-3 text-sm">
              Ask a superadmin to send you a new invitation from the Admin Users
              page.
            </p>
            <Link
              href="/sign-in"
              className="text-primary mt-5 inline-block text-sm font-medium hover:underline"
            >
              Go to sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
