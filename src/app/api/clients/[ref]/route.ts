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

// ============================================================================
// One client, by the app-facing numeric ref.
//
// PATCH rather than PUT: callers send what they changed, and clientToRow maps
// only what it is given. A full replace would blank every column the caller
// omitted — which on this table means losing an address because a phone number
// was corrected.
//
// WHAT MAY ACTUALLY BE CHANGED is not decided here. `clients_update` admits the
// record's OWNER, and RLS gates rows rather than columns, so the rules live in
// the database (20260803090000) where PostgREST cannot go round them:
//
//   raises   any change of facility_id, profile_id or ref by a caller without
//            edit_clients — a record moved to another business is not an edit
//   reverts  status, is_blocked, blocked_at/reason, outstanding_balance,
//            no_show_count, last_visit_date, and the membership / packages /
//            storeCredit entries in `details`
//
// This handler's job is to merge honestly and report what was actually stored.
// ============================================================================

export const dynamic = "force-dynamic";

/**
 * One client, with their pets.
 *
 * Every screen that needed one client — the booking page, and the fifteen in
 * the client file behind `useClientRecord` — fetched the facility's WHOLE
 * client list and picked one out of it. `clients.ref` is unique across the
 * platform, so this is one row; it is still narrowed to the facility this
 * portal is showing, so a platform admin or a member of two facilities cannot
 * open another facility's client by typing its number. RLS decides the rest,
 * and a row it hides is the same 404 as a row that does not exist.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const numericRef = Number(ref);
  if (!Number.isInteger(numericRef) || numericRef <= 0) {
    return NextResponse.json({ error: "Invalid client id." }, { status: 400 });
  }

  const supabase = await createServerClient();
  const scope = await activeFacilityIdForStaff();
  const [{ data, error }, context] = await Promise.all([
    supabase
      .from("clients")
      .select(CLIENT_SELECT)
      .eq("ref", numericRef)
      .match(inFacility(scope))
      .maybeSingle(),
    getFacilityContext(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }
  return NextResponse.json(
    rowToClient(data, context?.name ?? "Example Pet Care Facility"),
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const numericRef = Number(ref);
  if (!Number.isFinite(numericRef)) {
    return NextResponse.json({ error: "Invalid client id." }, { status: 400 });
  }

  const input = (await request.json()) as Partial<Client>;
  const supabase = await createServerClient();

  // Read the stored row first and merge onto it, because `details` is replaced
  // wholesale rather than deep-merged. Without this, a caller sending only
  // `phone` would drop the saved cards, the additional contacts and everything
  // else in the tail.
  //
  // Merging the FULL stored details is what makes the trigger's revert work as
  // intended rather than as a data-loss bug: a customer who never sees
  // storeCredit sends it back absent, the merge restores it from storage, and
  // the trigger has the same value to preserve either way.
  const { data: existing, error: readError } = await supabase
    .from("clients")
    .select("id, details")
    .eq("ref", numericRef)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!existing) {
    // Unreadable and absent are the same answer here, on purpose: telling a
    // caller that a client they may not see EXISTS is itself a disclosure.
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const row = clientToRow(input);
  if (row.details) {
    row.details = {
      ...((existing.details ?? {}) as Record<string, unknown>),
      ...(row.details as Record<string, unknown>),
    } as typeof row.details;
  }

  const { data: updated, error } = await supabase
    .from("clients")
    .update(row as never)
    .eq("id", existing.id)
    .select(CLIENT_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to edit this client.",
      duplicate: "Someone with that email is already a client here.",
    });
  }

  const context = await getFacilityContext();

  // Echoed back from the STORED row, not the request. The trigger may have
  // reverted a balance the caller tried to clear, and a response that repeated
  // the request would show them a zero the database refused.
  return NextResponse.json(
    rowToClient(updated, context?.name ?? "Example Pet Care Facility"),
  );
}

/**
 * What deleting this client would take with it.
 *
 * Measured 2026-09-21 from `pg_constraint`: 34 foreign keys point at
 * `public.clients`. Only `payments` and `store_credit_entries` are
 * `on delete restrict`. Almost everything else CASCADES — `bookings`,
 * `report_cards`, `waiver_signatures`, `form_submissions`,
 * `customer_packages`, `saved_cards` and the whole training set.
 *
 * So the restrict on `payments` protects a client who has PAID, by accident
 * and only then. A client with six unpaid bookings deleted cleanly and took
 * all six with them, their signed waivers included, and nothing said so.
 *
 * Counted rather than guessed, because the number is what makes the warning
 * worth reading: "this will delete 6 bookings and 2 signed waivers" is a
 * different sentence from "are you sure?".
 */
async function historyOf(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  clientId: string,
): Promise<{ total: number; counts: Record<string, number> }> {
  const TABLES = [
    "bookings",
    "report_cards",
    "waiver_signatures",
    "form_submissions",
  ] as const;

  const counted = await Promise.all(
    TABLES.map(async (table) => {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId);
      // A table this caller cannot read counts as UNKNOWN, not as zero — and
      // unknown must not read as "nothing to lose". One is enough to warn.
      if (error) return [table, 1] as const;
      return [table, count ?? 0] as const;
    }),
  );

  const counts = Object.fromEntries(counted.filter(([, n]) => n > 0));
  return {
    total: counted.reduce((sum, [, n]) => sum + n, 0),
    counts,
  };
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const numericRef = Number(ref);
  if (!Number.isFinite(numericRef)) {
    return NextResponse.json({ error: "Invalid client id." }, { status: 400 });
  }

  const supabase = await createServerClient();

  // The row, through a read this caller has to be able to make — so a client
  // at another facility is "not found" here rather than becoming an RLS
  // refusal further down that says less.
  const { data: target } = await supabase
    .from("clients")
    .select("id, name")
    .eq("ref", numericRef)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  // ── NOT BY ACCIDENT ─────────────────────────────────────────────────────
  //
  // Deliberately NOT a trigger. `supabase/tests/forms.sql` and `waivers.sql`
  // both assert, in as many words, that "an erasure request has to be able to
  // complete" — a person's record must be destroyable on request, history and
  // all. That is an obligation, not an oversight, so the rule here is not
  // "never" but "not without having been told what goes".
  //
  // A confirmation belongs in the layer that can ask. `?confirm=history` is
  // the caller saying they have seen the counts below.
  const confirmed = request.nextUrl.searchParams.get("confirm") === "history";

  if (!confirmed) {
    const { total, counts } = await historyOf(supabase, target.id);
    if (total > 0) {
      return NextResponse.json(
        {
          error:
            `${target.name} has records that would be destroyed with them: ` +
            describe(counts) +
            ". Deleting a client cannot be undone.",
          reason:
            "Mark the client inactive instead, or repeat this with " +
            "?confirm=history if the record really must go.",
          destroys: counts,
        },
        { status: 422 },
      );
    }
  }

  // `clients_delete` needs delete_clients — a permission distinct from
  // edit_clients precisely because this is not an edit. A customer cannot
  // delete their own record, and neither can most staff.
  //
  // Pets cascade with the owner (`on delete cascade`), which is the right shape:
  // an animal's record has no meaning without the person responsible for it.
  //
  // A refusal matches ZERO ROWS rather than erroring, so "denied" and "already
  // gone" are indistinguishable from the result alone. Reading back tells them
  // apart — the same shape the roles-override route uses.
  // rls-write-ok: the survivor read-back below turns a zero-row refusal
  // into the 403 it was.
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("ref", numericRef);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to remove this client.",
      duplicate: "",
    });
  }

  const { data: survivor } = await supabase
    .from("clients")
    .select("ref")
    .eq("ref", numericRef)
    .maybeSingle();

  if (survivor) {
    return NextResponse.json(
      { error: "Not allowed to remove this client." },
      { status: 403 },
    );
  }

  return new NextResponse(null, { status: 204 });
}

/** "6 bookings, 2 signed waivers" — the plural handled, because it is read. */
function describe(counts: Record<string, number>): string {
  const LABEL: Record<string, [string, string]> = {
    bookings: ["booking", "bookings"],
    report_cards: ["report card", "report cards"],
    waiver_signatures: ["signed waiver", "signed waivers"],
    form_submissions: ["submitted form", "submitted forms"],
  };
  return Object.entries(counts)
    .map(([table, n]) => {
      const [one, many] = LABEL[table] ?? [table, table];
      return `${n} ${n === 1 ? one : many}`;
    })
    .join(", ");
}
