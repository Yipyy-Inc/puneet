import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { writeFailure } from "@/lib/api/write-failure";
import {
  CUSTOMER_PACKAGE_SELECT,
  rowToCustomerPackage,
  type CustomerPackageRow,
  type PackageStatusRow,
  type PoolStatusRow,
  type RefMaps,
} from "@/lib/api/mappers/customer-packages";

// ============================================================================
// What customers own: list it, sell one.
//
// ── THE SALE IS ONE RPC CALL, NOT THREE WRITES ────────────────────────────
//
// POST does not insert anything. It resolves the client and the package and
// calls `purchase_package` (20260806380000), which copies name, price, validity
// and pools out of the catalogue inside a single transaction.
//
// The route deliberately has no way to say what a package costs. A price that
// arrives in a request body is a price the browser chose, and the one thing a
// purchase must not do is take the buyer's word for what they owe. The only
// caller-supplied money is `priceOverride`, for a negotiated sale — still
// snapshotted, still checked against zero in the function.
//
// ── THE COUNTS COME BACK FROM VIEWS, NOT FROM ARITHMETIC HERE ─────────────
//
// GET reads the rows, then `customer_package_status` and
// `customer_package_pool_status`. Three round trips instead of one, and worth
// it: the alternative is summing the ledger in TypeScript, which is the
// duplicate-counter problem this schema exists to remove.
// ============================================================================

export const dynamic = "force-dynamic";

/** Resolve the uuids the ledger stores back to the numeric ids the app uses.
 *  Only ids actually present are looked up — no query when the ledger is
 *  empty, which is the common case for a freshly sold package. */
async function resolveRefs(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  rows: CustomerPackageRow[],
): Promise<RefMaps> {
  const petIds = new Set<string>();
  const bookingIds = new Set<string>();
  for (const row of rows) {
    for (const entry of row.package_pass_entries ?? []) {
      if (entry.pet_id) petIds.add(entry.pet_id);
      if (entry.booking_id) bookingIds.add(entry.booking_id);
    }
  }

  const pets = new Map<string, number>();
  const bookings = new Map<string, number>();

  if (petIds.size > 0) {
    const { data } = await supabase
      .from("pets")
      .select("id, ref")
      .in("id", [...petIds]);
    for (const pet of data ?? []) pets.set(pet.id, pet.ref);
  }
  if (bookingIds.size > 0) {
    const { data } = await supabase
      .from("bookings")
      .select("id, ref")
      .in("id", [...bookingIds]);
    for (const booking of data ?? []) bookings.set(booking.id, booking.ref);
  }

  return { pets, bookings };
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const clientRef = request.nextUrl.searchParams.get("clientId");
  const supabase = await createServerClient();

  let query = supabase
    .from("customer_packages")
    .select(CUSTOMER_PACKAGE_SELECT)
    .order("purchased_at", { ascending: false });

  // Filtering through the embedded client keeps one code path for both the
  // "everything" and "one client" reads — the alternative is resolving the
  // client uuid first and branching.
  if (clientRef && /^\d+$/.test(clientRef)) {
    query = query.eq("clients.ref", Number(clientRef));
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as CustomerPackageRow[];
  if (rows.length === 0) return NextResponse.json([]);

  const ids = rows.map((r) => r.id);
  const [{ data: statuses }, { data: pools }, refs] = await Promise.all([
    supabase.from("customer_package_status").select("*").in("id", ids),
    supabase
      .from("customer_package_pool_status")
      .select("*")
      .in("customer_package_id", ids),
    resolveRefs(supabase, rows),
  ]);

  const statusById = new Map<string, PackageStatusRow>(
    ((statuses ?? []) as unknown as PackageStatusRow[]).map((s) => [s.id, s]),
  );
  const poolsByPackage = new Map<string, PoolStatusRow[]>();
  for (const pool of (pools ?? []) as unknown as PoolStatusRow[]) {
    const list = poolsByPackage.get(pool.customer_package_id) ?? [];
    list.push(pool);
    poolsByPackage.set(pool.customer_package_id, list);
  }

  return NextResponse.json(
    rows.map((row) =>
      rowToCustomerPackage(
        row,
        statusById.get(row.id),
        poolsByPackage.get(row.id) ?? [],
        refs,
      ),
    ),
  );
}

/**
 * True when the signed-in session IS the customer this client row belongs to.
 *
 * Asks `profile_id` directly rather than inferring from visibility: a client
 * row is visible to its own customer AND to the facility's staff, so "I can
 * see it" is not "it is mine". Getting that wrong here would hand every
 * receptionist a free-package button.
 */
async function callerOwnsClient(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  clientId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("clients")
    .select("profile_id")
    .eq("id", clientId)
    .maybeSingle();
  return (data as { profile_id: string | null } | null)?.profile_id === userId;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as {
    clientId?: number;
    packageId?: string;
    priceOverride?: number;
  } | null;

  if (!input?.clientId || !input.packageId) {
    return NextResponse.json(
      { error: "A purchase needs a client and a package." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("ref", input.clientId)
    .maybeSingle();
  if (!client) {
    return NextResponse.json({ error: "No such client." }, { status: 404 });
  }

  // The catalogue id the app carries is the legacy id (`gpp-*`) for seeded
  // packages and the uuid for anything created since.
  const byLegacy = await supabase
    .from("prepaid_packages")
    .select("id")
    .eq("legacy_id", input.packageId)
    .maybeSingle();
  let packageId = byLegacy.data?.id as string | undefined;
  if (!packageId && /^[0-9a-f-]{36}$/i.test(input.packageId)) {
    const byId = await supabase
      .from("prepaid_packages")
      .select("id")
      .eq("id", input.packageId)
      .maybeSingle();
    packageId = byId.data?.id as string | undefined;
  }
  if (!packageId) {
    return NextResponse.json({ error: "No such package." }, { status: 404 });
  }

  // ── WHO IS ALLOWED TO SELL, AND WHY A CUSTOMER IS NOT ────────────────────
  //
  // Staff sell through their own privileges: `purchase_package` is SECURITY
  // INVOKER, so `financial_take_payment` decides, and a groomer is refused.
  //
  // A customer buying from the portal has no such permission and deliberately
  // never will (20260806460000). A row in `customer_packages` is a package
  // somebody paid for; if a client could write one, a client could grant
  // themselves passes for nothing — from the checkout screen today, and from
  // any client-side query for the rest of the project's life.
  //
  // So their purchase runs with the service-role client, AFTER checking the
  // session owns that client row. The check is the authorisation: without it
  // this route would let any signed-in person buy a package in anybody's name.
  //
  // The gap this leaves, stated rather than buried: nothing here takes payment.
  // That was equally true of the mock. What changed is that the capability now
  // lives in one server route that a payment gate can be added to, instead of
  // in every browser holding a session.
  const ownsClient = await callerOwnsClient(supabase, client.id, user.id);
  let executor = supabase;
  if (!ownsClient) {
    // Not their own — fall through to the caller's own permissions, which is
    // the staff path and refuses if they have none.
  } else if (hasServiceRoleKey()) {
    executor = createAdminClient() as unknown as typeof supabase;
  }

  const { data, error } = await executor.rpc("purchase_package", {
    p_client_id: client.id,
    p_package_id: packageId,
    p_price_override: input.priceOverride ?? undefined,
  });

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to sell packages at this facility.",
      duplicate: "That purchase already exists.",
    });
  }

  return NextResponse.json({ id: data as string }, { status: 201 });
}
