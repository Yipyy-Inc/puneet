import {
  LOCATION_CAPACITY_KEYS,
  type FacilityLocation,
} from "@/types/location";

// ============================================================================
// Go-live readiness for a real branch.
//
// Was 8 items over the fixture `Location` (address & contact, phone & email,
// services enabled, capacity, operating hours, staff assigned, manager
// designated, taxes/payment) -- 3 have nowhere real to read from and are
// dropped rather than faked:
//
//   services enabled  -- services aren't location-scoped in Postgres anywhere.
//   operating hours   -- `facility_settings.business_hours` is keyed
//                        (facility_id, domain), one set of hours per FACILITY,
//                        not per branch.
//   taxes / payment   -- same story: `facility_settings.tax_config` is
//                        facility-wide, no location_id column exists on that
//                        table. Real per-branch hours/tax needs a schema
//                        change (a location_id column + reworking every
//                        consumer that assumes one set per facility) -- its
//                        own project, not a rider on this checklist.
//
// What's left is what the database can actually answer: the location row
// itself (address/phone/email/capacity, real per branch) and staffing, via
// `facility_memberships.home_location_id` (see `useStaffHomeLocations`).
// ============================================================================

export interface LocationOnboardingStep {
  label: string;
  done: boolean;
}

/** Just enough of a staff profile to judge "assigned" and "managed". */
export interface OnboardingStaffMember {
  primaryRole: string;
}

export function locationOnboardingSteps(
  location: FacilityLocation,
  staffAtLocation: OnboardingStaffMember[],
): LocationOnboardingStep[] {
  const hasCapacity = LOCATION_CAPACITY_KEYS.some(
    (k) => (location.capacity[k] ?? 0) > 0,
  );
  const hasManager = staffAtLocation.some(
    (s) => s.primaryRole === "manager" || s.primaryRole === "owner",
  );
  return [
    {
      label: "Address",
      done: Boolean(location.address?.street && location.address?.city),
    },
    {
      label: "Phone & email",
      done: Boolean(location.phone && location.email),
    },
    { label: "Capacity configured", done: hasCapacity },
    { label: "Staff assigned", done: staffAtLocation.length >= 1 },
    { label: "Manager designated", done: hasManager },
  ];
}
