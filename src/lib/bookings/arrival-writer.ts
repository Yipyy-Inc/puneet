import type { PermissionKey } from "@/types/facility-staff";

// ============================================================================
// Which write checks a pet in (and out), by the booking's service.
//
// There is no one arrival. Each service already records its own, gated by its
// own permission — daycare `daycare_check_in_out`, boarding and training
// `check_in_out`, grooming `edit_bookings` (private.yipyy_go_may_check_in says
// the same) — and every screen calls that write rather than a second one of
// its own: the kiosk, the day boards, and since 2026-09-18 the booking page
// and the calendar too. Those routes are where the required forms, the kennel
// rule (409) and the check_in / check_out automations live, and the database
// mirrors the arrival into the booking's status (20260918151018), so one press
// moves both.
//
// A service with no attendance record — evaluations, a facility's custom
// services — has none of that, and its status is its lifecycle.
// ============================================================================

export type ArrivalWriter = "daycare" | "boarding" | "training" | "grooming";

export function arrivalWriterFor(
  service: string | undefined,
): ArrivalWriter | null {
  switch ((service ?? "").toLowerCase()) {
    case "daycare":
    case "boarding":
    case "training":
    case "grooming":
      return (service ?? "").toLowerCase() as ArrivalWriter;
    default:
      return null;
  }
}

/** The permission each service's arrival write asks for. */
export const ARRIVAL_PERMISSION: Record<ArrivalWriter, PermissionKey> = {
  daycare: "daycare_check_in_out",
  boarding: "check_in_out",
  training: "check_in_out",
  grooming: "edit_bookings",
};

/**
 * The permission that moves THIS booking in or out: its service's arrival
 * permission, or `edit_bookings` for a service whose status is its lifecycle.
 */
export function arrivalPermissionFor(
  service: string | undefined,
): PermissionKey {
  const writer = arrivalWriterFor(service);
  return writer ? ARRIVAL_PERMISSION[writer] : "edit_bookings";
}

/** Every permission that lets somebody check a pet in at the desk. */
export const ANY_ARRIVAL_PERMISSION: PermissionKey[] = [
  "daycare_check_in_out",
  "check_in_out",
  "edit_bookings",
];
