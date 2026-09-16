import { locations } from "@/data/locations";
import { FIXTURE_DATA_FACILITY_ID } from "@/data/facilities";
import type { Currency } from "@/data/cash-drawer";
import type { StaffProfile } from "@/types/facility-staff";

// Resolves the cash-register context for a signed-in employee. Pure (no hooks)
// so it works in both the server route and the client open-gate.
//
// ── THE FIXTURE FACILITY HERE IS CORRECT, NOT AN OVERSIGHT ────────────────
//
// There is no cash-drawer backend: `cash-register-store.ts` is a browser-local
// store seeded from `mockRegisterSessions`, and every one of those sessions is
// the fixture facility's. So this must name the SAME facility they do, or the
// open-gate, the store and the Daily Register page stop agreeing on which
// drawer is open — and "has today's till been counted?" gets two answers.
//
// It reads the shared constant rather than keeping its own `11` so that when
// the drawer does get a backend, the places tied to the fixture are the places
// that import this name. Real multi-location register support resolves the
// employee's active location here instead.
//
// It takes the STAFF MEMBER, not an id. It used to take an id and look it up in
// the mock array, which meant every caller silently depended on the acting
// person existing there — and once the shell started seating people from their
// session, none of them did: the drawer was counted, and the ledger signed, by
// "Staff". Each caller now hands over the viewer it already holds, so there is
// one roster in play instead of two.

export interface EmployeeRegisterContext {
  facilityId: number;
  locationId: string;
  locationName: string;
  currency: Currency;
  staffName: string;
  /** Managers/owners see the register Reports tab. */
  isManager: boolean;
}

const FACILITY_ID = FIXTURE_DATA_FACILITY_ID;
const MANAGER_ROLES = new Set(["owner", "admin", "manager", "supervisor"]);

export function resolveRegisterContext(
  staff: StaffProfile | null | undefined,
): EmployeeRegisterContext {
  const staffName = staff
    ? `${staff.firstName} ${staff.lastName}`.trim()
    : "Staff";
  const location =
    locations.find((l) => l.facilityId === FACILITY_ID && l.isPrimary) ??
    locations.find((l) => l.facilityId === FACILITY_ID)!;
  const currency: Currency = location.country === "CA" ? "CAD" : "USD";
  const isManager = staff ? MANAGER_ROLES.has(staff.primaryRole) : false;
  return {
    facilityId: FACILITY_ID,
    locationId: location.id,
    locationName: location.name,
    currency,
    staffName,
    isManager,
  };
}
