import { requireFacilityOwner } from "@/lib/facility-owner-guard";
import { FacilityDocumentsClient } from "./_components/facility-documents-client";

export default async function FacilityDocumentsPage() {
  // Server-side owner gate: Yipyy Agreements are legally signed records, part of
  // the Owner Account section. Any non-owner role gets a 403 page (not a 404,
  // blank page, or redirect) — enforced on the server for direct URL hits.
  await requireFacilityOwner();
  return <FacilityDocumentsClient />;
}
