import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// GET /api/facilities/[id]/bookings — one facility's bookings, for the
// superadmin's facility page.
//
// Paged, because a busy facility has thousands: `?page=` and `?pageSize=`
// with a count, newest first. `?status=` narrows to one status and `?q=`
// matches a booking number or, through `booking_search_names`
// (20260914200143), the client's name or any pet's.
//
// Platform members only, and read-only: bookings_read admits a platform
// member to every facility's bookings, and since 20260919195116 only a
// superadmin may write one — in the facility's own screens.
// ============================================================================

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export interface AdminFacilityBookingRow {
  ref: number;
  clientName: string | null;
  petNames: string[];
  service: string;
  status: string;
  paymentStatus: string | null;
  startAt: string;
  endAt: string;
  amountDue: number;
  amountPaid: number;
}

export interface AdminFacilityBookingsPage {
  rows: AdminFacilityBookingRow[];
  total: number;
  page: number;
  pageSize: number;
  /** The facility's own clock, for reading the times. */
  timezone: string;
}

const positive = (value: string | null, fallback: number, max: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? Math.min(n, max) : fallback;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      {
        error: "Only a platform administrator may view a facility's bookings.",
      },
      { status: 403 },
    );
  }

  const { id } = await params;
  const search = request.nextUrl.searchParams;
  const page = positive(search.get("page"), 1, 10_000);
  const pageSize = positive(search.get("pageSize"), PAGE_SIZE, MAX_PAGE_SIZE);
  const status = search.get("status");
  const q = (search.get("q") ?? "").trim();

  const supabase = await createServerClient();
  let query = supabase
    .from("bookings")
    .select(
      "ref, service, status, payment_status, start_at, end_at, amount_due, amount_paid, clients ( name ), booking_pets ( pets ( name ) )",
      { count: "exact" },
    )
    .eq("facility_id", id);

  if (status) query = query.eq("status", status as never);
  if (q) {
    query = /^#?\d+$/.test(q)
      ? query.eq("ref", Number(q.replace("#", "")))
      : query.ilike("booking_search_names", `%${q.replace(/[%_]/g, "")}%`);
  }

  const offset = (page - 1) * pageSize;
  const [{ data, error, count }, { data: facility }] = await Promise.all([
    query
      .order("start_at", { ascending: false })
      .range(offset, offset + pageSize - 1),
    supabase.from("facilities").select("timezone").eq("id", id).maybeSingle(),
  ]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as Array<{
    ref: number;
    service: string;
    status: string;
    payment_status: string | null;
    start_at: string;
    end_at: string;
    amount_due: number | string;
    amount_paid: number | string;
    clients: { name: string | null } | null;
    booking_pets: Array<{ pets: { name: string | null } | null }> | null;
  }>;

  const body: AdminFacilityBookingsPage = {
    rows: rows.map((r) => ({
      ref: r.ref,
      clientName: r.clients?.name ?? null,
      petNames: (r.booking_pets ?? [])
        .map((bp) => bp.pets?.name)
        .filter((name): name is string => Boolean(name)),
      service: r.service,
      status: r.status,
      paymentStatus: r.payment_status,
      startAt: r.start_at,
      endAt: r.end_at,
      amountDue: Number(r.amount_due ?? 0),
      amountPaid: Number(r.amount_paid ?? 0),
    })),
    total: count ?? 0,
    page,
    pageSize,
    timezone:
      (facility as { timezone: string | null } | null)?.timezone ?? "UTC",
  };
  return NextResponse.json(body);
}
