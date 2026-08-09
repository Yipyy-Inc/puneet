"use client";

import { use } from "react";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";
import { useClientRecord } from "@/lib/api/client";

export default function ClientAuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // The client, from Postgres. This was `clients.find(...)` over
  // `src/data/clients.ts`, so every client created since the migration was
  // told they did not exist on their own file.
  const { client } = useClientRecord(id);
  if (!client) return null;

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">Audit Trail</h2>
      <PageAuditTrail area="clients" entityId={id} />
    </div>
  );
}
