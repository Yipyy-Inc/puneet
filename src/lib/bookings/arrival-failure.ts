// ============================================================================
// Why an arrival or a departure was refused, as a reason a screen can word.
//
// Every per-service arrival write answers the same few ways: a boarding guest
// with no kennel (409), a role that cannot move that service (403), a booking
// that cannot be checked in in its state (the database's 22023, mapped to 422
// by the routes), a required form nobody gave a reason for. The kiosk mapped
// these first; the booking page and the calendar read the same map.
// ============================================================================

export type ArrivalFailure =
  | "reason_required"
  | "needs_kennel"
  | "not_allowed"
  | "cannot_now"
  | "no_writer"
  | "failed";

export function arrivalFailure(error: unknown): ArrivalFailure {
  const { status, code } = (error ?? {}) as { status?: number; code?: string };
  if (code === "override_reason_required") return "reason_required";
  if (status === 409) return "needs_kennel";
  if (status === 403) return "not_allowed";
  if (status === 404 || status === 422) return "cannot_now";
  return "failed";
}
