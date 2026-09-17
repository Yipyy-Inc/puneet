import { NextResponse, type NextRequest } from "next/server";

import {
  activeFacilityIdForStaff,
  inFacility,
} from "@/lib/api/facility-context";
import { deniedIfUntouched } from "@/lib/api/rls-write";
import { getViewer } from "@/lib/auth/viewer";
import { normaliseAddress } from "@/lib/messaging/send";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Who has told this facility to stop messaging them, and letting one back in.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// The messaging settings screen held this:
//
//   const [optedOutNumbers, setOptedOutNumbers] = useState([
//     { name: "Marie Tremblay", phone: "(514) 555-0182", … },
//     { name: "Daniel Roy",     phone: "(450) 555-0917", … },
//   ]);
//   const removeOptOut = (phone) => {
//     setOptedOutNumbers((prev) => prev.filter((o) => o.phone !== phone));
//     toast.success("Re-enabled SMS for this client");
//   };
//
// Two invented people, and "re-enabled" meant a row vanished from a list in
// one browser tab. WRONG IN BOTH DIRECTIONS, and this is a consent surface:
// somebody who really did text STOP never appeared on it, so staff reading the
// screen would conclude nobody had opted out — and somebody who never opted
// out appeared to have, and could be "re-enabled" by a click that did nothing.
//
// `message_suppressions` has held the truth all along (20260827111420). It is
// keyed `(facility_id, channel, address)` because under CASL a withdrawal
// attaches to the ADDRESS, not to our row for a person.
//
// ── A RELEASE IS NOT A DELETE ─────────────────────────────────────────────
//
// Re-enabling sets `released_at` and `released_by`. The opt-out row stays, so
// the facility can still answer "did this person ever withdraw consent, and who
// put them back on?" — which is exactly the question a complaint asks, and
// exactly the record a DELETE would destroy.
//
// ── THE READ IS WIDER THAN THE WRITE, DELIBERATELY ────────────────────────
//
// `message_suppressions_read` admits any member; the write needs
// `marketing_manage_automations`. Anybody who might message a customer should
// be able to see that they must not — a consent list only some staff can read
// is a consent list that gets breached by the others.
// ============================================================================

export const dynamic = "force-dynamic";

export interface SuppressionRow {
  id: string;
  channel: "email" | "sms";
  /** The address itself — normalised, as the sender keys it. */
  address: string;
  /** `marketing` or `all`. */
  scope: string;
  reason: string;
  source: string | null;
  createdAt: string;
  /** The customer this address belongs to, when one is linked. */
  clientName: string | null;
  clientRef: number | null;
}

const SELECT =
  "id, channel, address, scope, reason, source, created_at, clients:client_id ( ref, name )";

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  // No facility on screen means nobody has opted out OF it. An empty list is
  // the true answer; a 404 would make the screen show a failure instead.
  if (!scope) return NextResponse.json({ suppressions: [] });

  const channel = new URL(request.url).searchParams.get("channel");
  const supabase = await createServerClient();

  let query = supabase
    .from("message_suppressions")
    .select(SELECT)
    .match(inFacility(scope))
    // Only the ones still in force. A released row is history, and showing it
    // as an opt-out is the same lie in a new place.
    .is("released_at", null)
    .order("created_at", { ascending: false });

  if (channel === "sms" || channel === "email") {
    query = query.eq("channel", channel);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const suppressions = (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string;
      channel: string;
      address: string;
      scope: string;
      reason: string;
      source: string | null;
      created_at: string;
      clients:
        | { ref: number; name: string }
        | { ref: number; name: string }[]
        | null;
    };
    // PostgREST returns a to-one embed as an object and has answered with a
    // one-element array before now — reading one shape is how a board came
    // back empty (see the debt map).
    const embedded = Array.isArray(r.clients) ? r.clients[0] : r.clients;
    return {
      id: r.id,
      channel: r.channel as "email" | "sms",
      address: r.address,
      scope: r.scope,
      reason: r.reason,
      source: r.source,
      createdAt: r.created_at,
      clientName: embedded?.name ?? null,
      clientRef: embedded?.ref ?? null,
    } satisfies SuppressionRow;
  });

  return NextResponse.json({ suppressions });
}

/**
 * Let an address back in.
 *
 * Takes the address rather than the row id, because that is what the person
 * doing it has in front of them and what the sender keys on — and it is
 * normalised the same way `isSuppressed` normalises, or a release stored
 * against "5145551234" leaves the suppression on "+15145551234" in force and
 * the screen says it worked.
 */
export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  if (!scope) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    channel?: string;
    address?: string;
  } | null;

  const channel = body?.channel;
  if (channel !== "sms" && channel !== "email") {
    return NextResponse.json(
      { error: "`channel` must be sms or email." },
      { status: 422 },
    );
  }

  const address = normaliseAddress(channel, body?.address ?? "");
  if (!address) {
    return NextResponse.json(
      { error: "That is not an address we can send to." },
      { status: 422 },
    );
  }

  const { data, error } = await supabaseRelease(
    scope,
    channel,
    address,
    viewer,
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // An update that touched nothing is either RLS refusing or an address that
  // was not suppressed, and a route cannot tell those apart from the outside —
  // which is what `deniedIfUntouched` is for (check:rls-writes). It answers 403
  // for both. That is the repo's trade, and it errs the safe way here: being
  // told you may not re-enable somebody is a smaller harm than being told you
  // did when you did not.
  const denied = deniedIfUntouched(
    data,
    "You do not have permission to re-enable messages, or that address is not suppressed.",
  );
  if (denied) return denied;

  return NextResponse.json({ released: (data ?? []).length });
}

async function supabaseRelease(
  facilityId: string,
  channel: "email" | "sms",
  address: string,
  viewer: { userId: string | null; fullName: string | null },
) {
  const supabase = await createServerClient();
  return supabase
    .from("message_suppressions")
    .update({
      released_at: new Date().toISOString(),
      // Who put them back on: the question a complaint asks.
      released_by: viewer.fullName ?? viewer.userId ?? null,
    })
    .eq("facility_id", facilityId)
    .eq("channel", channel)
    .eq("address", address)
    .is("released_at", null)
    .select("id");
}
