"use client";

import { use, useMemo } from "react";
import { clients } from "@/data/clients";
import { useAssignedScope } from "@/lib/facility-permissions";
import { isClientAssignedTo } from "@/lib/api/client";
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
// ============================================================================

export default function EmployeeClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const client = clients.find((c) => c.id === parseInt(id, 10));
  const assignedClientScope = useAssignedScope("view_clients");

  // The shared profile reads its route params via use(params); hand it a STABLE
  // promise (a fresh one each render would suspend forever).
  const detailParams = useMemo(() => Promise.resolve({ id }), [id]);

  const denied =
    !client ||
    (assignedClientScope != null &&
      !isClientAssignedTo(client, assignedClientScope));

  if (denied) return <AccessRestricted />;
  return <ClientDetailPage params={detailParams} />;
}
