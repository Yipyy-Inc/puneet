import { facilityStaff } from "@/data/facility-staff";
import { locations } from "@/data/locations";
import type { Currency } from "@/data/cash-drawer";

// Resolves the cash-register context for a signed-in employee. Pure (no hooks)
// so it works in both the server route and the client open-gate. For the demo
// this pins to facility 11's primary location — the same location the facility
// Daily Register page and the seeded sessions use — so the gate, the store, and
// the admin page all agree on one drawer. Real multi-location register support
// would resolve the employee's active location here.

export interface EmployeeRegisterContext {
  facilityId: number;
  locationId: string;
  locationName: string;
  currency: Currency;
  staffName: string;
  /** Managers/owners see the register Reports tab. */
  isManager: boolean;
}

const FACILITY_ID = 11;
const MANAGER_ROLES = new Set(["owner", "admin", "manager", "supervisor"]);

export function resolveRegisterContext(
  staffId: string | undefined,
): EmployeeRegisterContext {
  const staff = facilityStaff.find((s) => s.id === staffId);
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
