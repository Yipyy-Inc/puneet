import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Spending one pass.
//
// ── THE CALLER NAMES THE POOL ─────────────────────────────────────────────
//
// `serviceId` is required, not defaulted. The old mock spent "the first pass"
// (`pkg.passes[0]`), which was harmless only because every fixture package held
// exactly one service — and quietly wrong the moment a real bundle held two: a
// customer booking a bath would have had a Full Groom pass taken instead, worth
// nearly twice as much.
//
// Guessing here would reintroduce that. If a screen does not know which pool it
// is spending from, that screen has a bug the database cannot fix for it.
//
// ── THE CHECK AND THE WRITE ARE THE SAME STATEMENT ────────────────────────
//
// This route does not read the balance and then decide. `redeem_package_pass`
// locks the purchase, checks expiry and the pool, and appends -1, all inside
// one transaction. Two tills closing at once cannot both spend the last pass —
// the second waits and finds it gone, rather than acting on a stale read.
//
// The refusals come back as messages a person at a counter can act on, because
// that is who reads them: "No passes left for that service" and "That package
// has expired" are different problems with different answers.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as {
    customerPackageId?: string;
    serviceId?: string;
    serviceLabel?: string;
    bookingId?: number;
    petId?: number;
    petName?: string;
  } | null;

  if (!input?.customerPackageId || !input.serviceId) {
    return NextResponse.json(
      { error: "A redemption needs a package and a service." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const byLegacy = await supabase
    .from("customer_packages")
    .select("id")
    .eq("legacy_id", input.customerPackageId)
    .maybeSingle();
  let packageId = byLegacy.data?.id as string | undefined;
  if (!packageId && /^[0-9a-f-]{36}$/i.test(input.customerPackageId)) {
    const byId = await supabase
      .from("customer_packages")
      .select("id")
      .eq("id", input.customerPackageId)
      .maybeSingle();
    packageId = byId.data?.id as string | undefined;
  }
  if (!packageId) {
    return NextResponse.json({ error: "No such package." }, { status: 404 });
  }

  // The ledger stores uuids; the app carries numeric ids. Both are optional —
  // a pass can be spent at the counter with no booking attached.
  let petUuid: string | undefined;
  if (input.petId) {
    const { data } = await supabase
      .from("pets")
      .select("id")
      .eq("ref", input.petId)
      .maybeSingle();
    petUuid = data?.id;
  }
  let bookingUuid: string | undefined;
  if (input.bookingId) {
    const { data } = await supabase
      .from("bookings")
      .select("id")
      .eq("ref", input.bookingId)
      .maybeSingle();
    bookingUuid = data?.id;
  }

  const { data, error } = await supabase.rpc("redeem_package_pass", {
    p_customer_package_id: packageId,
    p_service_id: input.serviceId,
    p_service_label: input.serviceLabel ?? "",
    p_booking_id: bookingUuid,
    p_pet_id: petUuid,
    p_pet_name: input.petName,
  });

  if (error) {
    // 23514 is the function's own refusals — expired, empty pool, no such pool.
    // Its message is written for the counter, so it is passed through.
    const status = error.code === "42501" ? 403 : 409;
    return NextResponse.json(
      { error: error.message || "That pass could not be redeemed." },
      { status },
    );
  }

  return NextResponse.json({ passesLeft: data as number });
}
