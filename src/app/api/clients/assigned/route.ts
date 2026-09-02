import { NextResponse } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { ownStaffId } from "@/lib/api/own-staff";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Which clients are assigned to one staff member.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
//   export function assignedClientIds(staffId: string): Set<number> {
//     const ids = new Set<number>();
//     for (const b of bookings) {                     // ← src/data
//       if (resolveBookingStaffId(b) === staffId) ids.add(b.clientId);
//     }
//     return ids;
//   }
//
// That decided a PERMISSION SCOPE from the bookings fixture. `view_clients =
// assigned_shifts` is a real grant — groomer@yipyy.dev holds it — and which
// records it admits was answered by mock rows.
//
// MEASURED: with Alice Johnson's booking genuinely assigned to that groomer in
// Postgres, the client list showed them 0 clients. The fixture's booking staff
// ids are strings like "fs-dev-groomer" and a signed-in viewer's id is a uuid,
// so the comparison matched nothing — which meant a scoped viewer saw an empty
// list whatever was really assigned to them, and would have seen SOMEBODY
// ELSE'S clients the moment those two id spaces happened to collide.
//
// ── IT ANSWERS FOR THE CALLER, AND TAKES NO STAFF ID ──────────────────────
//
// The first version took `?staffId=`, because that is the shape the helper had.
// Two things were wrong with it.
//
// It never worked: the caller passed `viewer.id` from the RBAC provider, which
// is a FIXTURE staff id ("fs-dev-groomer"), while `bookings.assigned_staff_id`
// holds uuids. MEASURED — the endpoint returned {"refs":[15]} for the groomer's
// real uuid and nothing for the id the screen actually had.
//
// And it should not exist: this scope always means "the viewer". Accepting an
// id lets a caller ask about somebody else, which is the anti-pattern
// check:facility-from-session exists for. `ownStaffId` resolves the caller's
// staff row from their membership, through their OWN client so RLS still
// applies.
//
// ── WHY REFS AND NOT UUIDS ────────────────────────────────────────────────
//
// Every screen holds `Client.id`, which the mapper sets from `clients.ref` —
// the small integer in the URL. Returning uuids would make each caller join
// them back, which is the sort of translation that goes wrong once and then
// silently: see the ref/uuid note on `useClientRecord`.
//
// ── THIS IS A NARROWING, NOT A BOUNDARY ───────────────────────────────────
//
// RLS lets a facility's staff read their colleagues' clients — a rota needs it
// — so this endpoint does not make a client unreadable, it answers which ones a
// scoped viewer should be SHOWN. The real boundary stays where it is, in
// `clients_read`. Said plainly because a helper named "assigned" is easy to
// mistake for a gate.
// ============================================================================

export const dynamic = "force-dynamic";

export interface AssignedClientsPayload {
  /** `clients.ref` for every client with a booking assigned to this staff. */
  refs: number[];
}

export async function GET() {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const staffId = await ownStaffId(supabase, viewer, context.facilityId);
  // Not an error: somebody with a membership but no staff row is rostered
  // nowhere, so nothing is assigned to them. An empty list is the true answer
  // and a 404 would make the screen show a failure instead of a fact.
  if (!staffId) return NextResponse.json({ refs: [] });

  const { data, error } = await supabase
    .from("bookings")
    .select("clients:client_id ( ref )")
    .eq("facility_id", context.facilityId)
    .eq("assigned_staff_id", staffId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const refs = new Set<number>();
  for (const row of data ?? []) {
    // PostgREST returns a to-one embed as an object, but has answered with a
    // one-element array before now — reading only one shape is how an empty
    // board was once produced.
    const embedded = (row as { clients?: unknown }).clients;
    const client = Array.isArray(embedded) ? embedded[0] : embedded;
    const ref = (client as { ref?: number } | null | undefined)?.ref;
    if (typeof ref === "number") refs.add(ref);
  }

  return NextResponse.json({ refs: [...refs].sort((a, b) => a - b) });
}
