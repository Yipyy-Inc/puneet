"use client";

import { use } from "react";
import { clients } from "@/data/clients";
import { TagList } from "@/components/shared/TagList";
import { NotesList } from "@/components/shared/NotesList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tags, StickyNote } from "lucide-react";

export default function ClientTagsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const clientId = parseInt(id, 10);
  const client = clients.find((c) => c.id === clientId);
  if (!client) return null;

  return (
    <div className="space-y-6 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">Tags & Notes</h2>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Tags className="size-4" />
            Client Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TagList entityType="customer" entityId={clientId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <StickyNote className="size-4" />
            Internal Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NotesList category="customer" entityId={clientId} />
        </CardContent>
      </Card>

      {client.pets.map((pet) => (
        <Card key={pet.id}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Tags className="size-4" />
              {pet.name} — Pet Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TagList entityType="pet" entityId={pet.id} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
