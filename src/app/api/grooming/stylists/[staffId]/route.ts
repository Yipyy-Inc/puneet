import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// Editing a groomer's grooming profile.
//
// ── ADDRESSED BY STAFF ID, AND IT UPSERTS ─────────────────────────────────
//
// Not by stylist id, because the screen that writes here shows groomers who
// have NO profile yet — three at this facility. They have a staff id and
// nothing else, so a route keyed on `stylist-00N` could not reach them, and
// "give this groomer a profile" is the same action as "edit it" from the
// editor's point of view: one form, one Save.
//
// So this is a PUT that creates the row if it is missing. The alternative was
// a POST for new and a PATCH for existing, which pushes a distinction into
// every caller to express something the caller does not know or care about.
//
// ── PARTIAL: ABSENT MEANS UNCHANGED ───────────────────────────────────────
//
// The visibility toggle sends one field. The editor sends a dozen. Both are
// the same request shape, and anything not named is left alone — which is why
// the toggle cannot accidentally reset somebody's skill tier to the default.
//
// On CREATE the same rule leaves the column defaults in place, and those
// defaults are deliberately modest (standard, 6 a day, handles nothing
// special): a groomer nobody has assessed should not arrive in the assignment
// picker claiming to take aggressive dogs.
//
// ── WRITE IS `manage_staff`, NOT `view_services` ──────────────────────────
//
// Enforced by RLS, not here. Changing somebody's skill tier, capacity or
// certifications is a decision about their job. The read side is facility
// membership (20260806540000) — a groomer can see the roster and cannot edit
// it, which is S6 in the SQL suite.
//
// ── AN RLS-DENIED *UPDATE* DOES NOT RAISE. IT MATCHES NOTHING ─────────────
//
// This is the trap, and it is the second time this schema has hit its shape.
// An INSERT that fails `with check` raises 42501 and `writeFailure` turns it
// into a 403. An UPDATE that fails `using` does not: the row simply is not
// visible to the statement, so it affects zero rows and reports success.
//
// Measured, before this guard existed: a GROOMER sent a skill-tier change and
// got back **204**. Nothing was written -- RLS held -- but the API told them it
// had been, and the screen would have shown "Grooming profile updated" over a
// profile that never changed. The data was safe and the answer was a lie.
//
// So every mutation below asks for the rows it touched (`.select`) and treats
// an empty result as a refusal. A DELETE has the same property, which is why
// the availability path counts first.
// ============================================================================

export const dynamic = "force-dynamic";

interface ProfileInput {
  specializations?: string[];
  certifications?: string[];
  yearsExperience?: number;
  bio?: string;
  onLeave?: boolean;
  visibleOnline?: boolean;
  calendarColor?: string | null;
  qualifiedPackageIds?: string[];
  capacity?: {
    maxDailyAppointments?: number;
    maxWeeklyAppointments?: number | null;
    maxConcurrentAppointments?: number;
    preferredPetSizes?: string[];
    skillLevel?: string;
    canHandleMatted?: boolean;
    canHandleAnxious?: boolean;
    canHandleAggressive?: boolean;
  };
  notificationPrefs?: Record<string, unknown> | null;
}

const SKILL_LEVELS = new Set(["basic", "standard", "premium", "platinum"]);

/** Names the field so the editor can point at it. The database enforces the
 *  same rules; this turns a constraint violation into a sentence. */
function validate(input: ProfileInput): string | null {
  if (
    input.yearsExperience != null &&
    (!Number.isFinite(input.yearsExperience) ||
      input.yearsExperience < 0 ||
      input.yearsExperience > 70)
  ) {
    return "Years of experience must be between 0 and 70.";
  }
  const capacity = input.capacity;
  if (capacity) {
    if (capacity.skillLevel != null && !SKILL_LEVELS.has(capacity.skillLevel)) {
      return "That is not a skill tier.";
    }
    for (const [label, value] of [
      ["daily", capacity.maxDailyAppointments],
      ["concurrent", capacity.maxConcurrentAppointments],
    ] as const) {
      if (value != null && (!Number.isFinite(value) || value <= 0)) {
        return `The ${label} appointment limit must be a positive number.`;
      }
    }
    const weekly = capacity.maxWeeklyAppointments;
    const daily = capacity.maxDailyAppointments;
    if (weekly != null) {
      if (!Number.isFinite(weekly) || weekly <= 0) {
        return "The weekly appointment limit must be a positive number.";
      }
      if (daily != null && weekly < daily) {
        return "A weekly limit below the daily one is a typo, not a policy.";
      }
    }
  }
  if (
    input.calendarColor != null &&
    input.calendarColor !== "" &&
    !/^#[0-9a-fA-F]{6}$/.test(input.calendarColor)
  ) {
    return "A calendar colour must be a hex value like #ec4899.";
  }
  return null;
}

function toRow(input: ProfileInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const put = (column: string, value: unknown) => {
    if (value !== undefined) patch[column] = value;
  };

  put("specializations", input.specializations);
  put("certifications", input.certifications);
  put("years_experience", input.yearsExperience);
  put("bio", input.bio?.trim());
  put("on_leave", input.onLeave);
  put("visible_online", input.visibleOnline);
  put("calendar_color", input.calendarColor || null);
  put("qualified_service_ids", input.qualifiedPackageIds);
  put("notification_prefs", input.notificationPrefs);

  const capacity = input.capacity;
  if (capacity) {
    put("max_daily_appointments", capacity.maxDailyAppointments);
    put("max_weekly_appointments", capacity.maxWeeklyAppointments);
    put("max_concurrent_appointments", capacity.maxConcurrentAppointments);
    put("preferred_pet_sizes", capacity.preferredPetSizes);
    put("skill_level", capacity.skillLevel);
    put("can_handle_matted", capacity.canHandleMatted);
    put("can_handle_anxious", capacity.canHandleAnxious);
    put("can_handle_aggressive", capacity.canHandleAggressive);
  }
  return patch;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { staffId: staffRef } = await params;
  const input = (await request.json().catch(() => null)) as ProfileInput | null;
  if (!input) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  const problem = validate(input);
  if (problem) return NextResponse.json({ error: problem }, { status: 422 });

  const supabase = await createServerClient();

  // The app carries `fs-*` staff ids; the database keys on uuid.
  const { data: staff } = await supabase
    .from("staff")
    .select("id, facility_id")
    .eq("legacy_id", staffRef)
    .maybeSingle();
  if (!staff) {
    return NextResponse.json(
      { error: "No such staff member." },
      { status: 404 },
    );
  }

  const patch = toRow(input);
  const { data: existing } = await supabase
    .from("grooming_stylist_profiles")
    .select("id")
    .eq("staff_id", staff.id)
    .maybeSingle();

  if (existing) {
    if (Object.keys(patch).length === 0) {
      return new NextResponse(null, { status: 204 });
    }
    const { data: touched, error } = await supabase
      .from("grooming_stylist_profiles")
      .update(patch as never)
      .eq("id", existing.id)
      .select("id");
    if (error) {
      return writeFailure(error, {
        denied: "Not allowed to edit grooming profiles at this facility.",
        duplicate: "That groomer already has a profile.",
      });
    }
    // Zero rows with no error means the UPDATE policy refused. See the header.
    if (!touched || touched.length === 0) {
      return NextResponse.json(
        { error: "Not allowed to edit grooming profiles at this facility." },
        { status: 403 },
      );
    }
    return new NextResponse(null, { status: 204 });
  }

  // Creating one. `facility_id` comes from the STAFF ROW, not the request and
  // not the session's facility — a profile belongs to the facility that
  // employs the person, and taking it from anywhere else is how a groomer ends
  // up on another salon's board.
  const { error } = await supabase.from("grooming_stylist_profiles").insert({
    ...patch,
    staff_id: staff.id,
    facility_id: staff.facility_id,
  } as never);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to create grooming profiles at this facility.",
      duplicate: "That groomer already has a profile.",
    });
  }

  return new NextResponse(null, { status: 201 });
}

// ── Working hours ───────────────────────────────────────────────────────────
//
// The grid is seven days; the table stores only the days somebody works.
// ABSENCE MEANS NOT WORKING, which is how the existing rows read and how
// `scheduleSummaries` already interprets them (`filter(a => a.isAvailable)`).
// Storing seven rows to say "no" four times would make "never set up" and
// "explicitly off" indistinguishable.
//
// Replaced whole, as delete-then-insert. Not one transaction, and the same
// judgement as the package bundle: a half-applied week is visible on the
// screen that saved it, where a half-applied payment is money.

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ staffId: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { staffId: staffRef } = await params;
  const input = (await request.json().catch(() => null)) as {
    availability?: {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }[];
  } | null;

  if (!input?.availability) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }

  const working = input.availability.filter((slot) => slot.isAvailable);
  for (const slot of working) {
    if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
      return NextResponse.json(
        { error: "That is not a day." },
        { status: 422 },
      );
    }
    if (slot.endTime <= slot.startTime) {
      return NextResponse.json(
        { error: "A shift cannot end before it starts." },
        { status: 422 },
      );
    }
  }

  const supabase = await createServerClient();
  const { data: staff } = await supabase
    .from("staff")
    .select("id, facility_id")
    .eq("legacy_id", staffRef)
    .maybeSingle();
  if (!staff) {
    return NextResponse.json(
      { error: "No such staff member." },
      { status: 404 },
    );
  }

  // Counted first, because a DELETE the policy refuses removes zero rows and
  // reports success -- the same silence as the UPDATE above. Comparing against
  // what was there is the only way to tell "refused" from "nothing to remove".
  const { count: existingHours } = await supabase
    .from("grooming_stylist_availability")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", staff.id);

  const { data: cleared, error: clearError } = await supabase
    .from("grooming_stylist_availability")
    .delete()
    .eq("staff_id", staff.id)
    .select("id");
  if (clearError) {
    return writeFailure(clearError, {
      denied: "Not allowed to set working hours at this facility.",
      duplicate: "",
    });
  }
  if ((existingHours ?? 0) > 0 && (cleared?.length ?? 0) === 0) {
    return NextResponse.json(
      { error: "Not allowed to set working hours at this facility." },
      { status: 403 },
    );
  }

  if (working.length > 0) {
    const { error } = await supabase
      .from("grooming_stylist_availability")
      .insert(
        working.map((slot) => ({
          facility_id: staff.facility_id,
          staff_id: staff.id,
          day_of_week: slot.dayOfWeek,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_available: true,
        })) as never,
      );
    if (error) {
      return writeFailure(error, {
        denied: "Not allowed to set working hours at this facility.",
        duplicate: "That week lists the same slot twice.",
      });
    }
  }

  return new NextResponse(null, { status: 204 });
}
