import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The people who actually teach here.
//
// ── WHAT THE SCREENS OFFERED BEFORE ───────────────────────────────────────
//
// `trainers` in src/data/training.ts: four invented people with their own ids
// ("trainer-001") and their own @yipyy.com addresses. This facility employs
// two trainers, and neither of them was on that list. Somebody assigned to a
// class could not be paid for it, rostered, or messaged.
//
// ── THE LIST IS `staff`, THE PROFILE IS OPTIONAL ──────────────────────────
//
// Driven by the ROLE, not by the profile table. `grooming_stylists` takes the
// opposite line — a groomer with no grooming profile is not a stylist — because
// a `Stylist` promises a skill level and a daily capacity that a scheduler
// reasons about, and inventing those would be a fabricated groomer in an
// assignment decision.
//
// Nothing on a trainer profile is load-bearing like that: specialisations, a
// bio and a certification list are things a customer reads. So a trainer nobody
// has written a bio for is still a trainer, and still assignable
// (20260807000000).
//
// ── `additional_roles` COUNTS ─────────────────────────────────────────────
//
// A caretaker who also runs the puppy class has `trainer` in `additional_roles`
// and `caretaker` as their primary. Filtering on `primary_role` alone would
// have hidden them from the picker they belong in.
// ============================================================================

export const dynamic = "force-dynamic";

interface StaffRow {
  id: string;
  legacy_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  job_title: string | null;
  primary_role: string;
  additional_roles: string[] | null;
  status: string;
}

interface ProfileRow {
  staff_id: string;
  specializations: string[];
  certifications: string[];
  years_experience: number | null;
  bio: string;
  visible_online: boolean;
  calendar_color: string | null;
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data: staffRows, error } = await supabase
    .from("staff")
    .select(
      "id, legacy_id, first_name, last_name, email, phone, avatar_url, job_title, primary_role, additional_roles, status",
    )
    .order("first_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const trainers = ((staffRows ?? []) as unknown as StaffRow[]).filter(
    (s) =>
      s.primary_role === "trainer" ||
      (s.additional_roles ?? []).includes("trainer"),
  );

  const { data: profileRows } = await supabase
    .from("training_trainer_profiles")
    .select(
      "staff_id, specializations, certifications, years_experience, bio, visible_online, calendar_color",
    );

  const byStaff = new Map(
    ((profileRows ?? []) as unknown as ProfileRow[]).map((p) => [
      p.staff_id,
      p,
    ]),
  );

  return NextResponse.json(
    trainers.map((s) => {
      const profile = byStaff.get(s.id);
      return {
        // The staff legacy id, so screens keying on `fs-train-01` keep working
        // and anything assigning a trainer names somebody who can be paid.
        id: s.legacy_id ?? s.id,
        staffId: s.id,
        name: `${s.first_name} ${s.last_name}`.trim(),
        email: s.email ?? "",
        phone: s.phone ?? "",
        photoUrl: s.avatar_url ?? undefined,
        jobTitle: s.job_title ?? undefined,
        // `invited` and `inactive` come back too, with the status on them: the
        // caller decides whether somebody who has not accepted their invite may
        // be assigned to a class, and the alternative is a picker that silently
        // omits an employee nobody can find.
        status: s.status,
        specializations: profile?.specializations ?? [],
        certifications: profile?.certifications ?? [],
        yearsExperience: profile?.years_experience ?? null,
        bio: profile?.bio ?? "",
        visibleOnline: profile?.visible_online ?? false,
        calendarColor: profile?.calendar_color ?? null,
        // Nothing invents a rating or a class count. The fixture carried
        // `rating: 4.9` and `totalClasses: 342` for people who do not exist;
        // both are derivable once sessions and reviews are real, and neither is
        // guessed at here.
        hasProfile: profile !== undefined,
      };
    }),
  );
}
