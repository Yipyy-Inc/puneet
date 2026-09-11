import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import { loadEstimates } from "@/lib/api/estimates-server";
import {
  estimateCreateSchema,
  estimateTotals,
  linesWithTotals,
} from "@/lib/api/mappers/estimate";

// ============================================================================
// Estimates: the facility's list, a client's, a customer's own; and a new one.
//
// Replaced `@/data/estimates` — seven invented rows that every estimate screen
// read and nothing could add to (the wizard's "Send" built an estimate and
// stored it nowhere). The rules are the table's (20260911113556): staff read
// with `view_estimates` and write with `create_bookings`; a customer reads
// their own once it is sent.
//
// The facility is the session's for staff (check:facility-from-session), and
// for a client's estimate the database resets it to the client's anyway. The
// totals are recomputed here from the lines — a total sent by the browser is
// a preview, never the quote.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const supabase = await createServerClient();

  // A customer's own, wherever they were given: RLS narrows to them.
  if (params.get("mine") === "1") {
    const estimates = await loadEstimates(supabase, (q) =>
      q.neq("status", "draft"),
    );
    return estimates.error
      ? NextResponse.json({ error: estimates.error }, { status: 500 })
      : NextResponse.json(estimates.data);
  }

  const scope = await activeFacilityIdForStaff();
  const clientRef = params.get("clientRef");
  let clientId: string | null = null;
  if (clientRef !== null) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("ref", Number(clientRef))
      .match(inFacility(scope))
      .maybeSingle();
    if (!client) return NextResponse.json([]);
    clientId = client.id;
  }

  const estimates = await loadEstimates(supabase, (q) => {
    const scoped = q.match(inFacility(scope));
    return clientId ? scoped.eq("client_id", clientId) : scoped;
  });
  return estimates.error
    ? NextResponse.json({ error: estimates.error }, { status: 500 })
    : NextResponse.json(estimates.data);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = estimateCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "That is not an estimate.", detail: parsed.error.issues },
      { status: 422 },
    );
  }
  const body = parsed.data;

  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();

  let clientId: string | null = null;
  if (body.clientRef !== undefined) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("ref", body.clientRef)
      .match(inFacility(facility.facilityId))
      .maybeSingle();
    if (!client) {
      return NextResponse.json(
        { error: "That client does not exist at this facility." },
        { status: 404 },
      );
    }
    clientId = client.id;
  }

  let petIds: string[] = [];
  if (body.petRefs.length > 0) {
    if (!clientId) {
      return NextResponse.json(
        { error: "A guest estimate names no pets on file." },
        { status: 422 },
      );
    }
    const { data: pets } = await supabase
      .from("pets")
      .select("id")
      .in("ref", body.petRefs)
      .eq("client_id", clientId);
    if ((pets ?? []).length !== body.petRefs.length) {
      return NextResponse.json(
        { error: "Every pet on an estimate must be the client's." },
        { status: 422 },
      );
    }
    petIds = (pets ?? []).map((p) => p.id);
  }

  // How long a sent estimate stays open is the facility's decision.
  let expiresAt: string | null = null;
  if (body.send) {
    const { data: settings } = await supabase
      .from("facility_settings")
      .select("value")
      .eq("facility_id", facility.facilityId)
      .eq("domain", "estimate_settings")
      .maybeSingle();
    const days = Number(
      (settings?.value as { defaultExpiryDays?: number } | null)
        ?.defaultExpiryDays ?? 30,
    );
    expiresAt = new Date(
      Date.now() + Math.max(1, days) * 86_400_000,
    ).toISOString();
  }

  const viewer = await getViewer().catch(() => null);
  const actor = viewer?.fullName ?? viewer?.email ?? "Staff";
  const now = new Date().toISOString();
  const totals = estimateTotals(body);

  const { data, error } = await supabase
    .from("estimates")
    .insert({
      // Reset to the client's facility by the trigger when there is a client.
      facility_id: facility.facilityId,
      client_id: clientId,
      guest: clientId ? null : (body.guest ?? null),
      pet_ids: petIds,
      service: body.service,
      service_type: body.serviceType ?? null,
      start_date: body.startDate ?? null,
      end_date: body.endDate ?? body.startDate ?? null,
      check_in_time: body.checkInTime ?? null,
      check_out_time: body.checkOutTime ?? null,
      room_type: body.roomType ?? null,
      line_items: linesWithTotals(body.lineItems),
      subtotal: totals.subtotal,
      discount: totals.discount,
      discount_reason: body.discountReason ?? null,
      tax_rate: body.taxRate,
      tax_amount: totals.taxAmount,
      total: totals.total,
      deposit_required: body.depositRequired ?? null,
      status: body.send ? "sent" : "draft",
      sent_at: body.send ? now : null,
      sent_via: body.send ? "link" : null,
      expires_at: expiresAt,
      public_note: body.publicNote ?? null,
      internal_note: body.internalNote ?? null,
      duplicated_from: body.duplicatedFrom ?? null,
      activity_log: [
        { at: now, type: "created", actor },
        ...(body.send ? [{ at: now, type: "sent", actor }] : []),
      ],
      created_by: user.id,
      created_by_name: actor,
    } as never)
    .select("id")
    .single();

  if (error) {
    return writeFailure(error, {
      duplicate: "That estimate already exists.",
      denied: "You do not have permission to write estimates.",
    });
  }

  const created = await loadEstimates(supabase, (q) =>
    q.eq("id", (data as { id: string }).id),
  );
  return created.error || created.data.length === 0
    ? NextResponse.json(
        { error: created.error ?? "Not found." },
        { status: 500 },
      )
    : NextResponse.json(created.data[0], { status: 201 });
}
