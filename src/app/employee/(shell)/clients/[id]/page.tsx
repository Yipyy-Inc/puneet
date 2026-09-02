"use client";

import { use, useMemo } from "react";
import { useAssignedScope } from "@/lib/facility-permissions";
import { isClientAssignedTo, useClientRecord } from "@/lib/api/client";
import { AccessRestricted } from "@/components/employee/AccessRestricted";
import ClientDetailPage from "@/app/facility/dashboard/clients/[id]/page";

// ============================================================================
// Section 5C / Part 0.3 — employee client profile.
//
// Renders the SAME client profile component as admin, but INSIDE the /employee
// shell so the FacilityRbacProvider stays mounted — which is what makes the
// profile's gates apply (view_client_address hides the Address section,
// view_client_financial hides the Billing tab / payments / invoice history,
// add_pet_notes and edit_pet_medical gate their controls).
//
// A scoped viewer (view_clients = assigned_only) opening a client outside their
// assigned set gets a 403 → AccessRestricted, never the record. The decision is
// the data-layer helper isClientAssignedTo (8B).
//
// STILL A FIXTURE, AND SAY SO: `isClientAssignedTo` calls `assignedClientIds`,
// which walks the `bookings` array in src/data. So WHICH clients a scoped
// viewer may open is computed from mock bookings — wrong in both directions,
// hiding real assignments and inventing others. It is not fixed here because
// it is not one call site: `scopeClientsToStaff` filters the client LIST from
// the same helper, and doing it properly means a real "clients assigned to this
// staff member" query rather than a swap. The existence check above no longer
// depends on it.
// ============================================================================

export default function EmployeeClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // ── THE GATE USED TO ASK A FIXTURE WHETHER THIS CLIENT EXISTED ──────────
  //
  //   const client = clients.find((c) => c.id === parseInt(id, 10));
  //
  // `clients` is src/data. The URL carries `Client.id`, which the mapper sets
  // from `clients.ref` — a real small integer — and the fixture's largest id
  // is 53. So every real client whose ref the fixture never invented failed
  // `!client` and got Access Restricted, whatever permission the viewer held.
  //
  // LATENT, NOT LIVE, AND THE FIRST MEASUREMENT SAID OTHERWISE. Refs 35, 163
  // and 855 are refused — but they belong to pawradise and doggieville-mtl,
  // so RLS refuses them too and the fixture was accidentally right. Every
  // client the demo facility actually has (15-22, 28, 29, 31-34) is one the
  // fixture invented, so today nobody is wrongly denied.
  //
  // The case that separates the two: one demo-facility client moved to ref 934,
  // outside anything the fixture contains. Old code refused David Park to a
  // manager holding full view_clients; this shows him. Reverted afterwards.
  //
  // Which is to say the gate was one new client away from refusing them —
  // refs are assigned in sequence and the fixture stops at 34.
  //
  // `useClientRecord` asks the database and parses the ref in one place — its
  // own comment calls that "the one that breaks these pages when it is missed",
  // which is what happened here.
  const { client, pending } = useClientRecord(id);
  const assignedClientScope = useAssignedScope("view_clients");

  // The shared profile reads its route params via use(params); hand it a STABLE
  // promise (a fresh one each render would suspend forever).
  const detailParams = useMemo(() => Promise.resolve({ id }), [id]);

  // Nothing is decided while the answer is unknown. Denying during the fetch
  // would flash Access Restricted at somebody who has access — and the reverse,
  // rendering the profile first, would show a record before the check.
  if (pending) return null;

  const denied =
    !client ||
    (assignedClientScope != null &&
      !isClientAssignedTo(client, assignedClientScope));

  if (denied) return <AccessRestricted />;
  return <ClientDetailPage params={detailParams} />;
}
