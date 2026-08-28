import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import type { RebookHistoryEntry, RebookHistoryPayload } from "@/types/rebook";

// ============================================================================
// What was actually attempted.
//
// ── IT IS THE OUTBOX, NOT A SECOND TABLE ──────────────────────────────────
//
// `message_sends` already records every message this facility has tried to
// send, why it did not go when it did not, and what the customer received. A
// `rebook_history` table would be a copy of that, free to disagree with it —
// which is the exact bug the fixture version had: "Total Sent: 1,392" was a
// literal in a TypeScript file, on a system that had never sent anything.
//
// ── THE STATS ARE COUNTED FROM THE ROWS BELOW THEM ────────────────────────
//
// Not from a separate query, and certainly not from a stored counter. Whatever
// the tiles say, the reader can count the list underneath and get the same
// number — which is the only version of this anybody can trust.
//
// ── "REBOOKED" IS DERIVED, AND IT IS THE POINT ────────────────────────────
//
// A reminder that went out is not a success; a client who came back is. So
// `rebooked_at` is a lateral join in `rebook_history()` onto bookings made
// AFTER the message left, excluding cancelled ones — computed on every read, so
// it cannot go stale and cannot keep crediting a rebook that was later called
// off.
// ============================================================================

export const dynamic = "force-dynamic";

interface HistoryRow {
  send_id: string;
  client_id: string | null;
  client_name: string | null;
  service: string;
  channel: string;
  status: string;
  skip_reason: string | null;
  to_address: string;
  created_at: string;
  sent_at: string | null;
  rebooked_at: string | null;
  rebooked_total: number | string | null;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility in this session." },
      { status: 403 },
    );
  }

  const asked = Number(new URL(request.url).searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(asked)
    ? Math.min(Math.max(Math.trunc(asked), 1), 500)
    : 100;

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("rebook_history", {
    p_facility_id: context.facilityId,
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const entries: RebookHistoryEntry[] = ((data ?? []) as HistoryRow[]).map(
    (row) => ({
      sendId: row.send_id,
      clientId: row.client_id,
      clientName: row.client_name,
      service: row.service,
      channel: row.channel,
      status: row.status,
      skipReason: row.skip_reason,
      toAddress: row.to_address,
      createdAt: row.created_at,
      sentAt: row.sent_at,
      rebookedAt: row.rebooked_at,
      // PostgREST hands numeric back as a STRING. Left as one it would
      // concatenate rather than add, and the revenue tile would read
      // "0125.0038.00".
      rebookedTotal:
        row.rebooked_total === null ? null : Number(row.rebooked_total),
    }),
  );

  const payload: RebookHistoryPayload = {
    entries,
    stats: {
      sent: entries.filter((e) => e.status === "sent").length,
      // 'queued' and 'sending' together: from a reader's side both mean "not
      // yet gone", and separating them would invite the question of which one
      // the tile meant.
      waiting: entries.filter(
        (e) => e.status === "queued" || e.status === "sending",
      ).length,
      skipped: entries.filter(
        (e) => e.status === "skipped" || e.status === "cancelled",
      ).length,
      failed: entries.filter((e) => e.status === "failed").length,
      rebooked: entries.filter((e) => e.rebookedAt !== null).length,
      recoveredRevenue: entries.reduce(
        (total, e) => total + (e.rebookedTotal ?? 0),
        0,
      ),
    },
  };
  return NextResponse.json(payload);
}
