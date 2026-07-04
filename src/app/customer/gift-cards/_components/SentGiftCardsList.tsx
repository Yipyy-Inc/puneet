"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { giftCards } from "@/data/gift-cards";
import {
  EmptyState,
  STATUS_META,
  Thumb,
  fmtDate,
} from "./gift-card-list-shared";

interface SentGiftCardsListProps {
  facilityId: number;
  customerId: number;
}

export function SentGiftCardsList({
  facilityId,
  customerId,
}: SentGiftCardsListProps) {
  const sent = giftCards.filter(
    (gc) =>
      gc.facilityId === facilityId && gc.purchasedByClientId === customerId,
  );

  const [resentIds, setResentIds] = useState<Set<string>>(new Set());

  if (sent.length === 0) {
    return (
      <EmptyState
        icon={<Send className="size-6" />}
        text="You haven't sent any gift cards yet."
      />
    );
  }

  return (
    <div className="space-y-2">
      {sent.map((gc) => (
        <div
          key={gc.id}
          className="flex items-center gap-3 rounded-xl border p-3"
        >
          <Thumb id={gc.id} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              To {gc.recipientName ?? gc.recipientEmail ?? "Recipient"}
            </p>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
              Sent {fmtDate(gc.purchaseDate)}
              <Badge
                className={cn("text-[10px]", STATUS_META[gc.status].className)}
              >
                {STATUS_META[gc.status].label}
              </Badge>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold">
              ${gc.initialAmount.toFixed(2)}
            </p>
            <p className="text-muted-foreground text-xs">
              ${gc.currentBalance.toFixed(2)} left
            </p>
          </div>
          {gc.type === "online" && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              disabled={resentIds.has(gc.id)}
              onClick={() => setResentIds((prev) => new Set(prev).add(gc.id))}
            >
              {resentIds.has(gc.id) ? (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Sent
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Resend
                </>
              )}
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
