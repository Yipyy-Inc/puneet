import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { loadEstimates } from "@/lib/api/estimates-server";
import {
  estimatePatchSchema,
  estimateTotals,
  linesWithTotals,
  type EstimateRow,
} from "@/lib/api/mappers/estimate";

// ============================================================================
// One estimate: read it (by id, or by the customer's link token), act on it,
// or delete a draft.
//
// Staff act through named ACTIONS rather than a free-form patch, because each
// one is a line in the estimate's history and has its own rule:
//
//   send              draft → sent; stamps the expiry from the facility's
//                     `defaultExpiryDays`. It sends NO message: the screen
//                     copies the customer's link, and says so.
//   accept_on_behalf  sent → accepted, under the signed-in person's name
//   decline           → declined, with the reason
//   convert           accepted/sent → converted, pointing at the booking the
//                     booking pipeline just created (the screen creates it
//                     through /api/bookings, which owns every booking rule)
//   edit              lines, dates, notes; once sent, it is a new VERSION
//                     with the old total kept in `revisions`
//
// Every write reads back through `.select()` — an RLS refusal touches zero
// rows, and `deniedIfUntouched` makes that the 403 it was.
// ============================================================================

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/i;
const DENIED = "You do not have permission to change estimates.";

type RawRow = Pick<
  EstimateRow,
  | "id"
  | "facility_id"
  | "status"
  | "expires_at"
  | "total"
  | "current_version"
  | "revisions"
  | "activity_log"
  | "client_id"
>;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { key } = await params;
  const column = UUID.test(key) ? "id" : TOKEN.test(key) ? "token" : null;
  if (!column) {
    return NextResponse.json({ error: "No such estimate." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const found = await loadEstimates(supabase, (q) => q.eq(column, key));
  if (found.error) {
    return NextResponse.json({ error: found.error }, { status: 500 });
  }
  if (found.data.length === 0) {
    return NextResponse.json({ error: "No such estimate." }, { status: 404 });
  }
  return NextResponse.json(found.data[0]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { key } = await params;
  if (!UUID.test(key)) {
    return NextResponse.json({ error: "No such estimate." }, { status: 404 });
  }

  const parsed = estimatePatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "That is not something an estimate can do.",
        detail: parsed.error.issues,
      },
      { status: 422 },
    );
  }
  const patch = parsed.data;

  const supabase = await createServerClient();
  const { data: current } = await supabase
    .from("estimates")
    .select(
      "id, facility_id, status, expires_at, total, current_version, revisions, activity_log, client_id",
    )
    .eq("id", key)
    .maybeSingle();
  if (!current) {
    return NextResponse.json({ error: "No such estimate." }, { status: 404 });
  }
  const row = current as unknown as RawRow;

  const viewer = await getViewer().catch(() => null);
  const actor = viewer?.fullName ?? viewer?.email ?? "Staff";
  const now = new Date().toISOString();
  const log = (type: string, detail?: string) => [
    ...(Array.isArray(row.activity_log) ? row.activity_log : []),
    { at: now, type, actor, ...(detail ? { detail } : {}) },
  ];
  const expired =
    row.status === "sent" &&
    Boolean(row.expires_at) &&
    new Date(row.expires_at as string).getTime() <= Date.now();

  let update: Record<string, unknown>;

  switch (patch.action) {
    case "send": {
      if (row.status !== "draft" && row.status !== "sent") {
        return NextResponse.json(
          { error: "Only a draft or an open estimate can be sent." },
          { status: 409 },
        );
      }
      const { data: settings } = await supabase
        .from("facility_settings")
        .select("value")
        .eq("facility_id", row.facility_id)
        .eq("domain", "estimate_settings")
        .maybeSingle();
      const days = Number(
        (settings?.value as { defaultExpiryDays?: number } | null)
          ?.defaultExpiryDays ?? 30,
      );
      update = {
        status: "sent",
        sent_at: now,
        sent_via: patch.via,
        expires_at: new Date(
          Date.now() + Math.max(1, days) * 86_400_000,
        ).toISOString(),
        activity_log: log(row.status === "sent" ? "resent" : "sent"),
      };
      break;
    }
    case "accept_on_behalf": {
      if (row.status !== "sent" || expired) {
        return NextResponse.json(
          { error: "Only an open estimate can be accepted." },
          { status: 409 },
        );
      }
      update = {
        status: "accepted",
        accepted_at: now,
        accepted_by: actor,
        accepted_on_behalf: true,
        activity_log: log("accepted", patch.note),
      };
      break;
    }
    case "decline": {
      if (row.status === "converted" || row.status === "declined") {
        return NextResponse.json(
          { error: "That estimate is already closed." },
          { status: 409 },
        );
      }
      update = {
        status: "declined",
        declined_at: now,
        decline_reason: patch.reason || null,
        activity_log: log("declined", patch.reason),
      };
      break;
    }
    case "convert": {
      if (row.status === "converted" || row.status === "declined") {
        return NextResponse.json(
          { error: "That estimate is already closed." },
          { status: 409 },
        );
      }
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, client_id")
        .eq("ref", patch.bookingRef)
        .eq("facility_id", row.facility_id)
        .maybeSingle();
      if (!booking) {
        return NextResponse.json(
          { error: "That booking does not exist at this facility." },
          { status: 422 },
        );
      }
      update = {
        status: "converted",
        converted_booking_id: booking.id,
        converted_at: now,
        activity_log: log("converted", `#${patch.bookingRef}`),
      };
      break;
    }
    case "edit": {
      if (row.status === "converted" || row.status === "declined") {
        return NextResponse.json(
          { error: "A closed estimate cannot be edited." },
          { status: 409 },
        );
      }
      const body = patch.body;
      update = {};
      if (body.service !== undefined) update.service = body.service;
      if (body.serviceType !== undefined)
        update.service_type = body.serviceType;
      if (body.startDate !== undefined) update.start_date = body.startDate;
      if (body.endDate !== undefined) update.end_date = body.endDate;
      if (body.checkInTime !== undefined)
        update.check_in_time = body.checkInTime;
      if (body.checkOutTime !== undefined)
        update.check_out_time = body.checkOutTime;
      if (body.roomType !== undefined) update.room_type = body.roomType;
      if (body.publicNote !== undefined)
        update.public_note = body.publicNote || null;
      if (body.internalNote !== undefined)
        update.internal_note = body.internalNote || null;
      if (body.discountReason !== undefined)
        update.discount_reason = body.discountReason || null;
      if (body.depositRequired !== undefined)
        update.deposit_required = body.depositRequired;
      if (body.lineItems !== undefined) {
        const totals = estimateTotals({
          lineItems: body.lineItems,
          discount: body.discount ?? 0,
          taxRate: body.taxRate ?? 0,
        });
        update.line_items = linesWithTotals(body.lineItems);
        update.subtotal = totals.subtotal;
        update.discount = totals.discount;
        update.tax_rate = body.taxRate ?? 0;
        update.tax_amount = totals.taxAmount;
        update.total = totals.total;
        // Once a customer has seen a price, changing it is a new version.
        if (row.status !== "draft") {
          const version = (row.current_version ?? 1) + 1;
          update.current_version = version;
          update.revisions = [
            ...(Array.isArray(row.revisions) ? row.revisions : []),
            {
              version,
              changedAt: now,
              changedBy: actor,
              changes: patch.changes || "",
              previousTotal: Number(row.total),
              newTotal: totals.total,
            },
          ];
        }
      }
      update.activity_log = log(
        row.status === "draft" ? "edited" : "version",
        patch.changes,
      );
      break;
    }
  }

  const { data, error } = await supabase
    .from("estimates")
    .update(update as never)
    .eq("id", key)
    .select("id");
  if (error) {
    return writeFailure(error, { duplicate: "", denied: DENIED });
  }
  const refused = deniedIfUntouched(data, DENIED);
  if (refused) return refused;

  const updated = await loadEstimates(supabase, (q) => q.eq("id", key));
  return NextResponse.json(updated.data[0] ?? null);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { key } = await params;
  if (!UUID.test(key)) {
    return NextResponse.json({ error: "No such estimate." }, { status: 404 });
  }

  // Only a draft: the policy deletes nothing else, and an estimate a customer
  // has seen is kept as the record of what they were quoted.
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("estimates")
    .delete()
    .eq("id", key)
    .select("id");
  if (error) {
    return writeFailure(error, { duplicate: "", denied: DENIED });
  }
  const refused = deniedIfUntouched(
    data,
    "Only a draft can be deleted; a sent estimate is kept as the record.",
  );
  if (refused) return refused;
  return new NextResponse(null, { status: 204 });
}
