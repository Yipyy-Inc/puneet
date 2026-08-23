import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";
import {
  CLOSED_STATUSES,
  OPEN_STATUSES,
} from "@/lib/merchant-application/review";

// ============================================================================
// The review queue: every merchant application, for the people who work them.
//
// ── IT READS THROUGH RLS, NOT AROUND IT ───────────────────────────────────
//
// No admin client anywhere in this file. `merchant_applications_read` already
// admits `private.is_platform_admin()`, so the caller's own session is enough
// and the database is still the boundary. The `isPlatformAdmin` check below is
// there to answer 403 in one sentence rather than returning an empty list that
// looks like "no applications" — it is a courtesy, not the gate.
//
// That distinction matters here more than usual. Reaching for the service role
// would mean this route, not Postgres, deciding who may read a stranger's date
// of birth and home address. The one place a service_role client IS used in
// this feature is the submit path, and it is used for one write on a row the
// caller has already been authorised against.
//
// ── OPEN WORK FIRST, CLOSED WORK BEHIND A SWITCH ──────────────────────────
//
// Rejected and withdrawn applications accumulate for ever and are read roughly
// never. A queue that lists them by default is a queue where the three rows
// that need somebody are on page two by the end of the quarter. `?scope=all`
// asks for the rest.
// ============================================================================

const LIST_SELECT =
  "id, facility_id, status, status_detail, external_reference, legal_name, trading_name, country, submitted_at, decided_at, created_at, updated_at, signed_name, estimated_monthly_volume_cents, purged_at, facilities(name, slug)";

interface ListRow {
  id: string;
  facility_id: string;
  status: string;
  status_detail: string | null;
  external_reference: string | null;
  legal_name: string | null;
  trading_name: string | null;
  country: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string | null;
  signed_name: string | null;
  estimated_monthly_volume_cents: number | null;
  purged_at: string | null;
  // PostgREST returns a to-ONE relation as an object, not an array. Reading it
  // as an array yields undefined for every row and a table of blanks with no
  // error anywhere — a mistake this repo has already paid for once.
  facilities: { name: string | null; slug: string | null } | null;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (!viewer.isPlatformAdmin) {
    return NextResponse.json(
      { error: "Only Yipyy staff can open the review queue." },
      { status: 403 },
    );
  }

  const scope = request.nextUrl.searchParams.get("scope") ?? "open";
  const supabase = await createServerClient();

  let query = supabase
    .from("merchant_applications")
    .select(LIST_SELECT)
    // A draft is nobody's work: the facility has not submitted it and may never
    // do so. Listing drafts would put a half-typed form in a reviewer's queue.
    .neq("status", "draft");

  if (scope !== "all") {
    query = query.in("status", OPEN_STATUSES);
  }

  const { data, error } = await query
    // Oldest submission first. A queue sorted newest-first is one where the
    // application that has been waiting longest is hardest to find.
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as ListRow[];

  return NextResponse.json({
    scope: scope === "all" ? "all" : "open",
    // Both counts, always, so the screen can offer "show closed (14)" without a
    // second request — and so a reviewer looking at an empty open queue can see
    // that closed work exists rather than wondering if the page is broken.
    counts: {
      open: rows.filter((r) => OPEN_STATUSES.includes(r.status as never))
        .length,
      closed: rows.filter((r) => CLOSED_STATUSES.includes(r.status as never))
        .length,
    },
    applications: rows.map((row) => ({
      id: row.id,
      facilityId: row.facility_id,
      facilityName: row.facilities?.name ?? null,
      facilitySlug: row.facilities?.slug ?? null,
      status: row.status,
      statusDetail: row.status_detail,
      externalReference: row.external_reference,
      legalName: row.legal_name,
      tradingName: row.trading_name,
      country: row.country,
      submittedAt: row.submitted_at,
      decidedAt: row.decided_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      signedName: row.signed_name,
      estimatedMonthlyVolumeCents: row.estimated_monthly_volume_cents,
      purgedAt: row.purged_at,
    })),
  });
}
