import { NextResponse, after, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { notifyStaff } from "@/lib/notifications/notify-staff";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// POST /api/customer/bookings/[ref]/notes   { kind: "note" | "change_dates", content }
//
// A customer leaves a note on their booking, or asks to change its dates. The
// portal's "Add a note" saved nothing and toasted "Note added", and
// "Reschedule" opened a blank booking form. Rescheduling stays the facility's
// to do; the customer asks, and the desk is told.
//
// public.add_owner_booking_note (20260919170912) decides everything: their own
// booking only, still open, 1-1000 characters, ten a day. The note is a shared
// booking note, so the customer and the staff read the same words.
// ============================================================================

export const dynamic = "force-dynamic";

// Not in the generated types yet — the same shape require-forms.ts uses.
type UntypedRpc = (
  fn: "add_owner_booking_note",
  args: Record<string, unknown>,
) => PromiseLike<{
  data: unknown;
  error: { code?: string; message: string } | null;
}>;

const STATUS_BY_CODE: Record<string, number> = {
  P0002: 404,
  "22023": 422,
  "55000": 409,
  "54000": 429,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { ref } = await params;
  if (!/^\d{1,12}$/.test(ref)) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    kind?: string;
    content?: string;
  };
  const kind = body.kind === "change_dates" ? "change_dates" : "note";

  const supabase = await createServerClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;
  const { data, error } = await rpc("add_owner_booking_note", {
    p_ref: Number(ref),
    p_kind: kind,
    p_content: body.content ?? "",
  });
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: STATUS_BY_CODE[error.code ?? ""] ?? 500 },
    );
  }

  const { data: booked } = await supabase
    .from("bookings")
    .select("id, facility_id, service, start_at, clients ( name )")
    .eq("ref", Number(ref))
    .maybeSingle();
  const row = booked as unknown as {
    id: string;
    facility_id: string;
    service: string;
    start_at: string;
    clients: { name: string | null } | null;
  } | null;
  if (row) {
    after(() =>
      notifyStaff({
        facilityId: row.facility_id,
        kind:
          kind === "change_dates"
            ? "booking_change_requested"
            : "booking_customer_note",
        params: {
          client: row.clients?.name ?? undefined,
          service: row.service,
          date: row.start_at?.slice(0, 10),
        },
        link: `/facility/dashboard/bookings/${ref}`,
        sourceId: String(data ?? row.id),
        dedupeKey: `${kind}:${String(data ?? "")}`,
        actorProfileId: viewer.userId,
        request,
      }),
    );
  }

  return NextResponse.json({ id: String(data ?? "") }, { status: 201 });
}
