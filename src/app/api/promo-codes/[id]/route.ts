import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { writeFailure } from "@/lib/api/write-failure";
import {
  PROMO_CODE_SELECT,
  promoCodeToColumns,
  rowToPromoCode,
  type PromoCodeRow,
} from "@/lib/api/mappers/promo-code";
import type { MarketingPromoCode } from "@/types/marketing";

// One promo code: edit it (or switch it off) or delete it. Deleting a code
// keeps its history — a redemption's `promo_code_id` is ON DELETE SET NULL and
// it keeps the code it was (20260911173538).

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
  const input = (await request
    .json()
    .catch(() => null)) as Partial<MarketingPromoCode> | null;
  const columns = input ? promoCodeToColumns(input) : {};
  if (Object.keys(columns).length === 0) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 422 });
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .update(columns as never)
    .eq("id", id)
    .select(PROMO_CODE_SELECT);
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to manage promo codes at this facility.",
      duplicate: "That code already exists.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "Not allowed to change this promo code.",
  );
  if (denied) return denied;
  const { count } = await supabase
    .from("promo_code_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", id);
  return NextResponse.json(
    rowToPromoCode((data as unknown as PromoCodeRow[])[0], count ?? 0),
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
    .from("promo_codes")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to delete this promo code.",
      duplicate: "That promo code cannot be deleted.",
    });
  }
  const denied = deniedIfUntouched(
    data,
    "Not allowed to delete this promo code.",
  );
  if (denied) return denied;
  return new NextResponse(null, { status: 204 });
}
