"use client";

import { useFacilityProfile } from "@/lib/api/facility-profile";
import { useFacilitySettings } from "@/lib/api/facility-settings";
import {
  facilityInfoFromProfile,
  type FacilityInfo,
} from "@/lib/invoice-header";
import type { TaxConfig } from "@/lib/settings/tax";

// ============================================================================
// The facility that a printed document is FROM.
//
// Five screens print something a customer keeps — a payment receipt, a bulk
// payment receipt, a refund slip, a retail receipt, a customer invoice — and
// all five headed it with `facilities.find((f) => f.id === 11)`. That is the
// fixture: "Example Pet Care Facility, 123 Example St, Example City", carrying
// the fixture's GST and QST registration numbers.
//
// One hook so there is one answer, and so the next screen that prints something
// cannot quietly reintroduce the fixture.
// ============================================================================

/**
 * The current facility's own name, address, contact and tax registrations.
 *
 * @returns `null` until the profile has loaded — callers pass it straight to
 *   `invoiceHeaderHtml`, which renders nothing for null. An empty header beats
 *   a header naming the wrong business.
 */
export function useReceiptFacility(): FacilityInfo | null {
  const { profile, isPending } = useFacilityProfile();
  const settings = useFacilitySettings();
  const tax = settings.settings.tax_config.value as TaxConfig;

  if (isPending || !profile.businessName) return null;
  return facilityInfoFromProfile(profile, tax);
}
