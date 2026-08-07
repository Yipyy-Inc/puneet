import { NextResponse } from "next/server";

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

  // No `.eq("profile_id", ...)`: clients_read already restricts a customer to
  // their own row, and filtering here as well would hide the case where a STAFF
  // member opens the portal — they hold view_clients and would otherwise match
  // every row in the facility.
  const readOwn = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select(CLIENT_SELECT)
      .eq("profile_id", user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  };

  try {
    let row = await readOwn();

    if (!row) {
      // Unlinked. Claim the record for this subject if one carries their
      // address, then read again — the RPC returns the id but not the row, and
      // re-reading keeps a single mapping path rather than two.
      const { error: linkError } = await supabase.rpc("link_client_record");
      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 500 });
      }
      row = await readOwn();
    }

    if (!row) {
      return NextResponse.json(
        {
          linked: false,
          message: "No client record is linked to this account yet.",
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
