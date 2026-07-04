"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Wallet,
  CheckCircle2,
  Loader2,
  Inbox,
  ArrowUpRight,
} from "lucide-react";
import { giftCards } from "@/data/gift-cards";
import { clients } from "@/data/clients";
import type { GiftCard } from "@/types/payments";
import { EmptyState, Thumb, fmtDate } from "./gift-card-list-shared";

interface ReceivedGiftCardsListProps {
  facilityId: number;
  customerId: number;
}

export function ReceivedGiftCardsList({
  facilityId,
  customerId,
}: ReceivedGiftCardsListProps) {
  const customer = clients.find((c) => c.id === customerId);
  const customerEmail = customer?.email.toLowerCase() ?? "";

  const received = giftCards.filter(
    (gc) =>
      gc.facilityId === facilityId &&
      gc.recipientEmail?.toLowerCase() === customerEmail,
  );

  const [loadCard, setLoadCard] = useState<GiftCard | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadDone, setLoadDone] = useState(false);

  const closeLoad = () => {
    if (loading) return;
    setLoadCard(null);
    setLoadDone(false);
  };

  const handleLoad = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setLoadDone(true);
  };

  return (
    <>
      {received.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" />}
          text="No gift cards have been sent to you yet."
        />
      ) : (
        <div className="space-y-2">
          {received.map((gc) => {
            const canLoad = gc.status === "active" && gc.currentBalance > 0;
            return (
              <div
                key={gc.id}
                className="flex items-center gap-3 rounded-xl border p-3"
              >
                <Thumb id={gc.id} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    From {gc.purchasedBy ?? "Someone"}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Received {fmtDate(gc.createdAt ?? gc.purchaseDate)} ·{" "}
                    {gc.neverExpires
                      ? "No expiry"
                      : `Expires ${fmtDate(gc.expiryDate)}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-semibold text-green-600">
                    ${gc.currentBalance.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    of ${gc.initialAmount.toFixed(2)}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5"
                  disabled={!canLoad}
                  onClick={() => {
                    setLoadDone(false);
                    setLoadCard(gc);
                  }}
                >
                  <Wallet className="size-3.5" />
                  Load
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Load to My Wallet — simplified redeem flow */}
      <Dialog open={loadCard !== null} onOpenChange={(v) => !v && closeLoad()}>
        <DialogContent className="max-w-sm">
          {loadCard && !loadDone && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wallet className="size-5" />
                  Load to My Wallet
                </DialogTitle>
                <DialogDescription>
                  Move this gift card&apos;s balance into your wallet to use on
                  any service.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3 rounded-xl border p-3">
                <Thumb id={loadCard.id} />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    From {loadCard.purchasedBy ?? "Someone"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {loadCard.code}
                  </p>
                </div>
                <p className="text-lg font-bold text-green-600">
                  ${loadCard.currentBalance.toFixed(2)}
                </p>
              </div>
              <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <ArrowUpRight className="size-4" />
                <span className="text-foreground font-semibold">
                  ${loadCard.currentBalance.toFixed(2)}
                </span>
                will be added to your wallet.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={closeLoad}>
                  Cancel
                </Button>
                <Button onClick={handleLoad} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    "Load to Wallet"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
          {loadCard && loadDone && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="size-8 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold">Added to your wallet!</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  <span className="font-medium text-green-600">
                    ${loadCard.currentBalance.toFixed(2)}
                  </span>{" "}
                  is now available to spend on any service.
                </p>
              </div>
              <Button className="w-full" onClick={closeLoad}>
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
