import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { DaycareService } from "@/lib/api/mappers/daycare-service";

// ============================================================================
// The daycare services a CUSTOMER's own facility offers online.
//
// Not `/api/daycare/services`, which the booking modal reached for until now
// even when a customer was driving it. That route scopes with
// `activeFacilityIdForStaff()`, which returns null for somebody holding no
// membership — so the query fell through to RLS alone, and RLS admits active
// services at EVERY facility the caller is a client of. One household using
// two businesses saw both menus merged, with nothing saying which was which.
//
// It also handed over the whole row: the calendar colour our own setup screen
// labels "internal only", the pet tags that are the facility's behavioural
// classification of animals, the play-area sections, the rollover target. So
// this calls `public.offered_daycare_services()` (20260924140000) — active,
// offered at this branch, pet-tag rules already applied server-side, projected
// to the fields the booking flow actually draws.
//
// THE FACILITY COMES THROUGH THE CLIENT ROW, as /api/customer/custom-services
// does: RLS scopes `clients` to the caller's own record, and the function
// checks again that they are a client there. `getFacilityContext()` is the one
// thing this must not call — it answers a customer with the DEMO facility, and
// `check:customer-routes` exists because that priced every pet owner by the
// demo facility's rules until 2026-09-19.
// ============================================================================

export const dynamic = "force-dynamic";

/** What the projection returns. Deliberately narrower than `DaycareServiceRow`. */
interface OfferedRow {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number | string;
  facilityPrice: number | string;
  taxable: boolean;
  maxDurationHours: number | string | null;
  eligibleSpecies: string[];
  eligibleBreeds: string[];
  eligibleWeightTiers: string[];
  includedAddOnIds: string[];
  locationIds: string[];
  requiresEvaluationOnline: boolean;
  displayOrder: number;
}

function num(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The projection, widened back to the shape the picker already reads.
 *
 * The withheld fields become their EMPTY value rather than being absent, and
 * empty means "no restriction" throughout this domain (the rule
 * `grooming_services` set and Phase 1 followed). So `eligibleDaycareServices`
 * runs unchanged over a customer's menu — it simply finds nothing left to
 * filter on, because the server already did it.
 */
function toService(row: OfferedRow): DaycareService {
  return {
    id: row.id,
    rowId: row.id,
    categoryId: row.categoryId,
    name: row.name,
    description: row.description ?? "",
    imageUrl: row.imageUrl,
    // Internal only, and it is not sent.
    color: null,
    price: num(row.price),
    facilityPrice: num(row.facilityPrice),
    taxable: row.taxable,
    maxDurationHours:
      row.maxDurationHours === null ? null : num(row.maxDurationHours),
    // The rollover target is the facility's own business.
    rolloverAfterMinutes: null,
    rolloverToServiceId: null,
    eligibleSpecies: row.eligibleSpecies ?? [],
    eligibleBreeds: row.eligibleBreeds ?? [],
    eligibleWeightTiers: row.eligibleWeightTiers ?? [],
    // Applied by the projection, against the pets that were named. Empty here
    // is the truth from the client's side: there is no tag rule left to apply.
    eligiblePetTags: [],
    blockedPetTags: [],
    allowedSectionIds: [],
    includedAddOnIds: row.includedAddOnIds ?? [],
    locationIds: row.locationIds ?? [],
    // The staff-side question, which is not the customer's.
    requiresEvaluation: false,
    requiresEvaluationOnline: row.requiresEvaluationOnline,
    displayOrder: row.displayOrder,
    // Everything returned is on offer; a draft never leaves the projection.
    isActive: true,
    // The branch comparison is an HQ screen, not a customer one.
    locationPricing: [],
  };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const { data: client } = await supabase
    .from("clients")
    .select("facility_id")
    .limit(1)
    .maybeSingle();

  if (!client?.facility_id) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  // The branch the customer is booking at, when the wizard knows one. Absent
  // is the facility-wide answer, which is what a single-location business
  // always gets.
  const locationId = request.nextUrl.searchParams.get("locationId");

  // The pets they have chosen, by REF — the id every customer screen carries.
  // Mapped to uuids through `pets`, which RLS scopes to their own animals, so
  // naming somebody else's ref buys nothing: it simply does not resolve.
  const refs = (request.nextUrl.searchParams.get("petRefs") ?? "")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);

  let petIds: string[] = [];
  if (refs.length > 0) {
    const { data: pets } = await supabase
      .from("pets")
      .select("id")
      .in("ref", refs);
    petIds = ((pets ?? []) as { id: string }[]).map((pet) => pet.id);
  }

  const { data, error } = await supabase.rpc("offered_daycare_services", {
    p_facility_id: client.facility_id,
    p_location_id: locationId,
    p_pet_ids: petIds,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (Array.isArray(data) ? data : []) as unknown as OfferedRow[];
  return NextResponse.json(rows.map(toService));
}
