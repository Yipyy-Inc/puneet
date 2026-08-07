import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { CLIENT_SELECT, rowToClient } from "@/lib/api/mappers/client";
import { getFacilityContext } from "@/lib/api/facility-context";

// ============================================================================
// Which client record the signed-in person IS.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `const MOCK_CUSTOMER_ID = 15`, hardcoded in 35 files across the customer
// portal. Client 15 is Alice Johnson, so every signed-in pet owner was shown
// her bookings, her pets, her household and her documents — one fictional
// person rendered to everybody, on a live site, while Clerk knew perfectly
// well who was asking.
//
// Nothing was missing to fix it: Clerk resolves the person, `clients.profile_id`
// links them, and `clients_read` already admits `profile_id = auth.jwt()->>'sub'`
// so RLS scopes a customer to their own row without a WHERE clause. The portal
// simply never asked.
//
// ── THE LINK HEALS ITSELF, ONCE ───────────────────────────────────────────
//
// public.link_client_record() has existed since the tenancy migration and is
// called NOWHERE in the app — grep found it only in a comment. So a customer
// could sign up, be perfectly authenticated, and still have profile_id NULL
// forever, which reads exactly like "you have no bookings".
//
// It is called here, and only when the direct read finds nothing: it matches
// the caller's verified profile email against `clients.email` and claims the
// row if it is unclaimed. SECURITY DEFINER, and it can only ever link the
// CALLER — it takes no arguments, reads the subject from the JWT, and refuses
// a row somebody else already owns.
//
// Deliberately not done in the sync webhook: the webhook runs as service_role
// with no session, so "the caller" would be nobody, and it fires before a
// facility has necessarily created the client record anyway.
//
// ── 404 IS A REAL ANSWER ──────────────────────────────────────────────────
//
// A signed-in person with no client record is an ordinary state — somebody who
// created an account before booking anywhere. It is not an error, and the
// portal needs to tell those two apart to show "no bookings yet" rather than
// spinning. Hence `{ linked: false }` with a 404 rather than an empty object.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  // ── WHICH facility's record (spec 002 phase 5) ───────────────────────────
  //
  // The subdomain names it: proxy.ts stamps `x-facility-slug` from the Host.
  // This route used to answer "the caller's record" as though a person could
  // only have one — and `.maybeSingle()` ERRORS on two rows, so the customer
  // portal broke outright for anyone who is a customer at two facilities.
  //
  // With no facility named (the apex), it falls back to their FIRST record so
  // yipyy.com/customer keeps working exactly as it did.
  const slug = (await headers()).get("x-facility-slug");

  const readOwn = async () => {
    const query = supabase
      .from("clients")
      .select(`${CLIENT_SELECT}, facilities!inner(slug)`)
      .eq("profile_id", user.id);

    const { data, error } = slug
      ? await query.eq("facilities.slug", slug).maybeSingle()
      : await query.order("ref").limit(1).maybeSingle();

    if (error) throw new Error(error.message);
    return data;
  };

  try {
    let row = await readOwn();

    if (!row && slug) {
      // Unlinked HERE. Claim a record this facility already created for their
      // address, then read again — the RPC returns the id but not the row, and
      // re-reading keeps a single mapping path rather than two.
      //
      // Only when a facility is named. Without one there is nothing to claim
      // AT, and the unscoped version of this call is exactly the defect phase 5
      // removed: it claimed across every facility at once.
      const { error: linkError } = await supabase.rpc("link_client_record", {
        p_facility_slug: slug,
      });
      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 500 });
      }
      row = await readOwn();
    }

    if (!row) {
      // THE STRANGER GATE. Signed in at a facility they hold no record at is an
      // ordinary state, not a failure — the session cookie is shared across
      // every facility subdomain and always will be (spec 002 D1/D2). The
      // portal must show "you are not a customer here" rather than an empty
      // dashboard that looks like their data failed to load.
      return NextResponse.json(
        {
          linked: false,
          facilitySlug: slug,
          message: slug
            ? "You are not registered at this facility yet."
            : "No client record is linked to this account yet.",
        },
        { status: 404 },
      );
    }

    // From the caller's own context, not `legacy_id = "11"`. A customer has no
    // membership, so this still resolves to the demo facility for them — but it
    // resolves to the RIGHT one for staff reading their own record at a second
    // facility, where the old direct lookup was refused by facilities_read and
    // fell through to the hardcoded name below.
    const context = await getFacilityContext();

    return NextResponse.json(
      rowToClient(row, context?.name ?? "Example Pet Care Facility"),
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Read failed." },
      { status: 500 },
    );
  }
}
