import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import {
  PO_STATUS_IN,
  purchaseOrderItemsToStored,
  rowToPurchaseOrder,
  type RetailPurchaseOrderRow,
} from "@/lib/api/mappers/retail";
import type { PurchaseOrder } from "@/types/retail";

// ============================================================================
// Purchase orders (retail_purchase_orders, 20260911180840).
//
// The Orders tab listed `purchaseOrders` from @/data/retail and its Create
// Order did nothing. GET lists this facility's orders; POST creates one.
// Receiving goes through /[id]/receive, which moves the stock.
// retail_manage_suppliers decides who writes an order.
// ============================================================================

export const dynamic = "force-dynamic";

const SELECT =
  "id, number, supplier_id, supplier_name, status, items, expected_on, received_at, notes, created_by, created_at";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const { data, error } = await supabase
    .from("retail_purchase_orders")
    .select(SELECT)
    .match(inFacility(scope))
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    ((data ?? []) as unknown as RetailPurchaseOrderRow[]).map(
      rowToPurchaseOrder,
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
    .catch(() => null)) as Partial<PurchaseOrder> | null;
  if (!input?.items?.length) {
    return NextResponse.json(
      { error: "An order needs at least one line." },
      { status: 422 },
    );
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("retail_purchase_orders")
    .insert({
      facility_id: facility.facilityId,
      supplier_id: input.supplierId || null,
      supplier_name: input.supplierName ?? "",
      status: PO_STATUS_IN[input.status ?? "pending"] ?? "draft",
      items: purchaseOrderItemsToStored(input.items),
      expected_on: input.expectedDelivery || null,
      notes: input.notes ?? "",
    } as never)
    .select(SELECT)
    .single();
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to write purchase orders at this facility.",
      duplicate: "That order already exists.",
    });
  }
  return NextResponse.json(
    rowToPurchaseOrder(data as unknown as RetailPurchaseOrderRow),
    { status: 201 },
  );
}
