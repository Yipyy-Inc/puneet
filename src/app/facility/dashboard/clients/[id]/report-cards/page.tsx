"use client";

import { use } from "react";
import { reportCards } from "@/data/pet-data";
import { useClientRecord } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

export default function ClientReportCardsPage({
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

  const petIds = client.pets.map((p) => p.id);
  const cards = reportCards.filter((r) => petIds.includes(r.petId));

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">Report Cards ({cards.length})</h2>
      {cards.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No report cards yet
        </p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => {
            const pet = client.pets.find((p) => p.id === card.petId);
            return (
              <Card key={card.id}>
                <CardContent className="flex items-center gap-3 pt-6">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Award className="size-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {pet?.name ?? "Pet"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(card.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {" · "}
                      {card.serviceType}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {card.serviceType}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
