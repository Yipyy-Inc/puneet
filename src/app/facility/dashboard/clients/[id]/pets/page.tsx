"use client";

import { use } from "react";
import Link from "next/link";
import { clients } from "@/data/clients";
import { PawPrint } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPetAgeDisplay } from "@/lib/pet-utils";

export default function ClientPetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const client = clients.find((c) => c.id === parseInt(id, 10));
  if (!client) return null;

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">Pets ({client.pets.length})</h2>
      {client.pets.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No pets registered
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {client.pets.map((pet) => (
            <Link
              key={pet.id}
              href={`/facility/dashboard/clients/${id}/pets/${pet.id}`}
              className="bg-card hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors"
            >
              <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
                <PawPrint className="text-primary size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{pet.name}</p>
                <p className="text-muted-foreground text-xs">
                  {pet.breed} · {pet.type} · {getPetAgeDisplay(pet)} ·{" "}
                  {pet.weight} lbs
                </p>
              </div>
              <Badge
                variant={pet.petStatus === "active" ? "default" : "secondary"}
                className="text-[10px] capitalize"
              >
                {pet.petStatus ?? "active"}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
