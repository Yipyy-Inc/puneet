import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { writeFailure } from "@/lib/api/write-failure";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import type { Json } from "@/types/database";

// ============================================================================
// A day's Daily Care floor records: shift notes, pet flags, head counts.
//
// They were Maps in one browser tab keyed by a hard-coded facility id
// (20260910230626 says what that cost). The board keeps its synchronous
// stores as a CACHE of this route: it hydrates them from GET and writes each
// change through POST or DELETE.
//
// A flag and a head count are one per subject per day, so a POST for one that
// exists updates it rather than adding a second (the table refuses a second
// anyway). A shift note is always a new row.
// ============================================================================

export const dynamic = "force-dynamic";

const KINDS = ["shift_note", "pet_flag", "head_count"] as const;
type Kind = (typeof KINDS)[number];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export interface DailyCareRecord {
  id: string;
  kind: Kind;
  subject: string;
  payload: Record<string, unknown>;
  createdByName: string | null;
  createdAt: string;
}

const SELECT = "id, kind, subject, payload, created_by_name, created_at";

type Row = {
  id: string;
  kind: Kind;
  subject: string;
  payload: Record<string, unknown> | null;
  created_by_name: string | null;
  created_at: string;
};

const toRecord = (row: Row): DailyCareRecord => ({
  id: row.id,
  kind: row.kind,
  subject: row.subject,
  payload: row.payload ?? {},
  createdByName: row.created_by_name,
  createdAt: row.created_at,
});

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const date = request.nextUrl.searchParams.get("date") ?? "";
  if (!ISO_DAY.test(date)) {
    return NextResponse.json({ error: "Name a day." }, { status: 422 });
  }

  const scope = await activeFacilityIdForStaff();
  if (!scope) return NextResponse.json([]);

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("daily_care_records")
    .select(SELECT)
    .match(inFacility(scope))
    .eq("occurred_on", date)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(((data ?? []) as unknown as Row[]).map(toRecord));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    date?: string;
    kind?: string;
    subject?: string;
    payload?: Record<string, unknown>;
  } | null;
  const kind = body?.kind as Kind | undefined;
  if (
    !body?.date ||
    !ISO_DAY.test(body.date) ||
    !kind ||
    !KINDS.includes(kind) ||
    (kind !== "shift_note" && !body.subject)
  ) {
    return NextResponse.json(
      { error: "That is not a Daily Care record." },
      { status: 422 },
    );
  }
  const payload = (body.payload ?? {}) as Json;

  // From the session, never the request — check:facility-from-session.
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const viewer = await getViewer().catch(() => null);
  const subject = kind === "shift_note" ? "" : String(body.subject);
  const denied = "You do not have permission to write on this board.";

  if (kind !== "shift_note") {
    const { data: existing } = await supabase
      .from("daily_care_records")
      .select("id")
      .eq("facility_id", facility.facilityId)
      .eq("occurred_on", body.date)
      .eq("kind", kind)
      .eq("subject", subject)
      .maybeSingle();
    if (existing) {
      const { data, error } = await supabase
        .from("daily_care_records")
        .update({ payload })
        .eq("id", (existing as { id: string }).id)
        .select(SELECT);
      if (error) return writeFailure(error, { duplicate: denied, denied });
      const refused = deniedIfUntouched(data, denied);
      if (refused) return refused;
      return NextResponse.json(toRecord((data as unknown as Row[])[0]));
    }
  }

  const { data, error } = await supabase
    .from("daily_care_records")
    .insert({
      facility_id: facility.facilityId,
      occurred_on: body.date,
      kind,
      subject,
      payload,
      created_by_name: viewer?.fullName ?? viewer?.email ?? null,
    })
    .select(SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      duplicate: "That is already on today's board.",
      denied,
    });
  }
  return NextResponse.json(toRecord(data as unknown as Row), { status: 201 });
}

/** Take a pet's flag down. Only flags come down — notes and counts stay. */
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;
  const date = params.get("date") ?? "";
  const subject = params.get("subject") ?? "";
  if (!ISO_DAY.test(date) || !subject) {
    return NextResponse.json(
      { error: "Name a day and a pet." },
      { status: 422 },
    );
  }

  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("daily_care_records")
    .delete()
    .eq("facility_id", facility.facilityId)
    .eq("occurred_on", date)
    .eq("kind", "pet_flag")
    .eq("subject", subject)
    .select("id");

  const denied = "You do not have permission to write on this board.";
  if (error) return writeFailure(error, { duplicate: denied, denied });
  const refused = deniedIfUntouched(data, denied);
  if (refused) return refused;
  return new NextResponse(null, { status: 204 });
}
