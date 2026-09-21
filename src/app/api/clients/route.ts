import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  CLIENT_SELECT,
  clientToRow,
  rowToClient,
} from "@/lib/api/mappers/client";
import {
  activeFacilityIdForStaff,
  getFacilityContext,
  inFacility,
} from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import type { Client } from "@/types/client";
import {
  describeCandidates,
  possibleDuplicates,
  type DuplicateCandidate,
} from "@/lib/clients/possible-duplicate";

// ============================================================================
// Clients, with their pets nested — the shape Client already has.
//
// One query with a join rather than two and a stitch: `client.pets` is how
// every consumer reads it, and doing the join per caller is the same work done
// worse, N times.
//
// RLS decides what comes back. Staff need `view_clients`; a customer sees the
// single record linked to their account. Neither is enforced here.
//
// WHAT MAY BE WRITTEN is decided BELOW this file, in the database
// (20260803090000). `clients_update` admits the record's owner, and RLS gates
// rows rather than columns — so without the trigger there, a blocked customer
// could clear their own balance and unblock themselves. PostgREST is reachable
// directly with the anon key and a session cookie; this file is a convenience,
// not a gate.
// ============================================================================

export const dynamic = "force-dynamic";

/**
 * The mock Client identifies its facility by NAME, so resolve it once.
 *
 * Via getFacilityContext, which takes the facility from the caller's
 * membership. This used to ask for `legacy_id = "11"` directly — and
 * `facilities_read` refuses that row to anyone who is not a member of the demo
 * facility, so for a second facility's staff `maybeSingle()` returned null and
 * every client in their list came back labelled "Example Pet Care Facility".
 */
async function facilityName(): Promise<string> {
  const context = await getFacilityContext();
  return context?.name ?? "Example Pet Care Facility";
}

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();

  const [{ data, error }, name] = await Promise.all([
    supabase
      .from("clients")
      .select(CLIENT_SELECT)
      .match(inFacility(scope))
      .order("ref"),
    facilityName(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.map((row) => rowToClient(row, name)));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const input = (await request.json()) as Partial<Client>;

  if (!input.name?.trim() || !input.email?.trim()) {
    return NextResponse.json(
      { error: "A name and an email address are required." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }

  // ── ALREADY A CLIENT HERE, UNDER ANOTHER ADDRESS? ───────────────────────
  //
  // A facility cannot hold two clients with the same email, so every duplicate
  // that gets made has a DIFFERENT address on it — which is the one case
  // nothing could see. One happened on 2026-09-21 at doggieville-mtl: refs 855
  // and 92037410, both "Parminder Singh", each with a dog called Bubu, made
  // while working around a login problem.
  //
  // A question, never a block: two people really can share a name, so this
  // asks somebody who can see both records and then does as it is told.
  //
  // Matched case- and accent-insensitively on the NAME, and on the phone when
  // there is one. The name leads because it is what actually matched in the
  // case above — 855 carries a phone and 92037410 does not, so a phone-only
  // check would have missed it. A phone stored in a different FORMAT is not
  // caught here; that needs normalising in SQL, and the debt map says so.
  const confirmed = request.nextUrl.searchParams.get("confirm") === "duplicate";

  if (!confirmed) {
    const byName = await supabase
      .from("clients")
      .select("ref, name, email, phone")
      .match(inFacility(facility.facilityId))
      .ilike("name", input.name.trim());

    const phone = (input.phone ?? "").trim();
    const byPhone = phone
      ? await supabase
          .from("clients")
          .select("ref, name, email, phone")
          .match(inFacility(facility.facilityId))
          .eq("phone", phone)
      : { data: [] as NonNullable<typeof byName.data> };

    const seen = new Map<number, DuplicateCandidate>();
    for (const row of [...(byName.data ?? []), ...(byPhone.data ?? [])]) {
      seen.set(row.ref, row);
    }

    const candidates = possibleDuplicates(
      { name: input.name, email: input.email, phone: input.phone },
      [...seen.values()],
    );

    if (candidates.length > 0) {
      return NextResponse.json(
        {
          error:
            `${describeCandidates(candidates)} ` +
            `${candidates.length === 1 ? "is" : "are"} already a client here, ` +
            "under a different email address.",
          reason:
            "If this is the same person, open that record and correct its " +
            "email instead. If it is somebody else, repeat this with " +
            "?confirm=duplicate.",
          candidates,
        },
        { status: 422 },
      );
    }
  }

  // The facility comes from the server's context, never from the request.
  // `clients_insert` checks create_clients AT THE ROW'S facility, so trusting a
  // request field here would let a caller aim the check at a facility they do
  // hold it for and write the row into one they do not.
  const row = clientToRow(input, { facilityId: facility.facilityId });

  const { data: created, error } = await supabase
    .from("clients")
    .insert(row as never)
    .select(CLIENT_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to add clients at this facility.",
      duplicate: "Someone with that email is already a client here.",
    });
  }

  return NextResponse.json(rowToClient(created, await facilityName()), {
    status: 201,
  });
}
