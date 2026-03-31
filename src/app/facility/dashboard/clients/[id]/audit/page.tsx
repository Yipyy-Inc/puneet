"use client";

import { use } from "react";
import { clients } from "@/data/clients";
import { PageAuditTrail } from "@/components/shared/PageAuditTrail";

export default function ClientAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const client = clients.find((c) => c.id === parseInt(id, 10));
  if (!client) return null;

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">Audit Trail</h2>
      <PageAuditTrail area="clients" entityId={id} />
    </div>
  );
}
