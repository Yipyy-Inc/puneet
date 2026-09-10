"use client";

import { use } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useClientRecord } from "@/lib/api/client";
import { ClientEditForm } from "./_components/ClientEditForm";

export default function ClientEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // The client, from Postgres. This was `clients.find(...)` over
  // `src/data/clients.ts`, so every client created since the migration was
  // told they did not exist on their own file.
  const { client, pending } = useClientRecord(id);

  if (pending) {
    return (
      <div className="space-y-6 p-4 pt-5 md:p-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }
  if (!client) return null;

  // Keyed by the client, so moving between two files never carries one
  // client's edits onto the other.
  return <ClientEditForm key={client.id} client={client} />;
}
