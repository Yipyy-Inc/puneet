import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import {
  RETAIL_SALE_SELECT,
  rowToRetailSale,
  type RetailSaleRow,
} from "@/lib/api/mappers/retail-sale";

// ============================================================================
// Till sales (retail_sales, record_retail_sale — 20260911180840).
//
// A cash sale at the till wrote nothing: `recordSale` pushed onto a fixture
// array. POST records a sale in one database transaction — the sale, each
// line off the shelf, and the money (cash, e-transfer, store credit, a gift
// card) through record_payment; a card charged through Clover beforehand is
// linked by its payment id. The payments must meet the total, or nothing is
// written. A refusal comes back with `reason` (the function's HINT).
// GET lists this facility's sales, newest first.
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
    .from("retail_sales")
    .select(RETAIL_SALE_SELECT)
    .match(inFacility(scope))
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    ((data ?? []) as unknown as RetailSaleRow[]).map(rowToRetailSale),
  );
}

interface SaleLineInput {
  productId?: string;
  variantId?: string;
  name: string;
  variantName?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total?: number;
  taxable?: boolean;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    items?: SaleLineInput[];
    subtotal?: number;
    discount?: number;
    tax?: number;
    tip?: number;
    total?: number;
    tender?: string;
    clientRef?: number;
    paymentIds?: string[];
    payments?: {
      method: string;
      amount: number;
      cashReceived?: number;
      giftCardCode?: string;
      note?: string;
    }[];
    promoCode?: string;
    note?: string;
    cashierName?: string;
  } | null;
  if (!body?.items?.length || !Number.isFinite(body.total)) {
    return NextResponse.json(
      { error: "A sale needs its lines and its total." },
      { status: 422 },
    );
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }
  const supabase = await createServerClient();

  let clientId: string | null = null;
  if (body.clientRef) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("ref", body.clientRef)
      .eq("facility_id", facility.facilityId)
      .maybeSingle();
    if (!client) {
      return NextResponse.json({ error: "No such client." }, { status: 404 });
    }
    clientId = client.id as string;
  }

  const items = body.items.map((i) => ({
    productId: i.productId || null,
    variantId: i.variantId || null,
    name: String(i.name ?? "").slice(0, 200),
    variantName: i.variantName ?? null,
    sku: i.sku ?? "",
    quantity: Math.round(Number(i.quantity)),
    unitPrice: Number(i.unitPrice),
    discount: Number(i.discount ?? 0),
    total: Number(i.total ?? Number(i.unitPrice) * Number(i.quantity)),
    taxable: i.taxable ?? true,
  }));

  const { data, error } = await supabase.rpc("record_retail_sale", {
    p_facility_id: facility.facilityId,
    p_items: items,
    p_subtotal: Number(body.subtotal ?? 0),
    p_discount: Number(body.discount ?? 0),
    p_tax: Number(body.tax ?? 0),
    p_tip: Number(body.tip ?? 0),
    p_total: Number(body.total),
    p_tender: String(body.tender ?? "cash"),
    p_client_id: clientId,
    p_payment_ids: body.paymentIds ?? [],
    p_payments: body.payments ?? [],
    p_promo_code: body.promoCode?.trim() || null,
    p_note: body.note ?? "",
    p_cashier_name: body.cashierName ?? "",
  });
  if (error) {
    return NextResponse.json(
      { error: error.message, reason: error.hint || null },
      { status: error.code === "42501" ? 403 : 409 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}
