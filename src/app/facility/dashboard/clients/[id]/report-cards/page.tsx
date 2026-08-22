"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { reportCardQueries } from "@/lib/api/report-cards";
import { useClientRecord } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";

// ============================================================================
// A client's report cards, from Postgres.
//
// This read `reportCards` from `src/data/pet-data.ts` and matched it on a
// numeric pet id, so it showed eleven hand-authored cards about somebody
// else's dog to whichever client happened to own those refs — and showed
// nothing at all for the cards the facility had actually written.
// ============================================================================

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

  // Narrowed server-side by the client's ref rather than by filtering the
  // facility's whole list here — see `reportCardSelect`.
  const {
    data: cards = [],
    isPending,
    error,
  } = useQuery({
    ...reportCardQueries.byClient(Number(id)),
    enabled: Number.isInteger(Number(id)),
  });

  if (!client) return null;

  return (
    <div className="space-y-4 p-4 pt-5 md:p-6">
      <h2 className="text-lg font-semibold">
        Report Cards{isPending ? "" : ` (${cards.length})`}
      </h2>

      {error ? (
        // An error, not an empty state. "No report cards yet" for a failed
        // read tells a facility their work is gone.
        <p className="text-destructive py-8 text-center text-sm">
          Report cards could not be loaded.
        </p>
      ) : isPending ? (
        <div className="space-y-3">
          <div
            data-slot="skeleton"
            className="bg-muted h-20 animate-pulse rounded-lg"
          />
          <div
            data-slot="skeleton"
            className="bg-muted h-20 animate-pulse rounded-lg"
          />
        </div>
      ) : cards.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No report cards yet
        </p>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <Card key={card.id}>
              <CardContent className="flex items-center gap-3 pt-6">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <Award className="size-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {card.petName ?? "Pet"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(card.visitDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {" · "}
                    {card.serviceType}
                  </p>
                </div>
                {/* A card that has not been sent is the facility's working
                    copy — the owner cannot see it, and the list should say so
                    rather than implying it was delivered. */}
                {card.deliveryStatus !== "sent" && (
                  <Badge variant="secondary" className="text-[10px]">
                    Draft
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] capitalize">
                  {card.serviceType}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
