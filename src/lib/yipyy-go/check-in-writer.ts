import type { PermissionKey } from "@/types/facility-staff";

// ============================================================================
// Which write checks a dog in, by the booking’s service.
//
// There is no one arrival. Each service already records its own, gated by its
// own permission — daycare `daycare_check_in_out`, boarding and training
// `check_in_out`, grooming `edit_bookings` (private.yipyy_go_may_check_in says
// the same) — and the kiosk calls that write rather than a second one of its
// own. A service with none cannot be checked in from the kiosk, and says so.
// ============================================================================

export type CheckInWriter = "daycare" | "boarding" | "training" | "grooming";

export function checkInWriterFor(service: string): CheckInWriter | null {
  switch (service) {
    case "daycare":
    case "boarding":
    case "training":
    case "grooming":
      return service;
    default:
      return null;
  }
}

/** The permission each write asks for. */
export const CHECK_IN_PERMISSION: Record<CheckInWriter, PermissionKey> = {
  daycare: "daycare_check_in_out",
  boarding: "check_in_out",
  training: "check_in_out",
  grooming: "edit_bookings",
};

/** Every permission that lets somebody check a dog in at the desk. */
export const ANY_CHECK_IN_PERMISSION: PermissionKey[] = [
  "daycare_check_in_out",
  "check_in_out",
  "edit_bookings",
];
