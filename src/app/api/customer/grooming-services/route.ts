import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { GroomingPackage } from "@/types/grooming";
import type { PetSize } from "@/types/base";

// ============================================================================
// The grooming services a CUSTOMER's own facility offers.
//
// Not `/api/grooming/services`, which the booking modal reached for even when
// a pet owner was driving it. That route scopes with
// `activeFacilityIdForStaff()` — null for somebody holding no membership — so
// the query fell through to RLS, and RLS admits active services at every
// facility the caller is a client of. One household using two businesses saw
// both menus merged, and the wizard prices whatever was picked: choosing the
// other business's "Full Groom" quoted the other business's price.
//
// It also attached `perLocationSizePricing()` to every response, which is the
// cross-branch breakdown built for HQ Services — so a customer was handed what
// each of the business's branches charges for each size.
//
// `public.offered_grooming_services()` (20260924160000) answers for ONE
// facility, resolves the size prices for ONE branch, and projects to an
// allowlist. See the migration for what is withheld and why.
//
// THE FACILITY COMES THROUGH THE CLIENT ROW, as /api/customer/custom-services
// and /api/customer/daycare-services do: RLS scopes `clients` to the caller's
// own record, and the function checks again that they are a client there.
// `getFacilityContext()` is the one thing this must not call — it answers a
// customer with the DEMO facility, which is what `check:customer-routes`
// exists to prevent.
// ============================================================================

export const dynamic = "force-dynamic";

/** What the projection returns. Deliberately narrower than `ServiceRow`. */
interface OfferedRow {
  id: string;
  name: string;
  description: string | null;
  basePrice: number | string;
  duration: number | null;
  coatAdjustments: Record<string, number> | null;
  coatAdjustmentMode: string | null;
  mattedSurchargeDefault: number | string | null;
  includes: string[];
  taxable: boolean;
  isPopular: boolean;
  imageUrl: string | null;
  minBookingNoticeHours: number | null;
  eligiblePetSizes: string[];
  eligibleCoatTypes: string[];
  eligibleBreeds: string[];
  displayOrder: number;
  sizePricing: Record<string, number | string>;
}

function num(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/**
 * The projection, widened back to the shape the picker already reads.
 *
 * The withheld fields become their EMPTY value rather than being absent, so
 * the components that filter on them keep working and simply find nothing left
 * to filter — the same decision the daycare customer route records.
 */
function toPackage(row: OfferedRow): GroomingPackage {
  const sizePricing: Record<string, number> = {};
  for (const [label, price] of Object.entries(row.sizePricing ?? {})) {
    if (
      label === "small" ||
      label === "medium" ||
      label === "large" ||
      label === "giant"
    ) {
      sizePricing[label] = num(price);
    }
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    basePrice: num(row.basePrice),
    duration: row.duration ?? 0,
    sizePricing,
    coatAdjustments: {
      values: row.coatAdjustments ?? {},
      mode: (row.coatAdjustmentMode as "flat" | "percent") ?? "flat",
    },
    mattedSurchargeDefault: num(row.mattedSurchargeDefault),
    includes: row.includes ?? [],
    isActive: true,
    isPopular: row.isPopular,
    taxable: row.taxable !== false,
    // Honest zero rather than an invented figure — the same call the staff
    // mapper makes, for the same reason.
    purchaseCount: 0,
    // Required by the type and genuinely not the customer's business, so it
    // is not fetched: an empty string says "not supplied" rather than
    // inventing a date the projection never returned.
    createdAt: "",
    eligiblePetSizes: (row.eligiblePetSizes ?? []) as PetSize[],
    eligibleCoatTypes: (row.eligibleCoatTypes ??
      []) as GroomingPackage["eligibleCoatTypes"],
    eligibleBreeds: row.eligibleBreeds ?? [],
    ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
    ...(row.minBookingNoticeHours !== null
      ? { minBookingNoticeHours: row.minBookingNoticeHours }
      : {}),
    displayOrder: row.displayOrder,
  } as GroomingPackage;
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

  // The branch they are booking at, when the wizard knows one. Absent is the
  // facility-wide answer, which is what a single-location business always gets.
  const locationId = request.nextUrl.searchParams.get("locationId");

  const { data, error } = await supabase.rpc("offered_grooming_services", {
    p_facility_id: client.facility_id,
    p_location_id: locationId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (Array.isArray(data) ? data : []) as unknown as OfferedRow[];
  return NextResponse.json(rows.map(toPackage));
}
