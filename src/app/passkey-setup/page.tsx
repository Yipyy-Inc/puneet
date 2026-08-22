import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/AuthCard";
import { PasskeySetupPrompt } from "@/components/auth/PasskeySetupPrompt";
import { getViewer } from "@/lib/auth/viewer";
import { createWorkosServerClient } from "@/lib/supabase/workos-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.passkey");
  return { title: `${t("setupTitle")} — Yipyy` };
}

// ============================================================================
// The one step between verifying an email and using the product.
//
// Reached from `verifyEmailCode` — which every new account passes through,
// because both WorkOS environments set `isEmailVerificationRequired: true`. So
// this is where a person is offered a passkey, at the only moment they have
// just proved who they are and have the device in their hand.
//
// ── IT SKIPS ITSELF WHENEVER IT HAS NOTHING TO ASK ────────────────────────
//
// Somebody who already has a passkey is sent straight on. That matters because
// this page also sits on the path of an EXISTING user who happened to be
// unverified — they should see it once, not on every sign-in. A browser without
// WebAuthn is bounced by the client component for the same reason.
//
// ── NO `emailVerified` GATE HERE, DELIBERATELY ────────────────────────────
//
// It would be redundant in the only direction that matters: the enrolment
// endpoint this page calls checks it, and that is the check that counts.
// Duplicating it here would put a second copy of a security rule somewhere it
// could later disagree with the first. See requireVerifiedUser().
// ============================================================================

export default async function PasskeySetupPage() {
  const viewer = await getViewer();
  if (viewer.source !== "session") redirect("/sign-in");

  // RLS scopes this to the caller, so there is no owner filter to get wrong.
  const { data: existing } = await createWorkosServerClient()
    .from("user_passkeys")
    .select("credential_id")
    .limit(1);

  if (existing && existing.length > 0) redirect("/");

  const t = await getTranslations("auth.passkey");

  return (
    <AuthCard title={t("setupTitle")} description={t("setupDescription")}>
      <PasskeySetupPrompt />
    </AuthCard>
  );
}
