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
  rowToProduct,
  rowsToMovements,
  type RetailMovementRow,
  type RetailProductRow,
} from "@/lib/api/mappers/retail";

// ============================================================================
// The stock ledger (retail_stock_movements, 20260911180840).
//
// The inventory screen's movements were `inventoryMovements` from
// @/data/retail and its "Adjust stock" dialog was a no-op. GET lists the
// latest movements with the count before and after each; POST records an
// adjustment — found, damaged, counted — which moves the count through the
// database's own trigger. retail_manage_inventory decides. The till also
// records a `sale` here when it puts a basket on a booking's bill instead
// of ringing it up — only ever a count going down, and retail_process_sale
// is enough for that (the table's policy).
// ============================================================================

export const dynamic = "force-dynamic";

const REASONS = new Set(["adjustment", "damaged", "count", "sale"]);

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const productId = new URL(request.url).searchParams.get("productId");

  let movementQuery = supabase
    .from("retail_stock_movements")
    .select(
      "id, product_id, variant_id, delta, reason, note, sale_id, purchase_order_id, author_name, created_at",
    )
    .match(inFacility(scope))
    .order("created_at", { ascending: false })
    .limit(300);
  if (productId) movementQuery = movementQuery.eq("product_id", productId);

  const [{ data, error }, { data: products }] = await Promise.all([
    movementQuery,
    supabase
      .from("retail_products")
      .select(RETAIL_PRODUCT_SELECT)
      .match(inFacility(scope)),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const byId = new Map(
    ((products ?? []) as unknown as RetailProductRow[]).map((p) => [
      p.id,
      rowToProduct(p),
    ]),
  );
  return NextResponse.json(
    rowsToMovements((data ?? []) as unknown as RetailMovementRow[], byId),
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const input = (await request.json().catch(() => null)) as {
    productId?: string;
    variantId?: string;
    delta?: number;
    reason?: string;
    note?: string;
    authorName?: string;
  } | null;
  const delta = Math.round(Number(input?.delta));
  if (!input?.productId || !Number.isFinite(delta) || delta === 0) {
    return NextResponse.json(
      { error: "Choose a product and a change that is not zero." },
      { status: 422 },
    );
  }
  const reason = REASONS.has(input.reason ?? "") ? input.reason : "adjustment";
  if (reason === "sale" && delta > 0) {
    return NextResponse.json(
      { error: "A sale takes stock off, never puts it back." },
      { status: 422 },
    );
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("retail_stock_movements")
    .insert({
      facility_id: facility.facilityId,
      product_id: input.productId,
      variant_id: input.variantId || null,
      delta,
      reason,
      note: input.note?.trim() ?? "",
      author_name: input.authorName?.trim() || "Staff",
    } as never)
    .select("id")
    .single();
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to adjust stock at this facility.",
      duplicate: "That adjustment was already recorded.",
    });
  }
  return NextResponse.json(data, { status: 201 });
}
