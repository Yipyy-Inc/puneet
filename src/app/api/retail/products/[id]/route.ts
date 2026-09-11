import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  RETAIL_PRODUCT_SELECT,
  productToColumns,
  rowToProduct,
  type RetailProductRow,
} from "@/lib/api/mappers/retail";
import type { Product } from "@/types/retail";

// One product: edit it or delete it.
//
// An edit never moves the count — the product row's guard puts `stock` and
// each variant's count back (20260911180840). A count typed into the editor
// is therefore sent as `stockCount` and written as a `count` movement, so the
// ledger says who changed it, from what, to what.

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const input = (await request.json().catch(() => null)) as
    | (Partial<Product> & { stockCount?: number; authorName?: string })
    | null;
  if (!input) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  if (input.name !== undefined && !input.name.trim()) {
    return NextResponse.json(
      { error: "A product needs a name." },
      { status: 422 },
    );
  }
  const { stockCount, authorName, ...product } = input;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("retail_products")
    .update(productToColumns(product, false) as never)
    .eq("id", id)
    .select(RETAIL_PRODUCT_SELECT);
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage products at this facility.",
      duplicate: "Another product already has that SKU or barcode.",
    });
  }
  const denied = deniedIfUntouched(data, "Not allowed to change this product.");
  if (denied) return denied;
  let row = (data as unknown as RetailProductRow[])[0];

  // A new count for a product without variants: the difference, on the ledger.
  if (
    stockCount !== undefined &&
    Number.isFinite(stockCount) &&
    Math.round(stockCount) !== row.stock &&
    (!Array.isArray(row.variants) || row.variants.length === 0)
  ) {
    const { data: facilityRow } = await supabase
      .from("retail_products")
      .select("facility_id")
      .eq("id", id)
      .single();
    const { error: moveError } = await supabase
      .from("retail_stock_movements")
      .insert({
        facility_id: (facilityRow as { facility_id: string }).facility_id,
        product_id: id,
        delta: Math.round(stockCount) - row.stock,
        reason: "count",
        note: "Counted in the product editor",
        author_name: authorName?.trim() || "Staff",
      } as never);
    if (moveError) {
      return writeFailure(moveError, {
        denied: "The product was saved, but your role cannot change its stock.",
        duplicate: "That count was already recorded.",
      });
    }
    const { data: fresh } = await supabase
      .from("retail_products")
      .select(RETAIL_PRODUCT_SELECT)
      .eq("id", id)
      .single();
    if (fresh) row = fresh as unknown as RetailProductRow;
  }
  return NextResponse.json(rowToProduct(row));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("retail_products")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to delete this product.",
      duplicate: "That product cannot be deleted.",
    });
  }
  const denied = deniedIfUntouched(data, "Not allowed to delete this product.");
  if (denied) return denied;
  return new NextResponse(null, { status: 204 });
}
