import { NextResponse, type NextRequest } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Who earned the tip.
//
// The tip itself is `payments.tip` — collected at checkout, already real. What
// was missing is the other half of the sentence: which of the people who
// handled the pet is owed it. `<TipSplitModal onSave={() => {}} />` computed a
// split to the cent, refused to submit unless it balanced, said "Tip split
// saved", and dropped it.
//
// ── THE COLLECTED TOTAL COMES BACK WITH THE SPLIT ─────────────────────────
//
// Because they are two halves of one question and the modal cannot check its
// own arithmetic without both. It also stops the screen inventing a figure: the
// caller used `invoice?.tipTotal ?? 0`, and before that `?? 5` — a five-dollar
// tip conjured at render time for a booking nobody had tipped on.
//
// ── THE WRITE IS A PUT ────────────────────────────────────────────────────
//
// A split is a whole thing, not a list you append to. Saving it replaces it,
// which is what `set_booking_tip_split` does in one transaction — see
// 20260806940000 for why that cannot be a delete followed by an insert from
// here.
// ============================================================================

export const dynamic = "force-dynamic";

interface AllocationInput {
  staffId: string;
  amount: number;
}

interface SplitInput {
  method?: string;
  allocations?: AllocationInput[];
}

const STATUS_BY_CODE: Record<string, number> = {
  "42501": 403,
  P0002: 404,
  // An unknown method, or a staff member who is not this facility's.
  "22023": 422,
  "23503": 422,
  // More allocated than was ever collected.
  "23514": 409,
};

async function resolveBooking(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  ref: number,
) {
  const { data } = await supabase
    .from("bookings")
    .select("id")
    .eq("ref", ref)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const bookingRef = Number((await params).ref);
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json(
      { error: "That is not a booking reference." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const bookingId = await resolveBooking(supabase, bookingRef);
  if (!bookingId) {
    return NextResponse.json(
      { error: "That booking does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { data: payments, error: paymentsError } = await supabase
    .from("payments")
    .select("tip")
    .eq("booking_id", bookingId);

  if (paymentsError) {
    return NextResponse.json({ error: paymentsError.message }, { status: 500 });
  }

  const { data: rows, error } = await supabase
    .from("booking_tip_allocations")
    .select("id, staff_id, amount, method, author_name, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allocations = (rows ?? []) as {
    id: string;
    staff_id: string;
    amount: number | string;
    method: string;
    author_name: string | null;
    created_at: string;
  }[];

  return NextResponse.json({
    // Signed sum: a refunded payment carries a negative tip, and the tip goes
    // back with it.
    tipCollected: ((payments ?? []) as { tip: number | string }[]).reduce(
      (sum, p) => sum + Number(p.tip ?? 0),
      0,
    ),
    method: allocations[0]?.method ?? null,
    allocations: allocations.map((a) => ({
      id: a.id,
      staffId: a.staff_id,
      amount: Number(a.amount),
      authorName: a.author_name,
      createdAt: a.created_at,
    })),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const bookingRef = Number((await params).ref);
  if (!Number.isFinite(bookingRef)) {
    return NextResponse.json(
      { error: "That is not a booking reference." },
      { status: 422 },
    );
  }

  const body = (await request.json().catch(() => null)) as SplitInput | null;
  if (!body?.method || !Array.isArray(body.allocations)) {
    return NextResponse.json(
      { error: "A split needs a method and a list of allocations." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("set_booking_tip_split", {
    p_booking_ref: bookingRef,
    p_method: body.method,
    // Sent as plain JSON: the RPC reads `staffId` and `amount` off each object
    // and validates both against the database, so the shape is checked where
    // it can actually be enforced rather than here.
    p_allocations: body.allocations.map((a) => ({
      staffId: String(a.staffId),
      amount: Number(a.amount),
    })),
  });

  if (error) {
    const err = error as PostgrestError;
    // The messages are already sentences a person at a counter can act on
    // ("Tips allocated (999.00) exceed the tips collected…"), so only the
    // status is decided here.
    return NextResponse.json(
      { error: err.message },
      { status: STATUS_BY_CODE[err.code] ?? 500 },
    );
  }

  return NextResponse.json({ allocated: data ?? 0 });
}
