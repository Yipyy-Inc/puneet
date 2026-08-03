import { redirect } from "next/navigation";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import { OnboardingChecklist } from "./_components/onboarding-checklist";
import { OnboardingHeader } from "./_components/onboarding-header";

// ============================================================================
// Where a new hire lands after setting their password.
//
// The Supabase invite link's `redirectTo` points here, so by the time this
// renders the person is SIGNED IN — that is the difference between this and
// /onboard/[token], which serves someone with no account at all. Both exist on
// purpose: the token link works before the password is set, this works after.
//
// A Server Component (CLAUDE.md: pages are server by default). The two
// interactive pieces are small client children in ./_components — the checklist
// needs state to expand a section, the header needs a sign-out handler.
// Everything else, including the query that decides what to show, runs here.
// ============================================================================

export const dynamic = "force-dynamic";

export default async function EmployeeOnboardingPage() {
  const viewer = await getViewer();

  // The portal gate above this (src/app/employee/layout.tsx) already refuses a
  // signed-out visitor. This is not a second gate — it is the narrowing that
  // lets the rest of the function assume an email.
  if (viewer.source !== "session" || !viewer.email) {
    redirect("/login?next=%2Femployee%2Fonboarding");
  }

  const supabase = await createServerClient();

  // Their own staff row. RLS admits it through private.own_staff_ids(), so this
  // needs no facility filter and cannot return somebody else's.
  const { data: staff } = await supabase
    .from("staff")
    .select("id, legacy_id, first_name, status, facility_id")
    .ilike("email", viewer.email)
    .maybeSingle();

  if (!staff) {
    // Signed in, but no staff record — a customer who followed a stale link, or
    // a record deleted since. Their own portal, not an error page.
    redirect("/customer/dashboard");
  }

  const [{ data: instance }, { data: facility }] = await Promise.all([
    supabase
      .from("onboarding_instances")
      .select(
        "id, submitted_at, reviewed_at, account_password_set_at, token_expires_at, onboarding_sections ( task_key, section_type, status, completed_at )",
      )
      .eq("staff_id", staff.id)
      .maybeSingle(),
    supabase
      .from("facilities")
      .select("name")
      .eq("id", staff.facility_id)
      .maybeSingle(),
  ]);

  // Already activated — the checklist is behind them. Sending them to their
  // real portal is better than showing a completed list they cannot act on.
  if (instance?.reviewed_at) {
    redirect("/employee");
  }

  const sections = (instance?.onboarding_sections ?? []).map((s) => ({
    taskKey: s.task_key,
    type: s.section_type,
    status: s.status,
    completedAt: s.completed_at,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <OnboardingHeader
        firstName={staff.first_name}
        facilityName={facility?.name ?? "your facility"}
        submitted={Boolean(instance?.submitted_at)}
      />
      <OnboardingChecklist
        sections={sections}
        hasInstance={Boolean(instance)}
        submitted={Boolean(instance?.submitted_at)}
      />
    </div>
  );
}
