import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import {
  PROMO_CODE_SELECT,
  promoCodeToColumns,
  rowToPromoCode,
  type PromoCodeRow,
} from "@/lib/api/mappers/promo-code";
import type { MarketingPromoCode } from "@/types/marketing";

// ============================================================================
// The facility's promo codes (20260911173538).
//
// Marketing → Promo Codes listed `promoCodes` from @/data/marketing and its
// Save button was a console.log. GET lists this facility's codes with how
// often each has been used — counted from `promo_code_redemptions`, never a
// stored number. POST creates one; writing needs manage_services.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();

  const [{ data, error }, { data: uses }] = await Promise.all([
    supabase
      .from("promo_codes")
      .select(PROMO_CODE_SELECT)
      .match(inFacility(scope))
      .order("created_at", { ascending: false }),
    supabase
      .from("promo_code_redemptions")
      .select("promo_code_id")
      .match(inFacility(scope)),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const counts = new Map<string, number>();
  for (const u of (uses ?? []) as { promo_code_id: string | null }[]) {
    if (u.promo_code_id)
      counts.set(u.promo_code_id, (counts.get(u.promo_code_id) ?? 0) + 1);
  }
  return NextResponse.json(
    ((data ?? []) as unknown as PromoCodeRow[]).map((row) =>
      rowToPromoCode(row, counts.get(row.id) ?? 0),
    ),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const input = (await request
    .json()
    .catch(() => null)) as Partial<MarketingPromoCode> | null;
  if (!input?.code?.trim() || !input.type) {
    return NextResponse.json(
      { error: "A code and a discount type are required." },
      { status: 422 },
    );
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .insert({
      facility_id: facility.facilityId,
      ...promoCodeToColumns(input),
    } as never)
    .select(PROMO_CODE_SELECT)
    .single();
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage promo codes at this facility.",
      duplicate: "That code already exists.",
    });
  }
  return NextResponse.json(rowToPromoCode(data as unknown as PromoCodeRow, 0), {
    status: 201,
  });
}
