import type {
  Stylist,
  StylistAvailability,
  StylistSkillLevel,
  GroomerNotificationPrefs,
} from "@/types/grooming";
import type { PetSize } from "@/types/base";

// ============================================================================
// staff ⨝ grooming_stylist_profiles → Stylist.
//
// ── THE PERSON COMES FROM `staff`, THE GROOMER FROM THE PROFILE ───────────
//
// `name`, `email`, `phone`, `photoUrl` and `status` are staff columns. The
// profile contributes only what is true of a groomer as a groomer. That split
// is the whole point of 20260806500000, and it is why the mock's David Kim
// could say "on-leave" while the staff roster said "inactive".
//
// ── STATUS IS COMPUTED, NOT READ ──────────────────────────────────────────
//
// Employment wins. A profile cannot claim someone is working when the staff
// record says they are not; the only thing it can add is `on-leave`, which
// `staff.status` has no word for.
//
// ── `rating` IS ALWAYS 0, AND THAT IS THE HONEST ANSWER ───────────────────
//
// Nothing in this database rates a groomer — no reviews table, no report-card
// score. The fixture's 4.9 was typed, not measured. The stylists page already
// renders "—" for a groomer with no rating and averages only the rated ones, so
// this reads as "no ratings yet" rather than as a wrong number.
//
// ── `hireDate` IS NOT A GROOMING FACT ─────────────────────────────────────
//
// It belongs to employment, which lives on the staff record and is not exposed
// through this route. The stylists page already falls back to
// `staff.employment.hireDate` when a profile has none — that fallback is now
// the only path.
// ============================================================================

export interface StaffRow {
  id: string;
  legacy_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: string;
}

export interface StylistProfileRow {
  id: string;
  legacy_id: string | null;
  staff_id: string;
  specializations: string[] | null;
  certifications: string[] | null;
  years_experience: number;
  bio: string;
  on_leave: boolean;
  visible_online: boolean;
  calendar_color: string | null;
  qualified_service_ids: string[] | null;
  max_daily_appointments: number;
  max_weekly_appointments: number | null;
  max_concurrent_appointments: number;
  preferred_pet_sizes: string[] | null;
  skill_level: string;
  can_handle_matted: boolean;
  can_handle_anxious: boolean;
  can_handle_aggressive: boolean;
  notification_prefs: unknown;
  staff: StaffRow | null;
}

/** One row of `grooming_stylist_stats`. */
export interface StylistStatsRow {
  staff_id: string;
  total_appointments: number;
}

/** The app id for a stylist: the seeded `stylist-00N` where one exists, the
 *  profile uuid otherwise. Kept because pet preferences, booking rules and the
 *  pricing check all still reference those ids by name. */
export function stylistAppId(row: {
  legacy_id: string | null;
  id: string;
}): string {
  return row.legacy_id ?? row.id;
}

/** Employment first, then the one thing only grooming knows. */
function deriveStatus(
  staffStatus: string,
  onLeave: boolean,
): Stylist["status"] {
  if (staffStatus !== "active") return "inactive";
  return onLeave ? "on-leave" : "active";
}

export function rowToStylist(
  row: StylistProfileRow,
  stats: StylistStatsRow | undefined,
): Stylist {
  const staff = row.staff;
  return {
    id: stylistAppId(row),
    ...(staff?.legacy_id ? { staffId: staff.legacy_id } : {}),
    name: staff ? `${staff.first_name} ${staff.last_name}`.trim() : "",
    email: staff?.email ?? "",
    phone: staff?.phone ?? "",
    ...(staff?.avatar_url ? { photoUrl: staff.avatar_url } : {}),
    specializations: row.specializations ?? [],
    certifications: row.certifications ?? [],
    yearsExperience: row.years_experience,
    status: deriveStatus(staff?.status ?? "inactive", row.on_leave),
    bio: row.bio,
    // See the header: no source, so no number.
    rating: 0,
    totalAppointments: Number(stats?.total_appointments ?? 0),
    // Employment data, read from the staff record by the screens that show it.
    hireDate: "",
    capacity: {
      maxDailyAppointments: row.max_daily_appointments,
      ...(row.max_weekly_appointments != null
        ? { maxWeeklyAppointments: row.max_weekly_appointments }
        : {}),
      maxConcurrentAppointments: row.max_concurrent_appointments,
      preferredPetSizes: (row.preferred_pet_sizes ?? []) as PetSize[],
      skillLevel: row.skill_level as StylistSkillLevel,
      canHandleMatted: row.can_handle_matted,
      canHandleAnxious: row.can_handle_anxious,
      canHandleAggressive: row.can_handle_aggressive,
    },
    visibleOnline: row.visible_online,
    ...(row.calendar_color ? { calendarColor: row.calendar_color } : {}),
    qualifiedPackageIds: row.qualified_service_ids ?? [],
    ...(row.notification_prefs
      ? {
          notificationPrefs: row.notification_prefs as GroomerNotificationPrefs,
        }
      : {}),
  };
}

export interface AvailabilityRow {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

/**
 * Availability is stored against STAFF; the app addresses it by stylist.
 * The route passes the lookup it already built rather than re-querying, and a
 * row whose groomer has no profile is dropped by the caller rather than
 * rendered against an empty id.
 */
export function rowToAvailability(
  row: AvailabilityRow,
  stylistId: string,
  stylistName: string,
): StylistAvailability {
  return {
    id: row.id,
    stylistId,
    stylistName,
    dayOfWeek: row.day_of_week,
    // Postgres `time` comes back as HH:MM:SS; the app formats HH:MM.
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    isAvailable: row.is_available,
  };
}

/** The select the route issues. Beside the row types so they cannot drift. */
export const STYLIST_PROFILE_SELECT = `
  id, legacy_id, staff_id,
  specializations, certifications, years_experience, bio,
  on_leave, visible_online, calendar_color, qualified_service_ids,
  max_daily_appointments, max_weekly_appointments, max_concurrent_appointments,
  preferred_pet_sizes, skill_level,
  can_handle_matted, can_handle_anxious, can_handle_aggressive,
  notification_prefs,
  staff ( id, legacy_id, first_name, last_name, email, phone, avatar_url, status )
` as const;
