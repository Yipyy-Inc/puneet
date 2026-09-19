import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/time/facility-time";

// ============================================================================
// GET /api/admin/bookings/[ref] — one booking, in full, for Yipyy's own team:
// the facility, the client and pets, the price, what was added, what was paid
// and how, and where it stands.
//
// Read-only by design. A platform member may READ every facility's bookings
// (bookings_read, booking_line_items_read and payments_read all admit
// is_platform_admin); since 20260919195116 only a superadmin may write one,
// and that happens in the facility's own screens, not here.
// ============================================================================

export const dynamic = "force-dynamic";

export interface AdminBookingDetail {
  ref: number;
  facility: {
    id: string;
    name: string;
    slug: string | null;
    /** Times are read on the facility's own clock. */
    timezone: string;
  };
  client: { name: string | null; email: string | null; phone: string | null };
  pets: string[];
  service: string;
  serviceType: string | null;
  status: string;
  paymentStatus: string | null;
  startAt: string;
  endAt: string;
  totalCost: number;
  discount: number;
  amountDue: number;
  amountPaid: number;
  specialRequests: string | null;
  createdAt: string;
  lines: Array<{ name: string; quantity: number; price: number }>;
  payments: Array<{
    at: string;
    method: string;
    amount: number;
    tip: number;
    cardBrand: string | null;
    cardLast4: string | null;
  }>;
}

const n = (v: number | string | null | undefined) => Number(v ?? 0);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only Yipyy's team may read any facility's bookings." },
      { status: 403 },
    );
  }

  const { ref } = await params;
  if (!/^\d{1,12}$/.test(ref)) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      "id, ref, service, service_type, status, payment_status, start_at, end_at, total_cost, discount, amount_due, amount_paid, special_requests, created_at, facilities ( id, name, slug, timezone ), clients ( name, email, phone ), booking_pets ( pets ( name ) )",
    )
    .eq("ref", Number(ref))
    .maybeSingle();
  const row = data as unknown as {
    id: string;
    ref: number;
    service: string;
    service_type: string | null;
    status: string;
    payment_status: string | null;
    start_at: string;
    end_at: string;
    total_cost: number | string;
    discount: number | string | null;
    amount_due: number | string;
    amount_paid: number | string;
    special_requests: string | null;
    created_at: string;
    facilities: {
      id: string;
      name: string;
      slug: string | null;
      timezone: string | null;
    } | null;
    clients: {
      name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
    booking_pets: Array<{ pets: { name: string | null } | null }> | null;
  } | null;
  if (!row || !row.facilities) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  const [{ data: lines }, { data: payments }] = await Promise.all([
    supabase
      .from("booking_line_items")
      .select("name, quantity, price, unit_price")
      .eq("booking_id", row.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select("created_at, method, grand_total, tip, card_brand, card_last4")
      .eq("booking_id", row.id)
      .order("created_at", { ascending: true }),
  ]);

  const detail: AdminBookingDetail = {
    ref: row.ref,
    facility: {
      ...row.facilities,
      timezone: row.facilities.timezone ?? DEFAULT_TIMEZONE,
    },
    client: {
      name: row.clients?.name ?? null,
      email: row.clients?.email ?? null,
      phone: row.clients?.phone ?? null,
    },
    pets: (row.booking_pets ?? [])
      .map((bp) => bp.pets?.name)
      .filter((name): name is string => Boolean(name)),
    service: row.service,
    serviceType: row.service_type,
    status: row.status,
    paymentStatus: row.payment_status,
    startAt: row.start_at,
    endAt: row.end_at,
    totalCost: n(row.total_cost),
    discount: n(row.discount),
    amountDue: n(row.amount_due),
    amountPaid: n(row.amount_paid),
    specialRequests: row.special_requests,
    createdAt: row.created_at,
    lines: (
      (lines ?? []) as Array<{
        name: string;
        quantity: number;
        price: number | string | null;
        unit_price: number | string;
      }>
    ).map((l) => ({
      name: l.name,
      quantity: l.quantity,
      price: l.price === null ? n(l.unit_price) * l.quantity : n(l.price),
    })),
    payments: (
      (payments ?? []) as Array<{
        created_at: string;
        method: string;
        grand_total: number | string;
        tip: number | string | null;
        card_brand: string | null;
        card_last4: string | null;
      }>
    ).map((p) => ({
      at: p.created_at,
      method: p.method,
      amount: n(p.grand_total),
      tip: n(p.tip),
      cardBrand: p.card_brand,
      cardLast4: p.card_last4,
    })),
  };
  return NextResponse.json(detail);
}
