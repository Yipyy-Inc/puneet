import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import {
  RETAIL_PRODUCT_SELECT,
  productToColumns,
  rowToProduct,
  type RetailProductRow,
} from "@/lib/api/mappers/retail";
import type { Product } from "@/types/retail";

// ============================================================================
// The facility's products (retail_products, 20260911180840).
//
// The Products tab, the till's catalogue and the inventory screen all read
// `products` from @/data/retail — thirteen fixture products — and a product
// created on the Products tab lived in that tab's useState and never reached
// the till. GET lists this facility's products; POST creates one, its opening
// count written to the stock ledger by the database. retail_manage_products
// decides.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { data, error } = await supabase
    .from("retail_products")
    .select(RETAIL_PRODUCT_SELECT)
    .match(inFacility(scope))
    .order("name", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    ((data ?? []) as unknown as RetailProductRow[]).map(rowToProduct),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const input = (await request
    .json()
    .catch(() => null)) as Partial<Product> | null;
  if (!input?.name?.trim()) {
    return NextResponse.json(
      { error: "A product needs a name." },
      { status: 422 },
    );
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("retail_products")
    .insert({
      facility_id: facility.facilityId,
      ...productToColumns(input, true),
    } as never)
    .select(RETAIL_PRODUCT_SELECT)
    .single();
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage products at this facility.",
      duplicate: "Another product already has that SKU or barcode.",
    });
  }
  return NextResponse.json(rowToProduct(data as unknown as RetailProductRow), {
    status: 201,
  });
}
