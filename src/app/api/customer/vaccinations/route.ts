import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { VaccinationRecord } from "@/types/pet";

// ============================================================================
// GET /api/customer/vaccinations — the calling customer's own pets' records.
//
// ── WHY THIS ROUTE EXISTS ─────────────────────────────────────────────────
//
// `/api/vaccinations` resolves its facility with `getFacilityContext()` and
// `activeFacilityIdForStaff()`, which read the caller's MEMBERSHIP — and fall
// back to the DEMO facility for a caller with none, which every customer is.
// `check:customer-routes` forbids a customer route from calling it for exactly
// that reason. And the table's read policy admits staff only, so a pet owner
// could not read their own animal's rabies certificate by any route at all.
//
// So the customer portal invented them: three screens filtered
// `vaccinationRecords` from `@/data/pet-data` by `petId`, against fixture pet
// ids 1, 2, 3, 5, 13 and 14. A real pet matches none, so the dashboard told
// every real customer that every required vaccine was missing, for every pet —
// and a real pet whose ref happens to be 1 or 2 wore a fixture animal's
// certificate instead.
//
// ── WHAT IT READS THROUGH ─────────────────────────────────────────────────
//
// `public.my_pet_vaccinations()` (20260921113000), a SECURITY DEFINER function
// scoped to `private.own_pet_ids()`. It takes NO arguments, so there is no id
// to forge; the scope is who is asking. The table policy is untouched and
// still staff-only — the function returns the customer-safe columns and leaves
// `notes`, `reviewed_by` and `review_reason` behind, because those are written
// for colleagues about the owner's own paperwork.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("my_pet_vaccinations");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const records: VaccinationRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    // The numeric ref, which is the id the portal's pets carry.
    petId: row.pet_ref,
    vaccineName: row.vaccine_name,
    administeredDate: row.administered_on ?? "",
    // A record with no expiry never lapses. Carried as the empty string and
    // read as "no expiry" by `expiryState`, the same as the staff mapper.
    expiryDate: row.expires_on ?? "",
    veterinarianName: row.veterinarian_name ?? undefined,
    veterinaryClinic: row.veterinary_clinic ?? undefined,
    documentUrl: row.document_url ?? undefined,
    status: row.status as VaccinationRecord["status"],
  }));

  return NextResponse.json(records);
}
