import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";

// ============================================================================
// Things added to a booking at the counter.
//
// Products, add-ons, a late-pickup fee. The booking's own price stays in
// `bookings.total_cost`; these sum into `extras_total`, and `amount_due` is
// the two together (20260806820000). Nothing here touches a total — adding a
// row is what changes the bill.
//
// ── NO PRICE IS ACCEPTED, ONLY A UNIT PRICE AND A QUANTITY ────────────────
//
// `booking_line_items.price` is a generated column. A caller sending a `price`
// that disagreed with its own parts would be describing a line nobody could
// reproduce.
// ============================================================================

export const dynamic = "force-dynamic";

interface LineItemInput {
  kind?: "item" | "fee";
  name?: string;
  unitPrice?: number;
  quantity?: number;
  sourceId?: string;
}

/** Resolve `ref` to the row, through a read the caller must be able to make. */
async function resolveBooking(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  ref: string,
): Promise<{ id: string; facility_id: string } | null> {
  const n = Number(ref);
  if (!Number.isFinite(n)) return null;
  const { data } = await supabase
    .from("bookings")
    .select("id, facility_id")
    .eq("ref", n)
    .maybeSingle();
  return (data as { id: string; facility_id: string } | null) ?? null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const body = (await request.json().catch(() => null)) as {
    items?: LineItemInput[];
  } | null;

  const items = body?.items ?? [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Nothing to add." }, { status: 422 });
  }

  for (const item of items) {
    if (!item.name?.trim()) {
      return NextResponse.json(
        { error: "Every line needs a name." },
        { status: 422 },
      );
    }
    if (!Number.isFinite(item.unitPrice)) {
      return NextResponse.json(
        { error: `"${item.name}" needs a unit price.` },
        { status: 422 },
      );
    }
    if (item.quantity !== undefined && !(item.quantity >= 1)) {
      return NextResponse.json(
        { error: `"${item.name}" needs a quantity of at least 1.` },
        { status: 422 },
      );
    }
  }

  const supabase = await createServerClient();
  const booking = await resolveBooking(supabase, ref);
  if (!booking) {
    return NextResponse.json(
      { error: "That booking does not exist, or is not yours." },
      { status: 404 },
    );
  }

  // One statement, so a basket of four either lands or does not. Two of them
  // arriving is a customer charged for half of what was scanned.
  const { data, error } = await supabase
    .from("booking_line_items")
    .insert(
      items.map((item) => ({
        booking_id: booking.id,
        facility_id: booking.facility_id,
        kind: item.kind ?? "item",
        name: item.name!.trim(),
        unit_price: item.unitPrice!,
        quantity: item.quantity ?? 1,
        source_id: item.sourceId ?? null,
      })) as never,
    )
    .select("id, name, price");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to add items to a bill at this facility.",
      duplicate: "That item is already on this booking.",
    });
  }

  return NextResponse.json({ items: data ?? [] }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Which line should be removed?" },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const booking = await resolveBooking(supabase, ref);
  if (!booking) {
    return NextResponse.json(
      { error: "That booking does not exist, or is not yours." },
      { status: 404 },
    );
  }

  // Scoped to the booking in the URL as well as the id: a line id alone would
  // let a caller remove something from a bill they were not looking at.
  const { data, error } = await supabase
    .from("booking_line_items")
    .delete()
    .eq("id", id)
    .eq("booking_id", booking.id)
    .select("id");

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to change a bill at this facility.",
      duplicate: "That line cannot be removed.",
    });
  }

  const denied = deniedIfUntouched(
    data,
    "Not allowed to remove that line, or it is not on this booking.",
  );
  if (denied) return denied;

  return new NextResponse(null, { status: 204 });
}
