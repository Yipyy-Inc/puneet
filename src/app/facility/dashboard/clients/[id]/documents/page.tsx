"use client";

import { use } from "react";

import { ClientDocumentsPanel } from "@/components/clients/documents/ClientDocumentsPanel";
import { useClientRecord } from "@/lib/api/client";

// The client's files and signed agreements, from Postgres and the private
// `client-documents` bucket. This listed `clientDocuments` from
// `@/data/documents` by numeric id — somebody else's invented paperwork.
export default function ClientDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { client } = useClientRecord(parseInt(id, 10));
  if (!client) return null;

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <ClientDocumentsPanel
        clientRef={client.id}
        clientName={client.name}
        pets={client.pets}
      />
    </div>
  );
}
