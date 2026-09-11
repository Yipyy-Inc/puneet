import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  PO_STATUS_IN,
  purchaseOrderItemsToStored,
  rowToPurchaseOrder,
  type RetailPurchaseOrderRow,
} from "@/lib/api/mappers/retail";
import type { PurchaseOrder } from "@/types/retail";

// One purchase order: change its lines, status or notes, or delete it (only
// a draft or a cancelled one — the delete policy says so). What arrives is
// recorded by /receive, never by editing a line's received count here.

export const dynamic = "force-dynamic";

const SELECT =
  "id, number, supplier_id, supplier_name, status, items, expected_on, received_at, notes, created_by, created_at";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const input = (await request
    .json()
    .catch(() => null)) as Partial<PurchaseOrder> | null;
  if (!input) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  const supabase = await createServerClient();
  const patch: Record<string, unknown> = {};
  if (input.status !== undefined) {
    const status = PO_STATUS_IN[input.status];
    // Received and partly received are what /receive decides, not an edit.
    if (!status || status === "received" || status === "partial") {
      return NextResponse.json(
        { error: "Record what arrived to receive an order." },
        { status: 422 },
      );
    }
    patch.status = status;
  }
  if (input.items !== undefined) {
    const { data: current } = await supabase
      .from("retail_purchase_orders")
      .select("items")
      .eq("id", id)
      .maybeSingle();
    // An edited line keeps what has already been received against it.
    const received = new Map(
      (
        (current?.items as { productId: string; received?: number }[]) ?? []
      ).map((i, index) => [`${index}:${i.productId}`, i.received ?? 0]),
    );
    patch.items = purchaseOrderItemsToStored(input.items).map((i, index) => ({
      ...i,
      received: received.get(`${index}:${i.productId}`) ?? 0,
    }));
  }
  if (input.supplierId !== undefined)
    patch.supplier_id = input.supplierId || null;
  if (input.supplierName !== undefined)
    patch.supplier_name = input.supplierName;
  if (input.expectedDelivery !== undefined)
    patch.expected_on = input.expectedDelivery || null;
  if (input.notes !== undefined) patch.notes = input.notes;
  patch.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("retail_purchase_orders")
    .update(patch as never)
    .eq("id", id)
    .select(SELECT);
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change this purchase order.",
      duplicate: "That order already exists.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "Not allowed to change this purchase order.",
  );
  if (denied) return denied;
  return NextResponse.json(
    rowToPurchaseOrder((data as unknown as RetailPurchaseOrderRow[])[0]),
  );
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
    .from("retail_purchase_orders")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    return writeFailure(error, {
      denied: "Only a draft or cancelled order can be deleted.",
      duplicate: "That order cannot be deleted.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "Only a draft or cancelled order can be deleted.",
  );
  if (denied) return denied;
  return new NextResponse(null, { status: 204 });
}
